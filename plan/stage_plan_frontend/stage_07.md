# Stage 07: Git Graph 视觉与交互升级

## 目标
让 Git Graph 成为编辑器的“高级可视化工具”，具备更强可读性（分支/HEAD/合并）与更顺畅交互（定位、筛选、操作反馈）。

## Todo List
- [ ] 视觉统一：节点/边/背景与全站暗色主题一致（避免当前 graph 容器浅色背景冲突）。
- [ ] 节点信息增强：HEAD/分支名更清晰、commit message 截断策略、时间信息更友好。
- [ ] 交互优化：右键菜单组件化 + 键盘操作 + 点击空白关闭等一致行为。
- [ ] 功能增强：搜索 commit、定位到 HEAD、mini-map、fitView 与 zoom 快捷操作。
- [ ] 性能：大图渲染优化（memo、虚拟化策略评估、最小化 setState 抖动）。

## 验收标准
- Git Graph 在暗色主题下视觉一致，信息层级清晰。
- 对 commit 的操作（Add to Timeline / Fork）反馈明确且交互稳定。

