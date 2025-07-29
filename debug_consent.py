#!/usr/bin/env python3
"""
Debug script to check OAuth consent logic
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the api directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

from api.database import User, AuthProvider
from api.oauth_base import get_provider_config

def get_database_url():
    """Get the database URL from environment or use default"""
    if os.getenv('DATABASE_URL'):
        return os.getenv('DATABASE_URL')
    
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'zentropy')
    db_user = os.getenv('DB_USER', 'dev_user')
    db_password = os.getenv('DB_PASSWORD', 'dev_password')
    
    return f'postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}'

def debug_consent_logic():
    """Debug the consent triggering logic"""
    print("🔍 Debugging OAuth consent logic...")
    
    # Connect to database
    database_url = get_database_url()
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check all users in database
        users = db.query(User).all()
        print(f"\n📊 Found {len(users)} users in database:")
        
        for user in users:
            print(f"\n👤 User: {user.email}")
            print(f"   - ID: {user.id}")
            print(f"   - Auth Provider: {user.auth_provider}")
            print(f"   - Auth Provider Value: {user.auth_provider.value}")
            print(f"   - Google ID: {getattr(user, 'google_id', 'None')}")
            print(f"   - Microsoft ID: {getattr(user, 'microsoft_id', 'None')}")
            print(f"   - GitHub ID: {getattr(user, 'github_id', 'None')}")
        
        # Check provider configs
        print(f"\n⚙️  Provider configurations:")
        for provider_name in ['google', 'microsoft', 'github']:
            try:
                config = get_provider_config(provider_name)
                print(f"\n🔧 {provider_name.title()} Config:")
                print(f"   - Display Name: {config.display_name}")
                print(f"   - Auth Provider Enum: {config.auth_provider_enum}")
                print(f"   - Auth Provider Value: {config.auth_provider_enum.value}")
            except Exception as e:
                print(f"   - Error: {e}")
        
        # Test consent logic for each user/provider combo
        print(f"\n🧪 Testing consent logic scenarios:")
        
        test_email = "brianhusk@gmail.com"
        existing_user = db.query(User).filter(User.email == test_email).first()
        
        if existing_user:
            print(f"\n🎯 Testing with existing user: {test_email}")
            print(f"   - Current auth_provider: {existing_user.auth_provider}")
            
            for provider_name in ['google', 'microsoft', 'github']:
                config = get_provider_config(provider_name)
                
                # Check the condition from _handle_existing_user
                condition_met = existing_user.auth_provider in [config.auth_provider_enum, AuthProvider.HYBRID]
                
                print(f"\n   🔍 {provider_name.title()} OAuth attempt:")
                print(f"      - existing_user.auth_provider: {existing_user.auth_provider}")
                print(f"      - config.auth_provider_enum: {config.auth_provider_enum}")
                print(f"      - AuthProvider.HYBRID: {AuthProvider.HYBRID}")
                print(f"      - Condition check: {existing_user.auth_provider} in [{config.auth_provider_enum}, {AuthProvider.HYBRID}]")
                print(f"      - Result: {condition_met}")
                
                if condition_met:
                    print(f"      ✅ BYPASS consent (direct login)")
                else:
                    print(f"      ❗ REQUIRE consent")
        else:
            print(f"\n❌ No user found with email: {test_email}")
            print("   Create a test user first to debug consent logic")
            
    finally:
        db.close()

if __name__ == '__main__':
    debug_consent_logic()