from flask import current_app
import requests
import json
from PIL import Image
import io
from cachetools import TTLCache
import hashlib
import base64
from io import BytesIO
import os
import time

# Cache that expires after 1 hour
artwork_cache = TTLCache(maxsize=100, ttl=3600)

class ArtworkAnalyzer:
    """
    Analyzes children's artwork using LearnLM API to generate story elements
    """
    def __init__(self):
        self.model = "google/learnlm-1.5-pro-experimental:free"
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.max_file_size = 5 * 1024 * 1024  # 5MB
        self.allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif'}
        self.required_headers = {
            "HTTP-Referer": "https://storytales.kids",
            "X-Title": "StoryTales"
        }
        current_app.logger.debug(f"Initialized ArtworkAnalyzer with model: {self.model}")
        self.max_field_length = 300

        # Prompt template for artwork analysis
        self.prompt_template = """You are a parent helping young child (ages 3-5) explore their artwork and create stories.
Analyze the uploaded kid's artwork and used keywords "{keywords}" to generate engaging, child-friendly insights.

Please provide your response in the following format:

{
"comments": [
"2-3 specific, encouraging observations about the artwork",
"Focus on colors, shapes, or interesting details"
],
"questions": [
"2-3 open-ended questions that spark imagination",
"Questions should start with 'What', 'How', or 'Tell me about'"
],
"story_elements": {
"characters": ["Main character ideas based on the artwork"],
"setting/vibe": "Suggested story setting/vibe inspired by the artwork, like adventurous, silly, heartwarming",
"moral": "Child-friendly moral like friendship, bravery, discovery",
"opening_line": "A simple, engaging story starter"
}
}

Guidelines:
1. Keep language simple and positive
2. Focus on imagination and creativity
3. Avoid any scary or negative elements
4. Use concrete, specific observations
5. Make questions conversation starters
Keywords provided by parent: {keywords}"""

    def _compress_image(self, image_file, max_size=(800, 800), quality=85):
        """Compress uploaded image for API processing"""
        img = Image.open(image_file)
        
        # Convert to RGB if needed
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        # Resize if too large
        if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Save compressed image
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=quality, optimize=True)
        buffer.seek(0)
        
        return buffer

    def _get_cache_key(self, image_data, keywords):
        """Generate cache key from image data and keywords"""
        image_hash = hashlib.md5(image_data.getvalue()).hexdigest()
        keywords_hash = hashlib.md5(keywords.encode()).hexdigest()
        return f"{image_hash}_{keywords_hash}"

    def _truncate_field(self, text):
        """Truncate text to max field length"""
        return text[:self.max_field_length] if text else ""

    def _encode_image(self, image_file):
        """Convert image to base64 string"""
        # Reset file pointer to start
        image_file.seek(0)
        image_data = image_file.read()
        if len(image_data) == 0:
            raise ValueError("Empty image file")
        
        current_app.logger.debug(f"Image data length: {len(image_data)} bytes")
        current_app.logger.debug(f"First 20 bytes: {image_data[:20].hex()}")
        
        # Reset file pointer again for subsequent reads
        image_file.seek(0)
        return base64.b64encode(image_data).decode('utf-8')

    def analyze_artwork(self, image_file, keywords=""):
        """
        Analyze artwork and return structured insights
        
        Args:
            image_file: File object containing the artwork image
            keywords: String of keywords describing the artwork
        
        Returns:
            dict: Analysis results including comments, questions, and story elements
        """
        return self._try_analyze(image_file, keywords, self.model)

    def _clean_json_text(self, text):
        """Clean and extract JSON from text that may contain markdown or other formatting"""
        # First clean the text
        text = text.strip()
        
        # Remove markdown code blocks if present
        if text.startswith('```json'):
            text = text.replace('```json', '', 1)
        if text.endswith('```'):
            text = text[:-3]
        
        # Find the first { and last }
        start = text.find('{')
        end = text.rfind('}')
        
        if start >= 0 and end > start:
            text = text[start:end + 1]
        
        # Remove any leading/trailing whitespace or newlines
        text = text.strip()
        
        # Log the cleaning steps
        current_app.logger.debug("Text cleaning steps:")
        current_app.logger.debug(f"1. Original length: {len(text)}")
        current_app.logger.debug(f"2. Found JSON markers: start={start}, end={end}")
        current_app.logger.debug(f"3. Cleaned text: {text}")
        
        return text

    def _try_analyze(self, image_file, keywords, model):
        # Read image data once at the start
        image_file.seek(0)
        image_data = image_file.read()
        
        # Validate and prepare image
        file_size = len(image_data)
        if file_size > self.max_file_size:
            raise ValueError(f"Image file too large. Maximum size is {self.max_file_size/1024/1024:.1f}MB")
        
        # Validate file extension
        filename = image_file.filename.lower()
        ext = os.path.splitext(filename)[1]
        if ext not in self.allowed_extensions:
            raise ValueError(f"Invalid file type. Allowed types are: {', '.join(self.allowed_extensions)}")
        
        # Compress image
        compressed_image = self._compress_image(BytesIO(image_data))
        
        # Check cache
        cache_key = self._get_cache_key(compressed_image, keywords)
        cached_result = artwork_cache.get(cache_key)
        if cached_result:
            return cached_result
        
        # Default values for fallback
        default_analysis = {
            "comments": ["What a creative artwork!"],
            "questions": ["Tell me about your drawing?"],
            "story_elements": {
                "characters": ["A friendly character"],
                "setting/vibe": "A magical place",
                "moral": "A story about friendship",
                "opening_line": "Once upon a time..."
            }
        }

        try:
            # Prepare API request
            api_key = os.getenv('OPENROUTER_API_KEY')
            current_app.logger.debug("Preparing API request...")
            if not api_key:
                raise ValueError("OpenRouter API key not found in environment")
            
            headers = {
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json",
                **self.required_headers
            }
            current_app.logger.debug("Headers prepared")

            # Prepare payload
            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": self.prompt_template.format(keywords=keywords)},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{self._encode_image(compressed_image)}"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 1000,
                "temperature": 0.7
            }
            current_app.logger.debug("Payload prepared")

            try:
                current_app.logger.debug("Making API request to OpenRouter...")
                # Make single API call
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=30,
                    verify=True
                )
                current_app.logger.debug(f"API request completed with status: {response.status_code}")

                result = response.json()
                current_app.logger.debug(f"OpenRouter Response Status: {response.status_code}")
                current_app.logger.debug(f"OpenRouter Response Body: {json.dumps(result, indent=2)}")

                # Check for any errors in the response
                if 'error' in result:
                    error_data = result.get('error', {})
                    error_code = error_data.get('code')
                    error_msg = error_data.get('message', 'Unknown error')
                    
                    # Log error details
                    current_app.logger.debug(f"Error Code: {error_code}")
                    current_app.logger.debug(f"Error Message: {error_msg}")
                    
                    # Handle all errors with clear messages
                    if error_code == 429 or 'quota exceeded' in error_msg.lower():
                        raise ValueError("Google AI is currently at capacity. Please try again in a few minutes.")
                    elif error_code == 401:
                        raise ValueError("Invalid API key - please check your OpenRouter credentials")
                    elif error_code == 402:
                        raise ValueError("Insufficient API credits - please top up your account")
                    elif 'Provider returned error' in error_msg:
                        raise ValueError("The AI service is temporarily unavailable. Please try again in a moment.")
                    else:
                        raise ValueError(f"API Error: {error_msg}")

                # Process successful result
                try:
                    analysis_text = result['choices'][0]['message']['content']
                    current_app.logger.debug("Raw API response:")
                    current_app.logger.debug(json.dumps(result, indent=2))
                    current_app.logger.debug("Extracted content:")
                    current_app.logger.debug(analysis_text)

                except (KeyError, IndexError) as e:
                    current_app.logger.error(f"Failed to extract content from response: {str(e)}")
                    current_app.logger.error(f"Full response structure: {json.dumps(result, indent=2)}")
                    return default_analysis

                current_app.logger.debug("Raw analysis text:")
                current_app.logger.debug("----------------------------------------")
                current_app.logger.debug(analysis_text)
                current_app.logger.debug("----------------------------------------")
                
                try:
                    # Clean and parse the JSON
                    cleaned_text = self._clean_json_text(analysis_text)
                    current_app.logger.debug("Cleaned JSON text:")
                    current_app.logger.debug(cleaned_text)
                    
                    parsed_response = json.loads(cleaned_text)
                    
                    analysis = {
                        "comments": parsed_response.get("comments", ["What a creative artwork!"]),
                        "questions": parsed_response.get("questions", ["Tell me about your drawing?"]),
                        "story_elements": {
                            "characters": parsed_response.get("story_elements", {}).get("characters", ["A friendly character"]),
                            "setting/vibe": parsed_response.get("story_elements", {}).get("setting/vibe", "A magical place"),
                            "moral": parsed_response.get("story_elements", {}).get("moral", "A story about friendship"),
                            "opening_line": parsed_response.get("story_elements", {}).get("opening_line", "Once upon a time...")
                        }
                    }
                    
                    # Cache and return result
                    artwork_cache[cache_key] = analysis
                    return analysis
                    
                except (json.JSONDecodeError, KeyError) as e:
                    current_app.logger.error(f"Error parsing response: {str(e)}")
                    current_app.logger.info("Using default analysis")
                    return default_analysis

            except requests.exceptions.RequestException as e:
                current_app.logger.error(f"Request error: {str(e)}")
                raise ValueError("Network error. Please try again.")

        except Exception as e:
            current_app.logger.info(f"Falling back to default analysis due to: {type(e).__name__} - {str(e)}")
            return default_analysis 