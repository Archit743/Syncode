import dotenv from "dotenv";
dotenv.config();
import express from "express";
import fs from "fs";
import yaml from "yaml";
import path from "path";
import cors from "cors";
import { KubeConfig, AppsV1Api, CoreV1Api, NetworkingV1Api } from "@kubernetes/client-node";
import { PrismaClient } from "@prisma/client";
import { auth } from "express-oauth2-jwt-bearer";
import axios from "axios";
import type { Request } from "express";

const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use(cors());

const kubeconfig = new KubeConfig();
kubeconfig.loadFromDefault();
const coreV1Api = kubeconfig.makeApiClient(CoreV1Api);
const appsV1Api = kubeconfig.makeApiClient(AppsV1Api);
const networkingV1Api = kubeconfig.makeApiClient(NetworkingV1Api);

// Updated utility function to handle multi-document YAML files
const readAndParseKubeYaml = (filePath: string, replId: string): Array<any> => {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const docs = yaml.parseAllDocuments(fileContent).map((doc) => {
        let docString = doc.toString();
        const regex = new RegExp(`service_name`, 'g');
        docString = docString.replace(regex, replId);
        console.log(docString);
        return yaml.parse(docString);
    });
    return docs;
};

// --- Auth0 Middleware ---
const checkJwt = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: 'RS256'
});

const getAuth0Id = (req: Request): string | undefined => req.auth?.payload.sub;

const buildDefaultUsername = (email: string) => {
    const localPart = email.split("@")[0] || "user";
    return localPart.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "user";
};

const buildForkReplId = (sourceReplId: string) => {
    const suffix = Math.random().toString(36).slice(2, 7);
    return `${sourceReplId}-fork-${suffix}`;
};

const canViewProject = (project: any, currentUserId: string | null) => {
    if (!project) return false;
    if (project.visibility === "public") return true;
    if (!currentUserId) return false;
    if (project.userId === currentUserId) return true;
    return project.collaborators.some((entry: any) => entry.userId === currentUserId);
};

const canEditProject = (project: any, currentUserId: string | null) => {
    if (!project || !currentUserId) return false;
    if (project.userId === currentUserId) return true;
    return project.collaborators.some((entry: any) => entry.userId === currentUserId);
};

const getProjectWithRelations = async (replId: string) => {
    return prisma.project.findUnique({
        where: { replId },
        include: {
            collaborators: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatarUrl: true
                        }
                    }
                }
            }
        }
    });
};

