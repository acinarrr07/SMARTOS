# Smart Meal Guide — GitHub Pages sürümü

Bu paket yalnızca statik web sitesidir. İçindeki `index.html` GitHub Pages girişidir.

## Yayınlama

1. ZIP içindeki tüm dosya ve klasörleri yeni GitHub repository köküne yükle.
2. Settings → Pages → Source: GitHub Actions seç.
3. `main` branch'ine push yap. `.github/workflows/deploy-pages.yml` otomatik yayınlar.

## Yerel önizleme

```bash
python -m http.server 8000
```

`http://localhost:8000` adresini aç.

## Önemli

Varsayılan olarak örnek verilerle demo modunda çalışır. GitHub Pages Python/FastAPI çalıştırmaz. Gerçek hesap, ortak yorumlar, sunucuya fotoğraf yükleme ve kalıcı veritabanı için tam paketteki `backend/` klasörünü ayrı bir HTTPS host'a dağıt ve `js/runtime-config.js` dosyasındaki `API_BASE_URL` değerini ayarla. OBS otomasyonu üniversite yetkilendirmesi olmadan etkin değildir.
