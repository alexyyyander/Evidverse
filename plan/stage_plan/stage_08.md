# Stage 08: 视频生成工作流编排

## 目标
串联 LLM、SD、Seedance，实现从剧本到视频的完整自动化流。

## 功能列表
1. **LLM 剧本生成**: 调用 GPT-4 生成分镜脚本。
2. **Pipeline 编排**: Script -> Image (with Anchor) -> Video。
3. **全流程 API**: 一键生成视频片段。

## Todo List
- [x] 集成 OpenAI/Claude API。
- [x] 实现 `StoryGenerationService`。
- [x] 创建编排任务 `generate_clip_workflow`。
- [x] 处理中间失败的重试逻辑。
