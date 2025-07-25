"""
Add phone_number field to users table

This migration adds an optional phone_number field to the User model
to support contact information collection in user profiles.

Key changes:
1. Add phone_number column as nullable String field
2. Field is optional to maintain backward compatibility
3. No indexes needed initially as it's not used for queries

Created: 2025-01-25
"""

from alembic import op  # type: ignore
import sqlalchemy as sa


def upgrade():
    """Add phone_number field to users table"""

    # Add phone_number column to users table
    op.add_column("users", sa.Column("phone_number", sa.String(), nullable=True))

    print("✅ Added phone_number field to users table")
    print("📱 Users can now add phone numbers to their profiles")


def downgrade():
    """Remove phone_number field from users table"""

    # Remove phone_number column from users table
    op.drop_column("users", "phone_number")

    print("♻️  Removed phone_number field from users table")
