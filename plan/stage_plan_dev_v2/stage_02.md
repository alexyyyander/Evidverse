# Stage 02: Galgame/VN → 多世界线番剧（截图 + 引擎脚本导入）

## 📍 当前实现（已落地）
### 后端（FastAPI）
- /vn/assets：创建与查询 VNAsset（基于 object storage URL 记录素材引用）
- /vn/parse-preview：Ren'Py/KiriKiri 脚本文本解析预览（子集支持，用于验证导入与 IR）
- /vn/parse-jobs：异步解析任务（创建/查询/日志），用于后续大文件与多文件导入

### 前端（Next.js）
- Editor 左侧新增 VN Tab：脚本预览解析 / 上传 VN 素材并登记 VNAsset / 一键创建解析 Job 并导入 Script / 截图 VNAsset 绑定到 Beat（最小映射编辑）

## 目标
- 支持用户导入 Galgame/视觉小说数据，结构化为可编辑的剧情与分段，并驱动 Evidverse 生成多世界线番剧
- 支持三类输入（可混合）：
  - A：截图导入（人物立绘/对话框截图/漫画分镜图）
  - B：剧情导入（引擎脚本/导出文本/JSON）
  - C：人物设定导入（设定集图片 + 人物/世界观文本）
- 不做 OCR：截图中的对话文本以“脚本导入/用户校对录入/已有字幕文本”为主；截图主要用于 Seedance 漫画转视频与素材对齐

## 核心输出
- StoryGraph：StoryNode/StoryEdge + worldline_id（多世界线分支与合流结构）
- ClipSegment：视频剧情小节/片段（对外 UUID 可访问）
- 资产引用：截图/设定图/生成视频/字幕（用于编辑器与导出投稿复用）

## 新领域模型（草案）
### VNAsset（视觉小说素材）
- id（UUID）
- project_id / branch_id
- type（SCREENSHOT / VN_SCRIPT / VN_TEXT / VN_JSON / CHARACTER_SHEET / OTHER）
- storage_url
- metadata（来源、上传者、hash、宽高等）

### VNEngine（脚本引擎类型）
- KIRIKIRI（KiriKiri / 吉里吉里）
- RENPY（Ren'Py）
- NSCRIPTER（NScripter）
- REALLIVE（RealLive）
- UNITY_VN（Unity VN）
- CUSTOM（自研/未知）

### VNParseJob（解析任务）
- id（UUID）
- inputs（VNAsset 列表）
- engine_hint（可选：用于强制指定引擎）
- status（PENDING/STARTED/SUCCESS/FAILURE）
- result_ref（指向解析结果）

### StoryNode / StoryEdge（剧情关系图）
- node.id（UUID）：剧情节点（事件/对话片段/分镜段落）
- edge.id（UUID）：关系边（顺序/选择/条件分支/合流）
- worldline_id（UUID）：世界线标识

### ClipSegment（视频剧情小节/片段）
- id（UUID，对外可访问）
- project_id / branch_id
- story_node_id（可选）
- title / summary / tags
- assets_ref（引用生成的视频/图片/字幕/音频）
- provenance（来源：导入/生成/复用/合并）

## A：截图导入（SCREENSHOT）→ Seedance 漫画转视频
### 目的
- 截图不承担“抽文字”的职责，而是作为画面素材与风格参考，交由 Seedance 漫画转视频生成可编辑的视频片段

### 建议的最小工作流
- 用户上传一组截图（可按章节/场景分组）
- 用户选择：
  - 生成模式：逐张生成短片段 / 组内合成一个片段
  - 风格与一致性参数（可复用项目设定）
- 后端创建生成任务：
  - 输入：截图列表（或分镜图序列）+ 可选的文本剧情（来自 B）+ 角色设定（来自 C）
  - 输出：视频片段（映射到 ClipSegment 或其 assets_ref）

### 对齐策略（不依赖 OCR）
- 基于脚本导入的“对话序列/事件序列”生成 ClipSegment 占位
- 将截图组与 ClipSegment 做“半自动对齐”：
  - 默认顺序对齐（截图组第 i 段 → 第 i 个剧情小节）
  - 允许用户在 UI 中拖拽调整映射

