# Stage 03: Fork/Branch 协作深化（Merge、ClipSegment、归因）

## 已落地基础（不再作为本阶段任务）
- Branch：对外 UUID（public_id）、description/tags、parent_branch、creator
- Fork=创建分支：POST /projects/{project_id}/fork-branch
- 分支工作区：GET/PUT /projects/{project_id}/workspace?branch_name=...
- 编辑器分支切换：顶部下拉选择分支，自动保存当前分支并切换后 reload
- ClipSegment（MVP）：clip_segments 表 + /clips UUID 获取与列表；/vn/comic-to-video 可创建并回填 video_url
- Merge Request（MVP）：可创建 MR（提议采纳 clip_ids），owner 可 merge/close；merge 时复制 ClipSegment 到目标分支

## 本阶段目标（剩余）
- ClipSegment 成为稳定一等对象：对外 UUID、可引用/复用/合并、可用于导出投稿与贡献统计
- Contributor/Role 与权限：OWNER / MAINTAINER / CONTRIBUTOR / VIEWER
- Merge Request 流程：创建、审核、合并、拒绝、回滚、冲突策略（workspace/assets/settings）
- Root Project Overview：分支列表、tag 过滤、分支详情页（分支时间线、片段列表、剧情线路）
- 贡献统计最小闭环：按“被主线采纳的 ClipSegment”产出 project/branch/user 维度统计

## 关键数据模型（计划）
### ClipSegment
- id（UUID，对外访问 key）
- project_id / branch_id
- title / summary / tags
- story_node_id（可选）
- video_url / image_url / subtitle_url（可选）
- provenance（AI 生成 / 上传 / 合并 / 复用）

### MergeRequest
- id（UUID）
- project_id
- source_branch_id / target_branch_id（默认 target=main）
- title / description
- status（OPEN / MERGED / CLOSED）
- diff_ref（workspace 差异、片段差异、设定差异的结构化描述）
- decisions（审核记录与理由）

## API 设计（计划）
- POST /api/v1/projects/{project_id}/merge-requests
- GET /api/v1/projects/{project_id}/merge-requests
- GET /api/v1/merge-requests/{mr_id}
- POST /api/v1/merge-requests/{mr_id}/merge
- POST /api/v1/merge-requests/{mr_id}/close
- GET /api/v1/clips/{clip_id}

## 验收标准
- 一个 Fork 分支可创建 merge request，并能被 owner 合并到 main
- 合并后 main 的可见内容与贡献统计能体现该分支的采纳结果
- 任意 ClipSegment 可通过 UUID 获取其信息并用于引用与导出投稿
