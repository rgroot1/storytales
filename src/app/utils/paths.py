import os

def get_project_root():
    """Get the absolute path to the project root directory"""
    current_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    return current_dir 