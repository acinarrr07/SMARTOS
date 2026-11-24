from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / '.env')
STORAGE_DIR = Path(os.getenv('SMG_STORAGE_DIR', PROJECT_ROOT / 'storage')).resolve()
DATABASE_URL = os.getenv('SMG_DATABASE_URL', f"sqlite:///{(STORAGE_DIR / 'smart_meal_guide.db').as_posix()}")
SESSION_COOKIE = os.getenv('SMG_SESSION_COOKIE', 'smg_session')
SESSION_TTL_DAYS = int(os.getenv('SMG_SESSION_TTL_DAYS', '7'))
COOKIE_SECURE = os.getenv('SMG_COOKIE_SECURE', 'false').lower() == 'true'
COOKIE_SAMESITE = os.getenv('SMG_COOKIE_SAMESITE', 'lax').lower()
MAX_UPLOAD_BYTES = int(os.getenv('SMG_MAX_UPLOAD_BYTES', str(8 * 1024 * 1024)))
FRONTEND_ORIGINS = [x.strip() for x in os.getenv('SMG_FRONTEND_ORIGINS', 'http://localhost:8000,http://127.0.0.1:8000').split(',') if x.strip()]

for folder in ('dishes', 'reviews', 'menus'):
    (STORAGE_DIR / folder).mkdir(parents=True, exist_ok=True)
