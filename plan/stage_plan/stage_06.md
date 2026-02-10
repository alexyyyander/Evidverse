# Stage 06: Stable Diffusion 角色生成

## 目标
集成 Stable Diffusion (Diffusers 或 API)，实现角色参考图的生成。

## 功能列表
1. **Text-to-Image**: 输入 Prompt 生成角色图片。
2. **Prompt 优化**: 自动为角色 Prompt 添加质量增强词。
3. **图片存储**: 生成的图片自动上传到 S3。

## Todo List
- [x] 在 `ai_engine` 中实现 `StableDiffusionPipeline` (或 API Client)。
- [x] 创建 `backend/app/workers/image_tasks.py`。
- [x] 实现 `POST /api/v1/generate/character` 接口。
- [x] 验证生成的图片质量和存储流程。
