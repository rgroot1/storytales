from src.app.utils.limiter import limiter
from flask import current_app
import requests
import json
import random
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
requests_log = logging.getLogger("urllib3")
requests_log.setLevel(logging.DEBUG)
requests_log.propagate = True

class StoryGenerator:
    """
    Story generator using Perplexity AI API
    Version: 1.0.0
    """
    def __init__(self):
        self.model = "sonar"
        self.api_url = "https://api.perplexity.ai/chat/completions"
        
        # Age-specific token limits
        self.token_limits = {
            'baby': {
                'normal': 130,   # ~100 words
                'short': 65      # ~50 words
            },
            'preK': {
                'normal': 650,   # ~500 words
                'short': 520     # ~400 words
            },
            'growing': {
                'normal': 1950,  # ~1500 words
                'short': 1040    # ~800 words
            }
        }
        
        if not current_app.config['PERPLEXITY_API_KEY']:
            raise ValueError("Perplexity API key not found in environment variables")
        
        # Story templates with matching criteria
        self.story_templates = [
            {"name": "The Magic Surprise", "description": "A magical object changes something in an unexpected way.", "matches": ["magic"]},
            {"name": "The Silly Problem", "description": "A funny obstacle makes things harder before it gets solved.", "matches": []},
            {"name": "The Big Mix-Up", "description": "A misunderstanding leads to a humorous situation.", "matches": ["moral"]},
            {"name": "The Opposite Day", "description": "Everything works backward, causing funny chaos.", "matches": ["magic", "vibe"]},
            {"name": "The Wacky Rule", "description": "A strange rule must be followed, but why?", "matches": ["vibe"]},
            {"name": "The Friendly Trick", "description": "A trick backfires or surprises the character.", "matches": []},
            {"name": "The Helping Hand", "description": "A character helps someone and learns something important.", "matches": ["moral", "creature"]},
            {"name": "The Countdown Race", "description": "Something must be done before time runs out.", "matches": ["vibe"]},
            {"name": "The Swap Story", "description": "The character swaps places with another in a funny or magical way.", "matches": ["magic", "creature"]},
            {"name": "The Mysterious Object", "description": "A strange object leads to an unexpected discovery.", "matches": ["magic"]},
            {"name": "Oops, That Worked?", "description": "A mistake turns out to be the perfect solution.", "matches": ["moral"]},
            {"name": "The Backfired Plan", "description": "The character tries something clever, but it backfires hilariously.", "matches": ["moral"]},
            {"name": "The Wrong Assumption", "description": "The character believes something false, leading to a funny or surprising realization.", "matches": ["magic", "creature"]}
        ]
        
        # Configure session for better performance
        self.session = requests.Session()
        adapter = HTTPAdapter(
            pool_connections=20,
            pool_maxsize=20,
            max_retries=Retry(
                total=3,
                backoff_factor=1,
                status_forcelist=[408, 429, 500, 502, 503, 504],
                allowed_methods=None,  # Allow retries on all methods
            )
        )
        self.session.mount("https://", adapter)
        self.session.headers.update({
            "Authorization": f"Bearer {current_app.config['PERPLEXITY_API_KEY']}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Connection": "keep-alive",
            "Keep-Alive": "timeout=60, max=1000"
        })
    
    def calculate_max_tokens(self, prompt: str, age_group: str = 'growing', constrain_length: bool = False) -> int:
        """Calculate max tokens based on prompt length"""
        # Estimate prompt tokens (rough estimation)
        estimated_prompt_tokens = len(prompt.split()) * 1.3
        
        # Get age-appropriate token limit
        limits = self.token_limits.get(age_group, self.token_limits['growing'])
        base_limit = limits['short'] if constrain_length else limits['normal']
        
        # Calculate remaining tokens for response
        available_tokens = 2000 - estimated_prompt_tokens
        
        # Ensure we have enough tokens for a complete story
        max_response_tokens = min(available_tokens, base_limit)
        return int(max_response_tokens)
    
    @limiter.limit("5 per minute")  # Keep rate limiting for API protection
    def generate_story(self, data):
        """
        Generate a story based on the provided data.
        
        Args:
            data (dict): Contains:
                - mainPrompt (str): Main story idea
                - ageGroup (str): 'baby', 'preK', or 'growing'
                - moral (str, optional): Moral of the story
                - creature (str, optional): Additional character
                - magic (str, optional): Magical element
                - vibe (str, optional): Story mood/setting
        """
        try:
            start_time = time.time()
            
            # Basic validation
            if not data.get('mainPrompt'):
                raise ValueError("Main prompt is required")
            
            # Format the prompt
            prompt = self._format_prompt(data)
            current_app.logger.info(f"Final prompt:\n{prompt}")
            
            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a creative children's story writer. Create engaging, age-appropriate stories that are imaginative and educational."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.7,     # Balanced creativity
                "frequency_penalty": 1,  # Standard repetition control
                "max_tokens": self.calculate_max_tokens(prompt, data.get('ageGroup', 'preK')),
            }
            
            current_app.logger.info("Starting API request...")
            
            response = self.session.post(
                self.api_url,
                json=payload,
                timeout=(5, 60),  # (connect timeout, read timeout)
                stream=False
            )
            
            # Check response immediately
            if not response.ok:
                current_app.logger.error(f"API error {response.status_code}: {response.text}")
                if response.status_code == 429:
                    raise Exception("We're generating too many stories too quickly. Please wait a moment.")
                elif response.status_code == 401:
                    raise Exception("Story service authentication failed. Please try again later.")
                else:
                    raise Exception("Story generation encountered an error. Please try again.")
            
            try:
                response_data = response.json()
            except json.JSONDecodeError:
                current_app.logger.error(f"Invalid JSON response: {response.text}")
                raise Exception("Received invalid response from story service")
            
            if "choices" not in response_data or not response_data["choices"]:
                raise Exception("No story generated")
            
            return response_data["choices"][0]["message"]["content"]

        except requests.Timeout:
            current_app.logger.error(f"Request timed out after {time.time() - start_time:.2f} seconds")
            raise Exception(
                "The story is taking longer than usual to generate. "
                "This might be because we're making it extra special! "
                "Please try again in a moment."
            )
        except requests.ConnectionError:
            current_app.logger.error("Connection error occurred.")
            raise Exception("Could not connect to story generation service. Please try again.")
        except Exception as e:
            current_app.logger.error(f"Story generation failed: {str(e)}")
            raise

    def _choose_story_template(self, data):
        """Choose the most relevant story template based on user inputs."""
        scores = {template["name"]: 0 for template in self.story_templates}

        # Score each template based on matching inputs
        for template in self.story_templates:
            for key in ["moral", "magic", "creature", "vibe"]:
                if data.get(key) and key in template["matches"]:
                    scores[template["name"]] += 1

        # Get the highest scoring templates
        max_score = max(scores.values())
        best_templates = [
            template for template in self.story_templates 
            if scores[template["name"]] == max_score
        ]

        # Pick a random template from the best matches
        chosen_template = random.choice(best_templates)
        current_app.logger.info(f"Selected template: {chosen_template['name']} (Score: {max_score})")
        return chosen_template

    def _format_prompt(self, data):
        """Format the prompt for the story generator."""
        # Get age group and template
        age_group = data.get('ageGroup', 'preK')
        template = self._choose_story_template(data)
        
        # Age-appropriate guidelines
        age_guides = {
            'baby': "Use very simple words and lots of repetition. Keep it under 200 words",
            'preK': "Use simple words and short sentences. Include some repetition. Keep it under 600 words",
            'growing': "Use varied vocabulary and longer sentences. Add some challenging words. Keep it under 1500 words"
        }
        
        # Simplified prompt structure
        prompt_parts = [
            f"Write a children's story about {data['mainPrompt']}",
            age_guides.get(age_group, age_guides['preK']),  # Add age-appropriate guidance
            "Write as continuous text without chapters",
            f"Follow this story idea: {template['description']}"
        ]
        
        # Add essential elements only if provided
        if data.get('moral'): 
            prompt_parts.append(f"Include this lesson: {data['moral']}")
        if data.get('creature'):
            prompt_parts.append(f"Include this character: {data['creature']}")
        if data.get('magic'):
            prompt_parts.append(f"Include this magic: {data['magic']}")
        if data.get('vibe'):
            prompt_parts.append(f"Make the story feel: {data['vibe']}")
        
        # Join with single periods for clear separation
        return ". ".join(part.rstrip('.') for part in prompt_parts) + "." 