#!/usr/bin/env python3
"""
Database Schema Update Script

Updates the database schema to match the current SQLAlchemy models.
This will add the new email verification fields to the users table.
"""
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.database import engine, Base, test_database_connection
from sqlalchemy import text

def update_database_schema():
    """Update database schema to match current models."""
    print("🗄️  Updating Zentropy database schema...")
    
    # Test database connection
    if not test_database_connection():
        print("❌ Database connection failed!")
        return False
    
    print("✅ Database connection successful")
    
    try:
        # Create all tables (will add missing columns)
        print("🏗️  Creating/updating tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created/updated successfully")
        
        # Verify email verification fields exist
        print("🔍 Verifying email verification fields...")
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('email_verified', 'email_verification_token', 'email_verification_expires_at')
                ORDER BY column_name;
            """))
            columns = [row[0] for row in result]
            
            expected_columns = ['email_verification_expires_at', 'email_verification_token', 'email_verified']
            missing_columns = set(expected_columns) - set(columns)
            
            if missing_columns:
                print(f"❌ Missing email verification columns: {missing_columns}")
                
                # Add missing columns manually
                print("🔧 Adding missing email verification columns...")
                for column in missing_columns:
                    if column == 'email_verified':
                        sql = "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE NOT NULL;"
                    elif column == 'email_verification_token':
                        sql = "ALTER TABLE users ADD COLUMN email_verification_token VARCHAR UNIQUE;"
                    elif column == 'email_verification_expires_at':
                        sql = "ALTER TABLE users ADD COLUMN email_verification_expires_at TIMESTAMP;"
                    
                    try:
                        conn.execute(text(sql))
                        conn.commit()
                        print(f"✅ Added column: {column}")
                    except Exception as e:
                        if "already exists" in str(e):
                            print(f"ℹ️  Column {column} already exists")
                        else:
                            print(f"❌ Failed to add column {column}: {e}")
                            
            else:
                print("✅ All email verification columns exist")
        
        print("🎉 Database schema update complete!")
        return True
        
    except Exception as e:
        print(f"❌ Database schema update failed: {e}")
        return False

if __name__ == "__main__":
    success = update_database_schema()
    sys.exit(0 if success else 1)