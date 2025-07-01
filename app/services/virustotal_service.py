import httpx
from ..config import settings

VIRUSTOTAL_URL = "https://www.virustotal.com/api/v3/files/{}"

async def check_hash_virustotal(sha256_hash: str) -> bool:
    """
    Returns True if the file is malicious, False if clean or unknown.
    """
    headers = {"x-apikey": settings.virustotal_api_key}
    async with httpx.AsyncClient() as client:
        resp = await client.get(VIRUSTOTAL_URL.format(sha256_hash), headers=headers)
        if resp.status_code == 404:
            # Hash not found in VirusTotal
            return False
        resp.raise_for_status()
        data = resp.json()
        # Check if any engine flagged the file as malicious
        stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
        return stats.get("malicious", 0) > 0 