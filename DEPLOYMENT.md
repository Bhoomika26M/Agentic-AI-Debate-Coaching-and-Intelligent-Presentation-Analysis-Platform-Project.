# DebateAI — Deployment & Operations Guide

## 1. Docker Production Deployment

### Prerequisites
* Docker Engine 24+
* Docker Compose v2+

### Running Single-Command Stack
```bash
# Clone and enter directory
cd "AI DEBATE COACH"

# Start all containers in detached mode
docker compose up -d --build
```
Containers started:
* `debateai-backend`: Python 3.13 FastAPI on internal port 8000
* `debateai-frontend`: Nginx serving optimized React 18 production build on port 80

### Checking Container Health
```bash
docker compose ps
docker compose logs -f backend
```

---

## 2. Cloud Deployment Options

### Option A: AWS Elastic Container Service (ECS)
1. Push images to Amazon ECR:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account_id>.dkr.ecr.us-east-1.amazonaws.com
   docker tag debateai-backend:latest <account_id>.dkr.ecr.us-east-1.amazonaws.com/debateai-backend:latest
   docker push <account_id>.dkr.ecr.us-east-1.amazonaws.com/debateai-backend:latest
   ```
2. Provision an AWS ECS Fargate cluster with an Application Load Balancer (ALB).
3. Connect Amazon RDS PostgreSQL using the `DATABASE_URL` environment variable.

### Option B: Azure App Service / Container Apps
1. Create an Azure Container Registry (ACR).
2. Deploy backend container as an Azure Web App for Containers.
3. Configure Application Settings for `JWT_SECRET`, `DATABASE_URL`, and `OPENAI_API_KEY`.

---

## 3. Database Migration & PostgreSQL
By default, DebateAI initializes SQLite for zero-config local operation. To connect to enterprise PostgreSQL:
1. Provide connection string:
   ```env
   DATABASE_URL=postgresql://user:password@hostname:5432/debateai
   ```
2. The SQLAlchemy 2.0 ORM will automatically verify schema parity and index structures upon startup.
