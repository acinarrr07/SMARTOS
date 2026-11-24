# Smart Meal Guide

**Antalya Bilim Üniversitesi için gastronomi odaklı dijital yemekhane rehberi.** Günlük/haftalık menü, yemek detayları, tahmini tarif ve besin değerleri, alerjen uyarıları, topluluk yorumları ve yönetim araçlarını tek projede toplar.

> **Teslim durumu:** Bu depo iki parçalıdır: GitHub Pages üzerinde yayımlanabilen HTML/CSS/Vanilla JavaScript arayüzü ve ayrıca sunucuya dağıtılması gereken FastAPI backend. GitHub Pages yalnızca statik dosyaları çalıştırır. Gerçek hesaplar, paylaşılan yorumlar, fotoğraf depolama, SQLite/PostgreSQL ve yönetici servisleri için backend ayrı bir HTTPS sunucusunda çalışmalıdır.

## 1. GitHub'a yükle ve web sitesini yayımla

1. `Smart-Meal-Guide-Final.zip` dosyasını bilgisayarına çıkar.
2. GitHub'da yeni bir repository oluştur.
3. ZIP'in içindeki **dosya ve klasörlerin tamamını** repository'nin en üst seviyesine yükle. `index.html` doğrudan repository kökünde olmalı; `smart-meal-guide/` adlı ikinci bir klasörün içine koyma.
4. GitHub'da **Settings → Pages → Build and deployment → Source** alanında **GitHub Actions** seç.
5. `main` branch'ine push yap. `.github/workflows/deploy-pages.yml` dosyası siteyi otomatik yayımlar.
6. GitHub → **Actions** alanında `Deploy Smart Meal Guide to GitHub Pages` işinin yeşil tamamlandığını kontrol et. Site adresi Pages ekranında görünür.

Alternatif: Yalnızca statik siteyi yüklemek istiyorsan `Smart-Meal-Guide-GitHub-Pages.zip` paketini kullanabilirsin. Tam paket backend ve belgeleri de içerir.

## 2. Yerel olarak HTML sitesini çalıştır

Python kuruluysa Windows'ta repository kökünde terminal aç:

```powershell
py -m http.server 8000
```

Ardından `http://localhost:8000` adresini aç. macOS/Linux:

```bash
python3 -m http.server 8000
```

ES Modules ve çeviri JSON dosyaları kullanıldığı için `index.html` dosyasını `file://` ile doğrudan açma.

## 3. Arayüzde bulunan özellikler

- Responsive masaüstü, tablet ve telefon tasarımı.
- Günlük menü ve beş günlük örnek haftalık menü.
- Yemek arama ve birlikte uygulanabilen vegan, vejetaryen, glutensiz, düşük kalorili ve yüksek protein filtreleri.
- Yemek detayları, malzeme miktarları, tahmini tarif, porsiyon, besin değerleri ve alerjen bilgileri.
- Türkçe/İngilizce arayüz.
- Topluluk yorum akışı; demo modunda yorum ekleme/düzenleme/silme tarayıcı `localStorage` alanında çalışır.
- Fotoğraf seçme, önizleme ve tarayıcı tarafında boyut küçültme.
- Yönetici arayüzü; backend yapılandırıldığında admin API'sinden yorum moderasyonu, eksik veri, yemek sayısı ve OBS durumunu okuyabilir.
- Yönetici oturumuyla PDF menü yükleme ve metin çıkarma.
- Backend yapılandırıldığında gerçek hesap, oturum, yemek/menü verisi, sunucuda saklanan yorumlar ve yorum fotoğrafları.

**Demo/örnek veriler:** Başlangıçtaki 12 yemek, haftalık menü, bazı fotoğraflar ve üç örnek yorum demo amaçlıdır; gerçek OBS menüsü, kurum reçetesi veya gerçek kullanıcı içeriği değildir. Fotoğraf bulunmayan/gerçek çekimi olmayan yemek görselleri temsili harici görsellerdir. Besin değerleri doğrulanmış TürKomp aktarımı değil, örnek/tahmini alanlardır.

## 4. Backend'i çalıştır

Backend FastAPI + SQLAlchemy + SQLite kullanır. İçerdiği işlevler: hesap kaydı/giriş/çıkış, HttpOnly oturum çerezi, yemek listeleme/detay, aktif menü, yorum oluşturma/düzenleme/silme, raporlama, yorum fotoğrafını sunucu tarafında doğrulayıp WebP'ye dönüştürme, admin moderasyonu ve manuel PDF içe aktarma.

### Windows PowerShell

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r backend/requirements.txt
Copy-Item .env.example .env
$env:PYTHONPATH = "backend"
py -m app.db.seed
py -m uvicorn app.main:app --app-dir backend --reload --port 8001
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env
export PYTHONPATH=backend
python -m app.db.seed
uvicorn app.main:app --app-dir backend --reload --port 8001
```

- API: `http://127.0.0.1:8001`
- Swagger: `http://127.0.0.1:8001/docs`
- Health: `http://127.0.0.1:8001/health`

