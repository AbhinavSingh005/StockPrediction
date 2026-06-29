import os
import requests

from dotenv import load_dotenv
from typing import List, Dict, Any

load_dotenv()

API_KEY = os.getenv("TWELVEDATA_API_KEY")
BASE_URL = "https://api.twelvedata.com"


class StockService:

    @staticmethod
    def search_tickers(query: str) -> List[Dict[str, Any]]:
        if not query:
            return []

        response = requests.get(
            f"{BASE_URL}/symbol_search",
            params={"symbol": query, "apikey": API_KEY},
            timeout=10
        )

        data = response.json()
        result = []

        for item in data.get("data", [])[:15]:
            result.append({
                "symbol": item.get("symbol"),
                "name": item.get("instrument_name"),
                "sector": None,
                "industry": None
            })

        return result

    @staticmethod
    def get_stock_quote(symbol: str) -> Dict[str, Any]:
        quote = requests.get(
            f"{BASE_URL}/quote",
            params={"symbol": symbol.upper(), "apikey": API_KEY},
            timeout=10
        ).json()

        if quote.get("code"):
            raise ValueError(quote.get("message", "Unable to fetch quote"))

        return {
            "symbol": quote["symbol"],
            "name": quote["name"],
            "price": float(quote["close"]),
            "change": float(quote["change"]),
            "change_percent": float(quote["percent_change"]),
            "high": float(quote["high"]),
            "low": float(quote["low"]),
            "open": float(quote["open"]),
            "previous_close": float(quote["previous_close"]),
            "volume": int(float(quote.get("volume", 0) or 0)),
            "market_cap": None,
            "pe_ratio": None
        }

    @staticmethod
    def get_historical_data(symbol: str, period: str = "1y", interval: str = "1d"):
        interval_map = {
            "1m": "1min",
            "5m": "5min",
            "15m": "15min",
            "30m": "30min",
            "1h": "1h",
            "1d": "1day",
            "1wk": "1week",
            "1mo": "1month"
        }

        outputsize_map = {
            "1d": 1,
            "5d": 5,
            "1mo": 30,
            "3mo": 90,
            "6mo": 180,
            "1y": 365,
            "2y": 730,
            "5y": 5000
        }

        response = requests.get(
            f"{BASE_URL}/time_series",
            params={
                "symbol": symbol.upper(),
                "interval": interval_map.get(interval, "1day"),
                "outputsize": outputsize_map.get(period, 365),
                "apikey": API_KEY
            },
            timeout=15
        )

        data = response.json()

        if "values" not in data:
            print(data)
            return []

        result = []
        for candle in reversed(data["values"]):
            result.append({
                "date": candle["datetime"],
                "open": float(candle["open"]),
                "high": float(candle["high"]),
                "low": float(candle["low"]),
                "close": float(candle["close"]),
                "volume": int(float(candle.get("volume", 0) or 0))
            })

        return result
