from langchain_core.tools import tool
from datetime import datetime
import requests
import urllib.parse

@tool
def get_current_time() -> str:
    """Returns the current date and time."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

@tool
def add_numbers(a: float, b: float) -> float:
    """Adds two numbers and returns the result."""
    return a + b

@tool
def multiply_numbers(a: float, b: float) -> float:
    """Multiplies two numbers and returns the result."""
    return a * b

@tool
def fetch_weather(city: str) -> str:
    """
    Fetches the current weather conditions for a given city.
    """
    try:
        encoded_city = urllib.parse.quote(city)
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={encoded_city}&count=1&language=en&format=json"
        geo_resp = requests.get(geo_url, timeout=10)
        geo_resp.raise_for_status()
        geo_data = geo_resp.json()
        
        if not geo_data.get("results"):
            return f"Error: Could not find location '{city}'"
            
        loc = geo_data["results"][0]
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={loc['latitude']}&longitude={loc['longitude']}&current_weather=true"
        weather_resp = requests.get(weather_url, timeout=10)
        weather_resp.raise_for_status()
        weather_data = weather_resp.json()
        
        current = weather_data.get("current_weather", {})
        return (
            f"Current weather in {loc['name']}, {loc.get('country', 'Unknown')}:\n"
            f"- Temperature: {current.get('temperature')}°C\n"
            f"- Wind Speed: {current.get('windspeed')} km/h"
        )
    except Exception as e:
        return f"Error fetching weather: {str(e)}"

@tool
def search_web(query: str) -> str:
    """
    Searches the web for up-to-date information on the given query.
    Use this to look up current events, facts, or recent developments.
    """
    import re
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
        }
        encoded_query = urllib.parse.quote(query)
        resp = requests.get(f"https://html.duckduckgo.com/html/?q={encoded_query}", headers=headers, timeout=15)
        resp.raise_for_status()
        
        snippets = re.findall(r'<a class="result__snippet[^>]*>(.*?)</a>', resp.text, re.IGNORECASE | re.DOTALL)
        
        if not snippets:
            return f"No recent information found on the web for '{query}'"
            
        clean_snippets = []
        for s in snippets[:3]:
            # Remove HTML tags
            clean_s = re.sub(r'<[^>]*>', '', s).strip()
            # Decode HTML entities if needed (basic)
            clean_s = clean_s.replace('&quot;', '"').replace('&#39;', "'").replace('&amp;', '&')
            clean_snippets.append(f"- {clean_s}")
            
        return f"Web Search Results for '{query}':\n" + "\n".join(clean_snippets)
    except Exception as e:
        return f"Error searching the web: {str(e)}"

AVAILABLE_TOOLS = {
    "get_current_time": get_current_time,
    "add_numbers": add_numbers,
    "multiply_numbers": multiply_numbers,
    "fetch_weather": fetch_weather,
    "search_web": search_web,
    "search_wikipedia": search_web,  # Alias for backward compatibility
}
