# Stage 16: CLI 工具基础

## 目标
开发 `vidgit` 命令行工具的基础功能。

## 功能列表
1. **CLI 框架**: 基于 Click 或 Typer。
2. **Auth**: `vidgit login`。
3. **Init**: `vidgit init` (在当前目录初始化)。
4. **Status**: `vidgit status` (查看当前状态)。

## Todo List
- [ ] 完善 `cli/vidgit/main.py`。
- [ ] 实现 `auth` 命令 (保存 Token 到本地 `~/.vidgit/credentials`)。
- [ ] 实现 `api_client` (CLI 调用的 HTTP 客户端)。
- [ ] 打包发布测试。
