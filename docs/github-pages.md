# GitHub Pages yayınlama

1. Repository'ye ZIP'in içeriğini kök seviyede yükle; `index.html` depo kökünde olmalı.
2. GitHub → Settings → Pages → Build and deployment → Source: GitHub Actions.
3. `.github/workflows/deploy-pages.yml` `main` branch push'unda siteyi yayımlar.
4. İlk deployment ve sonraki deployment sonuçları Actions sekmesinden izlenir.

GitHub Pages statik hosting hizmetidir. Python kodu, SQLite dosyası, kullanıcı session yönetimi veya dosya upload endpoint'i burada çalışmaz. Bu işlevler için FastAPI ayrı bir sunucuya dağıtılmalıdır.
