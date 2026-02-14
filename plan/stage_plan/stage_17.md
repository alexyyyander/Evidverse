# Stage 17: CLI 高级功能

## 目标
在 CLI 中实现核心生成和版本控制功能。

## 功能列表
1. **Generate**: `evidverse generate "a cat jumping"`。
2. **Commit**: `evidverse commit -m "update video"`。
3. **Branch**: `evidverse branch` / `evidverse checkout`。

## Todo List
- [x] 实现 `generate` 命令 (调用后端 API，下载生成结果到本地)。
- [x] 实现本地状态跟踪 (`.evidverse` 目录结构)。
- [x] 实现 `commit` 命令 (上传变更，创建 Commit)。
- [x] 验证 CLI 与 Web 端的数据同步。
