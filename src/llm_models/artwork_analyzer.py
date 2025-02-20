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
import re

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

{{
"comments": [
"2-3 specific, encouraging observations about the artwork",
"Focus on colors, shapes, or interesting details"
],
"questions": [
"2-3 open-ended questions that spark imagination",
"Questions should start with 'What', 'How', or 'Tell me about'"
],
"story_elements": {{
"characters": ["Main character ideas based on the artwork"],
"setting": ["Two different settings inspired by the artwork, like 'magical forest', 'cozy treehouse'"],
"moral": "Two different Child-friendly morals, like friendship, bravery, discovery"
}}
}}

Guidelines:
1. Keep language simple and child-friendly
2. Focus on imagination and creativity
3. Reflect the Keywords: {keywords} in the story_elements
4. Do not include periods in the story_elements
"""

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
        """Analyze artwork and return structured insights"""
        try:
            analysis = self._try_analyze(image_file, keywords, self.model)
            
            # Debug log the raw analysis
            current_app.logger.debug("Raw analysis from _try_analyze:")
            current_app.logger.debug(json.dumps(analysis, indent=2))
            
            if not analysis:
                current_app.logger.error("Analysis is None or empty")
                raise ValueError("No analysis returned from _try_analyze")
            
            if not isinstance(analysis, dict):
                current_app.logger.error(f"Analysis is not a dict, got {type(analysis)}")
                raise ValueError(f"Invalid analysis type: {type(analysis)}")
            
            # Check story_elements existence
            if "story_elements" not in analysis:
                current_app.logger.error("story_elements missing from analysis")
                current_app.logger.error(f"Available keys: {list(analysis.keys())}")
                raise ValueError("Missing story_elements in analysis")
            
            # Format the response to match what the frontend expects
            formatted_response = {
                "success": True,
                "analysis": {
                    "comments": analysis.get("comments", []),
                    "questions": analysis.get("questions", []),
                    "story_elements": {
                        "characters": analysis.get("story_elements", {}).get("characters", []),
                        "setting": analysis.get("story_elements", {}).get("setting", ["A magical place", "A cozy home"]),
                        "moral": analysis.get("story_elements", {}).get("moral", "")
                    }
                }
            }
            
            # Verify the formatted response
            current_app.logger.debug("Formatted response structure:")
            current_app.logger.debug(json.dumps(formatted_response, indent=2))
            
            if "story_elements" not in formatted_response["analysis"]:
                current_app.logger.error("story_elements missing from formatted response")
                raise ValueError("Failed to include story_elements in formatted response")
            
            return formatted_response
            
        except Exception as e:
            current_app.logger.error(f"Error in analyze_artwork: {str(e)}")
            current_app.logger.error("Full stack trace:", exc_info=True)
            # Return error response
            return {
                "success": False,
                "error": "Failed to analyze artwork",
                "details": str(e)
            }

    def _clean_json_text(self, text):
        """Clean and extract JSON from text that may contain markdown or other formatting"""
        try:
            # Remove any markdown code blocks if present
            if text.startswith('```json'):
                text = text.replace('```json', '', 1)
            if text.endswith('```'):
                text = text[:-3]
            
            # Find the JSON object
            start = text.find('{')
            end = text.rfind('}') + 1
            if start >= 0 and end > start:
                text = text[start:end]

            # Let json.loads handle the parsing
            parsed = json.loads(text)
            return json.dumps(parsed)  # Return clean, formatted JSON
            
        except json.JSONDecodeError as e:
            current_app.logger.error(f"JSON Parse Error: {str(e)}")
            current_app.logger.error(f"Problematic text: {text}")
            raise

    def _try_analyze(self, image_file, keywords, model):
        try:
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
                    "setting": ["A magical place", "A cozy home"],
                    "moral": "A story about friendship"
                }
            }

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
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=30,
                    verify=True
                )
                
                current_app.logger.debug(f"API Response Status: {response.status_code}")
                
                result = response.json()
                analysis_text = result['choices'][0]['message']['content']
                
                # Clean and parse the JSON
                cleaned_text = self._clean_json_text(analysis_text)
                current_app.logger.debug("Cleaned JSON text:")
                current_app.logger.debug(cleaned_text)
                
                parsed_response = json.loads(cleaned_text)
                current_app.logger.debug("Parsed JSON response:")
                current_app.logger.debug(json.dumps(parsed_response, indent=2))
                
                # Validate required fields
                if "story_elements" not in parsed_response:
                    current_app.logger.error("Missing story_elements in parsed response")
                    current_app.logger.error(f"Available keys: {list(parsed_response.keys())}")
                    raise ValueError("Missing story_elements in API response")
                
                # Format the response
                analysis = {
                    "comments": parsed_response.get("comments", ["What a creative artwork!"]),
                    "questions": parsed_response.get("questions", ["Tell me about your drawing?"]),
                    "story_elements": {
                        "characters": parsed_response["story_elements"].get("characters", ["A friendly character"]),
                        "setting": parsed_response["story_elements"].get("setting", ["A magical place", "A cozy home"]),
                        "moral": parsed_response["story_elements"].get("moral", "A story about friendship")
                    }
                }
                
                # Verify analysis structure before returning
                current_app.logger.debug("Final analysis structure:")
                current_app.logger.debug(json.dumps(analysis, indent=2))
                
                if "story_elements" not in analysis:
                    current_app.logger.error("story_elements missing from final analysis")
                    raise ValueError("Failed to include story_elements in analysis")
                
                # Cache and return result
                artwork_cache[cache_key] = analysis
                return analysis

            except Exception as e:
                current_app.logger.error(f"API error: {str(e)}")
                current_app.logger.error("Full stack trace:", exc_info=True)
                raise
            
        except Exception as e:
            current_app.logger.error(f"Unexpected error in _try_analyze: {str(e)}")
            current_app.logger.error("Full stack trace:", exc_info=True)
            return self.default_analysis 