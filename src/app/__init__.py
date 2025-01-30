from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config.settings import Config
from src.app.utils.limiter import limiter
from flask_talisman import Talisman
import os

db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__,
        template_folder='templates',
        static_folder='static'
    )
    app.config.from_object(config_class)

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

    from src.app.routes import story, main
    app.register_blueprint(main.bp)
    app.register_blueprint(story.bp)

    if app.debug:
        app.logger.setLevel('DEBUG')

    return app 