# Veritabanı

SQLAlchemy modelleri şu anda şunları içerir:

- `users`, `user_sessions`
- `dishes`
- `menus`, `menu_items`
- `reviews`, `review_images`, `review_reports`

Yemek alanlarında Türkçe/İngilizce ad ve açıklama, porsiyon, tahmini besin değerleri, malzeme JSON'u, tarif adımları, alerjen ve diyet etiketleri tutulur. Ayrı `ingredient`/`nutrient_source` normalizasyonu ve Alembic migration'ları bir sonraki veritabanı iyileştirme aşamasıdır.

Ürün kodunda şu anda menü öğesi eşleşmesi admin onayıyla yapılır. Yemek kaydı fiziksel silme yerine arşivleme yaklaşımıyla korunmalıdır. Menü PDF hash'i aynı dosyanın ikinci kez içe aktarılmasını engeller. Fotoğraf dosyaları `storage/reviews` içinde üretilen rastgele isimlerle saklanır; dosya adı kullanıcıdan alınmaz.
