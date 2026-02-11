# Frontend Refactor Stage Plan (Next 10 Stages)

## 目标
在不破坏现有功能（Dashboard / Editor / Discover / Profile / Git Graph / Timeline）的前提下，把前端从“能用”升级到“好看、好维护、可扩展”：
- 统一视觉语言与组件体系（更强设计感、暗色主题一致、可复用组件）
- 统一数据获取与 API 层（类型化、错误处理、鉴权策略、缓存）
- 统一工程规范与测试（lint/format、e2e + unit/component tests）

## 现状速览（基于代码扫描）
- 技术栈：Next.js App Router + TS + Tailwind + axios + zustand + reactflow + timeline-editor
- 问题集中在：路由/页面边界、API 调用不统一、状态保存策略、UI 视觉一致性不足、测试脚本缺口

## 推荐前端技术栈（重构方向）
- UI：Tailwind CSS（保留） + 组件体系（建议引入 Radix UI / shadcn/ui）
- 设计：Design Tokens（颜色/间距/圆角/阴影/字体）+ 可组合组件（variants）
- 数据：axios（保留）+ TanStack Query（建议引入）管理 server-state
- 表单与校验：react-hook-form + zod（建议引入）
- 工程与质量：eslint（保留）+ prettier（建议引入）+ Playwright（保留）+ Vitest/RTL（建议引入）

## Stages
- [Stage 01: 视觉基线与布局体系](./stage_01.md)
- [Stage 02: 组件库与设计 Tokens](./stage_02.md)
- [Stage 03: API 层统一与类型系统](./stage_03.md)
- [Stage 04: Server State 管理与缓存](./stage_04.md)
- [Stage 05: 路由结构与页面边界重构](./stage_05.md)
- [Stage 06: 编辑器体验重构（Timeline / Assets / Preview）](./stage_06.md)
- [Stage 07: Git Graph 视觉与交互升级](./stage_07.md)
- [Stage 08: 认证与权限体验（前端侧）](./stage_08.md)
- [Stage 09: 测试与工程化（质量门槛）](./stage_09.md)
- [Stage 10: 性能、可访问性与设计收尾](./stage_10.md)

