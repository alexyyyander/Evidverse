# Stage 07: 角色一致性锚点 (MVP)

## 目标
实现核心差异化功能——角色一致性。

## 功能列表
1. **Anchor 定义**: 允许用户选定一组图片作为 "Character Anchor"。
2. **LoRA/IP-Adapter**: 在生成流程中注入角色特征。
3. **一致性生成**: 基于 Anchor 生成新场景的图片。

## Todo List
- [ ] 在 `ai_engine/anchors` 中实现一致性算法逻辑。
- [ ] 如果使用 API，研究 API 的 "Character Reference" 参数。
- [ ] 如果本地运行，集成 `ip-adapter`。
- [ ] 实现 `POST /api/v1/anchors` 创建角色锚点。
- [ ] 更新生成接口，支持传入 `anchor_id`。
