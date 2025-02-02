from cachetools import TTLCache
import hashlib
import json

# Cache that expires after 1 hour (3600 seconds)
story_cache = TTLCache(maxsize=100, ttl=3600)

def get_cache_key(data):
    """Generate a unique cache key from the input data"""
    # Sort the dictionary to ensure consistent keys for same data
    sorted_data = json.dumps(data, sort_keys=True)
    return hashlib.md5(sorted_data.encode()).hexdigest()

def get_cached_story(data):
    """Get story from cache if it exists"""
    cache_key = get_cache_key(data)
    return story_cache.get(cache_key)

def cache_story(data, story):
    """Cache the generated story"""
    cache_key = get_cache_key(data)
    story_cache[cache_key] = story 