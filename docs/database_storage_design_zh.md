# Vidgit 数据库与中心存储设计说明（面向“视频 GitHub”）

## 目标与约束

Vidgit 的产品初衷可以理解为“视频 GitHub”：
- 以项目（Project）为核心，拥有 Git 风格的提交图（Commit DAG）与分支（Branch）
- 支持 Fork、Merge Request、公开浏览与二创
- 作为示例网站，需要支持“按类目/标签浏览不同的视频族”（可理解为主题、品类、系列、合集等）

同时要满足两个运行场景：
- 开源/本地：开发者可以用轻量存储跑起来（SQLite + 本地对象存储/MinIO）
- 线上中心：需要一个可扩展、可审计、可备份、可加速分发的“中心存储”

核心约束建议明确为：
- 元数据强一致（关系/权限/可见性/引用关系），大对象弱一致（上传、分发、缓存）
- “版本不可变”优先（commit 快照不可修改），可变数据走工作区/草稿（workspace）
- 公开访问与私有访问并存，二者都要可控且可审计

## 数据分层：不要把一切都放进同一个数据库

建议把系统的数据分为三层，每层选最合适的存储：

1) 元数据层（强一致）
- 建议：Postgres（线上），SQLite（本地）
- 内容：用户/权限、项目/分支/提交、MR、标签与类目、资产索引、任务状态、发布状态、互动数据（like、浏览）

2) 对象层（大文件、可扩展、可 CDN）
- 建议：S3 兼容对象存储（AWS S3 / Cloudflare R2 / MinIO 等）
- 内容：视频、图片、脚本文本原件、导入文件、渲染产物、封面、预览图、打包导出文件等

3) 检索与分析层（可选但强烈推荐）
- 建议：全文/过滤检索（OpenSearch/Meilisearch），分析（ClickHouse/BigQuery）
- 内容：Discover 页的搜索、热门排序、推荐、访问统计、转化漏斗等

这三个层次分开后，线上“中心存储”就清晰了：
- Postgres 是“中心真相”（谁拥有什么、版本指向什么、是否公开、如何归类）
- S3 是“中心对象仓库”（真正的视频/图片/文件）
- CDN/搜索/统计是“访问体验与运营能力”的扩展

## 现有模型与“视频 GitHub”的核心实体

当前代码库里已经具备非常贴近“视频 GitHub”的核心表结构（示例）：
- Project：项目/仓库（含 public_id、tags、is_public、parent_project_id、workspace_data）
- Branch：分支（含 head_commit_id、tags、workspace_data、parent_branch_id）
- Commit：提交（含 parent_hash、video_assets 快照、video_url）
- MergeRequest：MR（source/target branch、status、merged_clip_ids 等）
- ClipSegment：生成/导入得到的片段资产索引（status/result/error 等）
- VNAsset、VNParseJob：VN 导入资产与解析任务

这些模型非常适合作为元数据层的主干：它们描述“版本图”和“资产引用关系”，而不是把大文件塞进数据库。

## 为“类目/视频族浏览”补齐的元数据设计

### 方案 A：继续使用 tags（轻量、上线快）

现有 `projects.tags`、`branches.tags` 是 JSON（Postgres 用 JSONB），适合做：
- 主题标签：anime / movie / game / shortDrama 等
- 风格/语言/画幅等维度：style、lang、aspectRatio、resolution

线上建议：
- Postgres 为 tags 建 GIN 索引（已在迁移中体现思路）
- Discover 页筛选：tag + sort（new/hot）+ 关键词（name/desc）

适用：示例站、早期阶段、标签体系不严格、允许“自由标签”

### 方案 B：引入“类目/合集/系列”规范化（更像 GitHub 的 Topics + Collections）

当你要做“不同类目的视频族”且需要可运营（固定栏目、可控排序、可配置入口）时，建议新增这些实体：

- Category（类目）
  - id, slug, name_i18n, description_i18n, order, is_active
  - 用于固定导航：动画/番剧/电影/游戏/短剧…

- Topic/Tag（主题标签，规范化）
  - id, slug, name_i18n, description_i18n
  - ProjectTopic（多对多）：project_id + topic_id
  - 用于“话题广场”“标签页”，可做聚合与搜索

- Collection（合集/策展）
  - id, slug, title_i18n, description_i18n, cover_asset_id, visibility
  - CollectionItem：collection_id + project_id + pinned + order
  - 用于“官方精选”“某个系列的作品集合”“活动专区”

推荐路径：
- 示例站可以先用方案 A（tags），当你要做可运营的“类目入口”时，再加 Category/Collection

## 线上中心存储：对象存储的 Key 设计与版本策略

