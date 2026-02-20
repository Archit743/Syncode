import express from "express";
import fs from "fs";
import yaml from "yaml";
import path from "path";
import cors from "cors";
import { KubeConfig, AppsV1Api, CoreV1Api, NetworkingV1Api } from "@kubernetes/client-node";
import { PrismaClient } from "@prisma/client";
import { auth } from "express-oauth2-jwt-bearer";
import axios from "axios";

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
    const auth0Id = req.auth?.payload.sub;
    const { email, name, picture } = req.body; // Expect frontend to send this

    if (!auth0Id || !email) {
        return res.status(400).send("Missing user data");
    }

    try {
        let user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) {
            user = await prisma.user.create({
                data: { auth0Id, email, name, avatarUrl: picture }
            });
        }
        res.json(user);
    } catch (error) {
        console.error("User sync error:", error);
        res.status(500).send("Failed to sync user");
    }
});

// Get User Projects
app.get("/projects", checkJwt, async (req, res) => {
    const auth0Id = req.auth?.payload.sub;
    try {
        const user = await prisma.user.findUnique({ 
            where: { auth0Id },
            include: { projects: true }
        });
        if (!user) return res.status(404).send("User not found");
        res.json(user.projects);
    } catch (error) {
        res.status(500).send("Error fetching projects");
    }
});

// Create Project
app.post("/projects", checkJwt, async (req, res) => {
    const auth0Id = req.auth?.payload.sub;
    const { replId, language, name } = req.body;

    if (!replId || !language) return res.status(400).send("Missing data");

    try {
        // 1. Find User
        const user = await prisma.user.findUnique({ where: { auth0Id } });
        if (!user) return res.status(404).send("User not found");

        // 2. Check if project exists (globally or locally? globally for now as replId must be unique for k8s)
        const existing = await prisma.project.findUnique({ where: { replId } });
        if (existing) return res.status(400).send("Project ID already exists");

        // 3. Create Project in DB
        const project = await prisma.project.create({
            data: {
                name: name || replId,
                replId,
                language,
                userId: user.id
            }
        });

        // 4. Call Init Service (internal)
        try {
            await axios.post("http://localhost:3001/project", { replId, language });
        } catch (err) {
            console.error("Init service failed:", err);
            // rollback db? or just continue?
             return res.status(500).send("Failed to initialize project files");
        }

        // 5. Start K8s Deployment
        await startDeployment(replId);
        const ready = await waitForPod(replId);

        if (ready) {
            res.status(200).send({ message: "Project created and ready", project });
        } else {
            res.status(200).send({ message: "Project created but pod pending", project });
        }

    } catch (error) {
        console.error("Project creation error:", error);
        res.status(500).send("Failed to create project");
    }
});


app.post("/start", async (req, res) => {
    const { replId } = req.body;
    // Legacy endpoint: allows starting a pod without auth (if we want to support anonymous for now)
    // Or we can deprecate it. For now, let's keep it but reuse the helper.
    
    try {
        await startDeployment(replId);
        const ready = await waitForPod(replId);
         if (ready) {
            res.status(200).send({ message: "Resources ready", ready: true });
        } else {
            res.status(200).send({ message: "Resources created but pod may still be starting", ready: false });
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
    const { id } = req.params;

    try {
        const projects = await prisma.project.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(projects);
    } catch (error) {
        console.error("Get user projects error:", error);
        res.status(500).send("Failed to get projects");
    }
});

const port = process.env.PORT || 3002;
app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});
