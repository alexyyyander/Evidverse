# Vidgit 开发路线图 (Roadmap)
## 2026年2月 - 2027年8月 | 18个月完整规划

---

# 🎯 总体目标

| 阶段 | 时间 | 核心目标 | 成功指标 |
|------|------|---------|---------|
| **Phase 0**: 技术验证 | 2个月 | 验证核心技术可行性 | 角色一致性>90% |
| **Phase 1**: MVP | 3个月 | 上线最小可用产品 | DAU 1000+ |
| **Phase 2**: 社区冷启动 | 4个月 | 建立种子用户社区 | 付费用户500+ |
| **Phase 3**: 增长引擎 | 5个月 | 病毒式传播 | DAU 10万+ |
| **Phase 4**: 生态开放 | 4个月 | 协议化+API开放 | 第三方接入10+ |

**人力配置演进**:
- 起步: 5人核心团队(2后端+1前端+1AI+1产品)
- 3个月: 15人(增加运营+测试)
- 6个月: 30人(增加增长+客服)
- 12个月: 50人(增加算法+商务)

---

# 📅 Phase 0: 技术验证 (2026年2月-3月)

## 目标
证明"角色锚点技术"和"Git式版本控制"在视频领域可行

## Sprint 1 (Week 1-2): 基础架构搭建

### 后端 (优先级P0)
```yaml
任务:
  - 搭建FastAPI后端框架
  - 设计数据库Schema (PostgreSQL)
    - users表: 用户基础信息
    - projects表: 视频项目(对应Git的repo)
    - commits表: 单个镜头(对应Git的commit)
    - branches表: 分支关系
  - 接入AWS S3存储

技术选型:
  - 后端: FastAPI + SQLAlchemy
  - 数据库: PostgreSQL 15 + Redis 7
  - 存储: AWS S3 (后续迁移到IPFS)
  - 任务队列: RabbitMQ

交付物:
  - API文档 (Swagger)
  - 单元测试覆盖率>80%
```

### AI引擎 (优先级P0)
```yaml
任务:
  - 调研Runway/Pika/可灵API
  - 实现"文本→视频"基础流程
  - 测试不同prompt对生成质量的影响

技术方案:
  - 优先调用Runway Gen-4 API
  - 备选: 可灵(价格便宜50%)
  - 自建: 基于Stable Diffusion Video(长期规划)

关键指标:
  - 生成速度: <60秒(生成30秒视频)
  - 成功率: >95%(不崩溃/不黑屏)
```

### 前端 (优先级P1)
```yaml
任务:
  - 搭建React Native基础框架
  - 实现"文本输入→视频预览"流程
  - 设计基础UI组件库

技术选型:
  - 跨平台: React Native 0.73
  - 状态管理: Zustand
  - UI库: NativeBase + 自定义组件

交付物:
  - 可运行的Demo APP (仅iOS TestFlight)
```

## Sprint 2 (Week 3-4): 角色锚点技术验证

### 核心算法 (优先级P0)
```python
# 伪代码示例
class CharacterAnchor:
    def __init__(self, reference_images: List[Image]):
        # Step 1: 提取角色特征
        self.embeddings = CLIP.encode(reference_images)
        
        # Step 2: 训练LoRA模型 (使用DreamBooth)
        self.lora_model = DreamBooth.train(
            base_model="stable-diffusion-xl",
            images=reference_images,
            concept="sks person",  # 特殊token
            steps=500
        )
    
    def generate_frame(self, prompt: str) -> Image:
        # Step 3: 注入角色特征
        enhanced_prompt = f"{prompt}, in the style of sks person"
        
        # Step 4: 生成并验证
        for attempt in range(3):
            image = self.lora_model.generate(enhanced_prompt)
            similarity = CLIP.similarity(image, self.embeddings)
            
            if similarity > 0.92:  # 一致性阈值
                return image
        
        raise Exception("角色一致性验证失败")
```

### 实验设计
```yaml
测试场景:
  - 场景A: 单个角色,10个不同场景
  - 场景B: 两个角色,对话场景
  - 场景C: 同一角色,不同情绪

评估指标:
  - CLIP相似度: >0.92 (Pass)
  - 人工评分: 盲测10人,8人以上认为"像同一个人"

成功标准:
  - 场景A通过率>95%
  - 场景B通过率>85%
  - 场景C通过率>80%
```

### 风险应对
```yaml
风险: LoRA训练时间过长(>10分钟)
应对: 
  - 使用预训练的通用角色库(1000个虚拟人)
  - 用户付费后才训练专属角色

风险: 相似度阈值过高导致生成失败率高
应对:
  - 动态调整阈值: 第1次>0.92, 第2次>0.88, 第3次>0.85
  - 失败后提示用户"上传更多照片"
```

