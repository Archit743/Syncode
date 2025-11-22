# Init Service

Microservice responsible for initializing new projects by copying language-specific templates from AWS S3 to designated storage locations.

## Overview

The Init Service acts as the first step in the project creation workflow. When a user creates a new project, this service:
1. Receives the project request with `replId` and `language`
2. Copies the appropriate template from AWS S3
3. Prepares the project structure for the runner service

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express 4.18
- **Language**: TypeScript 5.3
- **AWS SDK**: aws-sdk 2.1556
- **Environment**: dotenv 16.4
- **Development**: nodemon + ts-node

## Project Structure

```
init-service/
├── src/
│   ├── index.ts        # Express server and API endpoints
│   └── aws.ts          # AWS S3 configuration and utilities
├── dist/               # Compiled JavaScript (generated)
├── tsconfig.json       # TypeScript configuration
├── package.json        # Dependencies and scripts
└── .env               # Environment variables (not in git)
```

## API Endpoints

### POST `/project`

Creates a new project by copying template from S3.

**Request Body:**
```json
{
  "replId": "unique-project-id",
  "language": "nodejs"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project created successfully"
}
```

**Supported Languages:**
- `nodejs` - Node.js/JavaScript template
- `python` - Python template
- `react` - React application template
- Add more in S3 bucket organization

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to copy template from S3"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing parameters)
- `500` - Server error (S3 operation failed)

## Configuration

### Environment Variables

Create a `.env` file in the `init-service/` directory:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1

# S3 Configuration
S3_BUCKET=your-bucket-name

# Server Configuration
PORT=3001
```

### AWS S3 Bucket Structure

Organize templates in S3:
```
s3://your-bucket/
├── templates/
│   ├── nodejs/
│   │   ├── package.json
│   │   ├── index.js
│   │   └── ...
│   ├── python/
│   │   ├── requirements.txt
│   │   ├── main.py
│   │   └── ...
│   └── react/
│       ├── package.json
│       ├── src/
│       └── ...
└── code/
    └── {replId}/      # Project copies stored here
```

## Development

### Install Dependencies
```powershell
npm install
```

### Build TypeScript
```powershell
npm run build
```
Compiles TypeScript to JavaScript in `dist/` directory.

### Run Development Server
```powershell
npm run dev
```
Starts with nodemon for auto-reload on file changes.

### Run Production Build
```powershell
npm run start
```
Runs compiled JavaScript from `dist/`.

## AWS Setup

### IAM Policy Requirements

The AWS credentials must have the following S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*",
        "arn:aws:s3:::your-bucket-name"
      ]
    }
  ]
}
```

### Testing S3 Connection

Use AWS CLI to verify access:
```powershell
aws s3 ls s3://your-bucket-name/templates/
```

## How It Works

1. **Receive Request**: Express endpoint receives POST with `replId` and `language`
2. **Validate Input**: Check required fields are present
3. **S3 Copy Operation**: 
   - Source: `s3://bucket/templates/{language}/`
   - Destination: `s3://bucket/code/{replId}/`
4. **Return Response**: Send success/failure response to frontend

## Integration with Other Services

### Frontend Integration
Frontend calls this service when user creates a new project:
```typescript
const response = await axios.post('http://localhost:3001/project', {
  replId: 'user-project-123',
  language: 'nodejs'
});
```

### Orchestrator Integration
After Init Service creates the project, the Orchestrator service references the same S3 location (`code/{replId}/`) when creating the runner pod's initContainer.

### Runner Integration
The runner pod's initContainer copies files from `s3://bucket/code/{replId}/` to the pod's workspace volume.

## Error Handling

The service handles:
- **Missing Parameters**: Returns 400 with error message
- **S3 Connection Errors**: Returns 500 with error details
- **Invalid AWS Credentials**: Logged and returns 500
- **Bucket Not Found**: Returns 500 with bucket error

## Logging

Logs include:
- Server startup confirmation
- Incoming requests with replId and language
- S3 operation success/failure
- Error stack traces

Example log output:
```
Init Service running on port 3001
Received project request: replId=test-123, language=nodejs
Successfully copied template to S3
```

## Security Considerations

- **Never commit `.env`**: Already in `.gitignore`
- **Use IAM Roles**: In production, use EC2/ECS task roles instead of hardcoded keys
- **Validate Input**: Sanitize `replId` and `language` to prevent injection
- **Rate Limiting**: Consider adding rate limits to prevent abuse
- **CORS**: Configure CORS to allow only trusted origins

## Testing

### Manual Testing with curl
```powershell
curl -X POST http://localhost:3001/project `
  -H "Content-Type: application/json" `
  -d '{\"replId\":\"test-123\",\"language\":\"nodejs\"}'
```

### Manual Testing with Postman
1. Method: POST
2. URL: `http://localhost:3001/project`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "replId": "test-456",
  "language": "python"
}
```

### Verify in S3
```powershell
aws s3 ls s3://your-bucket-name/code/test-123/
```

## Troubleshooting

### Port Already in Use
```powershell
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### AWS Credentials Not Found
- Check `.env` file exists and has correct values
- Verify AWS credentials with: `aws sts get-caller-identity`

### S3 Access Denied
- Verify IAM policy includes required permissions
- Check bucket name is correct
- Ensure bucket region matches `AWS_REGION`

### TypeScript Build Errors
```powershell
# Clean and rebuild
Remove-Item -Recurse -Force dist
npm run build
```

## Performance Considerations

- **Async Operations**: S3 operations are async and non-blocking
- **Template Size**: Large templates will take longer to copy
- **Connection Pooling**: AWS SDK handles connection pooling automatically
- **Error Recovery**: Failed copies should be retried (not currently implemented)

## Deployment

### Docker (Optional)
Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Kubernetes Deployment
Deploy as a Kubernetes Deployment with:
- ConfigMap for non-sensitive config
- Secret for AWS credentials
- Service for internal cluster access

## Monitoring

Recommended monitoring:
- **Health Check Endpoint**: Add `GET /health` for liveness probes
- **Metrics**: Request count, S3 operation latency, error rate
- **Logging**: Integrate with CloudWatch or ELK stack

## Future Enhancements

- [ ] Add health check endpoint
- [ ] Implement retry logic for S3 operations
- [ ] Add request validation middleware
- [ ] Support custom templates
- [ ] Cache template metadata
- [ ] Add metrics/instrumentation
- [ ] Implement rate limiting
- [ ] Add unit tests
- [ ] Support multi-file uploads

## License

MIT
