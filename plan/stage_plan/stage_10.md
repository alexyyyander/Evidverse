# Stage 10: Git 核心逻辑 - Branch & Checkout

## 目标
实现多分支管理和版本切换。

## 功能列表
1. **创建分支**: 从当前 Commit 创建新指针。
2. **Checkout**: 切换当前工作区的 HEAD 到指定 Branch 或 Commit。
3. **History API**: 获取当前分支的 Commit 历史树。

## Todo List
- [ ] 实现 `POST /branches/` (从特定 Commit 创建)。
- [ ] 实现 `GET /projects/{id}/graph` (返回 DAG 数据结构供前端渲染)。
- [ ] 实现 `Checkout` 逻辑 (在无状态 API 中，这通常意味着返回指定 Commit 的数据)。
