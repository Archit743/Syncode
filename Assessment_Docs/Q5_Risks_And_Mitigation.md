# Q5: Identification of dependencies, risks, and mitigation strategies. (10 Marks)

## 1. Security Risks (CRITICAL)

### Risk: Arbitrary Code Execution / Container Escape
*   **Description:** Users have root access in their terminal. If they manage to escape the container, they could compromise the entire node or cluster.
*   **Mitigation:**
    *   **Non-Root User:** Ensure the Docker image runs as a non-root user (e.g., `uid: 1000`).
    *   **Network Policies:** Deny all egress traffic from Runner pods except to specific allow-listed domains (e.g., NPM registry, S3).
    *   **Runtime Isolation:** Use gVisor (Google's sandbox) instead of standard runc.

### Risk: Resource Exhaustion (Crypto Mining)
*   **Description:** Malicious users might run crypto miners, eating up 100% CPU.
*   **Mitigation:**
    *   **Resource Quotas:** Hard limits in K8s Deployment YAML (e.g., `cpu: "500m"`, `memory: "512Mi"`).
    *   **Monitoring:** Prometheus alerts for high-usage pods.

## 2. Technical / Implementation Risks

### Risk: WebSocket Connection Instability
*   **Description:** Corporate firewalls often block non-standard ports or disconnect long-lived WebSockets.
*   **Mitigation:**
    *   Run WebSockets over standard HTTPS (443) via the Ingress Controller paths.
    *   Implement robust heartbeat/reconnect logic in the Frontend client.

### Risk: Pod Startup Latency (Cold Starts)
*   **Description:** Waiting 10-20 seconds for a Pod to pull the image and start is a bad UX.
*   **Mitigation:**
    *   **Image Caching:** Ensure the standard runner image is pre-pulled on all nodes.
    *   **Pool of Warm Pods:** Maintain a few "generic" standby pods that can be claimed instantly (Advanced).

## 3. Operational Risks

### Risk: Orphaned Resources
*   **Description:** If the Orchestrator crashes or the user closes the tab without "Stopping", the Pod runs forever, costing money.
*   **Mitigation:**
    *   **Heartbeat Monitor:** Frontend sends "I am here" every minute.
    *   **Reaper CronJob:** A K8s CronJob that deletes any pod that hasn't received a heartbeat in 10 minutes.

## 4. Dependencies
*   **AWS S3 Availability:** If S3 is down, new projects cannot be initialized. (Low prob, high impact).
*   **Docker Hub:** If rate-limited, pod startups fail. (Mitigation: Use private ECR/Registry).
