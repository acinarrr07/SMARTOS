from __future__ import annotations
import json
from pathlib import Path
from sqlalchemy import select
from app.db.database import Base, engine, SessionLocal
from app.models.models import Dish

DATA = Path(__file__).with_name('demo_dishes.json')

def seed_demo_dishes():
    Base.metadata.create_all(bind=engine)
    rows = json.loads(DATA.read_text(encoding='utf-8'))
    with SessionLocal() as db:
        for item in rows:
            if db.scalar(select(Dish).where(Dish.id == item['id'])):
                continue
            db.add(Dish(
                id=item['id'], name=item['name'], name_en=item.get('en', ''), category=item.get('category', ''),
                category_en=item.get('categoryEn', ''), description=item.get('description', ''), description_en=item.get('descriptionEn', ''),
                image=item.get('image', ''), portion=item.get('portion', ''), prep=item.get('prep', ''), cook=item.get('cook', ''),
                calories=item.get('calories', 0), protein=item.get('protein', 0), carbs=item.get('carbs', 0), fat=item.get('fat', 0),
                fiber=item.get('fiber', 0), salt=item.get('salt', 0), tags_json=json.dumps(item.get('tags', []), ensure_ascii=False),
                allergens_json=json.dumps(item.get('allergens', []), ensure_ascii=False),
                ingredients_json=json.dumps(item.get('ingredients', []), ensure_ascii=False),
                ingredients_en_json=json.dumps(item.get('ingredientsEn', []), ensure_ascii=False),
                steps_json=json.dumps(item.get('steps', []), ensure_ascii=False),
                steps_en_json=json.dumps(item.get('stepsEn', []), ensure_ascii=False), data_status='estimated'
            ))
        db.commit()
    print(f'Seeded {len(rows)} demo dishes (existing records were preserved).')

if __name__ == '__main__':
    seed_demo_dishes()
