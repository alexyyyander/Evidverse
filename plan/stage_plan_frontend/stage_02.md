# Stage 02: 组件库与设计 Tokens

## 目标
建立可复用的 UI 组件层（Button / Card / Input / Modal / Tabs / Toast 等）与设计 Tokens（颜色/圆角/阴影/字体），让页面开发进入“拼积木”模式。

## 技术建议
- 保留 Tailwind，建议引入 Radix UI / shadcn/ui 作为可访问组件基础。
- 引入 variants（例如 cva）与 class 合并工具（例如 tailwind-merge），统一组件写法。

## Todo List
- [x] 建立 `src/components/ui/*` 目录与组件约定（受控 props、variants、尺寸、disabled、loading）。
- [x] 完成基础组件：Button、Card、Badge、Input、Textarea、Dialog/Modal、Tabs、DropdownMenu。
- [x] 完成反馈组件：Spinner、EmptyState、ErrorState、Toast（用于 API 错误与操作提示）。
- [x] 建立 tokens：颜色层级（bg/surface/border/text）、间距、圆角、阴影、字体。
- [x] 将现有页面的零散样式迁移到组件库（先迁 Projects/Discover/Profile）。

## 验收标准
- 页面中不再出现重复的“按钮/卡片/弹窗”样式块，改为复用 UI 组件。
- 新增一个页面/区块时，主要工作是组合组件与少量布局，不再手写大量 Tailwind 类。
