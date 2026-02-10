# Stage 13: 项目部署与 CI/CD

## 目标
配置 Docker 生产环境构建、GitHub Actions 流水线，确保项目可以自动化部署。

## 功能列表
1. **Dockerfile**: 优化 Backend 和 Frontend 的 Dockerfile。
2. **Docker Compose**: 生产环境编排 (`docker-compose.prod.yml`)。
3. **CI Pipeline**: GitHub Actions (Lint, Test, Build)。
4. **CD Pipeline**: 自动推送到 Docker Hub 或云服务 (可选)。

## Todo List
- [x] 优化 Backend Dockerfile (Multi-stage build)。
- [x] 优化 Frontend Dockerfile (Standalone output)。
- [x] 创建 `docker-compose.prod.yml`。
- [x] 配置 `.github/workflows/ci.yml`。
