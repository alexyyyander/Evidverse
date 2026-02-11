# Stage 06: 编辑器体验重构（Timeline / Assets / Preview）

## 目标
把 Editor 从“页面里堆组件”重构为“模块化编辑器”，并显著提升体验：布局一致、交互顺畅、保存可靠、状态职责清晰。

## Todo List
- [ ] 组件拆分：EditorShell、LeftRail、SidePanel、PreviewPanel、TimelinePanel、AssetsGrid、PromptPanel。
- [ ] 交互升级：Tab 切换动画、可折叠面板、键盘快捷键（保存/播放/切换 tab）。
- [ ] 生成流程 UX：`/generate/clip` 的任务状态轮询与进度展示（替换 mock setTimeout）。
- [ ] 保存策略：防抖自动保存 + 手动保存 + 离开页面未保存提醒（与 server-state/本地状态明确边界）。
- [ ] Timeline 数据结构梳理：effects/actions 的命名与类型定义，避免“commitId 既是 effectId 又是资源 id”的混用。

## 验收标准
- Editor 页面逻辑更清晰：模块化组件 + 单一职责，便于迭代更多编辑能力。
- 生成/保存都有可靠的 loading/成功/失败反馈，且不会在拖拽时高频写后端。

