# migrate_add_user_question_progress.py
"""
Migration script to add UserQuestionProgress table
"""
import sys
from pathlib import Path

# Add app to path
sys.path.append(str(Path(__file__).parent))

from app.database import Base, engine, init_db

def migrate():
    """Add UserQuestionProgress table"""
    print("Creating UserQuestionProgress table...")
    
    # Import the model to ensure it's registered
    from app.database import UserQuestionProgress
    
    # Create all tables (this will only create new ones)
    Base.metadata.create_all(bind=engine)
    
    print("✅ Migration completed: UserQuestionProgress table created")

if __name__ == "__main__":
    migrate()

