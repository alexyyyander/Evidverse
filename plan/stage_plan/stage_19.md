# Stage 19: 系统集成测试与性能优化

## 目标
确保系统稳定性和响应速度。

## 功能列表
1. **E2E 测试**: 使用 Playwright 进行端到端测试。
2. **Caching**: Redis 缓存热点数据 (如热门项目的 Graph)。
3. **CDN**: 确保视频资源通过 CDN 分发。

## Todo List
- [ ] 编写 Playwright 测试脚本 (覆盖核心 User Journey)。
- [ ] 在后端关键查询添加 Redis 缓存装饰器。
- [ ] 配置 S3/CloudFront CDN (如果是 AWS) 或 MinIO 缓存。
- [ ] 压测关键接口。