对象存储的关键是“命名（key）策略 + 可追溯性 + 权限”。

### 建议的对象 Key 规范

按“归属 + 不可变版本 + 类型”组织，避免后期迁移困难：

- 原始上传（用户导入文件）
  - `uploads/{user_public_id}/{yyyy}/{mm}/{dd}/{ulid}_{filename}`

- 项目级资产（与项目/分支关联，但文件本身尽量不可变）
  - `projects/{project_public_id}/assets/{asset_id}/{original_filename}`

- commit 产物（强烈建议不可变）
  - `projects/{project_public_id}/commits/{commit_sha}/render/{resolution}/{filename}`
  - `projects/{project_public_id}/commits/{commit_sha}/snapshot.json`（如果把快照从 DB 外置）

- VN 资产
  - `projects/{project_public_id}/vn/{asset_public_id}/{filename}`

如果要去重与节省存储，可引入内容哈希：
- `blobs/{sha256}/{filename}`，数据库用引用计数或软引用即可

### 元数据如何指向对象

数据库里不要存“临时可变 URL”，而是存：
- object_name（bucket 内 key）
- storage_provider（s3/minio/r2）
- content_type、size、sha256、created_at
- visibility（public/private）

对外返回可访问 URL 时：
- 公共资源：CDN URL（可缓存）
- 私有资源：短期签名 URL（presigned URL）

## 权限与可见性（公开浏览是“示例站”的生命线）

建议权限模型至少包含：
- Project.is_public：是否公开
- “公开可读，私有仅 owner/协作者可读”
- Fork：如果源项目公开，可允许 fork；若私有，需授权

对象存储层面的权限建议：
- bucket 默认私有
- 公开资源通过“发布管线”复制到 public bucket 或通过 CDN + signed cookie
- 私有资源走 presigned URL（短 TTL）

这样可以避免“把 bucket 设成 public 导致全站可爬”的风险。

## 数据一致性与引用完整性

“视频 GitHub”的一致性重点不在文件本身，而在引用关系：
- branch.head_commit_id 必须存在或为空
- commit.parent_hash 形成 DAG，避免环
- MR source/target branch 必须属于同一 project
- 删除策略：Project 删除应级联清理元数据；对象层可以延迟清理（异步 GC）

建议：
- Postgres 强制外键与约束（线上）
- 对象层用“软删除 + 生命周期策略”降低误删风险

## 扩展与性能建议（线上）

### 元数据（Postgres）
- 主键：内部自增/序列（便于 join），对外暴露 public_id（UUID/ULID）
- 索引建议：
  - projects(public_id), projects(owner_id), projects(is_public), projects(created_at)
  - tags：GIN（JSONB）或规范化后的 topic_id 索引
  - commits(project_id, created_at), branches(project_id, name)
  - merge_requests(project_id, status, created_at)

### 对象存储 + CDN
- 上传：客户端直传（presigned PUT），服务端只写元数据
- 下载：公共走 CDN 缓存；私有走签名 URL（避免回源打爆后端）

### 检索（可选但推荐）
Discover 体验通常需要：
- 关键词：项目名/描述/作者名
- 过滤：类目、tag、多语言字段
- 排序：new/hot（hot 需要聚合统计）

建议用搜索引擎承接“搜索与排序”，Postgres 保持一致性与事务边界。

## 本地开发与开源分发建议

为了“开源部分本地数据库没问题”，建议提供两种 profile：

- dev-lite（零依赖）
  - SQLite（元数据）
  - 本地文件系统或 MinIO（对象）
  - 适合快速体验与贡献者开发

- dev-full（接近线上）
  - Postgres + Redis + RabbitMQ + MinIO（docker-compose）
  - 适合验证迁移脚本、权限、性能与发布流程

线上部署建议直接选：
- Managed Postgres（RDS/Supabase/Neon 等）
- S3/R2 + CDN
- Redis（缓存/限流/任务状态）
- Queue（RabbitMQ/SQS/Redis Stream 任选其一，取决于部署环境）

## 推荐的“中心存储”落地方案（最小可行）

如果只做一个可公开访问的示例站，且要能长期跑：

- Postgres：存一切元数据（项目、版本图、类目、互动数据）
- 对象存储（S3/R2）：存视频/图片/导入文件
- CDN：公开资源加速
- Search（可选）：用于 Discover 搜索；早期可用 Postgres LIKE + tags 过滤替代

最关键的工程原则是：
- 任何“视频/图片/大 JSON”都不要成为 Postgres 的热点写入瓶颈
- commit 产物保持不可变，可重放、可审计、可缓存

