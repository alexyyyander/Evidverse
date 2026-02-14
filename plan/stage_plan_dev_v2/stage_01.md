# Stage 01: 导出与投稿（B 站 / 抖音）

## 📍 当前实现（已落地）
### 后端（FastAPI + Celery）
- PublishAccount / PublishJob：账号与投稿任务模型（含凭证加密存储）
- /publish API：创建/列出账号、创建投稿任务、查询任务状态
- B 站：biliup CLI 子进程集成（可用）
- 抖音：Provider 骨架（通过环境变量命令接入外部 uploader，实验性）
- 导出链路：
  - 创建投稿任务时可省略 video_url（提供 project_id + branch_name 即可）
  - HEAD commit 若只有一个视频 URL：直接投稿
  - HEAD commit 若有多个视频 URL：走 export:// 源，在发布任务中用 ffmpeg 合成导出、上传到 S3/MinIO，并写回 commit.video_url 后再投稿

### 前端（Next.js）
- 新增 /publish 页面：创建账号、提交投稿任务、轮询状态
- 导航栏新增 Publish 入口

### 已覆盖测试
- 后端：publish 账号/任务、fork-branch + workspace 权限等用例覆盖
- 前端：typecheck + unit tests 通过

### 提前落地（Stage 03 协作基础，已实现）
- Branch：对外 UUID（public_id）、description/tags、parent_branch、creator
- Fork=创建分支：POST /projects/{project_id}/fork-branch
- 分支工作区：GET/PUT /projects/{project_id}/workspace?branch_name=...
- 编辑器分支切换：顶部下拉选择分支，自动保存当前分支并切换后 reload
- 前端鉴权修复：仅 401 清 token（403 不再误判为登录过期）

## 目标
- 用户在 Yivid 内一键把项目/分支导出为“可投稿视频”（单 P / 多 P）
- 支持 B 站与抖音的投稿（先跑通最小链路：手动触发上传 + 上传结果回写）
- 为后续扩展更多平台建立统一抽象：账号、凭证、导出任务、投稿任务、回调与失败重试

## 优先级（本阶段只做这些）
- P0（已完成）：导出视频文件（本地/对象存储）+ 创建投稿任务 + 后台上传 + 状态查询
- P0（已完成）：B 站上传（biliup）
- P1（已完成/实验性）：抖音上传 Provider 骨架（外部命令接入）
- P1（已完成-基础版）：多 P（B 站多文件投稿）与基础元信息（tid/封面/定时）
- P2（未完成）：定时发布、批量发布、失败智能重试策略、平台侧草稿管理

## 方案选择（集成优先级）
### 方案 A：集成 biliup（推荐优先落地 B 站）
https://github.com/biliup/biliup
- 特点：对 B 站上传链路更成熟，提供 CLI/WebUI，登录方式丰富（短信/扫码/cookie 等）
- 集成方式：在 Yivid 后端新增“平台上传适配层”，以子进程/容器方式调用 biliup 完成上传
- 适用：B 站投稿稳定性优先、希望减少自研 API 适配成本

### 方案 B：集成 social-auto-upload（覆盖多平台，包含抖音）
https://github.com/dreammis/social-auto-upload
- 特点：多平台 uploader 模块 + Playwright 浏览器自动化，支持抖音/小红书/视频号等
- 集成方式：Celery worker 里运行 uploader（需要浏览器驱动与稳定选择器策略）
- 风险：平台 DOM/风控变化导致维护成本高，需要更强的健康监测与回退机制

### 推荐策略（v2 Stage 01）
- B 站：先接 biliup（快速可用）
- 抖音：优先评估 social-auto-upload（最小化自研），并做“可插拔适配器”，后续可替换为官方/第三方 API

## 本阶段剩余工作（从“可用”走向“可发布”）
- 多 P：已支持 B 站多 P 投稿；抖音仍为单文件（后续可扩展）
- 元信息增强：已支持 tid/封面/定时；仍缺更完整字段（分区映射/权限/封面上传策略等）
- 重试与可观测：已提供 /retry + 结构化日志（脱敏）+ 日志查询接口；已支持可配置自动重试（退避重排队），仍缺更智能策略与日志检索/聚合
- 账号状态：已提供 validate/disable/delete 与 active/expired/disabled；仍缺平台侧真实校验与扩展字段

## 核心对象与数据模型（草案）
### ExportPreset（导出预设）
- id（UUID）
- project_id / branch_id
- render_profile（分辨率、码率、封装格式、片头片尾、水印等）

### PublishAccount（平台账号）
- id（UUID）
- owner_user_id
- platform（BILIBILI / DOUYIN）
- credential_ref（指向加密存储的凭证引用）
- status（ACTIVE / EXPIRED / DISABLED）

### PublishJob（投稿任务）
- id（UUID）
- project_id / branch_id
- export_preset_id
- platform / account_id
- payload（标题、简介、标签、分区、是否公开、是否定时等）
- input_artifacts（导出文件/分 P 文件列表）
- status（PENDING/STARTED/SUCCESS/FAILURE）
- platform_result（稿件 id、链接、失败原因）

## API 设计（草案）
- POST /api/v1/publish/accounts
- GET /api/v1/publish/accounts
- POST /api/v1/publish/jobs（创建投稿任务，返回 job_id）
- GET /api/v1/publish/jobs/{job_id}
- POST /api/v1/publish/jobs/{job_id}/retry

## 后端架构建议
- 后端 FastAPI 负责：鉴权、任务编排、状态存储、凭证引用、导出生成参数校验
- Celery worker 负责：导出渲染（render）与平台上传（upload）
- 适配层：PublishProvider 接口（biliup_provider / douyin_provider）
- 运行隔离：上传任务建议独立队列与资源限制（避免阻塞生成任务）

## 前端交互（草案）
- Editor 或 Project 页面提供 “导出/投稿” 按钮
- 投稿弹窗：
  - 选择平台（B 站/抖音）
  - 选择账号
  - 选择导出来源（当前 branch / 指定 tag）
  - 编辑元信息（标题/简介/标签/分区/封面）
  - 提交后显示任务状态与日志（成功后显示平台链接）

## 安全与合规
- 凭证必须加密存储；前端不可直传明文 cookie/token 到日志
- 上传日志必须脱敏（cookie/token/手机号/验证码）
- 增加“免责声明与版权提示”（提交前必须确认）

## 验收标准
- 从一个项目/分支可以创建投稿任务并得到可追踪状态
- B 站投稿成功率可重复验证（至少在本地/测试环境通过）
- 抖音投稿可跑通最小链路（允许先以实验性标记）
