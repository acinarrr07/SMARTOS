# Backend dağıtım kontrol listesi

## Gereksinimler
- Python 3.11 veya üzeri
- `backend/requirements.txt`
- Kalıcı disk (SQLite DB ve kullanıcı fotoğrafları için) veya PostgreSQL + kalıcı obje depolama
- HTTPS

## Yapılandırma
`.env.example` kopyalanarak `.env` oluşturulur. Üretimde en azından:
- `SMG_DATABASE_URL`
- `SMG_STORAGE_DIR`
- `SMG_FRONTEND_ORIGINS` (tek tek, tam origin)
- `SMG_COOKIE_SECURE=true`
- `SMG_COOKIE_SAMESITE=none` (frontend ve API farklı site origin'lerinde ise)

değerleri doğru ayarlanmalıdır. `SameSite=None` çerezi sadece HTTPS üzerinde kullan.

## Başlatma

```bash
pip install -r backend/requirements.txt
export PYTHONPATH=backend
uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

İlk yönetici kullanıcı, `SMG_BOOTSTRAP_ADMIN_EMAIL` ve en az 12 karakterlik `SMG_BOOTSTRAP_ADMIN_PASSWORD` ortam değişkenleri ayarlanarak `python backend/scripts_create_admin.py` komutuyla açılır.

## Sınırlar

- SQLite tek sunuculu prototip için uygundur; çoklu instance/yoğun eşzamanlı kullanımda PostgreSQL'e geç.
- Yerel dosya depolaması tek instance ve kalıcı disk gerektirir.
- Rate limiting, e-posta doğrulama, parola sıfırlama, yedekleme/geri yükleme ve üretim gözlemlenebilirliği henüz kapsamlı şekilde tamamlanmış değildir.
- OBS yetkilendirme yöntemi kurum tarafından doğrulanmadan `obs/sync` etkinleştirilmez.
