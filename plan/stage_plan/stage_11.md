# Stage 11: Git 核心逻辑 - Branch & Checkout

## 目标
实现多分支管理和版本切换。

## 功能列表
1. **创建分支**: 从当前 Commit 创建新指针。
2. **Checkout/Head**: 获取当前分支的 HEAD 状态或切换分支。
3. **History API**: 获取项目的 Commit DAG 图。

## Todo List
- [x] 实现 `BranchService.create_branch`。
- [x] 实现 `POST /api/v1/branches/` 接口。
- [x] 实现 `GET /api/v1/projects/{id}/graph` 接口 (返回 DAG 数据)。
- [x] 实现 `GET /api/v1/projects/{id}/head` 接口 (解析 HEAD)。
- [x] 编写测试用例验证分支管理。
