"""
Add github_oauth to RegistrationType enum

This migration adds the 'github_oauth' value to the registrationtype enum
to support GitHub OAuth user registration tracking.

The enum currently has:
- 'email' (email/password registration)
- 'google_oauth' (Google OAuth registration)
- 'microsoft_oauth' (Microsoft OAuth registration)

Adding:
- 'github_oauth' (GitHub OAuth registration)

Created: 2025-07-28
"""

from alembic import op  # type: ignore


def upgrade():
    """Add github_oauth value to registrationtype enum"""

    # Add the new enum value to the existing registrationtype enum
    # PostgreSQL requires using ALTER TYPE ... ADD VALUE for enum modifications
    op.execute("ALTER TYPE registrationtype ADD VALUE 'github_oauth'")

    print("✅ Added 'github_oauth' to registrationtype enum")
    print("🔐 GitHub OAuth users can now be properly tracked")


def downgrade():
    """Remove github_oauth value from registrationtype enum"""

    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum and updating all references
    # For safety, we'll warn instead of attempting the complex downgrade
    print("⚠️  WARNING: Cannot safely remove enum values from PostgreSQL")
    print(
        "💡 To downgrade: recreate enum with original values and update all references"
    )
    print("🔄 Consider this a one-way migration for data safety")

    # Uncomment the following if you really need to downgrade:
    # This is complex and risky, so we leave it commented
    """
    # 1. Create new enum with original values
    op.execute(
        "CREATE TYPE registrationtype_new AS ENUM "
        "('email', 'google_oauth', 'microsoft_oauth')"
    )

    # 2. Update all columns to use new enum
    # (this will fail if github_oauth values exist)
    op.execute(
        "ALTER TABLE users ALTER COLUMN registration_type TYPE "
        "registrationtype_new USING "
        "registration_type::text::registrationtype_new"
    )
    # 3. Drop old enum and rename new one
    op.execute("DROP TYPE registrationtype")
    op.execute("ALTER TYPE registrationtype_new RENAME TO registrationtype")
    """
