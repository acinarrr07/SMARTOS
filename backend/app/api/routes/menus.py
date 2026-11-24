from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.db.database import get_db
from app.models.models import Menu

router = APIRouter(prefix='/menus', tags=['menus'])

def menu_out(menu: Menu):
    return {
        'id': menu.id, 'title': menu.title, 'week_start_date': menu.week_start_date.isoformat() if menu.week_start_date else None,
        'week_end_date': menu.week_end_date.isoformat() if menu.week_end_date else None, 'source': menu.source,
        'status': menu.status, 'is_active': menu.is_active,
        'items': [{'id': item.id, 'dish_id': item.dish_id, 'original_dish_name': item.original_dish_name,
                   'menu_date': item.menu_date.isoformat() if item.menu_date else None,
                   'display_order': item.display_order, 'day_index': item.day_index, 'match_status': item.match_status} for item in menu.items]
    }

@router.get('/active')
def active_menu(db: Session = Depends(get_db)):
    menu = db.scalar(select(Menu).options(selectinload(Menu.items)).where(Menu.is_active.is_(True)).order_by(Menu.created_at.desc()))
    if not menu:
        return {'menu': None, 'message': 'No active menu has been published.'}
    return {'menu': menu_out(menu)}

@router.get('/{menu_id}')
def get_menu(menu_id: int, db: Session = Depends(get_db)):
    menu = db.scalar(select(Menu).options(selectinload(Menu.items)).where(Menu.id == menu_id))
    if not menu:
        raise HTTPException(404, 'Menu not found.')
    return menu_out(menu)
