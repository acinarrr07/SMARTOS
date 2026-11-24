from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.db.database import Base, engine, SessionLocal
from app.models.models import Dish, User
from app.services.security import hash_password

client = TestClient(app)

def setup_module():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if not db.get(Dish, 'test-dish'):
            db.add(Dish(id='test-dish', name='Test Soup', name_en='Test Soup', calories=100, protein=3, carbs=10, fat=2, fiber=1, salt=0.5, data_status='estimated'))
        if not db.query(User).filter_by(email='admin@example.com').first():
            db.add(User(email='admin@example.com', display_name='Test Admin', password_hash=hash_password('Test-Admin-Pass-123!'), is_admin=True))
        db.commit()

def test_health_and_dish_list():
    assert client.get('/health').status_code == 200
    response = client.get('/api/v1/dishes')
    assert response.status_code == 200
    assert any(item['id'] == 'test-dish' for item in response.json()['items'])

def test_register_review_and_owner_permissions():
    client.post('/api/v1/auth/register', json={'email':'student@example.com','display_name':'Test Student','password':'Student-Password-123!'})
    me = client.get('/api/v1/auth/me')
    assert me.status_code == 200
    review = client.post('/api/v1/reviews', json={'dish_id':'test-dish','body':'A test review.'})
    assert review.status_code == 201
    review_id = review.json()['id']
    assert client.patch(f'/api/v1/reviews/{review_id}', json={'body':'Updated review.'}).status_code == 200
    assert client.get('/api/v1/reviews/dish/test-dish').json()['count'] == 1
    assert client.delete(f'/api/v1/reviews/{review_id}').status_code == 204

def test_admin_route_requires_admin():
    client.post('/api/v1/auth/logout')
    response = client.get('/api/v1/admin/missing-data')
    assert response.status_code == 401
    client.post('/api/v1/auth/login', json={'email':'admin@example.com','password':'Test-Admin-Pass-123!'})
    response = client.get('/api/v1/admin/obs/status')
    assert response.status_code == 200
    assert response.json()['connected'] is False

def test_nutrition_calculator_reports_missing_data_without_guessing():
    from app.services.nutrition_calculator import calculate_per_serving
    result = calculate_per_serving([
        {'name': 'Rice', 'grams': 100, 'per_100g': {'energy_kcal': 130, 'protein_g': 2.7, 'carbohydrate_g': 28, 'fat_g': 0.3, 'fiber_g': 0.4, 'salt_g': 0.01}, 'source': 'test-source'},
        {'name': 'Unknown ingredient', 'grams': 20}
    ], servings=2)
    assert result['per_serving']['energy_kcal'] == 65
    assert result['status'] == 'incomplete'
    assert result['missing_ingredients'] == ['Unknown ingredient']


def test_duplicate_review_report_is_rejected():
    client.post('/api/v1/auth/register', json={'email':'reporter@example.com','display_name':'Reporter','password':'Reporter-Password-123!'})
    review = client.post('/api/v1/reviews', json={'dish_id':'test-dish','body':'Report test review.'})
    review_id = review.json()['id']
    assert client.post(f'/api/v1/reviews/{review_id}/report', json={'reason':'Contains inappropriate content.'}).status_code == 201
    assert client.post(f'/api/v1/reviews/{review_id}/report', json={'reason':'Duplicate report test.'}).status_code == 409

def test_review_photo_upload_is_reencoded_on_server():
    from io import BytesIO
    from PIL import Image
    client.post('/api/v1/auth/register', json={'email':'photographer@example.com','display_name':'Photo User','password':'Photo-Password-123!'})
    review = client.post('/api/v1/reviews', json={'dish_id':'test-dish','body':'Photo upload test.'}).json()
    image_buffer = BytesIO()
    Image.new('RGB', (12, 12), (220, 120, 80)).save(image_buffer, format='PNG')
    response = client.post(f"/api/v1/reviews/{review['id']}/images", files={'files': ('meal.png', image_buffer.getvalue(), 'image/png')})
    assert response.status_code == 201
    assert response.json()['images'][0].endswith('.webp')

def test_admin_imports_text_pdf_and_detects_duplicate():
    import fitz
    pdf = fitz.open()
    page = pdf.new_page()
    page.insert_text((72, 72), 'Haftalik Yemek Menusu\nPazartesi\nDomates Corbasi\nEt Yahni\nSali\nBulgur Pilavi')
    content = pdf.tobytes()
    pdf.close()
    client.post('/api/v1/auth/logout')
    client.post('/api/v1/auth/login', json={'email':'admin@example.com','password':'Test-Admin-Pass-123!'})
    first = client.post('/api/v1/admin/menus/import', files={'file': ('haftalik-menu.pdf', content, 'application/pdf')})
    assert first.status_code == 201, first.text
    assert first.json()['items_found'] >= 3
    duplicate = client.post('/api/v1/admin/menus/import', files={'file': ('haftalik-menu.pdf', content, 'application/pdf')})
    assert duplicate.status_code == 409
    activated = client.post(f"/api/v1/admin/menus/{first.json()['menu_id']}/activate")
    assert activated.status_code == 200
    active = client.get('/api/v1/menus/active')
    assert active.status_code == 200
    assert active.json()['menu']['is_active'] is True


def test_disallowed_browser_origin_cannot_write():
    response = client.post(
        '/api/v1/auth/register',
        headers={'Origin': 'https://untrusted.example'},
        json={'email': 'origin-test@example.com', 'display_name': 'Origin Test', 'password': 'Origin-Test-Password-123!'}
    )
    assert response.status_code == 403


def test_admin_can_review_and_resolve_user_reports():
    client.post('/api/v1/auth/logout')
    client.post('/api/v1/auth/register', json={'email':'reportee@example.com','display_name':'Reportee','password':'Reportee-Password-123!'})
    review = client.post('/api/v1/reviews', json={'dish_id':'test-dish','body':'A reported review.'}).json()
    client.post('/api/v1/auth/logout')
    client.post('/api/v1/auth/register', json={'email':'reporter2@example.com','display_name':'Reporter Two','password':'Reporter-Two-Password-123!'})
    assert client.post(f"/api/v1/reviews/{review['id']}/report", json={'reason':'Please review this content.'}).status_code == 201
    client.post('/api/v1/auth/logout')
    client.post('/api/v1/auth/login', json={'email':'admin@example.com','password':'Test-Admin-Pass-123!'})
    reports = client.get('/api/v1/admin/reports')
    assert reports.status_code == 200
    report_id = reports.json()['items'][0]['id']
    updated = client.patch(f'/api/v1/admin/reports/{report_id}', json={'status':'resolved'})
    assert updated.status_code == 200
    assert updated.json()['status'] == 'resolved'
