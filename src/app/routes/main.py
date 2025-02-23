from flask import Blueprint, render_template

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    """Homepage with story creation options"""
    return render_template('index.html') 