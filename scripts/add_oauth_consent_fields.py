#!/usr/bin/env python3
"""
Database migration to add OAuth consent tracking fields to users table

This script adds the missing oauth_consent_given and oauth_consent_timestamps
columns to the users table to match the SQLAlchemy model definition.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the api directory to the path to import database modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

def get_database_url():
    """Get the database URL from environment or use default"""
    # Check for DATABASE_URL first
    if os.getenv('DATABASE_URL'):
        return os.getenv('DATABASE_URL')
    
    # Build from individual components
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'zentropy')
    db_user = os.getenv('DB_USER', 'dev_user')
    db_password = os.getenv('DB_PASSWORD', 'dev_password')
    
    return f'postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}'

def add_oauth_consent_fields():
    """Add OAuth consent tracking fields to users table"""
    database_url = get_database_url()
    engine = create_engine(database_url)
    
    print(f"Connecting to database: {database_url.split('@')[1] if '@' in database_url else database_url}")
    
    try:
        with engine.connect() as conn:
            # Check if columns already exist
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('oauth_consent_given', 'oauth_consent_timestamps')
            """))
            
            existing_columns = [row[0] for row in result]
            
            if 'oauth_consent_given' in existing_columns and 'oauth_consent_timestamps' in existing_columns:
                print("✅ OAuth consent fields already exist in users table")
                return
            
            print("Adding OAuth consent fields to users table...")
            
            # Add oauth_consent_given column
            if 'oauth_consent_given' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN oauth_consent_given JSONB DEFAULT NULL
                """))
                print("✅ Added oauth_consent_given column")
            
            # Add oauth_consent_timestamps column  
            if 'oauth_consent_timestamps' not in existing_columns:
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN oauth_consent_timestamps JSONB DEFAULT NULL
                """))
                print("✅ Added oauth_consent_timestamps column")
            
            # Commit the changes
            conn.commit()
            print("✅ Database migration completed successfully")
            
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        raise

def main():
    """Main function"""
    print("🔧 Starting OAuth consent fields migration...")
    add_oauth_consent_fields()
    print("🎉 Migration completed!")

if __name__ == '__main__':
    main()