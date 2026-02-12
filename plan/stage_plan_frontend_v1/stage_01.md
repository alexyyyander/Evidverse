# Stage 01: Editor 信息架构与联动底座

## 目标
把视频编辑页面做成“足够高级和复杂”的基础：建立统一的数据模型与选择态（selection），实现 Timeline、脚本、人物、资产、预览、参数面板之间的稳定联动。

## 背景与痛点
- 目前 Editor 的复杂度更多来自组件本身，而不是“信息架构 + 联动一致性”，用户点击一个片段时其他信息无法稳定对齐。
- 时间轴上的片段需要与剧情段落（scene/beat）建立结构化绑定，才能实现“点哪段→全局对齐”。
- 如果没有统一 selection/状态机，后续增加面板（剧本/人物/生成队列/检查器）会迅速失控。

## 交付物
- 一个可承载“剧本/人物/资产/预览/时间轴/检查器/生成队列”的 Editor 布局骨架（可伸缩面板 + 固定核心区）。
- 一套稳定的 Editor 数据模型（可持久化到 `workspace_data`），支持刷新恢复。
- 一套稳定的联动规则：任何入口改变 selection，都能驱动全局 UI 对齐到同一对象。

## Todo List
- [x] 定义核心实体与 ID 规则：`SceneId`/`BeatId`/`CharacterId`/`AssetId`/`ClipId`/`TimelineItemId`（稳定、可序列化、可引用）。
- [x] 定义 Story 结构：Scene（标题/摘要/顺序）→ Beat（旁白/对白/镜头描述/建议时长/涉及人物/生成状态）。
- [x] 定义 Asset 结构：Image/Video/Audio（URL、尺寸、时长、来源、关联角色/段落、生成参数摘要）。
- [x] 定义 Clip 与 TimelineItem：Clip 绑定具体 Asset；TimelineItem 决定轨道、起始、时长、对齐到哪个 Beat。
- [x] 设计 selection 结构：`selectedBeatId` 为主选区；可选 `selectedTimelineItemId`/`selectedCharacterId` 作为补充选区。
- [x] 设计 selection 来源：Timeline 点击 / Script 点击 / Inspector 跳转 / 生成完成自动选中，保证只走同一个 state 入口。
- [x] 设计联动规则矩阵：选中 Beat 时各面板显示哪些内容；选中 TimelineItem 时如何反推 Beat；选中角色时如何筛选相关片段。
- [x] 落地“点击联动”最小闭环：Timeline 选中 → Script 高亮滚动 → Inspector 展示 → Preview 定位 → Assets/Characters 筛选。
- [x] 布局骨架落地：Left（Script/Characters/Assets Tabs）+ Center（Preview）+ Bottom（Timeline）+ Right（Inspector/Queue Tabs）。
- [x] 可伸缩面板体系：左右侧栏可折叠/拖拽宽度；底部时间轴可折叠/拖拽高度；布局状态持久化。
- [x] 播放指针（playhead）与选区协同：选中片段时 playhead 跳到片段起点；播放时各面板展示与当前时间对应的片段/段落。
- [x] 刷新恢复：Editor 打开时从 `workspace_data` 恢复 Story/Timeline/选区/布局，不丢失。
- [x] 最小保存策略：数据变更与 UI 变更（布局/选区）区分保存粒度，避免频繁写入。

## 验收标准
- 用户点击任意时间轴片段时，页面其他区域都能稳定对齐到同一条信息源（不出现互相打架/错位）。
- “剧情段落 ↔ 时间轴片段”的绑定是结构化数据，刷新后不丢失。
- 面板布局可扩展（后续加入生成队列、更多属性编辑不需要推翻架构）。
- 同一个对象（Beat/Clip/角色）在任意面板中拥有一致的标题/ID/状态展示，用户不会迷路。