## Sprint 3 (Week 5-6): Git式版本控制原型

### 数据结构设计
```sql
-- commits表 (类似Git的commit)
CREATE TABLE commits (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    parent_commit_id UUID REFERENCES commits(id),  -- 父节点
    content_hash VARCHAR(64),  -- 视频文件的SHA-256
    prompt TEXT,  -- 生成该镜头的prompt
    character_ids UUID[],  -- 使用的角色ID列表
    created_at TIMESTAMP,
    author_id UUID REFERENCES users(id)
);

-- branches表
CREATE TABLE branches (
    id UUID PRIMARY KEY,
    project_id UUID,
    name VARCHAR(100),  -- 如"official", "fan-remake-v2"
    head_commit_id UUID REFERENCES commits(id),
    is_main BOOLEAN DEFAULT false
);

-- merges表 (记录合并历史)
CREATE TABLE merges (
    id UUID PRIMARY KEY,
    source_branch_id UUID,
    target_branch_id UUID,
    merge_commit_id UUID,
    conflict_resolution JSONB,  -- 记录如何解决冲突
    merged_at TIMESTAMP
);
```

### API设计
```yaml
POST /api/commits/create
  - 输入: project_id, parent_commit_id, prompt, character_ids
  - 输出: commit_id, video_url, estimated_time
  - 逻辑: 
      1. 调用AI生成视频
      2. 计算SHA-256
      3. 存入数据库
      4. 返回预览链接

GET /api/branches/{branch_id}/history
  - 输出: [commit1, commit2, ...] (按时间倒序)
  - 逻辑: 递归查询parent_commit_id

POST /api/branches/fork
  - 输入: source_branch_id, new_branch_name
  - 输出: new_branch_id
  - 逻辑: 复制head_commit并创建新分支

POST /api/branches/merge
  - 输入: source_branch, target_branch, strategy
  - 输出: merge_commit_id
  - 逻辑: 
      - 若无冲突: 自动合并
      - 若有冲突(如两个分支都修改了同一镜头): 提示用户选择
```

### 前端交互设计
```yaml
功能: 可视化分支树
  - 参考: GitHub的Network Graph
  - 实现: 用D3.js或React Flow绘制DAG
  - 交互:
      - 点击节点: 播放该镜头
      - 拖拽节点: 调整分支顺序
      - 右键菜单: Fork / Merge / Delete

功能: 时间轴编辑器
  - 类似Premiere Pro的Timeline
  - 每个Commit对应一个clip
  - 可拖拽调整顺序
```

## Sprint 4 (Week 7-8): 技术验证总结

### 交付物清单
```yaml
✅ 后端API (20+ endpoints)
✅ AI生成流程 (文本→视频,30秒内完成)
✅ 角色锚点Demo (3个测试角色,一致性>90%)
✅ 版本控制Demo (支持Fork/Merge)
✅ 移动端Demo APP (仅内部测试)

📊 性能测试报告
  - API响应时间: P95 <500ms
  - 视频生成成功率: 96%
  - 数据库并发: 支持100 QPS
```

### 技术债务记录
```yaml
已知问题:
  - 视频生成失败时无重试机制
  - 前端未做离线缓存
  - 数据库无主从备份

优化方向:
  - 引入CDN加速视频加载
  - 实现渐进式加载(先低清再高清)
  - 添加Prometheus监控
```

### Go/No-Go决策
```yaml
继续条件:
  ✅ 角色一致性>90%
  ✅ 用户调研正面反馈>70%
  ✅ 成本可控(每分钟生成<¥0.5)

终止条件:
  ❌ 技术无法突破(一致性<80%)
  ❌ 成本过高(每分钟>¥2)
  ❌ 竞品已推出类似功能
```

---

# 📅 Phase 1: MVP上线 (2026年4月-6月)

## 目标
上线最小可用产品,获得1000个种子用户并验证PMF(Product-Market Fit)

## Sprint 5-6 (Week 9-12): 核心功能开发

### 用户系统 (优先级P0)
```yaml
功能列表:
  ✅ 手机号/邮箱注册
  ✅ 验证码登录
  ✅ 用户资料设置 (昵称/头像)
  ✅ 钱包地址绑定 (可选,为后续链上功能预留)

技术实现:
  - 短信服务: 阿里云SMS
  - 邮件服务: SendGrid
  - Session管理: JWT + Redis
  - 钱包连接: WalletConnect (暂不强制)

安全措施:
  - 密码加密: bcrypt
  - 验证码有效期: 5分钟
  - 登录失败5次锁定30分钟
```

