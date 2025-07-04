import uvicorn

import logging
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI

from .api.v1.endpoints import router as api_router
from .database import Base, engine


log_formatter = logging.Formatter(
    "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
file_handler = RotatingFileHandler(
    filename="app.log",
    maxBytes=5_000_000,
    backupCount=5
)
file_handler.setFormatter(log_formatter)

console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)

logger = logging.getLogger("file_service")
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)
logger.addHandler(console_handler)

app = FastAPI(title="File Upload Service")

Base.metadata.create_all(bind=engine)

app.include_router(
    api_router,
    prefix="/api/v1"
)

if __name__ == "__main__":    
    logger.info("Starting FastAPI application")
    uvicorn.run(
        "app.main:app",
        reload=True
    )
