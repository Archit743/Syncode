import { S3 } from "aws-sdk"
import fs from "fs";
import path from "path";

const s3 = new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.AWS_REGION || "ap-south-1",
    signatureVersion: 'v4'
})

export async function copyS3Folder(sourcePrefix: string, destinationPrefix: string, continuationToken?: string): Promise<void> {
    try {
        console.log(`Starting copy from ${sourcePrefix} to ${destinationPrefix}`);

        // List all objects in the source folder
        const listParams = {
            Bucket: process.env.S3_BUCKET ?? "",
            Prefix: sourcePrefix,
            ContinuationToken: continuationToken
        };

        console.log(`Listing objects with params:`, listParams);
        const listedObjects = await s3.listObjectsV2(listParams).promise();
        console.log(`Found ${listedObjects.Contents?.length || 0} objects`);

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            console.log(`No objects found in ${sourcePrefix}`);
            return;
        }

        // Copy each object to the new location
        // We're doing it parallely here, using promise.all()
        await Promise.all(listedObjects.Contents.map(async (object) => {
            if (!object.Key) return;

            // Skip folder markers (objects ending with / or size 0 that are "folders")
            if (object.Key.endsWith('/')) {
                console.log(`Skipping folder marker: ${object.Key}`);
                return;
            }

            let destinationKey = object.Key.replace(sourcePrefix, destinationPrefix);
            let copyParams = {
                Bucket: process.env.S3_BUCKET ?? "",
                CopySource: encodeURIComponent(`${process.env.S3_BUCKET}/${object.Key}`),
                Key: destinationKey
            };

            console.log(`Copying: ${object.Key} -> ${destinationKey}`);

            await s3.copyObject(copyParams).promise();
            console.log(`Copied ${object.Key} to ${destinationKey}`);
        }));

        // Check if the list was truncated and continue copying if necessary
        if (listedObjects.IsTruncated) {
            console.log(`List truncated, continuing with next page...`);
            await copyS3Folder(sourcePrefix, destinationPrefix, listedObjects.NextContinuationToken);
        }

        console.log(`Copy completed from ${sourcePrefix} to ${destinationPrefix}`);
    } catch (error) {
        console.error('Error copying folder:', error);
        throw error; // Re-throw so the caller knows it failed
    }
}

export const saveToS3 = async (key: string, filePath: string, content: string): Promise<void> => {
    const params = {
        Bucket: process.env.S3_BUCKET ?? "",
        Key: `${key}${filePath}`,
        Body: content
    }

    await s3.putObject(params).promise()
}

/**
 * List all file versions under a project prefix.
 * Returns an array of { path, versionId, lastModified, size } for each file's latest version.
 */
export async function listFileVersions(prefix: string): Promise<{ path: string; versionId: string; lastModified: Date; size: number }[]> {
    const bucket = process.env.S3_BUCKET ?? "";
    const result: { path: string; versionId: string; lastModified: Date; size: number }[] = [];
    let keyMarker: string | undefined = undefined;
    let versionIdMarker: string | undefined = undefined;

    do {
        const response: S3.ListObjectVersionsOutput = await s3.listObjectVersions({
            Bucket: bucket,
            Prefix: prefix,
            KeyMarker: keyMarker,
            VersionIdMarker: versionIdMarker,
            MaxKeys: 1000
        }).promise();

        if (response.Versions) {
            for (const version of response.Versions) {
                if (version.Key && version.VersionId && version.IsLatest) {
                    result.push({
                        path: version.Key.replace(prefix, ""),
                        versionId: version.VersionId,
                        lastModified: version.LastModified ?? new Date(),
                        size: version.Size ?? 0
                    });
                }
            }
        }

        keyMarker = response.NextKeyMarker;
        versionIdMarker = response.NextVersionIdMarker;
    } while (keyMarker);

    return result;
}

/**
 * Get snapshot data: current versionId for every file under `code/{replId}/`.
 */
export async function getSnapshotData(replId: string): Promise<{ path: string; versionId: string; size: number }[]> {
    const prefix = `code/${replId}/`;
    return listFileVersions(prefix);
}

/**
 * Restore a file to a specific version by copying that version back as the current object.
 */
export async function restoreFileVersion(key: string, versionId: string): Promise<void> {
    const bucket = process.env.S3_BUCKET ?? "";
    await s3.copyObject({
        Bucket: bucket,
        CopySource: encodeURIComponent(`${bucket}/${key}`) + `?versionId=${versionId}`,
        Key: key
    }).promise();
}