// --- Helper: Start K8s Deployment ---
const startDeployment = async (replId: string) => {
    const namespace = "default";
    const kubeManifests = readAndParseKubeYaml(path.join(__dirname, "../service.yaml"), replId);

    for (const manifest of kubeManifests) {
        try {
            switch (manifest.kind) {
                case "Deployment":
                    try {
                        await appsV1Api.readNamespacedDeployment(replId, namespace);
                        console.log(`Deployment ${replId} already exists`);
                    } catch (readError: any) {
                        if (readError.statusCode === 404) {
                            await appsV1Api.createNamespacedDeployment(namespace, manifest);
                            console.log(`Deployment ${replId} created`);
                        } else throw readError;
                    }
                    break;
                case "Service":
                    try {
                        await coreV1Api.readNamespacedService(replId, namespace);
                        console.log(`Service ${replId} already exists`);
                    } catch (readError: any) {
                        if (readError.statusCode === 404) {
                            await coreV1Api.createNamespacedService(namespace, manifest);
                            console.log(`Service ${replId} created`);
                        } else throw readError;
                    }
                    break;
                case "Ingress":
                    try {
                        await networkingV1Api.readNamespacedIngress(replId, namespace);
                        console.log(`Ingress ${replId} already exists`);
                    } catch (readError: any) {
                        if (readError.statusCode === 404) {
                            await networkingV1Api.createNamespacedIngress(namespace, manifest);
                            console.log(`Ingress ${replId} created`);
                        } else throw readError;
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error handling ${manifest.kind}:`, error);
        }
    }
};

// --- Helper: Wait for Pod ---
const waitForPod = async (replId: string): Promise<boolean> => {
    const namespace = "default";
    let ready = false;
    let attempts = 0;
    const maxAttempts = 60;

    while (!ready && attempts < maxAttempts) {
        try {
            const dep = await appsV1Api.readNamespacedDeployment(replId, namespace);
            const desired = dep.body.spec?.replicas ?? 1;
            const available = dep.body.status?.availableReplicas ?? 0;
            if (available >= desired) {
                ready = true;
                return true;
            }
        } catch (err) {
            // ignore
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
}

// --- User Routes ---

// Sync User Profile (create if not exists)
app.post("/verify-user", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { email, name, picture } = req.body; // Expect frontend to send this

    if (!auth0Id || !email) {
        return res.status(400).send("Missing user data");
    }

    try {
        const user = await prisma.user.upsert({
            where: { auth0Id },
            update: {
                email,
                name,
                avatarUrl: picture
            },
            create: {
                auth0Id,
                email,
                name,
                username: buildDefaultUsername(email),
                avatarUrl: picture
            }
        });
        res.json(user);
    } catch (error) {
        console.error("User sync error:", error);
        res.status(500).send("Failed to sync user");
    }
});

// Get User Projects
app.get("/projects", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    try {
        const user = await prisma.user.findUnique({
            where: { auth0Id },
            include: {
                projects: {
                    include: {
                        collaborators: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        avatarUrl: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                sharedProjects: {
                    include: {
                        project: {
                            include: {
                                collaborators: {
                                    include: {
                                        user: {
                                            select: {
                                                id: true,
                                                name: true,
                                                email: true,
                                                avatarUrl: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!user) return res.status(404).send("User not found");

        const ownedProjects = user.projects.map((project) => ({ ...project, accessRole: "owner" }));
        const sharedProjects = user.sharedProjects.map((entry) => ({ ...entry.project, accessRole: "collaborator" }));
        const allProjects = [...ownedProjects, ...sharedProjects].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        res.json(allProjects);
    } catch (error) {
        res.status(500).send("Error fetching projects");
    }
});

// Create Project
app.post("/projects", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { replId, language, name } = req.body;

    if (!replId || !language) return res.status(400).send("Missing data");

    try {
        // 1. Find User
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) return res.status(404).send("User not found");

        // 2. Check if project exists (globally or locally? globally for now as replId must be unique for k8s)
        const existing = await prisma.project.findUnique({ where: { replId } });
        if (existing) return res.status(400).send("Project ID already exists");

        // 3. Call Init Service (internal) BEFORE creating DB project record.
        // If S3/init is down, creation should fail gracefully and not leave orphaned projects.
        try {
            await axios.post("http://localhost:3001/project", { replId, language });
        } catch (err) {
            console.error("Init service failed:", err);
            return res.status(502).send("Failed to initialize project files");
        }

        // 4. Create Project in DB only after init succeeds
        const project = await prisma.project.create({
            data: {
                name: name || replId,
                replId,
                language,
                visibility: "private",
                userId: user.id
            }
        });

        // 5. Start K8s Deployment
        await startDeployment(replId);
        const ready = await waitForPod(replId);

        if (ready) {
            res.status(200).send({ message: "Project created and ready", project });
        } else {
            res.status(503).send({ message: "Project created but environment is not ready", project, ready: false });
        }

    } catch (error) {
        console.error("Project creation error:", error);
        res.status(500).send("Failed to create project");
    }
});

app.post("/projects/:replId/fork", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { replId } = req.params;
    const { newReplId } = req.body as { newReplId?: string };

    try {
        const sourceProject = await getProjectWithRelations(replId);
        if (!sourceProject) return res.status(404).send("Source project not found");

        const forkingUser = await prisma.user.findUnique({ where: { auth0Id } });
        if (!forkingUser) return res.status(404).send("User not found");

        const canFork = canViewProject(sourceProject, forkingUser.id);
        if (!canFork) return res.status(403).send("Cannot fork this project");

        const targetReplId = (newReplId?.trim() || buildForkReplId(replId)).toLowerCase();
        const existing = await prisma.project.findUnique({ where: { replId: targetReplId } });
        if (existing) return res.status(400).send("Fork project ID already exists");

        try {
            await axios.post("http://localhost:3001/copy", {
                sourceReplId: replId,
                destinationReplId: targetReplId
            });
        } catch (err) {
            console.error("Fork init service failed:", err);
            return res.status(502).send("Failed to initialize fork project files");
        }

        const forked = await prisma.project.create({
            data: {
                name: `${sourceProject.name} (fork)`,
                replId: targetReplId,
                language: sourceProject.language,
                visibility: "private",
                forkedFromReplId: sourceProject.replId,
                userId: forkingUser.id
            }
        });

        return res.status(201).json(forked);
    } catch (error) {
        console.error("Fork project error:", error);
        return res.status(500).send("Failed to fork project");
    }
});

app.get("/projects/:replId/access", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { replId } = req.params;

    try {
        const currentUser = await prisma.user.findUnique({ where: { auth0Id } });
        const project = await getProjectWithRelations(replId);

        if (!project) {
            return res.status(404).send("Project not found");
        }

        const allowed = canEditProject(project, currentUser?.id ?? null);
        if (!allowed) {
            return res.status(403).send("Access denied");
        }

        return res.json(project);
    } catch (error) {
        console.error("Project access check error:", error);
        return res.status(500).send("Failed to verify access");
    }
});

app.patch("/projects/:replId/visibility", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { replId } = req.params;
    const { visibility } = req.body as { visibility?: "public" | "private" };

    if (!visibility || !["public", "private"].includes(visibility)) {
        return res.status(400).send("Visibility must be public or private");
    }

    try {
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) return res.status(404).send("User not found");

        const project = await prisma.project.findUnique({ where: { replId } });
        if (!project) return res.status(404).send("Project not found");
        if (project.userId !== user.id) return res.status(403).send("Only owner can update visibility");

        const updated = await prisma.project.update({
            where: { replId },
            data: { visibility }
        });

        return res.json(updated);
    } catch (error) {
        console.error("Visibility update error:", error);
        return res.status(500).send("Failed to update visibility");
    }
});

app.post("/projects/:replId/collaborators", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { replId } = req.params;
    const { email } = req.body as { email?: string };

    if (!email) {
        return res.status(400).send("Collaborator email is required");
    }

    try {
        const owner = await prisma.user.findUnique({ where: { auth0Id } });
        if (!owner) return res.status(404).send("User not found");

        const project = await prisma.project.findUnique({ where: { replId } });
        if (!project) return res.status(404).send("Project not found");
        if (project.userId !== owner.id) return res.status(403).send("Only owner can add collaborators");

        const targetUser = await prisma.user.findUnique({ where: { email } });
        if (!targetUser) return res.status(404).send("User not found with that email");
        if (targetUser.id === owner.id) return res.status(400).send("Cannot invite yourself");

        // Check if already a collaborator
        const existing = await prisma.projectCollaborator.findUnique({
            where: { projectId_userId: { projectId: project.id, userId: targetUser.id } }
        });
        if (existing) return res.status(400).send("User is already a collaborator");

        // Upsert collaboration request (update if rejected previously)
        const request = await prisma.collaborationRequest.upsert({
            where: { projectId_receiverId: { projectId: project.id, receiverId: targetUser.id } },
            update: { status: "pending", senderId: owner.id },
            create: {
                projectId: project.id,
                senderId: owner.id,
                receiverId: targetUser.id
            }
        });

        // Create notification for the target user
        await prisma.notification.create({
            data: {
                userId: targetUser.id,
                type: "collab_request",
                message: `${owner.name || owner.email} invited you to collaborate on "${project.name}"`,
                metadata: JSON.stringify({ requestId: request.id, projectId: project.id, projectName: project.name, senderName: owner.name || owner.email })
            }
        });

        return res.json({ message: "Collaboration request sent", requestId: request.id });
    } catch (error) {
        console.error("Add collaborator error:", error);
        return res.status(500).send("Failed to send collaboration request");
    }
});

app.delete("/projects/:replId/collaborators/:userId", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { replId, userId } = req.params;

    try {
        const owner = await prisma.user.findUnique({ where: { auth0Id } });
        if (!owner) return res.status(404).send("User not found");

        const project = await prisma.project.findUnique({ where: { replId } });
        if (!project) return res.status(404).send("Project not found");
        if (project.userId !== owner.id) return res.status(403).send("Only owner can remove collaborators");

        await prisma.projectCollaborator.deleteMany({
            where: {
                projectId: project.id,
                userId
            }
        });

        const updatedProject = await getProjectWithRelations(replId);
        return res.json(updatedProject);
    } catch (error) {
        console.error("Remove collaborator error:", error);
        return res.status(500).send("Failed to remove collaborator");
    }
});

app.delete("/projects/:replId", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { replId } = req.params;

    try {
        const owner = await prisma.user.findUnique({ where: { auth0Id } });
        if (!owner) return res.status(404).send("User not found");

        const project = await prisma.project.findUnique({ where: { replId } });
        if (!project) return res.status(404).send("Project not found");
        if (project.userId !== owner.id) return res.status(403).send("Only owner can delete project");

        await prisma.projectCollaborator.deleteMany({ where: { projectId: project.id } });
        await prisma.project.delete({ where: { replId } });

        try {
            await appsV1Api.deleteNamespacedDeployment(replId, "default");
        } catch {
            // best effort cleanup
        }
        try {
            await coreV1Api.deleteNamespacedService(replId, "default");
        } catch {
            // best effort cleanup
        }
        try {
            await networkingV1Api.deleteNamespacedIngress(replId, "default");
        } catch {
            // best effort cleanup
        }

        return res.json({ message: "Project deleted" });
    } catch (error) {
        console.error("Delete project error:", error);
        return res.status(500).send("Failed to delete project");
    }
});


app.post("/start", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { replId } = req.body;
    // Legacy endpoint: allows starting a pod without auth (if we want to support anonymous for now)
    // Or we can deprecate it. For now, let's keep it but reuse the helper.

    try {
        const currentUser = await prisma.user.findUnique({ where: { auth0Id } });
        const project = await getProjectWithRelations(replId);

        if (!project) {
            return res.status(404).send({ message: "Project not found" });
        }

        const allowed = canEditProject(project, currentUser?.id ?? null);
        if (!allowed) {
            return res.status(403).send({ message: "Access denied" });
        }

        await startDeployment(replId);
        const ready = await waitForPod(replId);
        if (ready) {
            res.status(200).send({ message: "Resources ready", ready: true });
        } else {
            res.status(503).send({ message: "Resources are not ready", ready: false });
        }
    } catch (error) {
        console.error("Failed to handle resources", error);
        res.status(500).send({ message: "Failed to handle resources" });
    }
});

app.post("/stop", async (req, res) => {
    const { replId } = req.body;
    const namespace = "default";

    if (!replId) {
        return res.status(400).send({ message: "replId is required" });
    }

    try {
        const deletionResults = {
            deployment: false,
            service: false,
            ingress: false
        };

        // Delete Deployment
        try {
            await appsV1Api.deleteNamespacedDeployment(replId, namespace);
            deletionResults.deployment = true;
            console.log(`Deployment ${replId} deleted`);
        } catch (error: any) {
            if (error.statusCode === 404) {
                console.log(`Deployment ${replId} not found, already deleted`);
                deletionResults.deployment = true;
            } else {
                console.error(`Error deleting deployment ${replId}:`, error);
            }
        }

        // Delete Service
        try {
            await coreV1Api.deleteNamespacedService(replId, namespace);
            deletionResults.service = true;
            console.log(`Service ${replId} deleted`);
        } catch (error: any) {
            if (error.statusCode === 404) {
                console.log(`Service ${replId} not found, already deleted`);
                deletionResults.service = true;
            } else {
                console.error(`Error deleting service ${replId}:`, error);
            }
        }

        // Delete Ingress
        try {
            await networkingV1Api.deleteNamespacedIngress(replId, namespace);
            deletionResults.ingress = true;
            console.log(`Ingress ${replId} deleted`);
        } catch (error: any) {
            if (error.statusCode === 404) {
                console.log(`Ingress ${replId} not found, already deleted`);
                deletionResults.ingress = true;
            } else {
                console.error(`Error deleting ingress ${replId}:`, error);
            }
        }

        res.status(200).send({
            message: "Cleanup completed",
            results: deletionResults
        });
    } catch (error) {
        console.error("Failed to cleanup resources", error);
        res.status(500).send({ message: "Failed to cleanup resources" });
    }
});

// --- User Search ---
app.get("/users/search", checkJwt, async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
        return res.status(400).send("Search query required");
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                name: true,
                username: true,
                bio: true,
                email: true,
                avatarUrl: true
            },
            take: 20
        });
        res.json(users);
    } catch (error) {
        console.error("User search error:", error);
        res.status(500).send("Search failed");
    }
});

// --- Get User by ID ---
app.get("/users/:id", checkJwt, async (req, res) => {
    const { id } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                username: true,
                bio: true,
                website: true,
                email: true,
                avatarUrl: true,
                createdAt: true
            }
        });
        if (!user) {
            return res.status(404).send("User not found");
        }
        res.json(user);
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).send("Failed to get user");
    }
});

// --- Get User's Projects ---
app.get("/users/:id/projects", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { id } = req.params;

    try {
        const requester = await prisma.user.findUnique({ where: { auth0Id } });
        const isSelf = requester?.id === id;
        const projects = await prisma.project.findMany({
            where: {
                userId: id,
                ...(isSelf ? {} : { visibility: "public" })
            },
            select: {
                id: true,
                name: true,
                replId: true,
                language: true,
                visibility: true,
                forkedFromReplId: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(projects);
    } catch (error) {
        console.error("Get user projects error:", error);
        res.status(500).send("Failed to get projects");
    }
});

app.get("/me/profile", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    try {
        const user = await prisma.user.findUnique({
            where: { auth0Id },
            select: {
                id: true,
                name: true,
                username: true,
                bio: true,
                website: true,
                email: true,
                avatarUrl: true,
                createdAt: true
            }
        });
        if (!user) return res.status(404).send("User not found");
        return res.json(user);
    } catch (error) {
        console.error("Get my profile error:", error);
        return res.status(500).send("Failed to get profile");
    }
});

app.patch("/me/profile", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { name, username, bio, website } = req.body as {
        name?: string;
        username?: string;
        bio?: string;
        website?: string;
    };

    try {
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) return res.status(404).send("User not found");

        const updated = await prisma.user.update({
            where: { auth0Id },
            data: {
                ...(typeof name === "string" ? { name: name.slice(0, 80) } : {}),
                ...(typeof username === "string" ? { username: username.slice(0, 32) } : {}),
                ...(typeof bio === "string" ? { bio: bio.slice(0, 300) } : {}),
                ...(typeof website === "string" ? { website: website.slice(0, 200) } : {})
            },
            select: {
                id: true,
                name: true,
                username: true,
                bio: true,
                website: true,
                email: true,
                avatarUrl: true,
                createdAt: true
            }
        });
        return res.json(updated);
    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).send("Failed to update profile");
    }
});

// --- Notification Routes ---

app.get("/me/notifications", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    try {
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) return res.status(404).send("User not found");

        const notifications = await prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 50
        });
        const unreadCount = await prisma.notification.count({
            where: { userId: user.id, read: false }
        });
        return res.json({ notifications, unreadCount });
    } catch (error) {
        console.error("Get notifications error:", error);
        return res.status(500).send("Failed to get notifications");
    }
});

app.patch("/me/notifications/:id/read", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) return res.status(404).send("User not found");

        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification || notification.userId !== user.id) return res.status(404).send("Notification not found");

        const updated = await prisma.notification.update({ where: { id }, data: { read: true } });
        return res.json(updated);
    } catch (error) {
        console.error("Mark notification read error:", error);
        return res.status(500).send("Failed to mark notification as read");
    }
});

app.patch("/me/notifications/read-all", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    try {
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) return res.status(404).send("User not found");

        await prisma.notification.updateMany({
            where: { userId: user.id, read: false },
            data: { read: true }
        });
        return res.json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("Mark all read error:", error);
        return res.status(500).send("Failed to mark all as read");
    }
});

// --- Collaboration Request Routes ---

app.get("/me/collaboration-requests", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    try {
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) return res.status(404).send("User not found");

        const requests = await prisma.collaborationRequest.findMany({
            where: { receiverId: user.id, status: "pending" },
            include: {
                project: { select: { id: true, name: true, replId: true } },
                sender: { select: { id: true, name: true, email: true, avatarUrl: true } }
            },
            orderBy: { createdAt: "desc" }
        });
        return res.json(requests);
    } catch (error) {
        console.error("Get collaboration requests error:", error);
        return res.status(500).send("Failed to get requests");
    }
});

app.post("/collaboration-requests/:id/accept", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) return res.status(404).send("User not found");

        const request = await prisma.collaborationRequest.findUnique({
            where: { id },
            include: { project: true, sender: true }
        });
        if (!request) return res.status(404).send("Request not found");
        if (request.receiverId !== user.id) return res.status(403).send("Not your request");
        if (request.status !== "pending") return res.status(400).send("Request already processed");

        // Accept: update request, create collaborator, notify sender
        await prisma.collaborationRequest.update({ where: { id }, data: { status: "accepted" } });

        await prisma.projectCollaborator.upsert({
            where: { projectId_userId: { projectId: request.projectId, userId: user.id } },
            update: {},
            create: { projectId: request.projectId, userId: user.id }
        });

        await prisma.notification.create({
            data: {
                userId: request.senderId,
                type: "collab_accepted",
                message: `${user.name || user.email} accepted your invitation to "${request.project.name}"`,
                metadata: JSON.stringify({ requestId: request.id, projectId: request.projectId, projectName: request.project.name })
            }
        });

        const updatedProject = await getProjectWithRelations(request.project.replId);
        return res.json({ message: "Request accepted", project: updatedProject });
    } catch (error) {
        console.error("Accept request error:", error);
        return res.status(500).send("Failed to accept request");
    }
});

app.post("/collaboration-requests/:id/reject", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) return res.status(404).send("User not found");

        const request = await prisma.collaborationRequest.findUnique({
            where: { id },
            include: { project: true }
        });
        if (!request) return res.status(404).send("Request not found");
        if (request.receiverId !== user.id) return res.status(403).send("Not your request");
        if (request.status !== "pending") return res.status(400).send("Request already processed");

        await prisma.collaborationRequest.update({ where: { id }, data: { status: "rejected" } });

        await prisma.notification.create({
            data: {
                userId: request.senderId,
                type: "collab_rejected",
                message: `${user.name || user.email} declined your invitation to "${request.project.name}"`,
                metadata: JSON.stringify({ requestId: request.id, projectId: request.projectId, projectName: request.project.name })
            }
        });

        return res.json({ message: "Request rejected" });
    } catch (error) {
        console.error("Reject request error:", error);
        return res.status(500).send("Failed to reject request");
    }
});

// --- Snapshot Routes ---

app.get("/projects/:replId/snapshots", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { replId } = req.params;
    try {
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        const project = await getProjectWithRelations(replId);
        if (!project) return res.status(404).send("Project not found");

        const allowed = canViewProject(project, user?.id ?? null);
        if (!allowed) return res.status(403).send("Access denied");

        const snapshots = await prisma.snapshot.findMany({
            where: { projectId: project.id },
            include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
            orderBy: { createdAt: "desc" }
        });
        return res.json(snapshots);
    } catch (error) {
        console.error("Get snapshots error:", error);
        return res.status(500).send("Failed to get snapshots");
    }
});

app.post("/projects/:replId/snapshots", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { replId } = req.params;
    const { label } = req.body as { label?: string };
    try {
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) return res.status(404).send("User not found");

        const project = await getProjectWithRelations(replId);
        if (!project) return res.status(404).send("Project not found");

        const allowed = canEditProject(project, user.id);
        if (!allowed) return res.status(403).send("Access denied");

        // Fetch current file versions from init service
        let filesData: any[] = [];
        try {
            const response = await axios.get(`http://localhost:3001/snapshot-data?replId=${replId}`);
            filesData = response.data;
        } catch (err) {
            console.error("Failed to get snapshot data from init service:", err);
            return res.status(502).send("Failed to capture snapshot data");
        }

        const snapshot = await prisma.snapshot.create({
            data: {
                projectId: project.id,
                userId: user.id,
                label: label?.slice(0, 100) || null,
                files: filesData
            },
            include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }
        });

        return res.status(201).json(snapshot);
    } catch (error) {
        console.error("Create snapshot error:", error);
        return res.status(500).send("Failed to create snapshot");
    }
});

app.post("/projects/:replId/snapshots/:snapshotId/restore", checkJwt, async (req, res) => {
    const auth0Id = getAuth0Id(req);
    const { replId, snapshotId } = req.params;
    try {
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) return res.status(404).send("User not found");

        const project = await prisma.project.findUnique({ where: { replId } });
        if (!project) return res.status(404).send("Project not found");
        if (project.userId !== user.id) return res.status(403).send("Only the owner can restore snapshots");

        const snapshot = await prisma.snapshot.findUnique({ where: { id: snapshotId } });
        if (!snapshot || snapshot.projectId !== project.id) return res.status(404).send("Snapshot not found");

        // Call init service to restore files to these versions
        try {
            await axios.post("http://localhost:3001/snapshot/restore", {
                replId,
                files: snapshot.files
            });
        } catch (err) {
            console.error("Failed to restore snapshot via init service:", err);
            return res.status(502).send("Failed to restore snapshot");
        }

        return res.json({ message: "Snapshot restored", snapshot });
    } catch (error) {
        console.error("Restore snapshot error:", error);
        return res.status(500).send("Failed to restore snapshot");
    }
});

const port = process.env.PORT || 3002;
app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});
