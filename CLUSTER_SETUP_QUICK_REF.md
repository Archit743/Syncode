# Syncode Cluster Quick Setup Reference

> Quick reference for recreating the AWS EKS cluster

---

## AWS Configuration

| Setting | Value |
|---------|-------|
| **Region** | `ap-south-1` (Mumbai) |
| **S3 Bucket** | `syncode-db-bucket` |
| **S3 Endpoint** | `https://s3.ap-south-1.amazonaws.com` |

---

## 1. Create EKS Cluster

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

⏱️ Takes ~15-20 minutes

---

## 2. Connect kubectl

```bash
aws eks update-kubeconfig --region ap-south-1 --name syncode-cluster
kubectl get nodes  # Verify connection
```

---

## 3. Install Ingress Controller

```bash
kubectl apply -f k8s/ingress-controller.yaml
kubectl get svc -n ingress-nginx  # Get EXTERNAL-IP for DNS
```

---

## 4. Create Kubernetes Secret

```bash
kubectl create secret generic runner-aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY" \
  --from-literal=AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY" \
  --from-literal=S3_BUCKET="syncode-db-bucket" \
  --from-literal=S3_ENDPOINT="https://s3.ap-south-1.amazonaws.com"
```

---

## 5. Update DNS

Point these domains to the ingress EXTERNAL-IP:

| Domain | Purpose |
|--------|---------|
| `*.iluvcats.me` | WebSocket connections (port 3001) |
| `*.catclub.tech` | User preview (port 3000) |

Create **wildcard CNAME** records pointing to the ELB hostname.

---

## 6. Verify Setup

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
# Delete all deployments first
kubectl delete deployments --all
kubectl delete services --all
kubectl delete ingress --all

# Delete cluster
eksctl delete cluster --name syncode-cluster --region ap-south-1
```

⚠️ S3 bucket is NOT deleted (keeps your code/templates)

---

## Files to Check Before Recreating

- [ ] `init-service/.env` - AWS credentials
- [ ] `orchestrator/service.yaml` - Bucket name is `syncode-db-bucket`
- [ ] `k8s/ingress-controller.yaml` - Ready to apply

---

## Cost Reference

| Resource | ~Monthly Cost |
|----------|---------------|
| EKS Control Plane | $73 |
| 2x t3.medium nodes | $60 |
| Load Balancer | $20 |
| **Total** | **~$150/month** |
