from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import FRONTEND_ORIGINS, STORAGE_DIR
from app.db.database import Base, engine
from app.models import models  # noqa: F401 - register SQLAlchemy models
from app.api.routes import auth, dishes, menus, reviews, admin

Base.metadata.create_all(bind=engine)
app = FastAPI(title='Smart Meal Guide API', version='1.0.0', description='Smart Meal Guide backend services')
app.add_middleware(CORSMiddleware, allow_origins=FRONTEND_ORIGINS, allow_credentials=True, allow_methods=['GET','POST','PATCH','DELETE','OPTIONS'], allow_headers=['Content-Type','Authorization'])

@app.middleware('http')
async def enforce_allowed_browser_origin(request: Request, call_next):
    # Browsers attach Origin to cross-origin write requests; reject origins not explicitly trusted.
    origin = request.headers.get('origin')
    if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'} and origin and origin not in FRONTEND_ORIGINS:
        return JSONResponse(status_code=403, content={'detail': 'This origin is not allowed to modify Smart Meal Guide data.'})
    return await call_next(request)
app.mount('/uploads', StaticFiles(directory=str(STORAGE_DIR)), name='uploads')
app.include_router(auth.router, prefix='/api/v1')
app.include_router(dishes.router, prefix='/api/v1')
app.include_router(menus.router, prefix='/api/v1')
app.include_router(reviews.router, prefix='/api/v1')
app.include_router(admin.router, prefix='/api/v1')

@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'smart-meal-guide-api', 'obs': 'not_configured'}

@app.get('/')
def root():
    return {'message': 'Smart Meal Guide API', 'docs': '/docs', 'health': '/health'}
