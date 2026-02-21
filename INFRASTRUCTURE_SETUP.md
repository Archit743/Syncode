# Infrastructure Setup — AWS + Kubernetes

Complete guide to set up the AWS infrastructure and EKS cluster for Syncode.

## Prerequisites

- AWS account with CLI configured ([Install AWS CLI](https://aws.amazon.com/cli/))
- `kubectl` installed ([Install Guide](https://kubernetes.io/docs/tasks/tools/))
- `eksctl` installed ([GitHub Releases](https://github.com/weaveworks/eksctl/releases))
- Docker installed ([Download](https://www.docker.com/))
- Docker Hub account

## AWS Configuration

| Setting | Value |
|---------|-------|
| **Region** | `ap-south-1` (Mumbai) |
| **S3 Bucket** | `syncode-db-bucket` |
| **S3 Endpoint** | `https://s3.ap-south-1.amazonaws.com` |

---

## Step 1: IAM User Setup

1. Go to [IAM Console](https://console.aws.amazon.com/iam/) → **Users** → **Create user**
2. Username: `syncode-admin`
3. Attach policies directly:
   - `AmazonS3FullAccess`
   - `AmazonEKSClusterPolicy`
   - `AmazonEKSWorkerNodePolicy`
   - `AmazonEC2ContainerRegistryFullAccess` (optional, for ECR)
4. Create **access key** (CLI type) → download CSV
   - ⚠️ **Save both keys — the secret key is shown only once**

### Configure AWS CLI

```bash
aws configure
# AWS Access Key ID: <YOUR_ACCESS_KEY_ID>
# AWS Secret Access Key: <YOUR_SECRET_ACCESS_KEY>
# Default region: ap-south-1
# Default output format: json

# Verify:
aws sts get-caller-identity
```

---

## Step 2: Create S3 Bucket

```bash
aws s3 mb s3://syncode-db-bucket --region ap-south-1
```

> Bucket names are globally unique. If taken, use `syncode-db-<your-id>`.

### Set private access and create folder structure

```bash
aws s3api put-public-access-block --bucket syncode-db-bucket \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

aws s3api put-object --bucket syncode-db-bucket --key code/
```

### Upload base templates

```bash
# Upload from the S3BaseCodes directory
aws s3 cp ./S3BaseCodes/node/ s3://syncode-db-bucket/base/node/ --recursive
aws s3 cp ./S3BaseCodes/python/ s3://syncode-db-bucket/base/python/ --recursive
```

---

## Step 3: Create EKS Cluster

```bash
eksctl create cluster \
  --name syncode-cluster \
  --region ap-south-1 \
  --nodegroup-name syncode-nodes \
  --node-type t3.small \
  --nodes 4 \
  --nodes-min 1 \
  --nodes-max 4 \
  --managed
```

⏱️ Takes ~15-20 minutes.

---

## Step 4: Connect kubectl

```bash
aws eks update-kubeconfig --region ap-south-1 --name syncode-cluster
kubectl get nodes  # Verify connection
```

---

## Step 5: Install Ingress Controller

```bash
kubectl apply -f k8s/ingress-controller.yaml
kubectl get svc -n ingress-nginx  # Note the EXTERNAL-IP for DNS
```

---

## Step 6: Create Kubernetes Secret

Create a runner-specific IAM user with only S3 access (recommended), or reuse credentials:

```bash
kubectl create secret generic runner-aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY" \
  --from-literal=AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY" \
  --from-literal=S3_BUCKET="syncode-db-bucket" \
  --from-literal=S3_ENDPOINT="https://s3.ap-south-1.amazonaws.com"

# Verify:
kubectl get secrets
kubectl describe secret runner-aws-credentials
```

---

## Step 7: Build and Push Runner Image

```bash
cd runner
docker build -t <your-dockerhub-username>/runner:latest .
docker login
docker push <your-dockerhub-username>/runner:latest
```

Then update `orchestrator/service.yaml` with your image reference:
```yaml
image: <your-dockerhub-username>/runner:latest
```

---

## Step 8: Configure DNS

Point these wildcard domains to the ingress EXTERNAL-IP:

| Domain | Purpose |
|--------|---------|
| `*.iluvcats.me` | **WebSocket connections** — terminal I/O, file operations. Runner pods communicate with the frontend over Socket.io on port 3001 through this domain. |
| `*.catclub.tech` | **User app preview** — serves the user's running application on port 3000. Displayed in the IDE's preview iframe. |

Create **wildcard CNAME** records in your DNS provider pointing to the ELB hostname from `kubectl get svc -n ingress-nginx`.

### Using Route 53

1. [Route 53 Console](https://console.aws.amazon.com/route53/) → Create hosted zone for each domain
2. Create wildcard A record: `*` → Alias to the Network Load Balancer

### Using External DNS

```
*.iluvcats.me CNAME → <INGRESS-EXTERNAL-IP>
*.catclub.tech CNAME → <INGRESS-EXTERNAL-IP>
```

---

## Step 9: Verify Setup

```bash
kubectl get pods -A
kubectl get svc -n ingress-nginx
kubectl get secrets
```

---

## Local Services to Run

```bash
# Terminal 1 - Frontend
cd frontend && npm run dev

# Terminal 2 - Orchestrator
cd orchestrator && npm run dev

# Terminal 3 - Init Service
cd init-service && npm run dev
```

---

## Delete Cluster (Cost Savings)

```bash
# Delete all pods/services first
kubectl delete deployments --all
kubectl delete services --all
kubectl delete ingress --all

# Delete cluster
eksctl delete cluster --name syncode-cluster --region ap-south-1
```

⚠️ S3 bucket is **NOT** deleted (preserves your code/templates).

---

## Pre-Flight Checklist

Before recreating the cluster, verify:

- [ ] `init-service/.env` — AWS credentials + bucket name
- [ ] `orchestrator/service.yaml` — correct bucket name (`syncode-db-bucket`) and image reference
- [ ] `k8s/ingress-controller.yaml` — ready to apply
- [ ] DNS records updated if ingress IP changed

---

## AWS Resources Summary

| Resource | Name | Purpose |
|----------|------|---------|
| IAM User | `syncode-admin` | Admin CLI access |
| IAM User | `syncode-runner` (optional) | Limited S3 access for pods |
| S3 Bucket | `syncode-db-bucket` | Code storage + templates |
| EKS Cluster | `syncode-cluster` | Kubernetes cluster |

## Cost Reference

| Resource | ~Monthly Cost |
|----------|---------------|
| EKS Control Plane | $73 |
| 4× t3.small nodes | ~$60 |
| Load Balancer | ~$20 |
| S3 (10GB) | ~$0.25 |
| **Total** | **~$150/month** |

> 💡 Use spot instances for worker nodes to reduce costs by 60-70%.

---

## Troubleshooting

### kubectl can't connect to cluster
```bash
aws eks update-kubeconfig --region ap-south-1 --name syncode-cluster
```

### Pods can't pull from S3
```bash
kubectl get secret runner-aws-credentials -o yaml
```

### Ingress not getting external IP
```bash
kubectl get svc -n ingress-nginx
# Wait a few minutes for AWS to provision the load balancer
```

### Permission denied errors
```bash
aws iam list-attached-user-policies --user-name syncode-runner
```

---

## Security Best Practices

1. Never commit credentials to git
2. Use separate IAM users with minimal permissions
3. Rotate access keys every 90 days
4. Enable MFA on root and admin accounts
5. Use Kubernetes secrets (not env files in images)
6. Keep S3 buckets private
