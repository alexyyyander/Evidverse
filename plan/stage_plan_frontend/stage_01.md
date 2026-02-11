# Stage 01: 视觉基线与布局体系

## 目标
建立“统一的视觉基线”，让全站页面在背景、排版、间距、容器、暗色模式策略上保持一致，为后续组件化与设计系统打底。

## 背景（当前问题）
- `globals.css` 的 body 渐变与 `layout.tsx` 的 body 背景类存在叠加，导致主题表现不稳定。
- 页面容器与布局写法不一致（`min-h-screen`、padding、max-width 重复/冲突）。
- 交互/按钮/卡片的视觉语言未统一（颜色、圆角、阴影、hover/focus 状态）。

## Todo List
- [x] 明确暗色模式策略（Tailwind `darkMode: "class"` 或 `media`）并全站统一。
- [x] 统一全局背景与字体层级：定义基础色板、正文/标题字号、默认前景色。
- [x] 抽象页面布局骨架（AppShell / PageContainer / SectionHeader），替换页面内重复容器。
- [x] 统一可交互元素的 focus ring 与 hover 反馈（可访问性与一致性）。
- [x] 增加通用 loading / empty / error 的基础样式（不改业务逻辑，仅做 UI 基线）。

## 验收标准
- 首页 / Projects / Discover / Profile / Editor 的背景、内容宽度与基础间距一致。
- 全站按钮/链接有一致的 hover 与 focus 可视反馈。
- 不引入破坏性视觉回归（保留现有功能行为）。
