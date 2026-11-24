from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.config import SESSION_COOKIE
from app.db.database import get_db
from app.models.models import User, UserSession
from app.services.security import token_digest
from datetime import datetime, timezone

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(401, 'Authentication required.')
    session = db.get(UserSession, token_digest(token))
    if not session:
        raise HTTPException(401, 'Session is invalid or expired.')
    expiry = session.expires_at
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if expiry <= datetime.now(timezone.utc):
        db.delete(session)
        db.commit()
        raise HTTPException(401, 'Session has expired.')
    user = db.get(User, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(401, 'User account is not active.')
    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, 'Administrator permission required.')
    return user
