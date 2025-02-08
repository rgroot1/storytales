class Config:
    """Base configuration."""
    SECRET_KEY = 'dev'
    PERPLEXITY_API_KEY = ''  # Your API key here
    OPENROUTER_API_KEY = ''  # Your API key here
    
    # Feature flags
    FEATURES = {
        'ARTWORK_UPLOAD': True,  # Toggle artwork upload feature
        'ARTWORK_ANALYSIS': True  # Toggle LearnLM analysis
    }

    @staticmethod
    def init_app(app):
        """Initialize the application with this configuration."""
        app.config.update(Config.FEATURES) 