# Sistem mimarisi

## Statik web yüzü

Kök `index.html`, `css/`, `js/` ve `locales/` klasörleri GitHub Pages ile uyumludur. HTML/CSS/Vanilla JavaScript kullanır. Örnek menü ve demo kullanıcı içeriği `js/data.js` içindedir. `js/runtime-config.js` içindeki `API_BASE_URL` boşsa yorum demo akışı aynı tarayıcının localStorage alanını kullanır. Backend origin ayarlandığında `js/api.js`, hesap/menü/yemek/yorum uç noktalarına istek gönderir ve kullanıcı oturumunu HttpOnly cookie ile taşır.

## Backend

`backend/app/main.py` FastAPI uygulamasını başlatır. SQLAlchemy modelleri `backend/app/models/models.py` içindedir. Başlangıç veritabanı SQLite'tır. API uç noktaları `/api/v1` altında toplanır. Kullanıcı oturumu rastgele token'ın SHA-256 özetiyle veritabanında tutulur; ham token yalnızca HttpOnly cookie'de bulunur. Parolalar Argon2 ile hash'lenir.

## Veri doğruluğu

Tarif ve besin verileri tahmini/doğrulanmış/bilinmiyor durumlarıyla ayrılmalıdır. Bu frontend paketindeki örnek bilgiler gerçek kurum reçetesi ya da resmî gıda bileşimi çekimi değildir. Alerjen/çapraz bulaşma bilgileri doğrulanmadan alerjensiz garantisi verilmez.

## Dağıtım

GitHub Pages yalnızca statik web yüzünü çalıştırır. FastAPI, veritabanı ve yüklemeler HTTPS destekli ayrı bir Python/Docker sunucusunda çalıştırılmalıdır. Ayrı origin kullanımında CORS/Origin allowlist ve cookie ayarları tam alan adına göre düzenlenmelidir. GitHub Pages ile farklı bir API domaini kullanıldığında üçüncü taraf cookie kısıtları göz önünde bulundurulmalı; özel alan adı ve aynı site alt alan adları tercih edilmelidir.
