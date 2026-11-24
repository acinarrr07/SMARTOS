from datetime import timezone
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.api.deps import get_current_user
from app.core.config import STORAGE_DIR
from app.db.database import get_db
from app.models.models import Dish, Review, ReviewImage, ReviewReport, User
from app.schemas.schemas import ReviewCreate, ReviewUpdate, ReportCreate
from app.services.image_service import store_review_image, delete_stored_image

router = APIRouter(prefix='/reviews', tags=['reviews'])

def review_out(review: Review):
    created = review.created_at
    if created and created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return {
        'id': review.id, 'dishId': review.dish_id, 'user': review.user.display_name,
        'userId': review.user_id, 'text': review.body, 'date': created.isoformat() if created else None,
        'images': [f"/uploads/reviews/{image.storage_key}" for image in review.images],
        'status': review.status
    }

@router.get('/recent')
def recent_reviews(limit: int = 50, db: Session = Depends(get_db)):
    limit = max(1, min(limit, 100))
    reviews = db.scalars(select(Review).options(joinedload(Review.user), joinedload(Review.images)).where(Review.status == 'published').order_by(Review.created_at.desc()).limit(limit)).unique().all()
    return {'items': [review_out(r) for r in reviews], 'count': len(reviews)}

@router.get('/dish/{dish_id}')
def list_dish_reviews(dish_id: str, sort: str = 'newest', db: Session = Depends(get_db)):
    if not db.get(Dish, dish_id):
        raise HTTPException(404, 'Dish not found.')
    direction = Review.created_at.asc() if sort == 'oldest' else Review.created_at.desc()
    reviews = db.scalars(select(Review).options(joinedload(Review.user), joinedload(Review.images)).where(Review.dish_id == dish_id, Review.status == 'published').order_by(direction)).unique().all()
    return {'items': [review_out(r) for r in reviews], 'count': len(reviews)}

@router.post('', status_code=201)
def create_review(payload: ReviewCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.get(Dish, payload.dish_id):
        raise HTTPException(404, 'Dish not found.')
    review = Review(dish_id=payload.dish_id, user_id=user.id, body=payload.body.strip())
    db.add(review); db.commit(); db.refresh(review)
    return {'id': review.id, 'dishId': review.dish_id, 'text': review.body, 'status': review.status}

@router.post('/{review_id}/images', status_code=201)
async def add_review_images(review_id: int, files: list[UploadFile] = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, 'Review not found.')
    if review.user_id != user.id and not user.is_admin:
        raise HTTPException(403, 'You can only add images to your own review.')
    if len(files) > 4 or len(review.images) + len(files) > 4:
        raise HTTPException(400, 'A review can contain up to four images.')
    stored = []
    try:
        for upload in files:
            key, size = await store_review_image(upload)
            stored.append(ReviewImage(review_id=review.id, storage_key=key, mime_type='image/webp', file_size=size))
        db.add_all(stored); db.commit()
    except Exception:
        db.rollback()
        for row in stored:
            delete_stored_image(row.storage_key)
        raise
    return {'images': [f'/uploads/reviews/{row.storage_key}' for row in stored]}

@router.patch('/{review_id}')
def update_review(review_id: int, payload: ReviewUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, 'Review not found.')
    if review.user_id != user.id and not user.is_admin:
        raise HTTPException(403, 'You can only edit your own review.')
    if payload.body is not None:
        review.body = payload.body.strip()
    if payload.dish_id is not None:
        if not db.get(Dish, payload.dish_id):
            raise HTTPException(404, 'Dish not found.')
        review.dish_id = payload.dish_id
    db.commit()
    return {'id': review.id, 'dishId': review.dish_id, 'text': review.body, 'status': review.status}

@router.delete('/{review_id}', status_code=204)
def delete_review(review_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    review = db.scalar(select(Review).options(joinedload(Review.images)).where(Review.id == review_id))
    if not review:
        raise HTTPException(404, 'Review not found.')
    if review.user_id != user.id and not user.is_admin:
        raise HTTPException(403, 'You can only delete your own review.')
    keys = [image.storage_key for image in review.images]
    db.delete(review); db.commit()
    for key in keys:
        delete_stored_image(key)

@router.post('/{review_id}/report', status_code=201)
def report_review(review_id: int, payload: ReportCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.get(Review, review_id):
        raise HTTPException(404, 'Review not found.')
    if db.scalar(select(ReviewReport).where(ReviewReport.review_id == review_id, ReviewReport.reporter_user_id == user.id)):
        raise HTTPException(409, 'You have already reported this review.')
    report = ReviewReport(review_id=review_id, reporter_user_id=user.id, reason=payload.reason.strip())
    db.add(report); db.commit()
    return {'message': 'Report received.'}
