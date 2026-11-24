# Smart Meal Guide — GitHub'a yükleme

## En kolay yol

1. `Smart-Meal-Guide-GitHub-Pages.zip` veya bütün kaynakları içeren `Smart-Meal-Guide-Final.zip` paketini çıkar.
2. GitHub'da yeni bir repository aç.
3. ZIP içindeki `index.html`, `css`, `js`, `locales` ve diğer dosyaları repository'nin **kök dizinine** yükle. `index.html` bir alt klasörün içinde kalmamalı.
4. Repository → Settings → Pages → Build and deployment → Source: **GitHub Actions** seç.
5. `main` branch'ine push yap. `.github/workflows/deploy-pages.yml` otomatik yayınlar.
6. Actions sekmesindeki deploy işi yeşil olduğunda Settings → Pages sayfasındaki site adresini aç.

## Hangi ZIP'i yüklemeliyim?

- `Smart-Meal-Guide-GitHub-Pages.zip`: Yalnızca HTML sitesi ve onu otomatik yayımlayan GitHub Actions iş akışı. İlk kez siteyi yayımlamak için en kolayı budur.
- `Smart-Meal-Guide-Final.zip`: HTML sitesi + FastAPI backend + SQLite/SQLAlchemy modelleri + testler + kurulum ve teknik belgeler. Gerçek hesap ve ortak yorumları daha sonra bağlamak için bunu kullan.

## Bilmen gereken

GitHub Pages Python backend çalıştırmaz. Varsayılan sitede örnek menü/yorumlar demo olarak görünür. Gerçek kullanıcı hesabı, herkese açık yorumlar ve sunucuya fotoğraf yüklemek için tam paketteki `backend/` ayrıca HTTPS sunucusuna dağıtılmalı ve `js/runtime-config.js` içindeki `API_BASE_URL` ayarlanmalıdır. OBS erişimi üniversite yetkilendirmesi beklediği için etkin değildir.