### 视频生成工作流 (优先级P0)
```yaml
前端流程:
  1. 用户输入剧本 (支持语音转文字)
  2. 选择角色 (从预设库 or 上传照片)
  3. 调整参数 (画幅/时长/风格)
  4. 提交生成任务
  5. 轮询后端获取进度
  6. 预览/下载/分享

后端流程:
  1. 接收请求 → 写入RabbitMQ队列
  2. Worker消费任务:
     a. 调用AI API生成视频
     b. 上传到S3
     c. 更新数据库状态
  3. WebSocket推送进度给前端

优化点:
  - 排队时显示预计等待时间
  - 生成失败自动重试3次
  - 支持批量生成(一次提交多个镜头)
```

### 内容分享 (优先级P0)
```yaml
功能:
  - 生成带水印的MP4文件
  - 一键分享到微信/抖音/Instagram
  - 生成分享海报(带二维码)

水印设计:
  - 位置: 左下角
  - 内容: "Made with Vidgit | @用户名"
  - 样式: 半透明白色,不遮挡主体

分享统计:
  - 记录分享到哪个平台
  - 追踪通过分享链接注册的新用户
```

## Sprint 7-8 (Week 13-16): 产品打磨

### 预设资产库 (优先级P0)
```yaml
角色库 (100个):
  - 分类: 现代/古风/科幻/卡通
  - 每个角色包含:
      - 3张不同角度的参考图
      - 性格标签 (如"傲娇"、"暖男")
      - 推荐使用场景

场景库 (50个):
  - 室内: 办公室/咖啡厅/卧室
  - 室外: 街道/公园/海滩
  - 特殊: 太空/古代宫殿/赛博朋克城市

动作库 (30个):
  - 表情: 微笑/哭泣/愤怒
  - 动作: 奔跑/拥抱/打斗
  - 镜头: 推拉摇移/特写/全景

音效库 (20个):
  - BGM: 悬疑/浪漫/搞笑
  - 音效: 脚步声/开门声/爆炸声
```

### 新手引导 (优先级P1)
```yaml
交互式教程:
  - Step 1: 欢迎页,介绍Vidgit是什么
  - Step 2: 选择一个模板剧本(如"表白场景")
  - Step 3: 选择男女主角
  - Step 4: 点击生成,等待30秒
  - Step 5: 观看成片,引导分享

设计原则:
  - 每步<10秒完成
  - 使用动画演示
  - 允许跳过(但记录跳过率)
```

### 性能优化 (优先级P1)
```yaml
前端:
  - 图片懒加载
  - 视频预加载(优先加载前10秒)
  - 使用WebP格式图片

后端:
  - API响应缓存(Redis)
  - 数据库查询优化(添加索引)
  - CDN加速静态资源

监控:
  - 接入Sentry (错误追踪)
  - 接入Google Analytics (用户行为)
  - 自建性能监控面板
```

## Sprint 9 (Week 17-18): 内测与修复

### 内测计划
```yaml
阶段1: 内部员工测试 (50人)
  - 时间: Week 17
  - 目标: 发现崩溃级bug
  - 奖励: 每发现一个bug奖励¥50

阶段2: 外部种子用户测试 (200人)
  - 时间: Week 18
  - 招募: 在ProductHunt/即刻发布招募帖
  - 目标: 收集真实反馈
  - 奖励: 终身免费专业版

关键指标:
  - Crash Rate <1%
  - 平均生成成功率 >95%
  - NPS (净推荐值) >30
```

### Bug修复优先级
```yaml
P0 (立即修): 
  - 登录失败/支付失败/数据丢失

P1 (当天修):
  - 生成视频卡住/界面显示错误

P2 (本周修):
  - 文案错别字/样式不美观

P3 (排期修):
  - 锦上添花的功能优化
```

### MVP上线 (Week 18)
```yaml
发布渠道:
  ✅ iOS: TestFlight公开测试
  ✅ Android: 官网APK下载 (暂不上架应用商店)
  ✅ Web: beta.vidgit.ai

宣传策略:
  - ProductHunt首发
  - 在B站/抖音发布创始人访谈视频
  - 邀请10个KOL试用并分享

成功标准:
  - 首周注册用户>1000
  - 日活/注册 >30% (次日留存)
  - 有10个用户愿意付费
```

---

# 📅 Phase 2: 社区冷启动 (2026年7月-10月)

## 目标
从1000用户增长到10000用户,建立创作者社区,验证收费模式

## Sprint 10-11 (Week 19-22): 社交功能

