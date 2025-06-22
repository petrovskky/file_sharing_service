import magic
import logging
from datetime import datetime, timedelta

import aioboto3
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import JSONResponse, RedirectResponse

from ...config import settings
from ...dependencies import get_s3_session
from ...services.file_service import (
    delete_file_from_s3,
    generate_presigned_url,
    get_metadata,
    save_metadata,
    upload_file_to_s3,
)

router = APIRouter()
logger = logging.getLogger("file_service")


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    s3_session: aioboto3.Session = Depends(get_s3_session),
):
    if not file:
        raise HTTPException(
            status_code=400,
            detail="No file provided"
        )
    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="File content type not specified"
        )

    logger.info(
        f"Received upload request: filename={file.filename}, "
        f"content_type={file.content_type}"
    )

    file.file.seek(0)
    mime_check_bytes = file.file.read(settings.mime_check_size)
    file.file.seek(0)
    detected_mime = magic.from_buffer(mime_check_bytes, mime=True)
    if detected_mime not in settings.allowed_mime_types:
        logger.warning(f"Invalid MIME type: {detected_mime} for file {file.filename}")
        raise HTTPException(status_code=400, detail=f"Invalid file type: {detected_mime}")

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > settings.max_file_size:
        logger.warning(
            f"File too large: {file.filename} ({file_size} bytes)"
        )
        raise HTTPException(
            status_code=413,
            detail="File too large"
        )

    s3_key = None
    try:
        s3_key, uploaded_size = await upload_file_to_s3(
            s3_session,
            file.filename,
            file
        )

        if uploaded_size != file_size:
            logger.error(f"Size mismatch: expected {file_size}, got {uploaded_size}")
            raise HTTPException(status_code=500, detail="File size mismatch during upload")
        
        expiration = datetime.now() + timedelta(days=1)
        save_metadata(s3_key, file.filename, file_size, expiration)
        logger.info(f"File uploaded and metadata saved: {s3_key}")
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        if s3_key:
            try:
                await delete_file_from_s3(s3_session, s3_key)
                logger.warning(f"Deleted orphaned S3 file: {s3_key}")
            except Exception as s3_error:
                logger.error(
                    f"Failed to delete orphaned S3 file: {s3_error}"
                )
        raise HTTPException(
            status_code=500,
            detail="Upload failed"
        )

    return JSONResponse(
        content={
            "message": "File uploaded successfully",
            "s3_key": s3_key,
        }
    )


@router.get("/download/{s3_key}")
async def download_file(
    s3_key: str,
    s3_session: aioboto3.Session = Depends(get_s3_session),
):
    """Redirect to presigned URL for file download."""
    metadata = get_metadata(s3_key)
    if not metadata:
        logger.warning(f"Download attempt for unknown key: {s3_key}")
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    if datetime.now() > metadata.expiration_time:
        logger.warning(f"Attempt to access expired link: {s3_key}")
        raise HTTPException(
            status_code=410,
            detail="Download link expired"
        )

    try:
        presigned_url = await generate_presigned_url(
            s3_session,
            s3_key,
            metadata.original_filename
        )
        logger.info(f"Presigned URL generated for download: {s3_key}")
        return RedirectResponse(presigned_url)
    except Exception as e:
        logger.error(f"Failed to generate presigned URL for {s3_key}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Link generation failed"
        )


@router.get("/metadata/{s3_key}")
async def get_metadata_endpoint(s3_key: str):
    metadata = get_metadata(s3_key)
    if not metadata:
        logger.warning(f"Metadata requested for unknown key: {s3_key}")
        raise HTTPException(
            status_code=404,
            detail="Metadata not found"
        )

    logger.info(f"Metadata retrieved for: {s3_key}")
    return {
        "s3_key": metadata.s3_key,
        "original_filename": metadata.original_filename,
        "size": metadata.size,
        "upload_time": metadata.upload_time.isoformat(),
        "expiration_time": metadata.expiration_time.isoformat(),
    }
