# Stage 05: Seedance API 集成

## 目标
集成 Seedance (或其他视频生成 API)，实现 Image-to-Video 的基础调用。

## 功能列表
1. **API Client**: 封装 Seedance API 的 HTTP 调用。
2. **异步生成任务**: 使用 Celery 包装 API 调用，处理耗时等待。
3. **回调/轮询**: 实现查询任务状态的逻辑。

## Todo List
- [ ] 在 `ai_engine` 中实现 `SeedanceClient`。
- [ ] 创建 `backend/app/workers/video_tasks.py`。
- [ ] 实现 `generate_video_from_image` 任务。
- [ ] 数据库中记录生成任务状态 (`TaskStatus` 表或 Redis)。
- [ ] 编写集成测试：调用 Mock API 验证流程。
