from flask import Blueprint, request, jsonify
from src.llm_models.story_generator import StoryGenerator

bp = Blueprint('story', __name__, url_prefix='/story')
story_generator = StoryGenerator()

@bp.route('/generate', methods=['POST'])
def generate_story():
    data = request.get_json()
    keywords = data.get('keywords', '')
    
    if not keywords:
        return jsonify({'error': 'No keywords provided'}), 400
        
    try:
        story = story_generator.generate_story(keywords)
        return jsonify({
            'story': story,
            'keywords': keywords
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500 