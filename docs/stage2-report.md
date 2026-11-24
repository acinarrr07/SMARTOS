# Aşama 2 – Frontend Geliştirme Raporu

## Oluşturulanlar

- Premium gastronomi dergisi estetiğinde responsive HTML/CSS arayüzü.
- Ana sayfa, günlük menü, haftalık menü, yemek keşfi, yemek detayı, topluluk, profil ve demo yönetici ekranları.
- Vanilla JavaScript ES Modules ile sayfa gezinme ve etkileşimler.
- Türkçe ve İngilizce locale dosyaları.
- 12 örnek yemek ve 5 günlük demo menü verisi.
- Tahmini porsiyon besin değerlerini gösteren arayüz bileşenleri.
- Birden fazla seçimle kullanılabilen diyet ve beslenme filtreleri.
- Demo kullanıcı oturumu, yorum oluşturma/düzenleme/silme, sıralama ve bildirme akışı.
- JPG/JPEG, PNG ve WebP dosyaları için istemci tarafında format/boyut kontrolü, önizleme ve küçültme; yorum başına en fazla 4 fotoğraf.
- Demo admin görünümünde eksik veri listesi, yorum moderasyon arayüzü ve PDF seçimi akışı.
- Frontend doğrulama betiği.

## Doğrulama

`npm run validate:frontend` komutu aşağıdakileri kontrol eder:

- TR/EN locale dosyalarının JSON olarak okunması ve aynı anahtar kümesine sahip olması.
- HTML'deki çeviri anahtarlarının karşılıklarının bulunması.
- HTML ID'lerinin benzersiz olması.
- Örnek yemek ID'lerinin benzersiz olması.
- Haftalık menüde referans verilen yemek ID'lerinin var olması.
- Besin, malzeme, alerjen ve diyet alanlarının veri yapısı.
- HTML'deki yerel CSS/JS dosya yolları.
- JavaScript dosyalarının sözdizimi.

Bu doğrulamalar başarıyla tamamlandı.

## Bilinen sınırlamalar

- Bu aşamada gerçek FastAPI backend'i ve veritabanı yoktur.
- OBS API çağrısı yapılmaz. Giriş gerektiren OBS erişimi sonraki entegrasyon aşamasına bırakılmıştır.
- PDF seçimi yalnızca arayüz davranışını gösterir; dosya sunucuya gitmez ve içeriği ayrıştırılmaz.
- Demo giriş gerçek kimlik doğrulaması değildir.
- Yorumlar ve sıkıştırılmış fotoğraf önizlemeleri yalnızca tarayıcı `localStorage` alanında tutulur; başka cihazlara senkronize edilmez.
- Sunucu taraflı dosya doğrulama, zararlı dosya tarama ve moderasyon bu aşamada yoktur.
- Yemek görselleri internet bağlantısı gerektiren temsilî görsellerdir; üniversite yemekhanesinde çekilmiş fotoğraflar değildir.
- Otomatik headless tarayıcı etkileşim testi bu çalışma ortamında tarayıcı navigasyonu yönetici politikası tarafından engellendiği için çalıştırılamadı. Bu nedenle etkileşim testi kullanıcı bilgisayarında yerel sunucuyla yapılmalıdır.

## Çalıştırma

`frontend/README.md` dosyasındaki adımları izleyin. Yerel test sunucusunu `smart-meal-guide/frontend` klasöründe `python -m http.server 8000` komutuyla başlatın ve `http://localhost:8000` adresini açın.
