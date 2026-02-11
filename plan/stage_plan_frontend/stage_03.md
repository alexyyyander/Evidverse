# Stage 03: API 层统一与类型系统

## 目标
把前端的网络请求从“页面/组件直接 axios 调用”统一为“按领域划分的 API 层 + 类型化返回 + 统一错误处理”，降低维护成本并提升稳定性。

## 背景（当前问题）
- `projectApi/userApi` 与 `api.get/post/put` 并存，调用风格不一致，错误处理分散。
- 缺少统一的错误模型（鉴权失败、表单错误、网络错误、后端异常）。
- 缺少集中式的类型定义（Project/User/Graph/Workspace 等）。

## Todo List
- [ ] 定义 `src/lib/api` 的分层：`client`（axios 实例）、`domains`（project/user/task/generate）、`types`（共享类型）。
- [ ] 统一错误处理：标准化 error（message、status、code、fieldErrors），页面只消费规范化结果。
- [ ] 统一鉴权策略：token 存取、过期处理、401 行为（清 token + 跳转/提示）。
- [ ] 把现有 direct calls（`/generate/clip`、`PUT /projects/:id` 等）纳入 domains API。
- [ ] 为关键接口补齐类型：Project、User、Graph、TimelineWorkspace、TaskStatus。

## 验收标准
- 页面/组件不再直接调用 axios 实例；统一改为 `xxxApi` 方法。
- 任何 API 失败都有一致的 UI/Toast 行为与可观测错误信息（不依赖 console）。

