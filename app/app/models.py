from sqlalchemy import Column, DateTime, Integer, String

from .database import Base


class FileMetadata(Base):
    """
    Database model for storing file metadata.

    Attributes:
        s3_key: Unique S3 object key (primary key)
        original_filename: Original filename provided by user
        size: File size in bytes
        upload_time: Timestamp of file upload
        expiration_time: Timestamp when file becomes unavailable
    """
    __tablename__ = "file_metadata"

    s3_key = Column(String, primary_key=True, index=True)
    original_filename = Column(String)
    size = Column(Integer)
    upload_time = Column(DateTime)
    expiration_time = Column(DateTime)
