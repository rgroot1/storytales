import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration."""
    SECRET_KEY = 'dev'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///storytales.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    
    # Feature flags
    USE_PERPLEXITY = os.environ.get('USE_PERPLEXITY', 'True').lower() == 'true'
    FEATURES = {
        'ARTWORK_UPLOAD': True,  # Toggle artwork upload feature
        'ARTWORK_ANALYSIS': True  # Toggle LearnLM analysis
    }
    
    # API Keys
    OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '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')
    PERPLEXITY_API_KEY = os.environ.get('PERPLEXITY_API_KEY', 'your-default-key')  # Add your key here
    
    # Model settings
    PERPLEXITY_MODEL = "llama-3.1-sonar-large-128k-online"
    TEMPERATURE = 0.7
    BASE_MAX_TOKENS = 300
    TOKENS_PER_KEYWORD = 50
    ABSOLUTE_MAX_TOKENS = 500
    
    # Rate limiting settings
    HOURLY_RATE_LIMIT = 10
    DAILY_RATE_LIMIT = 80
    
    # Cache settings
    CACHE_TTL = 3600  # Cache stories for 1 hour 

    @staticmethod
    def init_app(app):
        """Initialize the application with this configuration."""
        app.config.update(Config.FEATURES)

    def __repr__(self):
        return f"<Config SECRET_KEY={self.SECRET_KEY}, SQLALCHEMY_DATABASE_URI={self.SQLALCHEMY_DATABASE_URI}, SQLALCHEMY_TRACK_MODIFICATIONS={self.SQLALCHEMY_TRACK_MODIFICATIONS}, UPLOAD_FOLDER={self.UPLOAD_FOLDER}, USE_PERPLEXITY={self.USE_PERPLEXITY}, PERPLEXITY_API_KEY={self.PERPLEXITY_API_KEY}, OPENROUTER_API_KEY={self.OPENROUTER_API_KEY}, PERPLEXITY_MODEL={self.PERPLEXITY_MODEL}, TEMPERATURE={self.TEMPERATURE}, BASE_MAX_TOKENS={self.BASE_MAX_TOKENS}, TOKENS_PER_KEYWORD={self.TOKENS_PER_KEYWORD}, ABSOLUTE_MAX_TOKENS={self.ABSOLUTE_MAX_TOKENS}, HOURLY_RATE_LIMIT={self.HOURLY_RATE_LIMIT}, DAILY_RATE_LIMIT={self.DAILY_RATE_LIMIT}, CACHE_TTL={self.CACHE_TTL}>" 