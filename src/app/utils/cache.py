from cachetools import TTLCache
from config.settings import Config

# Create a TTL cache that expires after 1 hour
story_cache = TTLCache(maxsize=100, ttl=Config.CACHE_TTL)

def get_cache_key(data: dict) -> str:
    """Generate a cache key from all input fields"""
    # Create a cache key that includes all fields
    key_parts = [
        data.get('mainPrompt', '').strip(),
        data.get('ageGroup', ''),
        data.get('moral', '').strip(),
        data.get('creature', '').strip(),
        data.get('magic', '').strip(),
        data.get('vibe', '').strip()
    ]
    return '_'.join(key_parts).lower().replace(' ', '')

def get_cached_story(data: dict) -> str:
    """Get story from cache if it exists"""
    cache_key = get_cache_key(data)
    return story_cache.get(cache_key)

def cache_story(data: dict, story: str) -> None:
    """Cache a generated story"""
    cache_key = get_cache_key(data)
    story_cache[cache_key] = story 