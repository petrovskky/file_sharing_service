from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    s3_bucket_name: str
    aws_access_key_id: str
    aws_secret_access_key: str
    s3_region: str
    max_file_size: int
    chunk_size: int
    database_url: str 
    mime_check_size: int
    allowed_mime_types: list
    virustotal_api_key: str
    virustotal_url: str


settings = Settings()