İlk çalıştırmada SQLite veritabanı ve yükleme dizinleri oluşturulur. `python -m app.db.seed` örnek yemek kayıtlarını ekler; mevcut kayıtları çoğaltmaz.

## 5. Admin hesabı oluştur

Admin parolası kaynak koda gömülü değildir. Backend ortam değişkenleriyle bir defalık yönetici hesabı oluştur:

```powershell
$env:PYTHONPATH = "backend"
$env:SMG_BOOTSTRAP_ADMIN_EMAIL = "admin@kurumunuz.edu.tr"
$env:SMG_BOOTSTRAP_ADMIN_PASSWORD = "UZUN_BENZERSIZ_BIR_PAROLA"
$env:SMG_BOOTSTRAP_ADMIN_NAME = "Smart Meal Guide Admin"
py backend/scripts_create_admin.py
```

macOS/Linux'ta aynı değişkenleri `export` ile tanımla. Gerçek parolayı GitHub'a, sohbete veya `.env.example` dosyasına koyma.

## 6. GitHub Pages arayüzünü backend'e bağla

Ön yüzün backend bağlantısı isteğe bağlıdır. Varsayılan ayar demo modudur.

1. Backend'i HTTPS destekleyen ayrı bir sunucuya dağıt.
2. `js/runtime-config.js` dosyasını aç.
3. `API_BASE_URL` değerine backend'in tam origin adresini yaz. Örnek:

```javascript
window.SMG_CONFIG = Object.freeze({
  API_BASE_URL: 'https://api.ornekalanadiniz.com'
});
```

4. Backend sunucusundaki `.env` dosyasında `SMG_FRONTEND_ORIGINS` değerini sitenin tam origin'i olarak ayarla. Örnek: `https://kullanici.github.io` veya özel alan adın.
5. Üretimde HTTPS kullan. `SMG_COOKIE_SECURE=true` ayarla. Ön yüz ve API farklı site alan adlarındaysa `SMG_COOKIE_SAMESITE=none` gerekir; tarayıcıların üçüncü taraf çerez politikaları bu kurulumu yine de engelleyebilir. En güvenilir seçenek kendi alan adını kullanmak (ör. `www.ornekalanadiniz.com` ve `api.ornekalanadiniz.com`) veya aynı site origin'inde reverse proxy kullanmaktır.
6. `js/runtime-config.js` değişikliğini GitHub'a push et.

CORS origin listesine `*` koyma; credential/cookie kullanılan API için açıkça izin verilen frontend origin'leri kullanılmalıdır. Backend, tarayıcıdan gelen yazma isteklerinde `Origin` başlığını izin listesiyle karşılaştırır. `.env.example` yalnızca yerel geliştirme değerleri içerir.

## 7. Backend API uç noktaları

| Method | Endpoint | İşlev |
|---|---|---|
| GET | `/health` | Servis kontrolü |
| GET | `/api/v1/dishes` | Yemekleri listele/ara |
| GET | `/api/v1/dishes/{id}` | Yemek detayı |
| GET | `/api/v1/menus/active` | Aktif menü |
| POST | `/api/v1/auth/register` | Kayıt ve oturum |
| POST | `/api/v1/auth/login` | Giriş |
| POST | `/api/v1/auth/logout` | Çıkış |
| GET | `/api/v1/auth/me` | Oturum kullanıcısı |
| GET | `/api/v1/reviews/recent` | Son yorumlar |
| GET | `/api/v1/reviews/dish/{id}` | Yemeğin yorumları |
| POST | `/api/v1/reviews` | Yorum oluştur |
| PATCH | `/api/v1/reviews/{id}` | Kendi yorumunu düzenle |
| DELETE | `/api/v1/reviews/{id}` | Kendi yorumunu sil |
| POST | `/api/v1/reviews/{id}/images` | Yorum fotoğrafı yükle (en fazla 4) |
| POST | `/api/v1/reviews/{id}/report` | Yorumu bildir |
| GET | `/api/v1/admin/missing-data` | Eksik yemek verileri |
| GET | `/api/v1/admin/reviews` | Admin yorum listesi |
| PATCH | `/api/v1/admin/reviews/{id}/moderation` | Yorum moderasyonu |
| GET | `/api/v1/admin/reports` | Kullanıcı bildirimleri |
| PATCH | `/api/v1/admin/reports/{id}` | Bildirim durumunu güncelle |
| POST | `/api/v1/admin/menus/import` | PDF metnini içe aktar |
| POST | `/api/v1/admin/menus/{id}/activate` | Menüyü yayına al |
| PATCH | `/api/v1/admin/menu-items/{id}/match` | Menü öğesini yemekle eşleştir |
| GET | `/api/v1/admin/obs/status` | OBS bağlantı durumu |
| POST | `/api/v1/admin/obs/sync` | OBS senkronizasyonu (şu an devre dışı) |

## 8. Docker ile backend

Docker ve Docker Compose kuruluysa:

