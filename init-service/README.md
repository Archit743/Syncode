# Init Service

Copies language-specific templates from AWS S3 to initialize new projects.

## Tech Stack

Node.js · Express 4 · TypeScript · AWS SDK · dotenv · nodemon

## Project Structure

```
init-service/
├── src/
│   ├── index.ts     # Express server + POST /project endpoint
│   └── aws.ts       # S3 copy operations (copyS3Folder)
├── dist/            # Compiled JS (generated)
├── tsconfig.json
└── package.json
```

## API

### `POST /project`

Copies a language template from S3 to the project's code folder.

**Body:**
```json
{ "replId": "my-project-id", "language": "node-js" }
```

**Language Mapping:**

| Input | S3 Folder |
|-------|-----------|
| `node-js`, `nodejs`, `node` | `base/node` |
| `python`, `py` | `base/python` |

Any unrecognized language falls back to `node`.

**S3 Copy:** `s3://bucket/base/{lang}/` → `s3://bucket/code/{replId}/`

**Status Codes:**
- `200` — Project created
- `400` — Missing `replId`
- `500` — S3 copy failed

## Environment Variables

Create `.env`:

```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-south-1
S3_BUCKET=syncode-db-bucket
PORT=3001
```

## Development

```powershell
npm install
npm run dev      # Dev server on port 3001 with nodemon
npm run build    # Compile TypeScript
npm run start    # Run compiled JS
```

## S3 Bucket Structure

```
s3://syncode-db-bucket/
├── base/
│   ├── node/        # Node.js template files
│   └── python/      # Python template files
└── code/
    └── {replId}/    # Project copies (created by this service)
```

Base templates are stored in the `S3BaseCodes/` directory of this repo and uploaded to S3 during infrastructure setup.
