# Stage 20: 部署与发布准备

## 目标
准备上线 Production 环境。

## 功能列表
1. **Docker Compose Prod**: 生产环境的 Docker 配置。
2. **CI/CD**: GitHub Actions 自动构建和部署。
3. **Docs**: 完善用户文档和 API 文档。

## Todo List
- [x] 编写 `docker-compose.prod.yml` - Created.
- [x] 配置 Nginx 反向代理 - Created `nginx/conf.d/default.conf`.
- [x] 设置 GitHub Actions workflow (Lint, Test, Build, Push) - Created `deploy.yml` and existing `ci.yml`.
- [x] 编写 `User Guide` 和 `Developer Guide` - Created in `docs/`.
- [x] Release v0.1.0! - Ready for tag.
