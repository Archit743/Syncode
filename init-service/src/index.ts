import dotenv from "dotenv"
dotenv.config()
import express from "express";
import cors from "cors";
import { copyS3Folder, getSnapshotData, restoreFileVersion } from "./aws";

const app = express();
app.use(express.json());
app.use(cors())
console.log("ENV S3_BUCKET:", process.env.S3_BUCKET);
console.log("ENV AWS_REGION:", process.env.AWS_REGION);

// Map frontend language IDs to S3 folder names
const LANGUAGE_MAP: { [key: string]: string } = {
    "node-js": "node",
    "nodejs": "node",
    "node": "node",
    "python": "python",
    "py": "python"
};

app.post("/project", async (req, res) => {
    // Hit a database to ensure this slug isn't taken already
    const { replId, language } = req.body;

    console.log(`Received project creation request: replId=${replId}, language=${language}`);

    if (!replId) {
        res.status(400).send("Bad request");
        return;
    }

    // Map the language to S3 folder name
    const lang = LANGUAGE_MAP[language] || language || "node";
    console.log(`Creating project ${replId} with language ${lang} (mapped from ${language})`);

    try {
        await copyS3Folder(`base/${lang}`, `code/${replId}`);
        console.log(`Project ${replId} created successfully`);
        res.send("Project created");
    } catch (error) {
        console.error(`Failed to create project ${replId}:`, error);
        res.status(500).send("Failed to create project");
    }
});

app.post("/copy", async (req, res) => {
    const { sourceReplId, destinationReplId } = req.body;

    if (!sourceReplId || !destinationReplId) {
        res.status(400).send("sourceReplId and destinationReplId are required");
        return;
    }

    console.log(`Copying project files from ${sourceReplId} to ${destinationReplId}`);

    try {
        await copyS3Folder(`code/${sourceReplId}`, `code/${destinationReplId}`);
        console.log(`Project ${destinationReplId} forked from ${sourceReplId} successfully`);
        res.send("Project copied");
    } catch (error) {
        console.error(`Failed to copy project ${sourceReplId} to ${destinationReplId}:`, error);
        res.status(500).send("Failed to copy project files");
    }
});

// Snapshot data: returns current versionId for every file in a project
app.get("/snapshot-data", async (req, res) => {
    const replId = req.query.replId as string;
    if (!replId) {
        return res.status(400).send("replId query parameter is required");
    }

    try {
        const data = await getSnapshotData(replId);
        return res.json(data);
    } catch (error) {
        console.error(`Failed to get snapshot data for ${replId}:`, error);
        return res.status(500).send("Failed to get snapshot data");
    }
});

// Restore snapshot: restores files to their specific versionIds
app.post("/snapshot/restore", async (req, res) => {
    const { replId, files } = req.body as { replId?: string; files?: { path: string; versionId: string }[] };
    if (!replId || !files || !Array.isArray(files)) {
        return res.status(400).send("replId and files array required");
    }

    try {
        const prefix = `code/${replId}/`;
        await Promise.all(
            files.map(async (file) => {
                const fullKey = `${prefix}${file.path}`;
                await restoreFileVersion(fullKey, file.versionId);
                console.log(`Restored ${fullKey} to version ${file.versionId}`);
            })
        );
        return res.json({ message: "Snapshot restored", filesRestored: files.length });
    } catch (error) {
        console.error(`Failed to restore snapshot for ${replId}:`, error);
        return res.status(500).send("Failed to restore snapshot");
    }
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
    console.log(`listening on *:${port}`);
});
