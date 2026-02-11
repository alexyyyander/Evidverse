# Stage 05: 路由结构与页面边界重构

## 目标
利用 Next.js App Router 的能力，把“路由组织、页面边界、加载与错误态”系统化，减少客户端页面的偶发错误与重复逻辑。

## 背景（当前问题）
- 目前链接到 `/editor/new`，但没有对应路由，`/editor/[id]` 对 `"new"` 会产生 `NaN`。
- 页面普遍是 `"use client"` + `useEffect` 拉数据，边界与错误态不一致。
- 缺少 route-level `loading.tsx` / `error.tsx` 等能力的使用。

## Todo List
- [ ] 补齐 `/editor/new`（新建项目流程：创建项目 -> 跳转 `/editor/:id`）。
- [ ] 将可 server-render 的页面迁移为 Server Components（例如 Discover、Profile、Projects 列表页），只在交互区块使用 Client Components。
- [ ] 为关键路由增加 `loading.tsx` / `error.tsx`，统一用户体验。
- [ ] 引入 route groups（例如 `(app)`、`(editor)`）与子 layout，隔离 editor 的全屏布局与普通页面布局。
- [ ] 清理导航与跳转方式（统一 `Link` / `router.push`，避免 `window.location.href`）。

## 验收标准
- `/editor/new` 可以正常工作且不产生 `NaN` 项目 ID。
- 页面加载与错误态具备一致体验，且首屏加载更快（减少不必要的 client hydration）。

