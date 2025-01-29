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

def construct_prompt(data):
    """Construct a detailed prompt from all user inputs"""
    constrain_length = data.get('constrainLength', False)
    
    main_story = data.get('mainPrompt', '').strip()
    moral = data.get('moral', '').strip()
    creature = data.get('creature', '').strip()
    magic = data.get('magic', '').strip()
    vibe = data.get('vibe', '').strip()
    age_group = data.get('ageGroup', 'preK')

    # Map age groups to age ranges and complexity levels
    age_ranges = {
        'baby': '0-3 years old',
        'preK': '3-5 years old',
        'growing': '5-7 years old'
    }

    complexity_guides = {
        'baby': 'Use very simple words and short, repetitive phrases. Keep sentences to 3-4 words. Use basic vocabulary that babies and toddlers can understand.',
        'preK': 'Use simple language with basic vocabulary. Include repetition and simple concepts. Keep sentences short and clear.',
        'growing': 'Use varied vocabulary and longer sentences. Include some challenging words with context clues. Add wordplay and engaging descriptions.'
    }

    # Age-specific length guidelines
    length_guides = {
        'baby': {
            'normal': '20-100 words',
            'short': '20-50 words'
        },
        'preK': {
            'normal': '100-500 words',
            'short': '100-400 words'
        },
        'growing': {
            'normal': '350-1500 words',
            'short': '350-800 words'
        }
    }

    age_range = age_ranges.get(age_group, '5-7 years old')
    complexity = complexity_guides.get(age_group, complexity_guides['growing'])
    length_guide = length_guides.get(age_group, length_guides['growing'])
    target_length = length_guide['short'] if constrain_length else length_guide['normal']

    prompt = (
        "You are a talented children's story writer creating an engaging, "
        f"short, and high-quality story for children {age_range}.\n\n"
        "Important: Write the story as continuous text without section headers or chapter markers.\n\n"
        f"Story length: Keep the story between {target_length} total words.\n\n"
        f"Writing style: {complexity}\n\n"
        f"Main story elements: {main_story}\n"
        f"{'\nTone/Setting: ' + vibe if vibe else ''}"
        f"{'\nFriend/Sidekick to include: ' + creature if creature else ''}"
        f"{'\nMagical elements to incorporate: ' + magic if magic else ''}"
        f"{'\nMoral lesson to include: ' + moral if moral else ''}"
        
        "\n\nPlease create a magical and creative story that:"
        "\n- Is easy to understand for young children"
        "\n- Has a clear beginning, middle, and end"
        "\n- Includes some gentle humor or playful elements"
        f"{'\n- Weaves in this moral: ' + moral if moral else '\n- Include a gentle positive message'}"
        "\n- Uses vivid descriptions to engage the imagination"
        f"{'' if magic else '\n\nFeel free to add magical elements or whimsical details to make the story more enchanting and memorable.'}"
    )
    return prompt

@bp.route('/generate', methods=['POST'])
@limiter.limit("5 per minute")
def generate_story():
    try:
        current_app.logger.debug("Received story generation request")
        data = request.get_json()
        current_app.logger.debug(f"Request data: {data}")
        if not data.get('mainPrompt', '').strip():
            return jsonify({
                'success': False,
                'error': 'Please provide some story elements or keywords.'
            }), 400

        # Check cache first
        cached_story = get_cached_story(data)
        if cached_story:
            return jsonify({
                'success': True,
                'story': cached_story,
                'cached': True
            })

        # Construct the enhanced prompt
        prompt = construct_prompt(data)
        current_app.logger.debug(f"Generated prompt: {prompt}")
        
        try:
            # Generate the story
            story_generator = StoryGenerator()
            story = story_generator.generate(prompt)
            current_app.logger.debug(f"Generated story: {story}")
        except Exception as e:
            current_app.logger.error(f"Story generation failed: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'error': f'Story generation failed: {str(e)}'
            }), 500
        
        # Cache the result
        cache_story(data, story)
        
        return jsonify({
            'success': True,
            'story': story,
            'cached': False
        })

    except Exception as e:
        current_app.logger.error(f"Error generating story: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'An error occurred while generating the story: {str(e)}'
        }), 500

@bp.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        'success': False,
        'error': 'Too many requests. Please wait before generating more stories.',
        'rate_limited': True,
        'retry_after': e.description
    }), 429 