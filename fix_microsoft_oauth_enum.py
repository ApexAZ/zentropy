#!/usr/bin/env python3
"""
Microsoft OAuth Enum Fix Script

This script fixes the Microsoft OAuth registration bug by adding the missing
'microsoft_oauth' value to the PostgreSQL registrationtype enum.

Bug: Microsoft OAuth registration fails with:
  psycopg2.errors.InvalidTextRepresentation: invalid input value for enum registrationtype: "microsoft_oauth"

Fix: Add 'microsoft_oauth' to the registrationtype enum in the database.

Usage:
  python3 fix_microsoft_oauth_enum.py
"""

import sys
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    from sqlalchemy import text
    from api.database import engine
    print("✅ SQLAlchemy imported successfully")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("💡 Make sure you're in the project directory and dependencies are installed")
    sys.exit(1)


def fix_microsoft_oauth_enum():
    """Fix the Microsoft OAuth enum issue by adding missing enum value."""
    
    try:
        print(f"🔗 Connecting to database...")
        
        # Test connection using existing engine
        with engine.connect() as conn:
            print("✅ Database connection successful")
            
            # Check current enum values
            print("🔍 Checking current registrationtype enum values...")
            result = conn.execute(text("SELECT unnest(enum_range(NULL::registrationtype)) as enum_value"))
            current_values = [row[0] for row in result.fetchall()]
            print(f"📋 Current enum values: {current_values}")
            
            # Check if microsoft_oauth already exists
            if 'microsoft_oauth' in current_values:
                print("✅ 'microsoft_oauth' already exists in enum - no fix needed!")
                return True
            
            # Add the missing enum value
            print("🔧 Adding 'microsoft_oauth' to registrationtype enum...")
            conn.execute(text("ALTER TYPE registrationtype ADD VALUE 'microsoft_oauth'"))
            conn.commit()
            
            # Verify the fix
            print("🔍 Verifying the fix...")
            result = conn.execute(text("SELECT unnest(enum_range(NULL::registrationtype)) as enum_value"))
            updated_values = [row[0] for row in result.fetchall()]
            print(f"📋 Updated enum values: {updated_values}")
            
            if 'microsoft_oauth' in updated_values:
                print("🎉 SUCCESS! Microsoft OAuth enum fix completed successfully!")
                print("🚀 Microsoft OAuth registration should now work!")
                return True
            else:
                print("❌ ERROR: microsoft_oauth was not added to enum")
                return False
                
    except Exception as e:
        print(f"❌ Error fixing Microsoft OAuth enum: {e}")
        print("\n💡 Alternative solutions:")
        print("1. Use a PostgreSQL client like pgAdmin, DBeaver, or psql")
        print("2. Run this SQL command manually on your database:")
        print("   ALTER TYPE registrationtype ADD VALUE 'microsoft_oauth';")
        print("3. Use your hosting provider's database management interface")
        return False


def main():
    """Main function to run the fix."""
    print("🔧 Microsoft OAuth Enum Fix Script")
    print("=" * 50)
    
    success = fix_microsoft_oauth_enum()
    
    if success:
        print("\n✅ Fix completed successfully!")
        print("🧪 You can now test Microsoft OAuth registration")
    else:
        print("\n❌ Fix failed - see error messages above")
        print("💡 You may need to run the SQL manually or use a database client")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())