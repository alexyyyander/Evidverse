# Stage 03: 核心数据模型 API (CRUD)

## 目标
实现项目 (Project) 和 分支 (Branch) 的基础增删改查 API，为后续 Git 逻辑做准备。

## 功能列表
1. **项目管理**: 创建、获取列表、获取详情、删除项目。
2. **分支管理**: 在项目中创建分支、列出所有分支、删除分支。
3. **权限控制**: 确保只有项目拥有者可以修改项目。

## Todo List
- [x] 定义 Project 和 Branch 的 Pydantic Schemas。
- [x] 实现 `backend/app/services/project_service.py`。
- [x] 实现 `backend/app/api/v1/endpoints/projects.py`。
- [x] 实现 `POST /projects/` (创建项目，同时自动创建 `main` 分支)。
- [x] 实现 `GET /projects/` (获取我的项目)。
- [x] 实现 `GET /projects/{id}/branches`。
- [x] 编写 CRUD 单元测试。
