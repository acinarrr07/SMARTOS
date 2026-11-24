from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class RegisterIn(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=40)
    password: str = Field(min_length=10, max_length=128)

class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class UserOut(BaseModel):
    id: int
    email: str
    display_name: str
    is_admin: bool
    model_config = ConfigDict(from_attributes=True)

class ReviewCreate(BaseModel):
    dish_id: str = Field(min_length=1, max_length=80)
    body: str = Field(min_length=1, max_length=1200)

class ReviewUpdate(BaseModel):
    body: str | None = Field(default=None, min_length=1, max_length=1200)
    dish_id: str | None = Field(default=None, min_length=1, max_length=80)

class ReportCreate(BaseModel):
    reason: str = Field(min_length=4, max_length=500)

class ModerationUpdate(BaseModel):
    status: str = Field(pattern='^(published|hidden|pending)$')

class MenuItemOut(BaseModel):
    id: int
    original_dish_name: str
    dish_id: str | None
    menu_date: date | None
    display_order: int
    match_status: str
    model_config = ConfigDict(from_attributes=True)

class MenuOut(BaseModel):
    id: int
    title: str
    week_start_date: date | None
    week_end_date: date | None
    source: str
    status: str
    is_active: bool
    items: list[MenuItemOut]
    model_config = ConfigDict(from_attributes=True)

class DishCreate(BaseModel):
    id: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=2, max_length=160)
    name_en: str = ''
    category: str = ''
    category_en: str = ''
    description: str = ''
    description_en: str = ''
    image: str = ''
    portion: str = ''
    prep: str = ''
    cook: str = ''
    calories: float = Field(default=0, ge=0)
    protein: float = Field(default=0, ge=0)
    carbs: float = Field(default=0, ge=0)
    fat: float = Field(default=0, ge=0)
    fiber: float = Field(default=0, ge=0)
    salt: float = Field(default=0, ge=0)
    tags: list[str] = []
    allergens: list[str] = []
    ingredients: list[list[str]] = []
    ingredients_en: list[list[str]] = []
    steps: list[str] = []
    steps_en: list[str] = []
    data_status: str = 'estimated'

class MenuItemMatch(BaseModel):
    dish_id: str = Field(min_length=1, max_length=80)


class ReportStatusUpdate(BaseModel):
    status: str = Field(pattern='^(open|resolved|dismissed)$')