### 内容Feed流 (优先级P0)
```yaml
功能:
  - 发现页: 推荐热门作品(按播放量/点赞排序)
  - 关注页: 显示关注用户的新作品
  - 分类页: 按标签筛选(霸总/悬疑/搞笑)

推荐算法 (v1简化版):
  - 冷启动: 人工精选50个优质作品
  - 协同过滤: "喜欢A作品的人也喜欢B"
  - 内容标签: 根据用户浏览历史推荐相似内容

交互设计:
  - 参考TikTok的沉浸式播放
  - 上滑切换下一个视频
  - 双击点赞/长按收藏
```

### 互动功能 (优先级P0)
```yaml
评论系统:
  - 支持文字/表情
  - 楼中楼回复
  - 敏感词过滤(接入腾讯云内容安全)

点赞/收藏:
  - 点赞数公开显示
  - 收藏数仅自己可见
  - 后台统计用于推荐算法

关注/粉丝:
  - 关注后接收通知
  - 粉丝数排行榜(每周更新)
```

### 创作者工具 (优先级P1)
```yaml
数据面板:
  - 作品播放量/点赞数趋势图
  - 粉丝增长曲线
  - 收入明细(后续付费功能)

创作激励:
  - "本周最佳创作者"徽章
  - 作品被推荐到首页会收到通知
  - 粉丝破1000送专属头像框
```

## Sprint 12-13 (Week 23-26): 付费功能

### 会员订阅 (优先级P0)
```yaml
套餐设计:
  免费版:
    - 每日3次生成
    - 720p分辨率
    - 带水印
    
  基础版 (¥30/月):
    - 无限生成
    - 1080p分辨率
    - 去水印
    
  专业版 (¥199/月):
    - 4K分辨率
    - 商用授权
    - 优先算力(生成速度快2倍)
    - 专属客服

支付方式:
  - 微信支付/支付宝 (中国用户)
  - Stripe (海外用户)
  - 加密货币 (可选,USDC/USDT)

实现细节:
  - 使用Stripe Subscription API
  - 自动续费提醒(到期前3天)
  - 支持随时取消(不退款)
```

### 虚拟货币系统 (优先级P1)
```yaml
积分(Vidgit Coins):
  - 获取方式:
      - 充值: ¥1 = 10 coins
      - 任务: 每日签到+10, 邀请好友+100
      - 创作: 作品被点赞+1, 被收藏+5
  
  - 消耗方式:
      - 生成视频: 30秒消耗50 coins
      - 购买资产: 角色包200 coins起
      - 打赏创作者: 自定义金额

经济模型:
  - 通胀控制: 每月销毁10%未使用积分
  - 汇率稳定: 始终保持¥1=10 coins
```

### 资产交易市场 (优先级P1)
```yaml
上架流程:
  1. 创作者上传角色/场景素材
  2. 填写标题/描述/定价(¥5-500)
  3. 平台审核(1-3天)
  4. 上架销售

交易机制:
  - 平台抽成15%
  - 创作者每月15日结算
  - 支持退款(7天内,未使用过)

热门品类激励:
  - 月销量Top 10的素材,平台抽成降至10%
  - 推荐位曝光
```

## Sprint 14-15 (Week 27-30): 增长黑客

### 邀请裂变 (优先级P0)
```yaml
机制设计:
  - 邀请1人: 双方各得100 coins
  - 邀请5人: 免费升级基础版1个月
  - 邀请20人: 永久基础版

防刷规则:
  - 被邀请人需完成1次视频生成
  - 同一设备注册多个账号无效
  - IP异常(如VPN)不计数

传播链追踪:
  - 每个用户生成唯一邀请码
  - 记录A→B→C→D的完整链路
  - 后台可视化"裂变树"
```

### 内容挑战赛 (优先级P1)
```yaml
月度主题:
  - 第1期: #我的平行人生
  - 第2期: #重拍经典电影片段
  - 第3期: #用AI拍广告

奖励设置:
  - 一等奖1名: ¥5000 + 永久专业版
  - 二等奖3名: ¥2000 + 3个月专业版
  - 三等奖10名: ¥500 + 1个月专业版
  - 参与奖: 所有参赛者送100 coins

评选规则:
  - 播放量30% + 点赞数30% + 评委打分40%
  - 公开投票防止刷票
```

### KOL合作计划 (优先级P1)
```yaml
合作对象:
  - B站: 10-50万粉UP主
  - 抖音: 50-100万粉创作者
  - 小红书: 美妆/剧情类博主

合作形式:
  1. 送永久专业版会员
  2. 定制专属角色(用他们的脸)
  3. 联合出品一期内容

ROI目标:
  - 单个KOL合作成本<¥5000
  - 带来新用户>500
  - CAC(获客成本)<¥10
```

