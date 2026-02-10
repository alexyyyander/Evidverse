# Stage 17: CLI 高级功能

## 目标
在 CLI 中实现核心生成和版本控制功能。

## 功能列表
1. **Generate**: `vidgit generate "a cat jumping"`。
2. **Commit**: `vidgit commit -m "update video"`。
3. **Branch**: `vidgit branch` / `vidgit checkout`。

## Todo List
- [ ] 实现 `generate` 命令 (调用后端 API，下载生成结果到本地)。
- [ ] 实现本地状态跟踪 (`.vidgit` 目录结构)。
- [ ] 实现 `commit` 命令 (上传变更，创建 Commit)。
- [ ] 验证 CLI 与 Web 端的数据同步。
