# Test kılavuzu

Frontend doğrulama:

```bash
npm run validate:frontend
```

Backend testleri (hesap/oturum, kullanıcı yorum izinleri, rapor bildirimi, admin moderasyonu, origin koruması, fotoğraf dönüştürme, besin hesaplayıcı ve PDF içe aktarma):

```bash
PYTHONPATH=backend pytest -q backend/tests
```

Backend'in yerel smoke test'i:

```bash
curl http://127.0.0.1:8001/health
```

Beklenen sağlık cevabı `status: ok` ve `obs: not_configured` değerlerini içerir. OBS'nin `not_configured` olması hata değildir; kurum onayı/erişim yöntemi henüz sağlanmamıştır.
