# Stage 12: 视频流可视化 (Git Graph)

## 目标
实现核心的 Git Graph 可视化，直观展示视频演变历史。
(注：原 Stage 12 "Web 视频播放" 已在 Stage 09 中部分实现，本阶段聚焦于 Graph)

## 功能列表
1. **Graph Engine**: 集成 React Flow。
2. **Node Types**: 自定义 Commit 节点 (显示视频缩略图、信息)。
3. **Edge Types**: 自定义连线 (分支走向)。
4. **Layout**: 自动计算 DAG 布局 (使用 dagre)。

## Todo List
- [ ] 定义 `CommitNode` 组件。
- [ ] 实现 API 数据 (from `GET /projects/{id}/graph`) 到 React Flow Nodes/Edges 的转换逻辑。
- [ ] 实现自动布局 (Dagre)。
- [ ] 集成到 `VideoEditor` 页面 (替换或作为 Sidebar/Modal)。
