# Stage 09: 前端视频编辑器

## 目标
构建 Next.js 前端界面，允许用户输入 Prompt 生成剧本，预览生成的图片和视频，并对生成的片段进行排序和简单剪辑。

## 功能列表
1.  **项目仪表盘**: 列出用户的所有项目，支持新建项目。
2.  **剧本生成页**: 输入 Topic，调用 Backend 生成 Storyboard。
3.  **编辑器界面**:
    *   **Timeline**: 展示生成的 Clips。
    *   **Preview**: 播放当前 Clip 或合成视频。
    *   **Asset Library**: 展示生成的图片和视频素材。
4.  **API 集成**: 对接 Backend 的 Auth, Project, Generation 接口。

## Todo List
- [ ] 检查并初始化 Frontend 项目结构 (Next.js + Tailwind + Shadcn/UI)。
- [ ] 实现 `Dashboard` 页面 (列出项目)。
- [ ] 实现 `ScriptGenerator` 组件 (输入 Prompt -> 显示 Storyboard)。
- [ ] 实现 `VideoEditor` 页面 (Timeline + Preview)。
- [ ] 集成 `generate_clip` API，并在前端展示进度。
