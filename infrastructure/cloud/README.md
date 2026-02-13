# Cloud 部署参考（Kubernetes）

该目录提供 `cloud_version` 的最小可行云端部署参考文件，目标是让你用“托管数据库 + 对象存储 + 集群计算”快速跑起中心站点。

## 前置

- 镜像仓库可用（GHCR/ECR）
- 你已经构建并推送：
  - `ghcr.io/your-org/vidgit-backend:cloud_version`
  - `ghcr.io/your-org/vidgit-frontend:cloud_version`
- 你有可用的：
  - 托管 Postgres（推荐）
  - S3/R2（推荐）
  - Redis（推荐）
  - RabbitMQ（推荐，或把 Celery broker 改成 Redis）

## 需要修改的地方

- [k8s/secret.yaml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/infrastructure/cloud/k8s/secret.yaml)
  - `SECRET_KEY`
  - `DATABASE_URL`
  - `S3_ACCESS_KEY` / `S3_SECRET_KEY`
- [k8s/configmap.yaml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/infrastructure/cloud/k8s/configmap.yaml)
  - `BACKEND_CORS_ORIGINS`
  - `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND`
  - `S3_ENDPOINT_URL` / `S3_BUCKET_NAME` / `S3_REGION_NAME`
- `image:` 字段替换成你的实际镜像地址

## 应用顺序（建议）

1. 创建命名空间
2. 配置 ConfigMap/Secret
3. 执行 DB 迁移 Job
4. 部署 backend/worker
5. 部署 frontend（如果不用 Vercel）
6. 配置 Ingress 与 TLS

对应的文件：
- [k8s/namespace.yaml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/infrastructure/cloud/k8s/namespace.yaml)
- [k8s/configmap.yaml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/infrastructure/cloud/k8s/configmap.yaml)
- [k8s/secret.yaml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/infrastructure/cloud/k8s/secret.yaml)
- [k8s/migrate-job.yaml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/infrastructure/cloud/k8s/migrate-job.yaml)
- [k8s/backend-deployment.yaml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/infrastructure/cloud/k8s/backend-deployment.yaml)
- [k8s/backend-service.yaml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/infrastructure/cloud/k8s/backend-service.yaml)
- [k8s/worker-deployment.yaml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/infrastructure/cloud/k8s/worker-deployment.yaml)
- [k8s/frontend-deployment.yaml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/infrastructure/cloud/k8s/frontend-deployment.yaml)
- [k8s/frontend-service.yaml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/infrastructure/cloud/k8s/frontend-service.yaml)
- [k8s/ingress.yaml](file:///mnt/c/Users/dubdoo/Desktop/individual_project/vidgit/infrastructure/cloud/k8s/ingress.yaml)

