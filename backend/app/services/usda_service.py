import httpx

from app.config import get_settings


class USDAService:
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.USDA_API_KEY
        self.base_url = settings.USDA_BASE_URL

    async def search_food(self, query: str, page_size: int = 5) -> list[dict]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/foods/search",
                params={"api_key": self.api_key},
                json={
                    "query": query,
                    "pageSize": page_size,
                    "dataType": [
                        "Survey (FNDDS)",
                        "SR Legacy",
                        "Foundation",
                    ],
                },
                timeout=15.0,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("foods", [])

    async def get_food_details(self, fdc_id: int) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/food/{fdc_id}",
                params={"api_key": self.api_key},
                timeout=15.0,
            )
            response.raise_for_status()
            return response.json()

    async def get_food_portions(self, fdc_id: int) -> list[dict]:
        details = await self.get_food_details(fdc_id)
        return details.get("foodPortions", [])
