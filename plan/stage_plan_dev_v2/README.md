# Stage Plan Dev v2（内容协作 + 多平台投稿 + 多世界线）

## 背景
Evidverse 已完成 MVP 闭环（AI 生成、编辑器、Git Graph、Discover、Fork/Like 等）。Dev v2 的目标是把“创作 → 协作 → 发行”升级为可规模化的内容生产与社区协作模型：
- 发行：项目可一键导出并投稿到各大平台（先做 B 站、抖音）
- 协作：Fork 不再只是复制一个项目，而是围绕“主项目（Root Project）+ 多分支（Branch）”协作、贡献与归因
- 叙事：支持 Galgame/视觉小说素材输入，生成多世界线番剧，并能可视化剧情关系图与拓展线路

## v2 的关键约束
- 统一“对外 ID”：所有对外可见对象必须使用不可枚举的 UUID（或等价不可预测标识）
- 统一“片段对象”：视频片段必须是稳定的一等对象（ClipSegment），可被引用、复用、合并与统计贡献
- 统一“协作语义”：贡献发生在 Branch 上；合并进入主线必须通过明确的 Merge 流程与冲突策略

## Stages（v2）
- [Stage 01: 导出与投稿（B 站 / 抖音）](./stage_01.md)（已落地，剩余：多 P/元信息/重试与日志）
- [Stage 02: Galgame/VN → 多世界线番剧（截图 + 引擎脚本导入）](./stage_02.md)（已落地）
- [Stage 03: Fork/Branch 协作深化（Merge、ClipSegment、归因）](./stage_03.md)
- [Stage 04: 剧情关系图与剧情拓展线路（可视化 + 生成 + 贡献统计）](./stage_04.md)
