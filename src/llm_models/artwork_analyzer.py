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
import logging
import traceback

# Cache that expires after 1 hour
artwork_cache = TTLCache(maxsize=100, ttl=3600)

class ArtworkAnalyzer:
    """
    Analyzes children's artwork using LearnLM API to generate story elements
    """
    def __init__(self):
        self.model = "google/learnlm-1.5-pro-experimental:free"
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.max_file_size = 5 * 1024 * 1024 # 5MB
        self.allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif'}
        self.required_headers = {
            "HTTP-Referer": "https://storytales.kids",
            "X-Title": "StoryTales"
        }
        self.logger = current_app.logger
        self.logger.debug(f"Initialized ArtworkAnalyzer with model: {self.model}")
        self.max_field_length = 300
        
        # Add default_analysis as an instance attribute
        self.default_analysis = {
            "comments": ["What a creative artwork!"],
            "questions": ["Tell me about your drawing?"],
            "story_elements": {
                "characters": ["A friendly character"],
                "setting": ["A magical place", "A cozy home"],
                "moral": "A story about friendship"
            }
        }
        
        # Prompt template for artwork analysis - Note the double curly braces to escape them
        self.prompt_template = """You are a parent helping young child (ages 3-5) explore their artwork and create stories.
        
        # TASK
        Analyze the child's artwork and provide:
        1. Positive comments about the artwork
        2. Questions to ask the child about their artwork
        3. Story elements that could be used to create a story based on the artwork
        
        # OUTPUT FORMAT
        Respond with a JSON object with the following structure:
        ```json
        {{
          "comments": ["comment1", "comment2", ...],
          "questions": ["question1", "question2", ...],
          "story_elements": {{
            "characters": ["character1", "character2", ...],
            "setting": ["setting1", "setting2", ...],
            "moral": "A story about..."
          }}
        }}
        ```
        
        # GUIDELINES
        - Be encouraging and positive
        - Focus on creativity and imagination
        - Suggest story elements that would appeal to young children
        - Keep all text appropriate for young children
        - Limit each comment, question, and story element to 300 characters or less
        - Include 2-3 comments
        - Include 2-3 questions
        - Include 2-4 characters
        - Include 1-2 settings
        - Include a brief moral or theme for the story
        
        # KEYWORDS
        If provided, incorporate these keywords into your analysis: {keywords}
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
        
        self.logger.debug(f"Image data length: {len(image_data)} bytes")
        self.logger.debug(f"First 20 bytes: {image_data[:20].hex()}")
        
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
            self.logger.error(f"JSON Parse Error: {str(e)}")
            self.logger.error(f"Problematic text: {text}")
            raise

    def _try_analyze(self, image_file, keywords, model):
        """
        Try to analyze the artwork using the specified model.
        
        Args:
            image_file: The image file to analyze
            keywords: Keywords to guide the analysis
            model: The model to use for analysis
            
        Returns:
            dict: Analysis results
        """
        try:
            # Reset file pointer
            image_file.seek(0)
            
            # Encode the image as base64
            image_b64 = self._encode_image(image_file)
            
            # Prepare the API request
            self.logger.debug("Preparing API request...")
            
            # Get the API key
            api_key = os.environ.get('OPENROUTER_API_KEY')
            if not api_key:
                self.logger.error("OPENROUTER_API_KEY not found in environment variables")
                return self.default_analysis
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
            
            # Add required headers
            for key, value in self.required_headers.items():
                headers[key] = value
                
            self.logger.debug("Headers prepared")
            
            # Format the prompt
            prompt = self.prompt_template.format(keywords=keywords or "None provided")
            
            # Log image data length for debugging
            self.logger.debug(f"Image data length: {len(image_b64)} bytes")
            self.logger.debug(f"First 20 bytes: {image_file.read(20).hex()}")
            image_file.seek(0)  # Reset file pointer
            
            # Prepare the payload
            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                        ]
                    }
                ]
            }
            
            self.logger.debug("Payload prepared")
            
            # Make the API request
            try:
                self.logger.debug("Making API request to OpenRouter...")
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=30,
                    verify=True
                )
                self.logger.debug(f"API Response Status: {response.status_code}")
                result = response.json()
                
                # Log the full response for debugging
                self.logger.debug(f"API Response: {json.dumps(result, indent=2)}")
                
                # Check if the response has the expected structure
                if 'choices' not in result:
                    self.logger.error(f"Unexpected API response format: {json.dumps(result, indent=2)}")
                    return self.default_analysis
                
                analysis_text = result['choices'][0]['message']['content']
                
                # Extract the JSON part
                json_match = re.search(r'```json\s*(.*?)\s*```', analysis_text, re.DOTALL)
                if json_match:
                    analysis_json = json_match.group(1)
                else:
                    # Try to find any JSON object in the text
                    json_match = re.search(r'(\{.*\})', analysis_text, re.DOTALL)
                    if json_match:
                        analysis_json = json_match.group(1)
                    else:
                        self.logger.error(f"Could not extract JSON from response: {analysis_text}")
                        return self.default_analysis
                
                # Parse the JSON
                try:
                    analysis = json.loads(analysis_json)
                except json.JSONDecodeError as e:
                    self.logger.error(f"Failed to parse JSON: {str(e)}")
                    self.logger.error(f"JSON text: {analysis_json}")
                    return self.default_analysis
                
                # Validate the analysis structure
                if not isinstance(analysis, dict):
                    self.logger.error(f"Analysis is not a dictionary: {type(analysis)}")
                    return self.default_analysis
                
                required_keys = ['comments', 'questions', 'story_elements']
                for key in required_keys:
                    if key not in analysis:
                        self.logger.error(f"Missing required key in analysis: {key}")
                        return self.default_analysis
                
                # Validate story_elements
                story_elements = analysis.get('story_elements', {})
                if not isinstance(story_elements, dict):
                    self.logger.error(f"story_elements is not a dictionary: {type(story_elements)}")
                    return self.default_analysis
                
                required_story_keys = ['characters', 'setting', 'moral']
                for key in required_story_keys:
                    if key not in story_elements:
                        self.logger.error(f"Missing required key in story_elements: {key}")
                        story_elements[key] = self.default_analysis['story_elements'][key]
                
                # Ensure lists are lists
                for key in ['comments', 'questions']:
                    if not isinstance(analysis[key], list):
                        self.logger.error(f"{key} is not a list: {type(analysis[key])}")
                        analysis[key] = self.default_analysis[key]
                
                for key in ['characters', 'setting']:
                    if not isinstance(story_elements[key], list):
                        self.logger.error(f"{key} is not a list: {type(story_elements[key])}")
                        story_elements[key] = self.default_analysis['story_elements'][key]
                
                # Truncate long fields
                for key in ['comments', 'questions']:
                    analysis[key] = [item[:self.max_field_length] for item in analysis[key]]
                
                for key in ['characters', 'setting']:
                    story_elements[key] = [item[:self.max_field_length] for item in story_elements[key]]
                
                if isinstance(story_elements['moral'], str):
                    story_elements['moral'] = story_elements['moral'][:self.max_field_length]
                
                return analysis
                
            except requests.exceptions.RequestException as e:
                self.logger.error(f"Request error: {str(e)}")
                return self.default_analysis
                
        except Exception as e:
            self.logger.error(f"Unexpected error in _try_analyze: {str(e)}")
            self.logger.error(f"Full stack trace:\n{traceback.format_exc()}")
            return self.default_analysis 