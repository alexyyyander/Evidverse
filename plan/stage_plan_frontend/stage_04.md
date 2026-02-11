# Stage 04: Server State 管理与缓存

## 目标
引入统一的 server-state 管理（缓存、失效、重试、并发、loading/error 状态），让列表页、详情页、点赞/ fork 等交互具备一致的体验与性能表现。

## 技术建议
- 建议引入 TanStack Query（React Query）管理请求、缓存与失效策略。
- 保留 zustand 用于编辑器本地状态（timeline、播放进度等），避免职责混淆。

## Todo List
- [x] 引入 QueryClient Provider 并定义全局默认策略（retry、staleTime、refetchOnWindowFocus）。
- [x] 将 feed / user profile / project list / graph 等查询迁移到 query hooks。
- [x] 将 like / fork 等 mutation 迁移到 mutation hooks，并实现乐观更新/失效刷新。
- [x] 统一 loading/empty/error UI（复用 Stage 02 组件）。
- [x] 明确“编辑器数据保存”的策略：手动保存 + 防抖自动保存 + 离开页面提醒。

## 验收标准
- Discover/Profile/Projects 页面不再手写 `useEffect + useState + try/catch` 拉取逻辑。
- 点赞/ fork 等操作具备一致的 loading/失败回退体验，并能正确刷新对应列表状态。
