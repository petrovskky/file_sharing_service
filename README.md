**File Sharing Application**

**Purpose:** Secure temporary file sharing. Files auto-delete after 24 hours.

**Key Features:**  
1.  **Upload/Download:** Web interface for file transfers.  
2.  **Storage:** Files stored in **Amazon S3**.
3.  **Auto-Delete:** S3 lifecycle policy deletes files after 24h (TTL).  
4.  **Security:**
    - MIME type validation  
    - HTTPS (SSL via Certbot/Let's Encrypt)  
5.  **Large Files:** **Chunked uploads** support  
6.  **Metadata:** File info stored in **PostgreSQL**.  

**Tech Stack:**  
- **Backend:** FastAPI  
- **Storage:** Amazon S3  
- **Database:** PostgreSQL

**Link for testing**
- [https](https://app.nonstudents.online/)
