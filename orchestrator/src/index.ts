import express from "express";
import fs from "fs";
import yaml from "yaml";
import path from "path";
import cors from "cors";
import { KubeConfig, AppsV1Api, CoreV1Api, NetworkingV1Api } from "@kubernetes/client-node";

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

app.post("/start", async (req, res) => {
    const { userId, replId } = req.body;
    const namespace = "default";

    try {
        const kubeManifests = readAndParseKubeYaml(path.join(__dirname, "../service.yaml"), replId);
        
        for (const manifest of kubeManifests) {
            try {
                switch (manifest.kind) {
                    case "Deployment":
                        // Check if deployment already exists
                        try {
                            await appsV1Api.readNamespacedDeployment(replId, namespace);
                            console.log(`Deployment ${replId} already exists, skipping creation`);
                        } catch (readError: any) {
                            if (readError.statusCode === 404) {
                                // Deployment doesn't exist, create it
                                await appsV1Api.createNamespacedDeployment(namespace, manifest);
                                console.log(`Deployment ${replId} created`);
                            } else {
                                throw readError;
                            }
                        }
                        break;
                    case "Service":
                        // Check if service already exists
                        try {
                            await coreV1Api.readNamespacedService(replId, namespace);
                            console.log(`Service ${replId} already exists, skipping creation`);
                        } catch (readError: any) {
                            if (readError.statusCode === 404) {
                                await coreV1Api.createNamespacedService(namespace, manifest);
                                console.log(`Service ${replId} created`);
                            } else {
                                throw readError;
                            }
                        }
                        break;
                    case "Ingress":
                        // Check if ingress already exists
                        try {
                            await networkingV1Api.readNamespacedIngress(replId, namespace);
                            console.log(`Ingress ${replId} already exists, skipping creation`);
                        } catch (readError: any) {
                            if (readError.statusCode === 404) {
                                await networkingV1Api.createNamespacedIngress(namespace, manifest);
                                console.log(`Ingress ${replId} created`);
                            } else {
                                throw readError;
                            }
                        }
                        break;
                    default:
                        console.log(`Unsupported kind: ${manifest.kind}`);
                }
            } catch (error) {
                console.error(`Error handling ${manifest.kind}:`, error);
                // Continue with other manifests even if one fails
            }
        }
        
        // Wait for pod to be ready before responding
        console.log(`Waiting for deployment ${replId} to be ready...`);
        let ready = false;
        let attempts = 0;
        const maxAttempts = 60; // 60 attempts * 1 second = 60 seconds max wait
        
        while (!ready && attempts < maxAttempts) {
            try {
                const dep = await appsV1Api.readNamespacedDeployment(replId, namespace);
                const desired = dep.body.spec?.replicas ?? 1;
                const available = dep.body.status?.availableReplicas ?? 0;
                if (available >= desired) {
                    ready = true;
                    console.log(`Deployment ${replId} is ready`);
                } else {
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (err) {
                console.error(`Error checking deployment status:`, err);
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        if (ready) {
            res.status(200).send({ message: "Resources ready", ready: true });
        } else {
            // Pod didn't become ready in time, but resources were created
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

const port = process.env.PORT || 3002;
app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});
