from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    s3_bucket_name: str
    aws_access_key_id: str
    aws_secret_access_key: str
    s3_region: str = "us-east-1"
    max_file_size: int = 150 * 1024 * 1024  # 150MB
    chunk_size: int = 5 * 1024 * 1024  # For multipart uploads, 4MB
    database_url: str = (
        "postgresql://postgres:postgres@localhost:5432/FileShareDB"
    )
    mime_check_size: int = 512
    allowed_mime_types: list = [
        "application/pdf",
        "text/plain",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/bmp",
        "audio/mpeg",
        "video/mp4",
        "application/zip",
        "application/x-tar",
        "application/gzip",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]
    virustotal_api_key: str



settings = Settings()
