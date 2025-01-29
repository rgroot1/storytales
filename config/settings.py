import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-please-change'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///storytales.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    
    # Feature flags
    USE_PERPLEXITY = os.environ.get('USE_PERPLEXITY', 'True').lower() == 'true'
    
    # API Keys
    PERPLEXITY_API_KEY = os.environ.get('PERPLEXITY_API_KEY')
    
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