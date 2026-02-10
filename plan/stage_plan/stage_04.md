# Stage 04: 任务队列与存储系统

## 目标
集成 Celery/RabbitMQ 处理异步任务，集成 S3/MinIO 处理文件存储。

## 功能列表
1. **Celery 配置**: 配置 Celery app 连接 Redis/RabbitMQ。
2. **S3 客户端**: 封装 S3 上传/下载/预签名 URL 生成工具。
3. **文件上传 API**: 实现 `POST /upload/presigned-url` 或直接上传接口。

## Todo List
- [x] 配置 `backend/app/core/celery_app.py`。
- [x] 创建 `backend/app/workers/tasks.py` (定义一个测试任务)。
- [x] 配置 `backend/app/services/storage_service.py` (Boto3)。
- [x] 实现文件上传 API，支持上传图片和视频。
- [x] 验证 Worker 能成功消费任务。
- [x] 验证文件能成功上传到 S3/MinIO。
