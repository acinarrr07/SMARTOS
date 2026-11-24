import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Dish

router = APIRouter(prefix='/dishes', tags=['dishes'])

def dish_out(d: Dish):
    return {
        'id': d.id, 'name': d.name, 'en': d.name_en, 'category': d.category, 'categoryEn': d.category_en,
        'description': d.description, 'descriptionEn': d.description_en, 'image': d.image, 'portion': d.portion,
        'prep': d.prep, 'cook': d.cook, 'calories': d.calories, 'protein': d.protein, 'carbs': d.carbs,
        'fat': d.fat, 'fiber': d.fiber, 'salt': d.salt, 'tags': json.loads(d.tags_json or '[]'),
        'allergens': json.loads(d.allergens_json or '[]'), 'ingredients': json.loads(d.ingredients_json or '[]'),
        'ingredientsEn': json.loads(d.ingredients_en_json or '[]'), 'steps': json.loads(d.steps_json or '[]'),
        'stepsEn': json.loads(d.steps_en_json or '[]'), 'estimate': d.data_status != 'verified', 'dataStatus': d.data_status
    }

@router.get('')
def list_dishes(q: str | None = None, db: Session = Depends(get_db)):
    query = select(Dish).where(Dish.is_archived.is_(False)).order_by(Dish.name)
    rows = db.scalars(query).all()
    results = [dish_out(d) for d in rows]
    if q:
        needle = q.casefold().strip()
        results = [d for d in results if needle in d['name'].casefold() or needle in d['en'].casefold()]
    return {'items': results, 'count': len(results)}

@router.get('/{dish_id}')
def get_dish(dish_id: str, db: Session = Depends(get_db)):
    dish = db.get(Dish, dish_id)
    if not dish or dish.is_archived:
        raise HTTPException(404, 'Dish not found.')
    return dish_out(dish)
