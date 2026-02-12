import boto3
from botocore.client import Config
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            config=Config(signature_version="s3v4"),
            region_name=settings.S3_REGION_NAME
        )
        self.bucket_name = settings.S3_BUCKET_NAME

    def generate_presigned_url(self, object_name: str, expiration: int = 3600, method: str = "put_object") -> str:
        """
        Generate a presigned URL to share an S3 object
        """
        try:
            response = self.s3_client.generate_presigned_url(
                method,
                Params={
                    "Bucket": self.bucket_name,
                    "Key": object_name
                },
                ExpiresIn=expiration
            )
        except Exception as e:
            print(e)
            return None
        return response

    def upload_file(self, file_content, object_name: str) -> bool:
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_name,
                Body=file_content
            )
        except Exception as e:
            print(e)
            return False
        return True

    def upload_file_path(self, file_path: str, object_name: str) -> bool:
        try:
            self.s3_client.upload_file(file_path, self.bucket_name, object_name)
        except Exception as e:
            print(e)
            return False
        return True

storage_service = StorageService()
