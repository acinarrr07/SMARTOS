from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.config import SESSION_COOKIE, SESSION_TTL_DAYS, COOKIE_SECURE, COOKIE_SAMESITE
from app.db.database import get_db
from app.models.models import User, UserSession
from app.schemas.schemas import RegisterIn, LoginIn, UserOut
from app.services.security import hash_password, verify_password, create_session_token, token_digest, session_expiry

router = APIRouter(prefix='/auth', tags=['authentication'])

def set_session_cookie(response: Response, token: str):
    response.set_cookie(SESSION_COOKIE, token, max_age=SESSION_TTL_DAYS * 86400, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, path='/')

def start_session(db: Session, user: User, response: Response):
    token = create_session_token()
    db.add(UserSession(token_hash=token_digest(token), user_id=user.id, expires_at=session_expiry()))
    db.commit()
    set_session_cookie(response, token)

@router.post('/register', response_model=UserOut, status_code=201)
def register(payload: RegisterIn, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, 'An account with this email already exists.')
    user = User(email=email, display_name=payload.display_name.strip(), password_hash=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    start_session(db, user, response)
    return user

@router.post('/login', response_model=UserOut)
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if not user or not user.is_active or not verify_password(user.password_hash, payload.password):
        raise HTTPException(401, 'Email or password is incorrect.')
    start_session(db, user, response)
    return user

@router.post('/logout', status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        session = db.get(UserSession, token_digest(token))
        if session:
            db.delete(session); db.commit()
    response.delete_cookie(SESSION_COOKIE, path='/')
    return response

@router.get('/me', response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
