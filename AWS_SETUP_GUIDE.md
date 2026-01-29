# AWS Setup Guide for Syncode

Complete step-by-step guide to set up a fresh AWS account with the Syncode project.

---

## Prerequisites

- Fresh AWS account created at [aws.amazon.com](https://aws.amazon.com)
- AWS CLI installed on your machine
- kubectl installed
- Docker installed
- Node.js 20+ installed

---

## Step 1: Install AWS CLI

### Windows (PowerShell as Administrator)
```powershell
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

### Verify installation
```bash
aws --version
```

---

## Step 2: Create IAM User with Programmatic Access

1. **Log into AWS Console** → Go to [IAM Console](https://console.aws.amazon.com/iam/)

2. **Create a new IAM User:**
   - Click **Users** → **Create user**
   - Username: `syncode-admin`
   - Click **Next**

3. **Set Permissions:**
   - Select **Attach policies directly**
   - Attach these policies:
     - `AmazonS3FullAccess` (for S3 bucket operations)
     - `AmazonEKSClusterPolicy` (for EKS cluster management)
     - `AmazonEKSWorkerNodePolicy` (for EKS worker nodes)
     - `AmazonEC2ContainerRegistryFullAccess` (optional, if using ECR)
   - Click **Next** → **Create user**

4. **Create Access Keys:**
   - Click on the newly created user
   - Go to **Security credentials** tab
   - Click **Create access key**
   - Select **Command Line Interface (CLI)**
   - Check the confirmation box → **Next** → **Create access key**
   - ⚠️ **IMPORTANT:** Download the CSV or copy both:
     - Access Key ID
     - Secret Access Key
   - **You won't be able to see the secret key again!**

---

## Step 3: Configure AWS CLI

Run in your terminal:

```bash
aws configure
```

Enter the following when prompted:
```
AWS Access Key ID [None]: <YOUR_ACCESS_KEY_ID>
AWS Secret Access Key [None]: <YOUR_SECRET_ACCESS_KEY>
Default region name [None]: ap-south-1
Default output format [None]: json
```

### Verify configuration:
```bash
aws sts get-caller-identity
```

You should see your account ID and user ARN.

---

## Step 4: Create S3 Bucket

### Create the bucket:
```bash
aws s3 mb s3://syncode-db --region ap-south-1
```

> **Note:** Bucket names must be globally unique. If `syncode-db` is taken, use something like `syncode-db-<your-unique-id>`

### Set bucket policy for private access:
```bash
aws s3api put-public-access-block --bucket syncode-db --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### Create the required folder structure:
```bash
# Create the code folder structure
aws s3api put-object --bucket syncode-db --key code/
```

### Upload base templates (if you have any):
```bash
# Example: Upload a base project template
aws s3 cp ./templates/node-base/ s3://syncode-db/base/node/ --recursive
```

---

## Step 5: Set Up EKS Cluster

### Option A: Using eksctl (Recommended)

#### Install eksctl:
**Windows (PowerShell):**
```powershell
choco install eksctl
# OR using scoop
scoop install eksctl
```

**Or download from:** https://github.com/weaveworks/eksctl/releases

#### Create EKS Cluster:
```bash
eksctl create cluster \
  --name syncode-cluster \
  --region ap-south-1 \
  --nodegroup-name syncode-nodes \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 4 \
  --managed
```

> ⏱️ This takes 15-20 minutes. Go grab a coffee!

### Option B: Using AWS Console

1. Go to [EKS Console](https://console.aws.amazon.com/eks/)
2. Click **Create cluster**
3. Configure:
   - Name: `syncode-cluster`
   - Kubernetes version: `1.28` (or latest)
   - Cluster service role: Create new or use existing
4. Configure networking (use defaults for VPC)
5. Create and wait for cluster to be active
6. Add Node Group with t3.medium instances

---

## Step 6: Configure kubectl for EKS

```bash
aws eks update-kubeconfig --region ap-south-1 --name syncode-cluster
```

### Verify connection:
```bash
kubectl get nodes
```

You should see your worker nodes listed.

---

## Step 7: Install NGINX Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/aws/deploy.yaml
```

### Verify ingress controller:
```bash
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

Note the **EXTERNAL-IP** of the ingress-nginx-controller service - you'll need this for DNS.

---

## Step 8: Create Kubernetes Secrets

### Create a new access key specifically for the runner (recommended):

1. Go to IAM → Users → Create user → `syncode-runner`
2. Attach only `AmazonS3FullAccess` policy
3. Create access key for CLI

### Create the Kubernetes secret:

```bash
kubectl create secret generic runner-aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID='<RUNNER_ACCESS_KEY>' \
  --from-literal=AWS_SECRET_ACCESS_KEY='<RUNNER_SECRET_KEY>' \
  --from-literal=S3_BUCKET='syncode-db' \
  --from-literal=S3_ENDPOINT='https://s3.ap-south-1.amazonaws.com'
```

### Verify secret was created:
```bash
kubectl get secrets
kubectl describe secret runner-aws-credentials
```

---

## Step 9: Build and Push Runner Image

### Option A: Push to DockerHub
```bash
cd runner
docker build -t <your-dockerhub-username>/runner:latest .
docker push <your-dockerhub-username>/runner:latest
```

### Option B: Use Amazon ECR (More Secure)

#### Create ECR Repository:
```bash
aws ecr create-repository --repository-name syncode/runner --region ap-south-1
```

#### Login to ECR:
```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com
```

#### Build and Push:
```bash
cd runner
docker build -t <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/syncode/runner:latest .
docker push <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/syncode/runner:latest
```

#### Update service.yaml to use ECR image:
Change the image line to:
```yaml
image: <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/syncode/runner:latest
```

---

## Step 10: Deploy Orchestrator

```bash
cd orchestrator
npm install
npm run build
```

### Set environment variables for orchestrator:
Create `orchestrator/.env`:
```env
PORT=3002
```

### Run orchestrator:
```bash
npm start
```

---

## Step 11: Configure DNS (Optional but Recommended)

### If using Route 53:

1. Go to [Route 53 Console](https://console.aws.amazon.com/route53/)
2. Create a hosted zone for your domain (e.g., `iluvcats.me`)
3. Create a wildcard A record:
   - Name: `*`
   - Type: `A`
   - Alias: Yes
   - Route traffic to: Network Load Balancer (the ingress EXTERNAL-IP)

### If using external DNS provider:

Create a wildcard CNAME record pointing to your ingress load balancer:
```
*.iluvcats.me → <INGRESS-EXTERNAL-IP>
```

---

## Step 12: Test the Setup

### 1. Create a test repl:
```bash
# Create test folder in S3
aws s3 cp ./test-project/ s3://syncode-db/code/test-repl-123/ --recursive
```

### 2. Start a pod via orchestrator:
```bash
curl -X POST http://localhost:3002/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "user1", "replId": "test-repl-123"}'
```

### 3. Check pod status:
```bash
kubectl get pods
kubectl get svc
kubectl get ingress
```

---

## Quick Reference: AWS Resources Created

| Resource | Name | Purpose |
|----------|------|---------|
| IAM User | syncode-admin | Admin access for CLI |
| IAM User | syncode-runner | Limited S3 access for pods |
| S3 Bucket | syncode-db | Store user code/projects |
| EKS Cluster | syncode-cluster | Kubernetes cluster |
| ECR Repo | syncode/runner | Container registry (optional) |

---

## Troubleshooting

### kubectl can't connect to cluster
```bash
aws eks update-kubeconfig --region ap-south-1 --name syncode-cluster
```

### Pods can't pull from S3
Check the secret exists and has correct values:
```bash
kubectl get secret runner-aws-credentials -o yaml
```

### Ingress not getting external IP
```bash
kubectl get svc -n ingress-nginx
# Wait a few minutes for AWS to provision the load balancer
```

### Permission denied errors
Ensure IAM policies are correctly attached:
```bash
aws iam list-attached-user-policies --user-name syncode-runner
```

---

## Cost Estimation (Monthly)

| Service | Estimated Cost |
|---------|----------------|
| EKS Cluster | $73 (control plane) |
| EC2 (2x t3.medium) | ~$60 |
| S3 (10GB) | ~$0.25 |
| Data Transfer | Variable |
| Load Balancer | ~$20 |
| **Total** | **~$150-200/month** |

> 💡 **Tip:** Use spot instances for worker nodes to reduce costs by 60-70%

---

## Security Best Practices

1. ✅ Never commit credentials to git
2. ✅ Use separate IAM users with minimal permissions
3. ✅ Rotate access keys every 90 days
4. ✅ Enable MFA on root and admin accounts
5. ✅ Use Kubernetes secrets (not env files in images)
6. ✅ Keep S3 buckets private
7. ✅ Regularly audit IAM permissions

---

## Next Steps

- [ ] Set up CI/CD pipeline for automatic deployments
- [ ] Configure CloudWatch for logging and monitoring
- [ ] Set up auto-scaling policies
- [ ] Implement backup strategy for S3
- [ ] Consider using AWS Secrets Manager for credential rotation
