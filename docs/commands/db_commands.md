# Database Commands

## Easy NPM Scripts (Recommended)

```bash
# Count users
npm run db:count

# List users (limit 10)
npm run db:list

# Find specific user
npm run db:find test@example.com

# Delete specific user
npm run db:delete test@example.com
```

## Direct Python Script Usage

```bash
# Count users
python3 scripts/db_utils.py count

# List users with custom limit
python3 scripts/db_utils.py list --limit 20

# Find user by email
python3 scripts/db_utils.py find brianhusk@gmail.com

# Delete user by email
python3 scripts/db_utils.py delete brianhusk@gmail.com

# Help
python3 scripts/db_utils.py --help
```

## Legacy One-liner Commands (For Reference)

```bash
# Find user
python3 -c "import sys; sys.path.append('.'); from api.database import User; from sqlalchemy.orm import sessionmaker; from sqlalchemy import create_engine; engine = create_engine('postgresql://dev_user:dev_password@localhost:5432/zentropy'); SessionLocal = sessionmaker(bind=engine); db = SessionLocal(); user = db.query(User).filter(User.email == 'EMAIL_HERE').first(); print(f'Found: {user.email}' if user else 'Not found'); db.close()"

# Delete user
python3 -c "import sys; sys.path.append('.'); from api.database import User; from sqlalchemy.orm import sessionmaker; from sqlalchemy import create_engine; engine = create_engine('postgresql://dev_user:dev_password@localhost:5432/zentropy'); SessionLocal = sessionmaker(bind=engine); db = SessionLocal(); user = db.query(User).filter(User.email == 'EMAIL_HERE').first(); db.delete(user) if user else None; db.commit() if user else None; print('Deleted' if user else 'Not found'); db.close()"
```

**Note:** Replace `EMAIL_HERE` with the actual email address.
