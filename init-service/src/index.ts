import dotenv from "dotenv"
dotenv.config()
import express from "express";
import cors from "cors";
import { copyS3Folder } from "./aws";

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

const port = process.env.PORT || 3001;

app.listen(port, () => {
    console.log(`listening on *:${port}`);
});
