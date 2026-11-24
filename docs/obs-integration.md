# OBS entegrasyonu

Bilinen servisler:

- `GET https://obsapi.antalya.edu.tr/api/cafeteria-menu/active`
- `GET https://obsapi.antalya.edu.tr/api/cafeteria-menu/{id}/download`

Aktif menü endpoint'i daha önce dış erişim testinde HTTP 401 döndürdü. Uygulama bu aşamada OBS'ye bağlandığını iddia etmez. Backend `/api/v1/admin/obs/status` ile `authorization_required` döndürür; `/api/v1/admin/obs/sync` ise kurumca belgelenmiş/izin verilmiş auth yöntemi edinilene kadar 503 döndürür.

Üniversite bilgi işleminden resmî servis hesabı veya belgelenmiş token akışı ve entegrasyon izni alınmalıdır. Öğrenci parolası, tarayıcı cookie'si ya da token kod içine yazılmamalıdır. Yetkili API hazır olana kadar admin PDF yükleme akışı kullanılabilir.

PDF metin çıkarma `PyMuPDF` ile yapılır. Taranmış PDF'ler için OCR henüz etkin değildir; metin bulunamazsa işlem açık hata verir. Gün/yemek ayrıştırması bir taslaktır ve yayınlamadan önce admin onayı gerekir.
