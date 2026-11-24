# Mimari Karar Kayıtları

## ADR-001: Vanilla JavaScript frontend

**Karar:** Framework zorunlu değil; HTML/CSS/Vanilla JS kullanılacak.

**Gerekçe:** Kullanıcının teknoloji tercihi ve proje ölçeğinde sade bakım ihtiyacı.

## ADR-002: FastAPI backend

**Karar:** Backend Python FastAPI olacak.

**Gerekçe:** REST API, PDF işleme, görsel işleme ve otomasyon Python ekosisteminden yararlanır.

## ADR-003: SQLite ile başlama

**Karar:** Geliştirme SQLite, üretim/hedef PostgreSQL.

**Gerekçe:** İlk kurulum kolaylığı; veritabanı erişiminin ORM katmanında tutulması sayesinde geçiş kolaylığı.

## ADR-004: OBS entegrasyonu yetki koşullu

**Karar:** Onaylı erişim olmadan auth aşılmayacak. Manuel PDF yükleme yedeği sağlanacak.

## ADR-005: Tahmini veriyi açıkça etiketleme

**Karar:** Tahmini reçete ve besin bilgileri doğrulanmış kurum verisi gibi gösterilmeyecek.

## ADR-006: Kullanıcı fotoğraflarını ayrı saklama

**Karar:** Resmî yemek fotoğrafları, temsilî görseller ve kullanıcı yorum fotoğrafları ayrı türlerde tutulacak.
