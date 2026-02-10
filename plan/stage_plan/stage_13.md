# Stage 13: 视频流可视化 (Git Graph)

## 目标
实现核心的 Git Graph 可视化，直观展示视频演变历史。

## 功能列表
1. **Graph Engine**: 集成 React Flow。
2. **Node Types**: 自定义 Commit 节点 (显示视频缩略图)。
3. **Edge Types**: 自定义连线 (分支走向)。
4. **Layout**: 自动计算 DAG 布局 (如 dagre 算法)。

## Todo List
- [ ] 安装 React Flow。
- [ ] 定义 `CommitNode` 组件。
- [ ] 实现 API 数据到 React Flow Nodes/Edges 的转换逻辑。
- [ ] 实现自动布局算法。
- [ ] 交互：点击节点播放对应视频。
