from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from config.settings import Config

db = SQLAlchemy()
login_manager = LoginManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    from src.app.routes import auth, story, user
    app.register_blueprint(auth.bp)
    app.register_blueprint(story.bp)
    app.register_blueprint(user.bp)

    return app 