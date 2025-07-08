#!/usr/bin/env python3
"""
Database Migration Runner for Zentropy
Safely applies database migrations with rollback capability
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import argparse

# Add the parent directory to the path so we can import the database module
sys.path.append(str(Path(__file__).parent.parent))

from api.database import DATABASE_URL


def run_migration_sql(engine, sql_file_path: str, dry_run: bool = False):
    """
    Run a SQL migration file against the database.
    
    Args:
        engine: SQLAlchemy engine
        sql_file_path: Path to the SQL migration file
        dry_run: If True, only validate the SQL without executing
    """
    print(f"📄 Running migration: {sql_file_path}")
    
    with open(sql_file_path, 'r') as f:
        sql_content = f.read()
    
    if dry_run:
        print("🔍 DRY RUN - SQL would execute:")
        print(sql_content)
        return
    
    try:
        with engine.begin() as conn:
            # Execute the migration SQL
            conn.execute(text(sql_content))
            print("✅ Migration executed successfully")
            
    except SQLAlchemyError as e:
        print(f"❌ Migration failed: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(description='Run database migrations')
    parser.add_argument('--migration', required=True, 
                       help='Migration file to run (e.g., 004_drop_deprecated_organization_field.sql)')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be executed without running')
    
    args = parser.parse_args()
    
    # Build the full path to the migration file
    migrations_dir = Path(__file__).parent
    migration_file = migrations_dir / args.migration
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        sys.exit(1)
    
    print(f"🗄️  Connecting to database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")
    
    try:
        # Create database engine
        engine = create_engine(DATABASE_URL)
        
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connection successful")
        
        # Run the migration
        run_migration_sql(engine, migration_file, dry_run=args.dry_run)
        
        if not args.dry_run:
            print("🎉 Migration completed successfully!")
        else:
            print("🔍 Dry run completed - no changes made")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()