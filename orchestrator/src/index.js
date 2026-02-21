"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const yaml_1 = __importDefault(require("yaml"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const client_node_1 = require("@kubernetes/client-node");
const client_1 = require("@prisma/client");
const express_oauth2_jwt_bearer_1 = require("express-oauth2-jwt-bearer");
const axios_1 = __importDefault(require("axios"));
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
const kubeconfig = new client_node_1.KubeConfig();
kubeconfig.loadFromDefault();
const coreV1Api = kubeconfig.makeApiClient(client_node_1.CoreV1Api);
const appsV1Api = kubeconfig.makeApiClient(client_node_1.AppsV1Api);
const networkingV1Api = kubeconfig.makeApiClient(client_node_1.NetworkingV1Api);
// Updated utility function to handle multi-document YAML files
const readAndParseKubeYaml = (filePath, replId) => {
    const fileContent = fs_1.default.readFileSync(filePath, 'utf8');
    const docs = yaml_1.default.parseAllDocuments(fileContent).map((doc) => {
        let docString = doc.toString();
        const regex = new RegExp(`service_name`, 'g');
        docString = docString.replace(regex, replId);
        console.log(docString);
        return yaml_1.default.parse(docString);
    });
    return docs;
};
// --- Auth0 Middleware ---
const checkJwt = (0, express_oauth2_jwt_bearer_1.auth)({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: 'RS256'
});
const getAuth0Id = (req) => { var _a; return (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload.sub; };
const buildDefaultUsername = (email) => {
    const localPart = email.split("@")[0] || "user";
    return localPart.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "user";
};
const buildForkReplId = (sourceReplId) => {
    const suffix = Math.random().toString(36).slice(2, 7);
    return `${sourceReplId}-fork-${suffix}`;
};
const canAccessProject = (project, currentUserId) => {
    if (!project)
        return false;
    if (project.visibility === "public")
        return true;
    if (!currentUserId)
        return false;
    if (project.userId === currentUserId)
        return true;
    return project.collaborators.some((entry) => entry.userId === currentUserId);
};
const getProjectWithRelations = (replId) => __awaiter(void 0, void 0, void 0, function* () {
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
});
// --- Helper: Start K8s Deployment ---
const startDeployment = (replId) => __awaiter(void 0, void 0, void 0, function* () {
    const namespace = "default";
    const kubeManifests = readAndParseKubeYaml(path_1.default.join(__dirname, "../service.yaml"), replId);
    for (const manifest of kubeManifests) {
        try {
            switch (manifest.kind) {
                case "Deployment":
                    try {
                        yield appsV1Api.readNamespacedDeployment(replId, namespace);
                        console.log(`Deployment ${replId} already exists`);
                    }
                    catch (readError) {
                        if (readError.statusCode === 404) {
                            yield appsV1Api.createNamespacedDeployment(namespace, manifest);
                            console.log(`Deployment ${replId} created`);
                        }
                        else
                            throw readError;
                    }
                    break;
                case "Service":
                    try {
                        yield coreV1Api.readNamespacedService(replId, namespace);
                        console.log(`Service ${replId} already exists`);
                    }
                    catch (readError) {
                        if (readError.statusCode === 404) {
                            yield coreV1Api.createNamespacedService(namespace, manifest);
                            console.log(`Service ${replId} created`);
                        }
                        else
                            throw readError;
                    }
                    break;
                case "Ingress":
                    try {
                        yield networkingV1Api.readNamespacedIngress(replId, namespace);
                        console.log(`Ingress ${replId} already exists`);
                    }
                    catch (readError) {
                        if (readError.statusCode === 404) {
                            yield networkingV1Api.createNamespacedIngress(namespace, manifest);
                            console.log(`Ingress ${replId} created`);
                        }
                        else
                            throw readError;
                    }
                    break;
            }
        }
        catch (error) {
            console.error(`Error handling ${manifest.kind}:`, error);
        }
    }
});
// --- Helper: Wait for Pod ---
const waitForPod = (replId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const namespace = "default";
    let ready = false;
    let attempts = 0;
    const maxAttempts = 60;
    while (!ready && attempts < maxAttempts) {
        try {
            const dep = yield appsV1Api.readNamespacedDeployment(replId, namespace);
            const desired = (_b = (_a = dep.body.spec) === null || _a === void 0 ? void 0 : _a.replicas) !== null && _b !== void 0 ? _b : 1;
            const available = (_d = (_c = dep.body.status) === null || _c === void 0 ? void 0 : _c.availableReplicas) !== null && _d !== void 0 ? _d : 0;
            if (available >= desired) {
                ready = true;
                return true;
            }
        }
        catch (err) {
            // ignore
        }
        attempts++;
        yield new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
});
// --- User Routes ---
// Sync User Profile (create if not exists)
app.post("/verify-user", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const auth0Id = getAuth0Id(req);
    const { email, name, picture } = req.body; // Expect frontend to send this
    if (!auth0Id || !email) {
        return res.status(400).send("Missing user data");
    }
    try {
        const user = yield prisma.user.upsert({
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
    }
    catch (error) {
        console.error("User sync error:", error);
        res.status(500).send("Failed to sync user");
    }
}));
// Get User Projects
app.get("/projects", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const auth0Id = getAuth0Id(req);
    try {
        const user = yield prisma.user.findUnique({
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
        if (!user)
            return res.status(404).send("User not found");
        const ownedProjects = user.projects.map((project) => (Object.assign(Object.assign({}, project), { accessRole: "owner" })));
        const sharedProjects = user.sharedProjects.map((entry) => (Object.assign(Object.assign({}, entry.project), { accessRole: "collaborator" })));
        const allProjects = [...ownedProjects, ...sharedProjects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json(allProjects);
    }
    catch (error) {
        res.status(500).send("Error fetching projects");
    }
}));
// Create Project
app.post("/projects", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const auth0Id = getAuth0Id(req);
    const { replId, language, name } = req.body;
    if (!replId || !language)
        return res.status(400).send("Missing data");
    try {
        // 1. Find User
        const user = yield prisma.user.findUnique({ where: { auth0Id } });
        if (!user)
            return res.status(404).send("User not found");
        // 2. Check if project exists (globally or locally? globally for now as replId must be unique for k8s)
        const existing = yield prisma.project.findUnique({ where: { replId } });
        if (existing)
            return res.status(400).send("Project ID already exists");
        // 3. Call Init Service (internal) BEFORE creating DB project record.
        // If S3/init is down, creation should fail gracefully and not leave orphaned projects.
        try {
            yield axios_1.default.post("http://localhost:3001/project", { replId, language });
        }
        catch (err) {
            console.error("Init service failed:", err);
            return res.status(502).send("Failed to initialize project files");
        }
        // 4. Create Project in DB only after init succeeds
        const project = yield prisma.project.create({
            data: {
                name: name || replId,
                replId,
                language,
                visibility: "private",
                userId: user.id
            }
        });
        // 5. Start K8s Deployment
        yield startDeployment(replId);
        const ready = yield waitForPod(replId);
        if (ready) {
            res.status(200).send({ message: "Project created and ready", project });
        }
        else {
            res.status(503).send({ message: "Project created but environment is not ready", project, ready: false });
        }
    }
    catch (error) {
        console.error("Project creation error:", error);
        res.status(500).send("Failed to create project");
    }
}));
app.post("/projects/:replId/fork", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const auth0Id = getAuth0Id(req);
    const { replId } = req.params;
    const { newReplId } = req.body;
    try {
        const sourceProject = yield getProjectWithRelations(replId);
        if (!sourceProject)
            return res.status(404).send("Source project not found");
        const forkingUser = yield prisma.user.findUnique({ where: { auth0Id } });
        if (!forkingUser)
            return res.status(404).send("User not found");
        const canFork = canAccessProject(sourceProject, forkingUser.id);
        if (!canFork)
            return res.status(403).send("Cannot fork this project");
        const targetReplId = ((newReplId === null || newReplId === void 0 ? void 0 : newReplId.trim()) || buildForkReplId(replId)).toLowerCase();
        const existing = yield prisma.project.findUnique({ where: { replId: targetReplId } });
        if (existing)
            return res.status(400).send("Fork project ID already exists");
        try {
            yield axios_1.default.post("http://localhost:3001/project", { replId: targetReplId, language: sourceProject.language });
        }
        catch (err) {
            console.error("Fork init service failed:", err);
            return res.status(502).send("Failed to initialize fork project files");
        }
        const forked = yield prisma.project.create({
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
    }
    catch (error) {
        console.error("Fork project error:", error);
        return res.status(500).send("Failed to fork project");
    }
}));
app.get("/projects/:replId/access", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const auth0Id = getAuth0Id(req);
    const { replId } = req.params;
    try {
        const currentUser = yield prisma.user.findUnique({ where: { auth0Id } });
        const project = yield getProjectWithRelations(replId);
        if (!project) {
            return res.status(404).send("Project not found");
        }
        const allowed = canAccessProject(project, (_a = currentUser === null || currentUser === void 0 ? void 0 : currentUser.id) !== null && _a !== void 0 ? _a : null);
        if (!allowed) {
            return res.status(403).send("Access denied");
        }
        return res.json(project);
    }
    catch (error) {
        console.error("Project access check error:", error);
        return res.status(500).send("Failed to verify access");
    }
}));
app.patch("/projects/:replId/visibility", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const auth0Id = getAuth0Id(req);
    const { replId } = req.params;
    const { visibility } = req.body;
    if (!visibility || !["public", "private"].includes(visibility)) {
        return res.status(400).send("Visibility must be public or private");
    }
    try {
        const user = yield prisma.user.findUnique({ where: { auth0Id } });
        if (!user)
            return res.status(404).send("User not found");
        const project = yield prisma.project.findUnique({ where: { replId } });
        if (!project)
            return res.status(404).send("Project not found");
        if (project.userId !== user.id)
            return res.status(403).send("Only owner can update visibility");
        const updated = yield prisma.project.update({
            where: { replId },
            data: { visibility }
        });
        return res.json(updated);
    }
    catch (error) {
        console.error("Visibility update error:", error);
        return res.status(500).send("Failed to update visibility");
    }
}));
app.post("/projects/:replId/collaborators", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const auth0Id = getAuth0Id(req);
    const { replId } = req.params;
    const { email } = req.body;
    if (!email) {
        return res.status(400).send("Collaborator email is required");
    }
    try {
        const owner = yield prisma.user.findUnique({ where: { auth0Id } });
        if (!owner)
            return res.status(404).send("User not found");
        const project = yield prisma.project.findUnique({ where: { replId } });
        if (!project)
            return res.status(404).send("Project not found");
        if (project.userId !== owner.id)
            return res.status(403).send("Only owner can add collaborators");
        const collaborator = yield prisma.user.findUnique({ where: { email } });
        if (!collaborator)
            return res.status(404).send("Collaborator user not found");
        if (collaborator.id === owner.id)
            return res.status(400).send("Owner is already a collaborator");
        yield prisma.projectCollaborator.upsert({
            where: {
                projectId_userId: {
                    projectId: project.id,
                    userId: collaborator.id
                }
            },
            update: {},
            create: {
                projectId: project.id,
                userId: collaborator.id
            }
        });
        const updatedProject = yield getProjectWithRelations(replId);
        return res.json(updatedProject);
    }
    catch (error) {
        console.error("Add collaborator error:", error);
        return res.status(500).send("Failed to add collaborator");
    }
}));
app.delete("/projects/:replId/collaborators/:userId", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const auth0Id = getAuth0Id(req);
    const { replId, userId } = req.params;
    try {
        const owner = yield prisma.user.findUnique({ where: { auth0Id } });
        if (!owner)
            return res.status(404).send("User not found");
        const project = yield prisma.project.findUnique({ where: { replId } });
        if (!project)
            return res.status(404).send("Project not found");
        if (project.userId !== owner.id)
            return res.status(403).send("Only owner can remove collaborators");
        yield prisma.projectCollaborator.deleteMany({
            where: {
                projectId: project.id,
                userId
            }
        });
        const updatedProject = yield getProjectWithRelations(replId);
        return res.json(updatedProject);
    }
    catch (error) {
        console.error("Remove collaborator error:", error);
        return res.status(500).send("Failed to remove collaborator");
    }
}));
app.delete("/projects/:replId", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const auth0Id = getAuth0Id(req);
    const { replId } = req.params;
    try {
        const owner = yield prisma.user.findUnique({ where: { auth0Id } });
        if (!owner)
            return res.status(404).send("User not found");
        const project = yield prisma.project.findUnique({ where: { replId } });
        if (!project)
            return res.status(404).send("Project not found");
        if (project.userId !== owner.id)
            return res.status(403).send("Only owner can delete project");
        yield prisma.projectCollaborator.deleteMany({ where: { projectId: project.id } });
        yield prisma.project.delete({ where: { replId } });
        try {
            yield appsV1Api.deleteNamespacedDeployment(replId, "default");
        }
        catch (_a) {
            // best effort cleanup
        }
        try {
            yield coreV1Api.deleteNamespacedService(replId, "default");
        }
        catch (_b) {
            // best effort cleanup
        }
        try {
            yield networkingV1Api.deleteNamespacedIngress(replId, "default");
        }
        catch (_c) {
            // best effort cleanup
        }
        return res.json({ message: "Project deleted" });
    }
    catch (error) {
        console.error("Delete project error:", error);
        return res.status(500).send("Failed to delete project");
    }
}));
app.post("/start", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const auth0Id = getAuth0Id(req);
    const { replId } = req.body;
    // Legacy endpoint: allows starting a pod without auth (if we want to support anonymous for now)
    // Or we can deprecate it. For now, let's keep it but reuse the helper.
    try {
        const currentUser = yield prisma.user.findUnique({ where: { auth0Id } });
        const project = yield getProjectWithRelations(replId);
        if (!project) {
            return res.status(404).send({ message: "Project not found" });
        }
        const allowed = canAccessProject(project, (_a = currentUser === null || currentUser === void 0 ? void 0 : currentUser.id) !== null && _a !== void 0 ? _a : null);
        if (!allowed) {
            return res.status(403).send({ message: "Access denied" });
        }
        yield startDeployment(replId);
        const ready = yield waitForPod(replId);
        if (ready) {
            res.status(200).send({ message: "Resources ready", ready: true });
        }
        else {
            res.status(503).send({ message: "Resources are not ready", ready: false });
        }
    }
    catch (error) {
        console.error("Failed to handle resources", error);
        res.status(500).send({ message: "Failed to handle resources" });
    }
}));
app.post("/stop", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            yield appsV1Api.deleteNamespacedDeployment(replId, namespace);
            deletionResults.deployment = true;
            console.log(`Deployment ${replId} deleted`);
        }
        catch (error) {
            if (error.statusCode === 404) {
                console.log(`Deployment ${replId} not found, already deleted`);
                deletionResults.deployment = true;
            }
            else {
                console.error(`Error deleting deployment ${replId}:`, error);
            }
        }
        // Delete Service
        try {
            yield coreV1Api.deleteNamespacedService(replId, namespace);
            deletionResults.service = true;
            console.log(`Service ${replId} deleted`);
        }
        catch (error) {
            if (error.statusCode === 404) {
                console.log(`Service ${replId} not found, already deleted`);
                deletionResults.service = true;
            }
            else {
                console.error(`Error deleting service ${replId}:`, error);
            }
        }
        // Delete Ingress
        try {
            yield networkingV1Api.deleteNamespacedIngress(replId, namespace);
            deletionResults.ingress = true;
            console.log(`Ingress ${replId} deleted`);
        }
        catch (error) {
            if (error.statusCode === 404) {
                console.log(`Ingress ${replId} not found, already deleted`);
                deletionResults.ingress = true;
            }
            else {
                console.error(`Error deleting ingress ${replId}:`, error);
            }
        }
        res.status(200).send({
            message: "Cleanup completed",
            results: deletionResults
        });
    }
    catch (error) {
        console.error("Failed to cleanup resources", error);
        res.status(500).send({ message: "Failed to cleanup resources" });
    }
}));
// --- User Search ---
app.get("/users/search", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = req.query.q;
    if (!query) {
        return res.status(400).send("Search query required");
    }
    try {
        const users = yield prisma.user.findMany({
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
    }
    catch (error) {
        console.error("User search error:", error);
        res.status(500).send("Search failed");
    }
}));
// --- Get User by ID ---
app.get("/users/:id", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const user = yield prisma.user.findUnique({
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
    }
    catch (error) {
        console.error("Get user error:", error);
        res.status(500).send("Failed to get user");
    }
}));
// --- Get User's Projects ---
app.get("/users/:id/projects", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const auth0Id = getAuth0Id(req);
    const { id } = req.params;
    try {
        const requester = yield prisma.user.findUnique({ where: { auth0Id } });
        const isSelf = (requester === null || requester === void 0 ? void 0 : requester.id) === id;
        const projects = yield prisma.project.findMany({
            where: Object.assign({ userId: id }, (isSelf ? {} : { visibility: "public" })),
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
    }
    catch (error) {
        console.error("Get user projects error:", error);
        res.status(500).send("Failed to get projects");
    }
}));
app.get("/me/profile", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const auth0Id = getAuth0Id(req);
    try {
        const user = yield prisma.user.findUnique({
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
        if (!user)
            return res.status(404).send("User not found");
        return res.json(user);
    }
    catch (error) {
        console.error("Get my profile error:", error);
        return res.status(500).send("Failed to get profile");
    }
}));
app.patch("/me/profile", checkJwt, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const auth0Id = getAuth0Id(req);
    const { name, username, bio, website } = req.body;
    try {
        const user = yield prisma.user.findUnique({ where: { auth0Id } });
        if (!user)
            return res.status(404).send("User not found");
        const updated = yield prisma.user.update({
            where: { auth0Id },
            data: Object.assign(Object.assign(Object.assign(Object.assign({}, (typeof name === "string" ? { name: name.slice(0, 80) } : {})), (typeof username === "string" ? { username: username.slice(0, 32) } : {})), (typeof bio === "string" ? { bio: bio.slice(0, 300) } : {})), (typeof website === "string" ? { website: website.slice(0, 200) } : {})),
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
    }
    catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).send("Failed to update profile");
    }
}));
const port = process.env.PORT || 3002;
app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});
