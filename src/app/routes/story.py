from flask import Blueprint, request, jsonify, current_app
from src.llm_models.story_generator import StoryGenerator
from src.app.utils.cache import get_cached_story, cache_story
from src.app.utils.limiter import limiter
from config.settings import Config
import re

bp = Blueprint('story', __name__, url_prefix='/story')

def clean_input(text):
    """Clean and normalize user input"""
    # Remove extra whitespace and normalize punctuation
    text = re.sub(r'\s+', ' ', text.strip())
    # If the input contains sentences (has periods, exclamation marks, etc),
    # return it as is. Otherwise, treat as comma-separated keywords
    if re.search(r'[.!?]', text):
        return text
    # Split by comma, clean each keyword, and rejoin with commas
    return ', '.join(word.strip() for word in text.split(','))

@bp.route('/generate', methods=['POST'])
@limiter.limit("5 per minute")
def generate_story():
    """Generate a story based on user input."""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('mainPrompt', '').strip():
            return jsonify({'error': 'Please provide a story prompt'}), 400

        # Set and validate age group
        data['ageGroup'] = data.get('ageGroup', 'preK')
        if data['ageGroup'] not in ['baby', 'preK', 'growing']:
            data['ageGroup'] = 'preK'

        # Check cache first
        cached_story = get_cached_story(data)
        if cached_story:
            current_app.logger.info("Returning cached story")
            return jsonify({
                'story': cached_story,
                'cached': True
            })

        # Generate story
        story_generator = StoryGenerator()
        story = story_generator.generate_story(data)
        
        # Cache the new story
        cache_story(data, story)
        
        return jsonify({
            'story': story,
            'cached': False
        })

    except Exception as e:
        current_app.logger.error(f"Story generation failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        'success': False,
        'error': 'Too many requests. Please wait before generating more stories.',
        'rate_limited': True,
        'retry_after': e.description
    }), 429 