## Sprint 16 (Week 31-32): 数据分析与优化

### 核心指标监控
```yaml
增长指标:
  - DAU (日活用户)
  - MAU (月活用户)
  - 注册转化率
  - 邀请病毒系数K值

留存指标:
  - 次日留存
  - 7日留存
  - 30日留存

收入指标:
  - ARPU (每用户平均收入)
  - 付费转化率
  - LTV (用户生命周期价值)

内容指标:
  - UGC占比 (目标>50%)
  - 日均生成视频数
  - 平均视频播放时长
```

### A/B测试计划
```yaml
测试1: 定价策略
  - 方案A: ¥30/月基础版
  - 方案B: ¥25/月基础版
  - 假设: 降价5元,转化率提升>20%

测试2: 首页推荐算法
  - 方案A: 纯播放量排序
  - 方案B: 播放量+新鲜度混合
  - 假设: 方案B能提升用户停留时长

测试3: 新手引导
  - 方案A: 5步教程
  - 方案B: 3步教程
  - 假设: 步骤越少,完成率越高
```

---

# 📅 Phase 3: 增长引擎 (2026年11月-2027年3月)

## 目标
从1万用户增长到10万用户,实现收支平衡

## Sprint 17-18 (Week 33-36): Fork功能上线

### Git式协作 (优先级P0)
```yaml
前端UI:
  - 作品详情页增加"Fork"按钮
  - Fork后可选择:
      a. 从头开始续写
      b. 从某个时间点修改
      c. 替换角色/场景
  
  - 可视化分支树:
      [主线] ──┬── [分支A: 女主答应]
               └── [分支B: 女主拒绝]

后端逻辑:
  - 创建新分支,复制parent_commit
  - 记录Fork关系到数据库
  - 计算相似度,自动判断是否需要分成

收益分配:
  - 若分支作品获得打赏/广告收入:
      - 相似度>80%: 原作者分30%
      - 相似度50-80%: 原作者分15%
      - 相似度<50%: 无需分成
```

### 协作工作流 (优先级P1)
```yaml
多人编辑:
  - 创建"项目组",邀请成员
  - 角色分工:
      - 编剧: 写剧本
      - 美术: 设计角色/场景
      - 导演: 审核最终效果
  
  - 权限管理:
      - Owner: 可删除项目
      - Admin: 可邀请成员
      - Editor: 可提交Commit
      - Viewer: 只读

实时协作 (类似Figma):
  - WebSocket同步编辑状态
  - 显示"XXX正在编辑第3个镜头"
  - 冲突检测: 两人同时编辑同一镜头时弹窗提示
```

## Sprint 19-20 (Week 37-40): 短剧出海专项

### 一键魔改功能 (优先级P0)
```yaml
场景: 把中文短剧改成英文/西班牙文版本

流程:
  1. 上传中文短剧(或选择平台已有作品)
  2. 选择目标语言+文化背景
     - 英语(美式) / 英语(英式)
     - 西班牙语(拉美) / 西班牙语(欧洲)
     - 阿拉伯语 / 印地语
  
  3. AI自动:
     a. 翻译台词(保留原意+本土化俚语)
     b. 替换演员(改成对应种族的角色)
     c. 调整场景(如"北京胡同"→"纽约街区")
  
  4. 生成预览,用户微调后发布

技术难点:
  - 台词同步: 口型与语音匹配(使用Lip-Sync技术)
  - 文化适配: 避免文化冲突(如猪肉在穆斯林地区)
  - 质量保证: 翻译准确性>95%(人工校对)
```

### 合作伙伴对接 (优先级P0)
```yaml
目标平台:
  1. ReelShort (字节跳动)
  2. FlexTV (快手)
  3. ShortMax (趣头条)

合作模式:
  - API对接: 平台创作者可在Vidgit生成,一键发布到平台
  - 收益分成: 
      - 广告收入: 平台50% + Vidgit 30% + 创作者20%
      - 会员收入: 平台60% + Vidgit 20% + 创作者20%

成功案例打造:
  - 找1个头部短剧(如"逆袭女王")
  - 用Vidgit魔改成10种语言版本
  - 在不同国家上线,对比数据
```

## Sprint 21-22 (Week 41-44): 区块链功能上线

### 版权NFT (优先级P1)
```yaml
功能:
  - 用户可选择"将作品上链"
  - 铸造NFT (ERC-721标准)
  - 元数据包含:
      - 视频IPFS哈希
      - 创作时间
      - 所有贡献者列表

技术实现:
  - 链: Base (Coinbase推出的L2,Gas费<$0.01)
  - 存储: IPFS (via Pinata)
  - 合约: 基于OpenZeppelin的ERC-721模板

用户体验:
  - 上链需支付Gas费($0.05,平台补贴50%)
  - 不上链也能正常使用所有功能
  - 上链后作品会有"🔗已认证"标识
```

