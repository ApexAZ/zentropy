#!/usr/bin/env python3
"""
Database utility script for common operations.
Usage:
    python scripts/db_utils.py find <email>
    python scripts/db_utils.py delete <email>
    python scripts/db_utils.py list [--limit 10]
    python scripts/db_utils.py count
"""

import sys
import argparse
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from api.database import User
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, func

# Database connection
DATABASE_URL = "postgresql://dev_user:dev_password@localhost:5432/zentropy"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def find_user(email: str):
    """Find a user by email."""
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"Found: {user.email} (ID: {user.id}, Role: {user.role})")
            print(f"  Name: {user.first_name} {user.last_name}")
            print(f"  Created: {user.created_at}")
            print(f"  Verified: {user.email_verified}")
            print(f"  Registration Type: {user.registration_type}")
            print(f"  Auth Provider: {user.auth_provider}")
            print(f"  Google ID: {user.google_id}")
        else:
            print("Not found")


def delete_user(email: str):
    """Delete a user by email."""
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"Deleting user: {user.email}")
            db.delete(user)
            db.commit()
            print("Deleted")
        else:
            print("Not found")


def list_users(limit: int = 10):
    """List users."""
    with SessionLocal() as db:
        users = db.query(User).limit(limit).all()
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"  {user.email} ({user.first_name} {user.last_name}) - {user.role}")


def count_users():
    """Count total users."""
    with SessionLocal() as db:
        count = db.query(func.count(User.id)).scalar()
        print(f"Total users: {count}")


def main():
    parser = argparse.ArgumentParser(description="Database utility commands")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Find command
    find_parser = subparsers.add_parser("find", help="Find user by email")
    find_parser.add_argument("email", help="Email to search for")

    # Delete command
    delete_parser = subparsers.add_parser("delete", help="Delete user by email")
    delete_parser.add_argument("email", help="Email to delete")

    # List command
    list_parser = subparsers.add_parser("list", help="List users")
    list_parser.add_argument("--limit", type=int, default=10, help="Limit number of results")

    # Count command
    subparsers.add_parser("count", help="Count total users")

    args = parser.parse_args()

    if args.command == "find":
        find_user(args.email)
    elif args.command == "delete":
        delete_user(args.email)
    elif args.command == "list":
        list_users(args.limit)
    elif args.command == "count":
        count_users()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()