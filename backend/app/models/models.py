from __future__ import annotations
from datetime import datetime, date, timezone
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(40))
    password_hash: Mapped[str] = mapped_column(String(255))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    reviews: Mapped[list['Review']] = relationship(back_populates='user')

class UserSession(Base):
    __tablename__ = 'user_sessions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class Dish(Base):
    __tablename__ = 'dishes'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    name_en: Mapped[str] = mapped_column(String(160), default='')
    category: Mapped[str] = mapped_column(String(80), default='')
    category_en: Mapped[str] = mapped_column(String(80), default='')
    description: Mapped[str] = mapped_column(Text, default='')
    description_en: Mapped[str] = mapped_column(Text, default='')
    image: Mapped[str] = mapped_column(Text, default='')
    portion: Mapped[str] = mapped_column(String(80), default='')
    prep: Mapped[str] = mapped_column(String(40), default='')
    cook: Mapped[str] = mapped_column(String(40), default='')
    calories: Mapped[float] = mapped_column(Float, default=0)
    protein: Mapped[float] = mapped_column(Float, default=0)
    carbs: Mapped[float] = mapped_column(Float, default=0)
    fat: Mapped[float] = mapped_column(Float, default=0)
    fiber: Mapped[float] = mapped_column(Float, default=0)
    salt: Mapped[float] = mapped_column(Float, default=0)
    tags_json: Mapped[str] = mapped_column(Text, default='[]')
    allergens_json: Mapped[str] = mapped_column(Text, default='[]')
    ingredients_json: Mapped[str] = mapped_column(Text, default='[]')
    ingredients_en_json: Mapped[str] = mapped_column(Text, default='[]')
    steps_json: Mapped[str] = mapped_column(Text, default='[]')
    steps_en_json: Mapped[str] = mapped_column(Text, default='[]')
    data_status: Mapped[str] = mapped_column(String(30), default='estimated')
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class Menu(Base):
    __tablename__ = 'menus'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(40), default='manual')
    external_menu_id: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    title: Mapped[str] = mapped_column(String(180))
    week_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    week_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    file_name: Mapped[str] = mapped_column(String(255), default='')
    file_storage_key: Mapped[str] = mapped_column(String(255), default='')
    file_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(30), default='pending_review')
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    items: Mapped[list['MenuItem']] = relationship(back_populates='menu', cascade='all, delete-orphan')

class MenuItem(Base):
    __tablename__ = 'menu_items'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    menu_id: Mapped[int] = mapped_column(ForeignKey('menus.id', ondelete='CASCADE'), index=True)
    dish_id: Mapped[str | None] = mapped_column(ForeignKey('dishes.id', ondelete='SET NULL'), nullable=True)
    original_dish_name: Mapped[str] = mapped_column(String(180))
    menu_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    day_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    match_status: Mapped[str] = mapped_column(String(30), default='unmatched')
    menu: Mapped[Menu] = relationship(back_populates='items')

class Review(Base):
    __tablename__ = 'reviews'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dish_id: Mapped[str] = mapped_column(ForeignKey('dishes.id', ondelete='RESTRICT'), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    body: Mapped[str] = mapped_column(String(1200))
    status: Mapped[str] = mapped_column(String(24), default='published', index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    user: Mapped[User] = relationship(back_populates='reviews')
    images: Mapped[list['ReviewImage']] = relationship(back_populates='review', cascade='all, delete-orphan')

class ReviewImage(Base):
    __tablename__ = 'review_images'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    review_id: Mapped[int] = mapped_column(ForeignKey('reviews.id', ondelete='CASCADE'), index=True)
    storage_key: Mapped[str] = mapped_column(String(255), unique=True)
    mime_type: Mapped[str] = mapped_column(String(80), default='image/webp')
    file_size: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    review: Mapped[Review] = relationship(back_populates='images')

class ReviewReport(Base):
    __tablename__ = 'review_reports'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    review_id: Mapped[int] = mapped_column(ForeignKey('reviews.id', ondelete='CASCADE'), index=True)
    reporter_user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    reason: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(24), default='open')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (UniqueConstraint('review_id', 'reporter_user_id', name='uq_review_reporter'),)

Index('ix_review_dish_status_created', Review.dish_id, Review.status, Review.created_at)
