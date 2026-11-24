from __future__ import annotations
import json
from pathlib import Path
from datetime import date, timedelta
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload
from app.api.deps import require_admin
from app.db.database import get_db
from app.models.models import Dish, Menu, MenuItem, Review, ReviewReport, User
from app.schemas.schemas import DishCreate, ModerationUpdate, MenuItemMatch, ReportStatusUpdate
from app.services.pdf_service import parse_menu_pdf
from app.core.config import STORAGE_DIR

router = APIRouter(prefix='/admin', tags=['administration'])

@router.get('/obs/status')
def obs_status(user: User = Depends(require_admin)):
    return {'connected': False, 'state': 'authorization_required', 'message': 'OBS credentials and an institution-approved access method have not been configured.'}

@router.post('/obs/sync')
def obs_sync(user: User = Depends(require_admin)):
    raise HTTPException(503, 'OBS synchronization is not configured. Obtain an approved institutional integration method first; manual PDF import remains available.')

@router.get('/missing-data')
def missing_data(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    dishes = db.scalars(select(Dish).where(Dish.is_archived.is_(False)).order_by(Dish.name)).all()
    items = []
    for dish in dishes:
        missing = []
        if not dish.image: missing.append('photo')
        if not json.loads(dish.ingredients_json or '[]'): missing.append('ingredients')
        if not json.loads(dish.steps_json or '[]'): missing.append('recipe')
        if dish.data_status == 'missing': missing.append('nutrition')
        if missing:
            items.append({'id': dish.id, 'name': dish.name, 'missing': missing})
    return {'items': items, 'count': len(items)}

@router.post('/dishes', status_code=201)
def create_dish(payload: DishCreate, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.get(Dish, payload.id):
        raise HTTPException(409, 'Dish ID already exists.')
    data = payload.model_dump()
    dish = Dish(
        id=data['id'], name=data['name'], name_en=data['name_en'], category=data['category'], category_en=data['category_en'],
        description=data['description'], description_en=data['description_en'], image=data['image'], portion=data['portion'],
        prep=data['prep'], cook=data['cook'], calories=data['calories'], protein=data['protein'], carbs=data['carbs'],
        fat=data['fat'], fiber=data['fiber'], salt=data['salt'], tags_json=json.dumps(data['tags'], ensure_ascii=False),
        allergens_json=json.dumps(data['allergens'], ensure_ascii=False), ingredients_json=json.dumps(data['ingredients'], ensure_ascii=False),
        ingredients_en_json=json.dumps(data['ingredients_en'], ensure_ascii=False), steps_json=json.dumps(data['steps'], ensure_ascii=False),
        steps_en_json=json.dumps(data['steps_en'], ensure_ascii=False), data_status=data['data_status']
    )
    db.add(dish); db.commit()
    return {'id': dish.id, 'name': dish.name}

@router.patch('/reviews/{review_id}/moderation')
def moderate_review(review_id: int, payload: ModerationUpdate, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, 'Review not found.')
    review.status = payload.status
    db.commit()
    return {'id': review.id, 'status': review.status}

@router.get('/reviews')
def admin_reviews(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.scalars(select(Review).options(joinedload(Review.user), selectinload(Review.images)).order_by(Review.created_at.desc())).all()
    return {'items': [{'id': r.id, 'dish_id': r.dish_id, 'user': r.user.display_name, 'body': r.body, 'status': r.status,
                       'created_at': r.created_at.isoformat(), 'images': [f'/uploads/reviews/{i.storage_key}' for i in r.images]} for r in rows], 'count': len(rows)}

@router.post('/menus/import', status_code=201)
async def import_menu_pdf(file: UploadFile = File(...), user: User = Depends(require_admin), db: Session = Depends(get_db)):
    content = await file.read(15 * 1024 * 1024 + 1)
    parsed = parse_menu_pdf(file.filename or 'menu.pdf', content)
    existing = db.scalar(select(Menu).where(Menu.file_hash == parsed['file_hash']))
    if existing:
        (STORAGE_DIR / 'menus' / parsed['stored_filename']).unlink(missing_ok=True)
        raise HTTPException(409, f'This PDF was already imported as menu #{existing.id}.')
    title = (file.filename or 'Imported weekly menu').rsplit('.', 1)[0][:180]
    menu = Menu(source='manual_pdf', title=title, file_name=parsed['source_filename'], file_storage_key=parsed['stored_filename'], file_hash=parsed['file_hash'], status='pending_review', is_active=False)
    db.add(menu); db.flush()
    for day in parsed['days']:
        for position, name in enumerate(day['items']):
            normalized = name.strip()
            if not normalized:
                continue
            db.add(MenuItem(menu_id=menu.id, original_dish_name=normalized, display_order=position, day_index=day['day_index'], match_status='unmatched'))
    db.commit(); db.refresh(menu)
    return {'menu_id': menu.id, 'title': menu.title, 'status': menu.status, 'days_found': len(parsed['days']),
            'items_found': sum(len(day['items']) for day in parsed['days']), 'extracted_days': parsed['days'],
            'needs_review': True, 'note': 'PDF text was extracted. Day/item detection is a draft and requires administrator review.'}

@router.post('/menus/{menu_id}/activate')
def activate_menu(menu_id: int, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    menu = db.get(Menu, menu_id)
    if not menu:
        raise HTTPException(404, 'Menu not found.')
    menu.is_active = True
    menu.status = 'published'
    for other in db.scalars(select(Menu).where(Menu.id != menu_id, Menu.is_active.is_(True))).all():
        other.is_active = False
    db.commit()
    return {'id': menu.id, 'is_active': menu.is_active, 'status': menu.status}


@router.patch('/menu-items/{item_id}/match')
def match_menu_item(item_id: int, payload: MenuItemMatch, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    item = db.get(MenuItem, item_id)
    if not item:
        raise HTTPException(404, 'Menu item not found.')
    dish = db.get(Dish, payload.dish_id)
    if not dish or dish.is_archived:
        raise HTTPException(404, 'Active dish not found.')
    item.dish_id = dish.id
    item.match_status = 'approved'
    db.commit()
    return {'id': item.id, 'dish_id': item.dish_id, 'match_status': item.match_status}


@router.get('/reports')
def admin_reports(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.execute(
        select(ReviewReport, Review, User)
        .join(Review, ReviewReport.review_id == Review.id)
        .join(User, ReviewReport.reporter_user_id == User.id)
        .order_by(ReviewReport.created_at.desc())
    ).all()
    items = []
    for report, review, reporter in rows:
        items.append({
            'id': report.id, 'review_id': review.id, 'dish_id': review.dish_id,
            'review_user': review.user.display_name if review.user else 'Member',
            'review_body': review.body, 'reporter': reporter.display_name,
            'reason': report.reason, 'status': report.status,
            'created_at': report.created_at.isoformat()
        })
    return {'items': items, 'count': len(items)}


@router.patch('/reports/{report_id}')
def update_report_status(report_id: int, payload: ReportStatusUpdate, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    report = db.get(ReviewReport, report_id)
    if not report:
        raise HTTPException(404, 'Report not found.')
    report.status = payload.status
    db.commit()
    return {'id': report.id, 'status': report.status}
