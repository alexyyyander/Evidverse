# Stage 09: Git 核心逻辑 - Commit

## 目标
实现视频版本的提交 (Commit) 逻辑，构建 DAG (有向无环图)。

## 功能列表
1. **Commit 数据结构**: 包含 `parent_id`, `message`, `video_assets`, `timestamp`。
2. **Hash 计算**: 基于内容计算 SHA 标识。
3. **提交 API**: `POST /commits/`。

## Todo List
- [ ] 完善 `Commit` 模型，确保包含 Git 所需元数据。
- [ ] 实现 `CommitService.create_commit`。
- [ ] 逻辑：检查当前 Branch 的 HEAD -> 创建新 Commit (指向旧 HEAD) -> 更新 Branch HEAD。
- [ ] 验证提交历史链条的连贯性。
