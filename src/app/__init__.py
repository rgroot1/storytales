from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config.settings import Config
from src.app.utils.limiter import limiter
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

    from src.app.routes import story, main
    app.register_blueprint(main.bp)
    app.register_blueprint(story.bp)

    if app.debug:
        app.logger.setLevel('DEBUG')

    return app 