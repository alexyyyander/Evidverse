# Stage 16: CLI 工具基础

## 目标
开发 `evidverse` 命令行工具的基础功能。

## 功能列表
1. **CLI 框架**: 基于 Click 或 Typer。
2. **Auth**: `evidverse login`。
3. **Init**: `evidverse init` (在当前目录初始化)。
4. **Status**: `evidverse status` (查看当前状态)。

## Todo List
- [x] 完善 `cli/evidverse/main.py`。
- [x] 实现 `auth` 命令 (保存 Token 到本地 `~/.evidverse/credentials`)。
- [x] 实现 `api_client` (CLI 调用的 HTTP 客户端)。
- [x] 打包发布测试。