### 智能合约分账 (优先级P1)
```solidity
// 简化版合约代码
contract VidgitRevenue {
    struct Contributor {
        address wallet;
        uint16 percentage;  // 基点 (1bp=0.01%)
    }
    
    mapping(uint256 => Contributor[]) public videoContributors;
    
    function registerContributors(
        uint256 videoId, 
        Contributor[] memory contributors
    ) external onlyOwner {
        // 验证总和 = 10000 (100%)
        uint16 sum = 0;
        for (uint i = 0; i < contributors.length; i++) {
            sum += contributors[i].percentage;
        }
        require(sum == 10000, "Percentages must sum to 100%");
        
        videoContributors[videoId] = contributors;
    }
    
    function distribute(uint256 videoId) external payable {
        Contributor[] memory contributors = videoContributors[videoId];
        
        for (uint i = 0; i < contributors.length; i++) {
            uint256 amount = msg.value * contributors[i].percentage / 10000;
            payable(contributors[i].wallet).transfer(amount);
        }
        
        emit RevenueDistributed(videoId, msg.value);
    }
}
```

### 测试与审计
```yaml
安全审计:
  - 内部: 代码审查 (2周)
  - 外部: 雇佣第三方审计公司 (CertiK/SlowMist)
  - 赏金计划: 发现漏洞奖励$10k-100k

测试网部署:
  - 在Base Goerli测试网运行1个月
  - 邀请100个用户测试
  - 监控Gas消耗和合约稳定性

主网上线:
  - 初始仅限付费用户使用(降低风险)
  - 单笔交易上限$10k(防止大额损失)
  - 24小时人工监控
```

## Sprint 23 (Week 45-46): 国际化

### 多语言支持 (优先级P0)
```yaml
支持语言:
  - 简体中文 (默认)
  - 英语
  - 西班牙语
  - 阿拉伯语
  - 日语

实现方案:
  - 使用i18n框架 (react-i18next)
  - 文案存储在JSON文件
  - 支持动态切换语言

翻译质量:
  - 核心文案: 人工翻译
  - 长文本: GPT-4翻译 + 人工校对
  - 技术术语: 建立术语库保持一致性
```

### 本地化运营 (优先级P1)
```yaml
市场选择:
  - 北美: 英语
  - 拉美: 西班牙语
  - 中东: 阿拉伯语

策略差异:
  - 北美: 主打"个人创作者赋能"
  - 拉美: 主打"低成本影视制作"
  - 中东: 主打"文化内容本土化"

本地化内容:
  - 预设角色库: 增加不同种族的角色
  - 场景库: 增加地标建筑(如自由女神像/迪拜塔)
  - 节日活动: 适配当地节日(如圣诞节/开斋节)
```

---

# 📅 Phase 4: 生态开放 (2027年4月-8月)

## 目标
Vidgit从产品进化为协议,建立开发者生态

## Sprint 24-25 (Week 47-50): API开放

### 开发者平台 (优先级P0)
```yaml
注册流程:
  1. 登录developers.vidgit.ai
  2. 创建应用,获取API Key
  3. 选择计费方式:
     - 按量付费: $0.10/分钟生成
     - 包年套餐: $10k/年无限调用

API功能:
  - POST /api/v1/generate: 生成视频
  - GET /api/v1/status/{job_id}: 查询进度
  - POST /api/v1/characters/train: 训练自定义角色
  - GET /api/v1/marketplace/assets: 获取资产列表

文档与支持:
  - 在线文档(类似Stripe Docs)
  - 代码示例(Python/JavaScript/Go)
  - Discord开发者社区
  - 每月举办线上答疑会
```

### 计费与限流 (优先级P0)
```yaml
计费规则:
  - 成功生成: 按视频时长计费
  - 失败/取消: 不计费
  - 重复调用(缓存命中): 收费50%

限流策略:
  - 免费层: 100次/天
  - 付费层: 10000次/天
  - 企业层: 无限制

监控Dashboard:
  - 实时调用量
  - 成功率曲线
  - 费用消耗明细
  - 错误日志查看
```

## Sprint 26-27 (Week 51-54): SDK与插件

