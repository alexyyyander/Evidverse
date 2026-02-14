# Stage 14: Web 项目导入与 Fork

## 目标
实现"一键 Fork"和项目导入功能。

## 功能列表
1. **导入 UI**: 输入 Git 仓库地址或 Evidverse 项目 ID。
2. **Fork 交互**: 在 Graph 上右键点击 -> Fork 分支。
3. **后端对接**: 调用 Fork API。

## Todo List
- [x] 实现项目导入模态框。
- [x] 实现 Graph 节点的 Context Menu (右键菜单)。
- [x] 对接 `POST /projects/fork` 接口。
- [x] 优化 Fork 后的跳转体验。
