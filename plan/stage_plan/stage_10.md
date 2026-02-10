# Stage 10: Git 核心逻辑 - Commit

## 目标
实现视频版本的提交 (Commit) 逻辑，构建 DAG (有向无环图)。

## 功能列表
1. **Commit 数据结构**: 包含 `parent_id`, `message`, `video_assets`, `timestamp`。
2. **Hash 计算**: 基于内容计算 SHA 标识。
3. **提交 API**: `POST /commits/`。

## Todo List
- [x] 完善 `Commit` 模型，添加 `video_assets` 字段。
- [x] 实现 `CommitService.create_commit` (含 Hash 计算)。
- [x] 实现 `POST /commits/` 接口。
- [x] 验证提交链条 (Parent -> Child)。
