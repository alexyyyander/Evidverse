# Frontend Optimization Stage Plan v1

## 背景
当前 Vidgit 前端已具备 MVP 功能闭环（登录/注册、Discover、My Projects、Editor、Git Graph 等）。接下来 v1 的重点不再铺开做“全站重构”，而是聚焦把“视频编辑页面”做得足够高级、足够复杂、足够好用：
- 用户从一个点子出发生成剧本（剧情段落/分镜/镜头）
- 根据描述生成人物图像和视频片段
- 在时间轴上对齐每段剧情对应的视频片段
- 点击某个片段时，脚本/人物/资产/参数/预览等信息全部联动对齐到该片段

## 现状速览（以仓库当前代码为准）
- 框架：Next.js App Router + TypeScript
- UI：Tailwind CSS + 自定义组件（Button/Card/Dialog/Input/Toast 等）
- 数据层：axios + TanStack Query
- 状态：zustand（编辑器/时间线等）
- 测试：Vitest + Testing Library（已有单测基础）
- 部署：Docker + Nginx 反向代理（建议前端默认走同源 `/api/v1`）

## v1 的关键约束（用于避免“越做越散”）
- v1 只做 3 个阶段：先把编辑器的“联动与数据模型”打牢，再把 AI 生成链路接入，最后做高级体验与收尾
- 所有新增能力必须围绕 Editor 页面（及其必要的入口/设置页）服务
- UI 的复杂度来自“信息架构与联动一致性”，不是无目的堆组件

## v1 交付物（目标形态）
- 一个“高级视频编辑器”页面：Timeline + Preview + Script/Storyboard + Character + Inspector + Assets + Generation Queue
- 场景(Scene)/片段(Clip)/人物(Character)有稳定 ID 与引用关系，点击任意片段全局联动
- 从点子生成剧本，再生成图像/视频并回填到时间轴可编辑

## Stages（v1）
- [Stage 01: Editor 信息架构与联动底座](./stage_01.md)
- [Stage 02: 点子→剧本→人物/视频生成链路接入](./stage_02.md)
- [Stage 03: 高级复杂编辑体验与打磨](./stage_03.md)
