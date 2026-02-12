# Stage 04: 剧情关系图与剧情拓展线路（可视化 + 生成 + 贡献统计）

## 目标
- 在已有“剧情结构”基础上，生成并可视化“剧情关系图”（人物-事件-世界线）
- 当用户上传剧情或 AI 生成剧情后：
  - 进行人物对齐（角色映射）
  - 构建剧情节点与关系边
  - 自动生成可拓展的剧情分支线路（Worldline Expansion）
- 在协作模型中：
  - 统计分支贡献度与主项目贡献度
  - 贡献度计算初版：以“生成的视频剧情小节数量（ClipSegment 数）”为基准

## 剧情关系图（Story Graph）
### 图的节点
- Character（人物）
- StoryNode（剧情节点：事件/对话段落/镜头段）
- Location / Setting（可选）

### 图的边
- SEQUENCE：时间顺序
- CHOICE：选择分支（多世界线）
- MERGE：合流
- RELATION：人物关系（同盟/亲属/敌对/暧昧等）

## 剧情拓展线路（生成策略草案）
- 输入：
  - 当前剧情（节点序列 + 世界线结构）
  - 人物设定（CharacterProfile + Anchor）
  - 分支主题（Branch tags/description）
- 输出：
  - 候选分支点（Choice Points）
  - 每个分支点的多条拓展线路（可生成 1-3 条）
  - 每条线路生成对应的 StoryNode 草案与 ClipSegment 占位
- 控制：
  - 风格一致性（与主线设定对齐）
  - 世界观一致性（规则约束）
  - 生成可解释（每条分支给出“为什么这样分叉”的说明）

## 可视化（前端）
- 基于现有图能力（ReactFlow 经验）扩展：
  - StoryGraph 视图：节点与边，可拖拽、缩放、过滤
  - Worldline 视图：按世界线泳道展示关键节点
  - 人物关系视图：人物节点 + 关系边
- 交互要求：
  - 点击节点联动到编辑器：定位到对应 ClipSegment/Scene/Beat
  - 在图上选择一个分支点 → 一键创建新 Branch（并带上 tag/主题）

## 贡献统计（初版规则）
### 统计维度
- 单个 Branch 贡献度：该分支新增且最终被主线接受的 ClipSegment 数
- 主项目总贡献度：所有被接受的 ClipSegment 累计（按主线口径）
- 贡献者贡献度：用户在各分支被接受的 ClipSegment 数累计

### 特殊情况处理（草案）
- 主作者“自己也生成了同段内容”且不接受贡献：
  - 贡献者该段记为未采纳，不计入主线贡献
  - 但仍计入“分支自有贡献”（用于展示分支产出）
- 复用/搬运片段：
  - 标记 provenance=REUSED，不重复计入“新增贡献”

## API 设计（草案）
- GET /api/v1/story/graph?project_id&branch_id
- POST /api/v1/story/align（人物映射确认/提交）
- POST /api/v1/story/expand（生成拓展线路）
- GET /api/v1/contrib/project/{project_id}
- GET /api/v1/contrib/branch/{branch_id}
- GET /api/v1/contrib/user/{user_id}

## 验收标准
- 能从剧情输入生成 Story Graph 并在前端可视化
- 能基于分支主题生成“可拓展线路”并落地为可编辑的节点/片段占位
- 能按 ClipSegment 数量产出项目/分支/用户维度的贡献统计

