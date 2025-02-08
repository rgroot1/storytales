from flask import Blueprint, request, jsonify, current_app
from werkzeug.exceptions import HTTPException
from src.llm_models.story_generator import StoryGenerator
from src.app.utils.cache import get_cached_story, cache_story
from src.app.utils.limiter import limiter
from config.settings import Config
import re
import json
from src.llm_models.artwork_analyzer import ArtworkAnalyzer

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
        
        current_app.logger.debug(f"Received request at /story/generate")
        current_app.logger.debug(f"Received story generation request: {data}")
        
        # Extract context if available
        context = data.get('context', {})
        if context:
            current_app.logger.debug(f"Story context: {context}")
        
        # Validate required fields
        if not data.get('mainPrompt', '').strip():
            return jsonify({'error': 'Please provide a story prompt'}), 400

        # Set and validate age group
        data['ageGroup'] = data.get('ageGroup', 'preK')
        if data['ageGroup'] not in ['baby', 'preK', 'growing']:
            data['ageGroup'] = 'preK'

        # Ensure isArtworkFlow is passed through
        data['isArtworkFlow'] = data.get('isArtworkFlow', False)
        
        # Add context to data if available
        if context:
            data.update(context)
        
        current_app.logger.debug(f"Story flow type: {'Artwork' if data['isArtworkFlow'] else 'Direct'}")

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
        
        current_app.logger.debug(f"Generated story: {story[:100]}...")  # Log first 100 chars
        
        # Cache the new story
        cache_story(data, story)
        
        return jsonify({
            'story': story,
            'cached': False,
            'success': True
        })

    except Exception as e:
        current_app.logger.error(f"Story generation failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.errorhandler(429)
def ratelimit_handler(e):
    """Handle rate limit errors with a proper JSON response"""
    return jsonify({
        'error': 'Too many requests. Please wait a moment before trying again.',
        'retry_after': e.description
    }), 429

@bp.route('/artwork/analyze', methods=['POST'])
def analyze_artwork():
    try:
        current_app.logger.debug(f"Files in request: {request.files}")
        current_app.logger.debug(f"Form data: {request.form}")
        
        if 'artwork' not in request.files:
            return jsonify({'error': 'Please upload an artwork image'}), 400
            
        artwork = request.files['artwork']
        if not artwork.filename:
            return jsonify({'error': 'No artwork file selected'}), 400
            
        # Validate file type
        if not artwork.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            return jsonify({'error': 'Please upload a valid image file (PNG, JPG, JPEG, GIF)'}), 400
            
        keywords = request.form.get('keywords', '')
        
        analyzer = ArtworkAnalyzer()
        analysis = analyzer.analyze_artwork(artwork, keywords)
        
        # Restructure response to match frontend expectations
        response = {
            'analysis': {
                'story_elements': analysis['story_elements'],
                'comments': analysis['comments'],
                'questions': analysis['questions']
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        current_app.logger.error(f"Artwork analysis failed: {str(e)}")
        # If it's a rate limit error, return 429
        if isinstance(e, ValueError) and ('quota exceeded' in str(e).lower() or 'rate limit' in str(e).lower()):
            return jsonify({'error': str(e)}), 429
        # For other errors, return 500
        return jsonify({'error': str(e)}), 500

@bp.errorhandler(HTTPException)
def handle_exception(e):
    """Return JSON instead of HTML for HTTP errors."""
    response = e.get_response()
    response.data = json.dumps({
        "code": e.code,
        "name": e.name,
        "description": e.description,
    })
    response.content_type = "application/json"
    return response

@bp.errorhandler(Exception)
def handle_unexpected_error(e):
    """Handle non-HTTP exceptions."""
    current_app.logger.error(f'Unexpected error: {str(e)}')
    return jsonify({
        'error': 'An unexpected error occurred',
        'details': str(e)
    }), 500 