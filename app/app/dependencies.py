import aioboto3

from .config import settings


# Create reusable S3 session instance
session = aioboto3.Session(
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    region_name=settings.s3_region,
)


def get_s3_session():
    return session