### Unity/Unreal插件 (优先级P1)
```yaml
目标用户: 游戏开发者/虚拟主播

功能:
  - 在游戏内实时生成NPC对话视频
  - 根据玩家选择生成不同剧情分支
  - 支持与游戏引擎的角色系统集成

技术实现:
  - Unity: C# SDK
  - Unreal: C++ SDK
  - 通过REST API调用Vidgit后端

案例应用:
  - 互动电影游戏(如《底特律:变人》)
  - 虚拟偶像直播(根据弹幕实时生成回应视频)
```

### Figma/Canva插件 (优先级P1)
```yaml
目标用户: 设计师

功能:
  - 在Figma中选择一段文字
  - 一键生成对应的视频素材
  - 直接插入到设计稿中

应用场景:
  - 制作APP原型(用AI视频模拟功能演示)
  - 制作营销海报(嵌入动态视频)
```

### VS Code扩展 (优先级P2)
```yaml
目标用户: 开发者

功能:
  - 编写Markdown格式的剧本
  - 使用特殊语法标记角色/场景
  - 保存时自动生成视频预览

示例语法:
```
# 场景1: 办公室
[角色: 张三, 情绪: 焦虑]
张三: "项目deadline要到了,我还没写完代码!"

[镜头: 特写张三的电脑屏幕]
(屏幕上显示满屏的bug)
```

一键生成后在侧边栏预览视频
```yaml

## Sprint 28 (Week 55-56): 白标解决方案

### 企业定制部署 (优先级P1)
```yaml
目标客户:
  - 大型影视公司
  - 教育机构
  - 电商平台

提供服务:
  - 私有化部署(on-premise)
  - 定制UI/LOGO
  - 专属算力资源
  - SLA保证(99.9%可用性)

定价模型:
  - 基础版: ¥50万/年 (支持100并发)
  - 企业版: ¥150万/年 (支持1000并发)
  - 旗舰版: ¥300万/年 (无限并发+7×24客服)

案例:
  - 某影视公司用Vidgit生成样片,节省80%前期成本
  - 某教育机构制作AI课程视频,学生参与度提升50%
```

## Sprint 29-30 (Week 57-60): DAO治理

### 社区治理 (优先级P2)
```yaml
治理Token: $VGT (Vidgit Governance Token)
  - 总量: 10亿枚
  - 分配:
      - 团队: 20% (4年线性释放)
      - 投资人: 15% (2年锁定)
      - 社区: 50% (创作挖矿)
      - 生态基金: 15% (用于资助开发者)

投票机制:
  - 1 $VGT = 1票
  - 提案类型:
      - 功能开发优先级
      - 平台抽成比例调整
      - 黑名单用户申诉

投票流程:
  1. 任何人可在论坛发起提案
  2. 获得100个$VGT持有者支持后进入投票
  3. 投票期7天,超过50%赞成即通过
  4. 开发团队执行(30天内)
```

### 激励计划 (优先级P2)
```yaml
创作挖矿:
  - 上传原创作品: 奖励10 $VGT
  - 作品播放量破10万: 奖励100 $VGT
  - 被其他人Fork超过50次: 奖励500 $VGT

策展挖矿:
  - 早期点赞后续爆款的作品: 奖励50 $VGT
  - 推荐好友注册: 奖励20 $VGT

开发者挖矿:
  - 提交代码PR被合并: 奖励100 $VGT
  - 开发第三方插件: 奖励1000 $VGT
```

---

# 📊 关键指标与里程碑

## 北极星指标
**DAU (日活用户)** - 衡量产品粘性的核心指标

## 里程碑时间表

| 时间 | 里程碑 | DAU目标 | 付费用户 | 月收入 |
|------|--------|---------|---------|--------|
| 2026.3 | 技术验证完成 | - | - | - |
| 2026.6 | MVP上线 | 1000 | 50 | ¥5万 |
| 2026.9 | 付费功能上线 | 5000 | 500 | ¥30万 |
| 2026.12 | 社区活跃 | 1万 | 2000 | ¥100万 |
| 2027.3 | 病毒增长 | 5万 | 1万 | ¥400万 |
| 2027.6 | 国际化突破 | 10万 | 3万 | ¥1000万 |
| 2027.8 | 生态成型 | 15万 | 5万 | ¥1500万 |

## 每季度OKR

### 2026 Q2
```yaml
O: 验证技术可行性并上线MVP
KR1: 角色一致性>90% ✅
KR2: MVP在ProductHunt获得Top 5 ✅
KR3: 获得1000个注册用户 ✅
```

### 2026 Q3
```yaml
O: 建立种子用户社区
KR1: 日活用户>5000
KR2: UGC内容占比>50%
KR3: 次日留存率>30%
```

### 2026 Q4
```yaml
O: 验证商业模式
KR1: 付费用户>2000
KR2: 月收入>¥100万
KR3: 毛利率>40%
```

