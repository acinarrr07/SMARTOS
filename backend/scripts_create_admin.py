from __future__ import annotations
import os, sys
from sqlalchemy import select
from app.db.database import Base, engine, SessionLocal
from app.models.models import User
from app.services.security import hash_password

email = os.getenv('SMG_BOOTSTRAP_ADMIN_EMAIL', '').strip().lower()
password = os.getenv('SMG_BOOTSTRAP_ADMIN_PASSWORD', '')
name = os.getenv('SMG_BOOTSTRAP_ADMIN_NAME', 'Smart Meal Guide Admin').strip()
if not email or len(password) < 12:
    print('Set SMG_BOOTSTRAP_ADMIN_EMAIL and SMG_BOOTSTRAP_ADMIN_PASSWORD (at least 12 characters).', file=sys.stderr)
    raise SystemExit(2)
Base.metadata.create_all(bind=engine)
with SessionLocal() as db:
    user = db.scalar(select(User).where(User.email == email))
    if user:
        user.is_admin = True
        user.is_active = True
        if name: user.display_name = name
    else:
        db.add(User(email=email, display_name=name, password_hash=hash_password(password), is_admin=True))
    db.commit()
print(f'Administrator role ensured for {email}.')
