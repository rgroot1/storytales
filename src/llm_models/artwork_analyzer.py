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

# Cache that expires after 1 hour
artwork_cache = TTLCache(maxsize=100, ttl=3600)

class ArtworkAnalyzer:
    """
    Analyzes children's artwork using LearnLM API to generate story elements
    """
    def __init__(self):
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"  # Verify this is the correct endpoint
        self.model = "google/learnlm-1.5-pro-experimental:free"
        current_app.logger.debug(f"Initialized ArtworkAnalyzer with model: {self.model}")
        self.max_field_length = 300
        self.max_file_size = 5 * 1024 * 1024  # 5MB limit
        self.allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif'}  # No PDF for MVP as it's not an image format

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
        try:
            # Debug API key
            api_key = os.getenv('OPENROUTER_API_KEY')
            current_app.logger.debug(f"API Key present: {bool(api_key)}")
            if not api_key:
                raise ValueError("OpenRouter API key not found in environment")
            
            # Strip any whitespace from API key
            api_key = api_key.strip()
            
            # Verify API key format
            if not api_key.startswith('sk-'):
                current_app.logger.error("API key format appears invalid")
                raise ValueError("Invalid API key format")
            
            # Validate file size
            image_file.seek(0, 2)
            file_size = image_file.tell()
            image_file.seek(0)
            
            if file_size > self.max_file_size:
                raise ValueError(f"Image file too large. Maximum size is {self.max_file_size/1024/1024:.1f}MB")
            
            # Validate file extension
            filename = image_file.filename.lower()
            ext = os.path.splitext(filename)[1]
            if ext not in self.allowed_extensions:
                raise ValueError(f"Invalid file type. Allowed types are: {', '.join(self.allowed_extensions)}")

            # Compress image
            compressed_image = self._compress_image(image_file)
            
            # Check cache
            cache_key = self._get_cache_key(compressed_image, keywords)
            cached_result = artwork_cache.get(cache_key)
            if cached_result:
                current_app.logger.info("Returning cached artwork analysis")
                return cached_result

            # Prepare headers
            headers = {
                "Authorization": api_key.strip(),  # Remove 'Bearer ' prefix
                "HTTP-Referer": "https://storytales.kids",
                "X-Title": "StoryTales",
                "Content-Type": "application/json"
            }

            # Debug headers
            current_app.logger.debug(f"Authorization header length: {len(headers['Authorization'])}")
            current_app.logger.debug(f"Authorization header first 10 chars: {headers['Authorization'][:10]}...")
            current_app.logger.debug(f"Full headers: {headers}")

            # Prepare the prompt
            prompt = f"""You are a parent helping young children (ages 3-5) explore their artwork and create stories based on the artwork.
            {f'Additional context: {keywords}' if keywords else ''}
            
            Please provide specific observations about the artwork, ask open-ended questions and suggest story elements.
            Focus on encouraging and imaginative interpretations suitable for young children."""

            # Prepare payload
            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{self._encode_image(image_file)}"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 1000,  # Add token limit
                "temperature": 0.7   # Add temperature
            }

            # Debug payload (excluding the base64 image for brevity)
            debug_payload = dict(payload)
            debug_payload["messages"][0]["content"][1]["image_url"]["url"] = "[BASE64_IMAGE]"
            current_app.logger.debug(f"Request payload structure: {json.dumps(debug_payload, indent=2)}")

            # Make API request
            current_app.logger.debug(f"Making API request to {self.api_url}")
            current_app.logger.debug(f"Headers: {headers}")
            current_app.logger.debug(f"Payload size: {len(str(payload))} bytes")
            current_app.logger.debug(f"Model being used: {self.model}")
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=30
            )

            if response.status_code != 200:
                current_app.logger.error(f"LearnLM API error: {response.text}")
                current_app.logger.error(f"Response status code: {response.status_code}")
                current_app.logger.error(f"Response headers: {response.headers}")
                error_data = response.json()
                error_message = error_data.get('error', {}).get('message', str(error_data))
                current_app.logger.error(f"Full error data: {error_data}")
                raise Exception(f"API Error: {error_message}")

            # Parse response
            result = response.json()
            current_app.logger.info("LearnLM API Response:")
            current_app.logger.info(json.dumps(result, indent=2))
            
            # Check for API errors
            if 'error' in result:
                error_msg = result.get('error', {}).get('message', 'Unknown API error')
                if 'quota exceeded' in error_msg.lower() or result.get('error', {}).get('code') == 429:
                    raise ValueError("We're experiencing high traffic. Please try again in a minute.")
                raise ValueError(f"API Error: {error_msg}")
            
            try:
                analysis_text = result['choices'][0]['message']['content']
                # Try to parse as JSON first
                try:
                    parsed_response = json.loads(analysis_text)
                    current_app.logger.debug("Successfully parsed JSON response")
                    
                    # Extract directly from structured response
                    analysis = {
                        "comments": parsed_response.get("comments", []),
                        "questions": parsed_response.get("questions", []),
                        "story_elements": {
                            "characters": parsed_response.get("story_elements", {}).get("characters", ["A friendly character"]),
                            "setting/vibe": parsed_response.get("story_elements", {}).get("setting/vibe", "A magical place"),
                            "moral": parsed_response.get("story_elements", {}).get("moral", "A story about friendship"),
                            "opening_line": parsed_response.get("story_elements", {}).get("opening_line", "Once upon a time...")
                        }
                    }
                    
                    # Log parsed elements for debugging
                    current_app.logger.debug("Parsed JSON elements:")
                    current_app.logger.debug(json.dumps(analysis, indent=2))
                    
                    # Cache and return the result
                    artwork_cache[cache_key] = analysis
                    return analysis
                    
                except json.JSONDecodeError:
                    current_app.logger.warning("Failed to parse JSON response, falling back to text parsing")
                    # Initialize default structure
                    analysis = {
                        "comments": [],
                        "questions": [],
                        "story_elements": {
                            "characters": ["A friendly character"],
                            "setting/vibe": "A magical place",
                            "moral": "A story about friendship",
                            "opening_line": "Once upon a time..."
                        }
                    }
                    
                    # Parse the markdown-formatted response
                    sections = analysis_text.split('**')
                    
                    # Parse each section
                    for section in sections:
                        if section.startswith('Observations:'):
                            analysis["comments"] = [line.strip('* "\n') for line in section.split('\n') 
                                                  if line.strip().startswith('*')]
                        elif section.startswith('Open-ended questions:'):
                            analysis["questions"] = [line.strip('* "\n') for line in section.split('\n')
                                                   if line.strip().startswith('*')]
                        elif section.startswith('Story Elements:'):
                            story_lines = [line.strip('* "\n') for line in section.split('\n')
                                         if line.strip().startswith('*')]
                            if story_lines:
                                # Log the parsed lines
                                current_app.logger.debug(f"Parsed story lines: {story_lines}")
                                
                                # Extract character suggestions
                                character_lines = [line for line in story_lines[:2]]  # Take first two lines
                                if character_lines:
                                    analysis["story_elements"]["characters"] = character_lines
                                
                                # Extract setting/vibe (usually in the middle)
                                if len(story_lines) > 2:
                                    analysis["story_elements"]["setting/vibe"] = story_lines[2]
                                
                                # Extract moral/theme (usually near the end)
                                if len(story_lines) > 3:
                                    analysis["story_elements"]["moral"] = story_lines[3]
                                
                                # Use first line as opening
                                analysis["story_elements"]["opening_line"] = story_lines[0]
                    
                    # Log parsed elements for debugging
                    current_app.logger.debug("Parsed text elements:")
                    current_app.logger.debug(json.dumps(analysis, indent=2))
                    
                    # Cache and return the result
                    artwork_cache[cache_key] = analysis
                    return analysis
                
            except (KeyError, IndexError) as e:
                current_app.logger.error(f"Unexpected API response format: {str(e)}")
                raise ValueError("We couldn't analyze your artwork. Please try again.")

        except Exception as e:
            current_app.logger.error(f"Artwork analysis failed: {str(e)}")
            if isinstance(e, ValueError):
                raise
            raise ValueError("An unexpected error occurred. Please try again.") from e 