```bash
cp .env.example .env
# .env içindeki SMG_FRONTEND_ORIGINS ve üretim cookie ayarlarını düzenle.
docker compose up --build -d
```

Backend `http://localhost:8001` üzerinden erişilir. Üretimde önüne HTTPS reverse proxy koy; SQLite veri hacmi ve yedekleme ihtiyacı büyüdüğünde PostgreSQL'e geçir.

## 9. OBS entegrasyonunun gerçek durumu

Bilinen uç noktalar:

- `GET https://obsapi.antalya.edu.tr/api/cafeteria-menu/active`
- `GET https://obsapi.antalya.edu.tr/api/cafeteria-menu/{id}/download`

Aktif menü endpoint'i için dış erişim denemesinde `401 Unauthorized` görülmüştü. Üniversite tarafından onaylanmış erişim yöntemi veya servis hesabı sağlanmadığı için bu pakette canlı OBS senkronizasyonu **çalışır durumda değildir**. Admin API durumu `authorization_required` olarak bildirir ve senkronizasyon çağrısı `503` döndürür. Kimlik doğrulama aşılmaz, kişisel OBS şifresi/cookie/token koda yazılmaz.

Manuel PDF aktarımında metin tabanlı PDF içeriği çıkarılır ve gün/yemek satırları için ilk taslak oluşturulur; menü yöneticinin kontrolü ve eşleştirmesini bekler. Taranmış PDF/OCR bu sürümde etkin değildir. PDF'den tarih/metin ayrıştırmanın doğruluğu gerçek üniversite PDF örnekleriyle ayrıca test edilmelidir.

## 10. Besin değerleri ve alerjen doğruluğu

Besin hesaplayıcı servisi malzeme gramajı ve 100 gram başına kaynak değerleri sağlandığında porsiyon başına hesaplama yapar; eksik veri varsa sonucu `incomplete` olarak işaretler, değeri uydurmaz. Ancak canlı TürKomp veri çekimi veya lisanslı veri aktarımı bu pakette etkin değildir. TürKomp ve diğer veri kaynaklarının lisans/izin koşullarını üniversite projesi için teyit et.

Alerjen ve diyet etiketleri kurum reçetesi ve çapraz bulaşma doğrulaması olmadan kesin güvenlik garantisi değildir. Belirsiz içerik, yönetici tarafından doğrulanmalıdır.

## 11. Testler

Frontend veri/çeviri/bağlantı/JS kontrolleri:

```bash
npm run validate:frontend
```

Backend API testleri:

```bash
PYTHONPATH=backend pytest -q backend/tests
```

Bu teslim sırasında her iki kontrol grubu çalıştırılmıştır. Backend testleri kayıt/giriş, yorum izinleri, fotoğraf dönüştürme, rapor tekrarı, admin koruması ve PDF içe aktarma akışlarını kapsar.

## 12. Dizin yapısı

```text
smart-meal-guide/
├── index.html
├── css/                       # Tasarım sistemi ve responsive stiller
├── js/                        # Vanilla JS, API adaptörü, demo verileri
├── locales/                   # TR / EN metinleri
├── favicon.svg
├── .nojekyll
├── .github/workflows/         # GitHub Pages deploy action
├── backend/                   # FastAPI, SQLAlchemy, servisler ve testler
├── storage/                   # Yerel backend dosyaları; Git'e yüklenmez
├── docs/                      # Mimari, dağıtım, OBS, test dokümanları
├── scripts/                   # Frontend doğrulama
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md
```

## 13. Üretim öncesi yapılması gerekenler

Bu teslim bir çalışan üniversite proje temeli ve yayınlanabilir statik arayüzdür; kurumsal canlıya alma öncesinde şu konular tamamlanmalıdır:

- Backend'i kalıcı depolama ve HTTPS olan bir host'a dağıt; yedekleme ve izleme kur.
- GitHub Pages'ten gerçek kullanıcı hesabı/yorum kullanacaksan API origin, CORS ve cookie topolojisini gerçek alan adında dene.
- OBS entegrasyonu için üniversiteden resmî yetki al; gerçek PDF formatlarıyla parser doğrula ve OCR gerekiyorsa ekle.
- TürKomp veri kullanım izinlerini doğrula; malzemeleri kaynak kayıt numarası ve pişmiş/çiğ durumu ile yönet.
- Admin arayüzüne tam yemek/tarif/malzeme düzenleme ve rapor inceleme akışlarını ekle; şu anki admin UI ağırlıklı olarak dashboard, PDF içe aktarma ve yorum moderasyonunu kapsar.
- Üretim ortamında reverse proxy seviyesinde rate limiting, CSRF/origin kontrolü, log rotasyonu, yedekleme ve güvenlik taraması uygula.
- 20 gerçek katılımcıyla kullanıcı testi yapmadan test sonucu/anket istatistiği yayımlama.

## Lisans

Bu eğitim projesi için MIT lisansı eklenmiştir. Harici görsellerin ve üçüncü taraf veri kaynaklarının kendi lisans/koşulları ayrıca geçerlidir.
