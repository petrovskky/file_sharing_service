import httpx
from ..config import settings


async def check_hash_virustotal(sha256_hash: str) -> bool:
    headers = {"x-apikey": settings.virustotal_api_key}
    async with httpx.AsyncClient() as client:
        resp = await client.get(settings.virustotal_url.format(sha256_hash), headers=headers)
        if resp.status_code == 404:
            return False
        resp.raise_for_status()
        data = resp.json()
        stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
        return stats.get("malicious", 0) > 0
