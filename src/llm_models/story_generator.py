import requests
from config.settings import Config

class StoryGenerator:
    """
    Story generator using Perplexity AI API
    Version: 1.0.0
    """
    def __init__(self):
        self.api_key = Config.PERPLEXITY_API_KEY
        self.model = Config.PERPLEXITY_MODEL
        self.base_url = "https://api.perplexity.ai/chat/completions"
        self.max_total_tokens = 2000  # Maximum context length
        
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
        
        if not self.api_key:
            raise ValueError("Perplexity API key not found in environment variables")
    
    def calculate_max_tokens(self, prompt: str, age_group: str = 'growing', constrain_length: bool = False) -> int:
        """Calculate max tokens based on prompt length"""
        # Estimate prompt tokens (rough estimation)
        estimated_prompt_tokens = len(prompt.split()) * 1.3
        
        # Get age-appropriate token limit
        limits = self.token_limits.get(age_group, self.token_limits['growing'])
        base_limit = limits['short'] if constrain_length else limits['normal']
        
        # Calculate remaining tokens for response
        available_tokens = self.max_total_tokens - estimated_prompt_tokens
        
        # Ensure we have enough tokens for a complete story
        max_response_tokens = min(available_tokens, base_limit)
        return int(max_response_tokens)
    
    def generate(self, prompt, max_length=None):
        """
        Generate a children's story using the provided prompt via Perplexity AI.
        
        Args:
            prompt (str): The complete prompt for story generation
            max_length (int, optional): Maximum length of the generated story
            
        Returns:
            str: Generated story
            
        Raises:
            Exception: If API call fails
        """
        # Add strong completion guidance to prompt
        prompt += "\n\nCritical: Ensure the story fits within the token limit and has a proper ending. "
        prompt += "If approaching the token limit, wrap up the story naturally rather than cutting it off."
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Calculate max tokens based on keyword count if not specified
        if not max_length:
            max_length = self.calculate_max_tokens(prompt)
        
        data = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": Config.TEMPERATURE,
            "max_tokens": max_length
        }
        
        try:
            response = requests.post(
                self.base_url,
                headers=headers,
                json=data
            )
            response.raise_for_status()
            
            story = response.json()["choices"][0]["message"]["content"]
            return story.strip()
            
        except requests.exceptions.RequestException as e:
            # Log the error (implement logging later)
            raise Exception(f"Failed to generate story: {str(e)}") 