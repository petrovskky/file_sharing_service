import os
import uuid
from datetime import datetime

import aioboto3
from fastapi import HTTPException, UploadFile

from ..config import settings
from ..database import SessionLocal
from ..models import FileMetadata


async def upload_file_to_s3(
    session: aioboto3.Session,
    filename: str,
    file: UploadFile
):
    file_ext = os.path.splitext(filename)[1]
    if not file_ext:
        raise HTTPException(
            status_code=400,
            detail="File has no extension"
        )
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    async with session.client('s3') as s3_client:
        multipart_upload = await s3_client.create_multipart_upload(
            Bucket=settings.s3_bucket_name,
            Key=unique_filename
        )
        upload_id = multipart_upload['UploadId']

        parts = []
        part_number = 1
        file_size = 0
        try:
            while True:
                chunk = await file.read(settings.chunk_size)
                if not chunk:
                    break
                file_size += len(chunk)

                part = await s3_client.upload_part(
                    Bucket=settings.s3_bucket_name,
                    Key=unique_filename,
                    PartNumber=part_number,
                    UploadId=upload_id,
                    Body=chunk
                )

                etag = part['ETag']

                parts.append({
                    'PartNumber': part_number,
                    'ETag': etag
                })
                part_number += 1

            parts = sorted(parts, key=lambda x: x['PartNumber'])

        except Exception as e:
            await s3_client.abort_multipart_upload(
                Bucket=settings.s3_bucket_name,
                Key=unique_filename,
                UploadId=upload_id
            )
            raise e

        try:
            await s3_client.complete_multipart_upload(
                Bucket=settings.s3_bucket_name,
                Key=unique_filename,
                UploadId=upload_id,
                MultipartUpload={'Parts': parts}
            )
        except Exception as e:
            print(f"Error completing multipart upload. Parts: {parts}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to complete multipart upload: {str(e)}"
            )

    return unique_filename, file_size


def save_metadata(
    s3_key: str,
    original_filename: str,
    size: int,
    expiration: datetime
):
    db = SessionLocal()
    try:
        file_metadata = FileMetadata(
            s3_key=s3_key,
            original_filename=original_filename,
            size=size,
            upload_time=datetime.now(),
            expiration_time=expiration
        )
        db.add(file_metadata)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def get_metadata(s3_key: str):
    db = SessionLocal()
    try:
        metadata = db.query(FileMetadata).filter(
            FileMetadata.s3_key == s3_key
        ).first()
        return metadata
    finally:
        db.close()


async def generate_presigned_url(
    session: aioboto3.Session,
    s3_key: str,
    original_filename: str
):
    async with session.client('s3') as s3_client:
        presigned_url = await s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.s3_bucket_name,
                'Key': s3_key,
                'ResponseContentDisposition': (
                    f'attachment; filename="{original_filename}"'
                )
            },
            ExpiresIn=300
        )
    return presigned_url


async def delete_file_from_s3(
    session: aioboto3.Session,
    s3_key: str
):
    async with session.client('s3') as s3_client:
        await s3_client.delete_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key
        )
