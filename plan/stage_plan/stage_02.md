# Stage 02: 后端基础框架与用户认证

## 目标
实现 FastAPI 的基础路由结构，并完成用户注册、登录和认证流程。

## 功能列表
1. **API 路由**: 搭建 API 路由分发机制 (`api/v1/router.py`)。
2. **用户注册**: `POST /auth/register`。
3. **用户登录**: `POST /auth/login` (返回 JWT)。
4. **当前用户**: `GET /users/me` (依赖注入 `get_current_user`)。
5. **安全工具**: 密码哈希 (bcrypt) 和 JWT 编解码工具。

## Todo List
- [x] 实现 `backend/app/core/security.py` (密码哈希, Token 生成)。
- [x] 定义 Pydantic Schemas (`UserCreate`, `UserLogin`, `Token`).
- [x] 实现 `backend/app/api/deps.py` (获取当前用户依赖)。
- [x] 实现 `backend/app/api/v1/endpoints/auth.py`。
- [x] 实现 `backend/app/api/v1/endpoints/users.py`。
- [x] 注册路由到 `main.py`。
- [x] 编写测试用例验证注册和登录流程。