### 2027 Q1
```yaml
O: 实现病毒式增长
KR1: DAU>5万
KR2: K因子(病毒系数)>1.5
KR3: 获客成本CAC<¥20
```

### 2027 Q2
```yaml
O: 国际化扩张
KR1: 海外用户占比>30%
KR2: 与3个海外平台达成合作
KR3: 月收入>¥1000万
```

---

# 🚨 风险应对计划

## 技术风险

### 风险1: AI生成质量不达预期
**触发条件**: 用户投诉率>10%

**应对方案**:
- Plan A: 切换到备用AI供应商(如可灵)
- Plan B: 引入人工修复流程(付费用户优先)
- Plan C: 暂时下线功能,专注打磨

### 风险2: 服务器宕机
**触发条件**: 可用性<99%

**应对方案**:
- Plan A: 启用备用服务器(AWS多地域部署)
- Plan B: 降级服务(暂停非核心功能)
- Plan C: 全额退款受影响用户

## 市场风险

### 风险3: 巨头推出竞品
**触发条件**: 字节/腾讯发布类似产品

**应对方案**:
- Plan A: 强化技术壁垒(专利+开源社区)
- Plan B: 转型To B,成为巨头的供应商
- Plan C: 被收购(估值>$100M)

### 风险4: 用户增长停滞
**触发条件**: 连续2个月DAU负增长

**应对方案**:
- Plan A: 大规模营销(烧钱买量)
- Plan B: Pivot产品方向(如专注教育赛道)
- Plan C: 缩减团队,延长跑道

## 法律风险

### 风险5: 版权纠纷
**触发条件**: 被起诉侵权

**应对方案**:
- Plan A: 下架争议内容,积极沟通和解
- Plan B: 启用法律顾问团队应诉
- Plan C: 购买保险赔付

---

# 🛠 技术栈总览

## 前端
```yaml
移动端:
  - React Native 0.73
  - Zustand (状态管理)
  - React Query (数据请求)
  
Web端:
  - Next.js 14
  - TailwindCSS
  - Framer Motion (动画)

工具链:
  - TypeScript
  - ESLint + Prettier
  - Jest + React Testing Library
```

## 后端
```yaml
API服务:
  - FastAPI (Python 3.11)
  - SQLAlchemy (ORM)
  - Alembic (数据库迁移)

数据库:
  - PostgreSQL 15 (主数据库)
  - Redis 7 (缓存+队列)
  - MongoDB (日志+分析)

消息队列:
  - RabbitMQ (视频生成任务)
  - Celery (定时任务)

存储:
  - AWS S3 (视频文件)
  - IPFS (链上内容)
```

## AI/ML
```yaml
视频生成:
  - Runway API (主要)
  - 可灵API (备用)
  - Stable Diffusion (自建,长期)

NLP:
  - OpenAI GPT-4 (剧本生成)
  - Whisper (语音转文字)

CV:
  - CLIP (相似度计算)
  - DreamBooth (角色训练)
```

## 区块链
```yaml
智能合约:
  - Solidity 0.8.20
  - Hardhat (开发框架)
  - OpenZeppelin (合约库)

链:
  - Base (主网)
  - Ethereum Goerli (测试网)

存储:
  - IPFS (via Pinata)
  - Arweave (永久存储)
```

## DevOps
```yaml
CI/CD:
  - GitHub Actions
  - Docker
  - Kubernetes

监控:
  - Prometheus + Grafana
  - Sentry (错误追踪)
  - DataDog (APM)

日志:
  - ELK Stack (Elasticsearch + Logstash + Kibana)
```

---

# 📝 附录: Sprint模板

## Sprint规划会议
```yaml
时间: 每2周一次
参与: 全员
议程:
  1. Review上个Sprint完成情况 (30分钟)
  2. Demo新功能给团队 (30分钟)
  3. 制定下个Sprint目标 (60分钟)
  4. 任务分配与优先级排序 (30分钟)
```

## 每日站会
```yaml
时间: 每天早上10:00, 15分钟
格式:
  - 每人回答3个问题:
      1. 昨天完成了什么?
      2. 今天计划做什么?
      3. 遇到什么阻碍?
  - 有阻碍的事项会后单独讨论
```

## 代码Review流程
```yaml
1. 开发者提交PR到GitHub
2. 自动化测试(单元测试+集成测试)
3. 至少1个同事Review代码
4. 通过后合并到main分支
5. 自动部署到测试环境
```

---

**文档维护**: 本路线图每月更新一次,根据实际进展调整优先级。

**最后更新**: 2026年2月
**下次Review**: 2026年3月