## B：剧情导入（VN_SCRIPT / VN_TEXT / VN_JSON）
### 支持的常见引擎与格式（首批目标）
- KiriKiri（吉里吉里）：.ks
- Ren'Py：.rpy
- NScripter：.txt / .scr
- RealLive：.txt（以及编译产物 .dat 的可选支持）
- Unity VN：JSON / ScriptableObject（先以 JSON 导出为主）
- 自研引擎：加密 .dat / .bin 等（以“可插拔解包/解密适配器”承接）

### 解析架构（插件式）
- VNImporter：识别文件类型、编码、目录结构
- VNParser：按引擎语法解析为 AST 或事件流
- VNNormalizer：归一到统一 IR
  - SAY（说话/旁白）
  - NARRATION（叙述）
  - CHOICE（选项与跳转）
  - JUMP/LABEL（跳转/标签）
  - SCENE（场景切换）
  - META（立绘/背景/音效等）
- VNResolver：解析资源引用（立绘/背景/语音）与脚本路径

### 加密/编译格式处理策略
- 对 .dat/.bin 等：
  - 本阶段不承诺“全自动破解”
  - 提供解包/解密适配器接口（可由社区维护）
  - 默认路径：用户上传“已解包脚本/可读导出文本”

## C：人物设定导入（CHARACTER_SHEET + 文本）
- 文字设定抽取：姓名/别名/性格/关系/世界观规则 → CharacterProfile
- 图片设定归档：立绘/表情/服装 → CharacterAnchor 候选
- 人物对齐：以脚本中的名字/别名为主，必要时让用户确认映射

## 与编辑器的对接
- VNParseJob 成功后，可一键生成：
  - StoryGraph（含 worldline）
  - 初始 ClipSegment 列表（仅文字/占位资源）
  - 截图组与 ClipSegment 的映射（可编辑）
- Seedance 漫画转视频结果回写到 ClipSegment.assets_ref，时间线自动补齐

## API 设计（草案）
- POST /api/v1/files/presigned-url（获取直传 URL + object_name）
- POST /api/v1/vn/assets（登记 VNAsset 引用）
- GET /api/v1/vn/assets（查询 VNAsset）
- POST /api/v1/vn/parse-preview（脚本解析预览）
- POST /api/v1/vn/parse-jobs（创建解析任务）
- GET /api/v1/vn/parse-jobs/{job_id}
- GET /api/v1/vn/parse-jobs/{job_id}/logs
- POST /api/v1/vn/comic-to-video（创建 Seedance 漫画转视频任务）
- GET /api/v1/clips/{clip_id}（ClipSegment 对外可访问）

## 前端交互（草案）
- Editor 左侧新增 “VN 导入” 面板：
  - 上传截图/脚本/设定集（支持文件夹/压缩包导入预留）
  - 选择引擎/格式（自动识别失败时手动选择）
  - 解析预览（对话/分支结构预览与手动修正）
  - 截图组 ↔ 剧情小节映射编辑
  - 一键触发 Seedance 漫画转视频并回填

## 风险与控制
- 引擎脚本差异大：插件式解析器 + 统一 IR，先支持最常见语法子集
- 加密/编译格式：以适配器接口 + 用户提供解包脚本为默认路径
- 多世界线复杂度：本阶段只保证导入与结构化、基础可编辑；剧情拓展与可视化放到 Stage 04

## 验收标准
- 剧情导入：至少支持 2 种引擎脚本格式导入并可结构化
- 截图导入：可触发 Seedance 漫画转视频链路并回填为 ClipSegment 资产
- 设定导入：能给出人物候选映射，并允许用户校对确认
- ClipSegment（UUID 可访问）可在编辑器中浏览与引用

## ✅ 验收（MVP）
- 剧情导入：Ren'Py / KiriKiri 支持预览解析与异步解析，并可导入到编辑器 Script
- 截图导入：SCREENSHOT 可绑定到 Beat；可触发 comic-to-video 并生成 ClipSegment（含 video_url 回填）
- ClipSegment：支持 UUID 获取与列表浏览（/clips）
