# Stage 15: Web 简易时间轴编辑器

## 目标
提供基于时间轴的非线性编辑能力。

## 功能列表
1. **Timeline UI**: 多轨道时间轴。
2. **Clip Management**: 拖拽 Commit 到时间轴上。
3. **Preview**: 序列播放时间轴上的 Clips。

## Todo List
- [x] 调研并集成时间轴库 (如 @xzdarcy/react-timeline-editor)。
- [x] 实现 Clip 拖拽逻辑 (从 Graph 拖到 Timeline - 使用 Context Menu 替代拖拽以简化交互)。
- [x] 实现时间轴的序列播放逻辑 (UI 同步)。
- [x] 保存时间轴状态到后端 (Project Workspace Data)。
