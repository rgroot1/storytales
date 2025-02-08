from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config.settings import Config
from src.app.utils.limiter import limiter
from flask_talisman import Talisman
import os
from dotenv import load_dotenv

db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__,
        template_folder='templates',
        static_folder='static'
    )
    
    # Load configuration
    app.config.from_object(config_class)
    app.config.update(config_class.FEATURES)  # Add features to config

    # Load environment variables
    load_dotenv()
    
    # Verify API key is loaded
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set")

    db.init_app(app)
    limiter.init_app(app)
    csp = {
        'default-src': ['\'self\''],
        'script-src': [
            '\'self\'',
            '\'unsafe-inline\'',
            'https://cdnjs.cloudflare.com'
        ],
        'style-src': [
            '\'self\'',
            '\'unsafe-inline\'',
            'https://fonts.googleapis.com',
            'https://cdnjs.cloudflare.com'
        ],
        'font-src': [
            '\'self\'',
            'https://fonts.gstatic.com',
            'https://cdnjs.cloudflare.com'
        ],
        'img-src': ['\'self\'', 'data:', 'https:'],
        'connect-src': ['\'self\''],
        'form-action': ['\'self\''],
        'frame-ancestors': ['\'self\''],
        'base-uri': ['\'self\''],
        'object-src': ['\'none\'']
    }
    
    Talisman(
        app,
        force_https=True,
        content_security_policy=csp,
        content_security_policy_nonce_in=['script-src'],
        feature_policy={
            'geolocation': '\'none\'',
            'midi': '\'none\'',
            'notifications': '\'none\'',
            'push': '\'none\'',
            'sync-xhr': '\'none\'',
            'microphone': '\'none\'',
            'camera': '\'none\'',
            'magnetometer': '\'none\'',
            'gyroscope': '\'none\'',
            'speaker': '\'none\'',
            'vibrate': '\'none\'',
            'fullscreen': '\'self\'',
            'payment': '\'none\''
        }
    )

    # Register blueprints
    from src.app.routes.main import bp as main_bp
    from src.app.routes.story import bp as story_bp
    app.register_blueprint(main_bp)  # Register main blueprint first (for homepage)
    app.register_blueprint(story_bp)

    if app.debug:
        app.logger.setLevel('DEBUG')

    return app 