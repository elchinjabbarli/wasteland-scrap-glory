# FAZ 3 PLAN: Seferler, Başarımlar, Görevler & Liderlik

> **Strateji:** Faz 2 ekonomisinin üzerine aktif oynanış döngüsü + meta-koleksiyon + sosyal yarış ekler.
> **Kapsam dışı (Faz 4):** Klan sistemi, Grup Raid, Socket.io (gerçek zamanlı gerekir)

---

## 🎯 Faz 3 Hedefleri

1. **Sefer (Expedition) Sistemi** — 4 bölge, gerçek zamanlı süre, risk/ödül
2. **Başarımlar (Achievements)** — 4 kategori, otomatik tetiklenme, puan sistemi
3. **Günlük Görevler** — 3 PvP / 1 Sefer / 1 Pazar, yenilenme
4. **Liderlik Tablosu** — Seviye, galibiyet, öldürme, başarı puanı
5. **Günlük Hava Olayı** — Asit Yağmuru, Radyasyon Fırtınası, Altın Saat (bonus/penalty)
6. **Anti-Cheat Kuralları** — Rate limit, anormal kazanç tespiti

---

## 📦 FAZ 3 - GELİŞTİRME (3.x)

### 3.1 DB Şema Güncellemeleri
- [ ] `Expedition` modeli (playerId, zoneType, startedAt, finishesAt, status, risks, rewards)
- [ ] `Achievement` modeli (code, name, category, description, points, condition JSON)
- [ ] `PlayerAchievement` modeli (playerId, achievementCode, unlockedAt)
- [ ] `DailyQuest` modeli (playerId, type, target, progress, completedAt, expiresAt)
- [ ] `WeatherEvent` modeli (günlük tek kayıt, type, multiplier, expiresAt)
- [ ] Player'a `achievementPoints`, `expeditionSlots` alanları ekle
- [ ] `db:push`

### 3.2 Sefer (Expedition) Backend
- [ ] `src/lib/game/expedition.ts`
  - 4 bölge (GDD'den):
    - Radyasyon Vadisi (Sv 1-30): %10 Radyasyon riski, 2 saat
    - Terk Edilmiş Şehir (Sv 30-60): %20 Mutant riski, 4 saat
    - Dağ Sığınağı (Sv 60-90): %30 Pusuya düşme riski, 6 saat
    - Nükleer Santral (Sv 90-100): %50 Kritik arıza riski, 8 saat
  - `startExpedition(player, zone)` → slot kontrol, level kontrol, süre başlat
  - `completeExpedition(player, expeditionId)` → risk roll, ödül üret
  - `cancelExpedition(player, expeditionId)` → %30 malzeme iade, time wasted
  - Başarılı: Hurda + Tech-Part + Eşya drop (level'e göre)
  - Başarısız: Karakter "Yaralı" (24 saat PvP yasağı)
  - Hızlandırma: Reklam (%50), Antik Kristal (%100)

### 3.3 Sefer API
- [ ] `GET /api/expedition/zones` — 4 bölge bilgisi (level kısıtı dahil)
- [ ] `GET /api/expedition/active` — oyuncunun aktif seferleri
- [ ] `POST /api/expedition/start` — `{ zoneType }` → başlat
- [ ] `POST /api/expedition/complete` — `{ expeditionId }` → tamamla
- [ ] `POST /api/expedition/cancel` — `{ expeditionId }` → iptal
- [ ] `POST /api/expedition/speedup` — `{ expeditionId, method }` → hızlandır

### 3.4 Başarımlar Backend
- [ ] `src/lib/game/achievements.ts`
  - 4 kategori (GDD'den):
    - Savaş: İlk Kan, Seri Katil (10 kill), İntikamcı, Boss Katili
    - Keşif: Gezgin (5 sefer), Hayatta Kalan (50 sefer), Hazine Avcısı
    - Ekonomi: Tüccar (10 satış), Üretici (5 craft), Koleksiyoncu (50 eşya)
    - Sosyal: Lider, Dost Canlısı, Klan Savaşçısı (Faz 4)
  - Her başarım: code, name, description, category, points, condition
  - `checkAchievements(player)` → her aksiyon sonrası kontrol
  - Puan: Common 10, Rare 25, Epic 50, Legendary 100
  - Toplam puan liderlik tablosunda gösterilir

### 3.5 Başarımlar API
- [ ] `GET /api/achievements` — tüm başarımlar + oyuncunun kazandıkları
- [ ] `POST /api/achievements/check` — manuel tetikleme (debug)

### 3.6 Günlük Görevler Backend
- [ ] `src/lib/game/quests.ts`
  - 3 tip günlük görev:
    - Savaş: 3 PvP kazan
    - Sefer: 1 sefer tamamla
    - Ekonomi: 1 pazar işlemi (al veya sat)
  - `generateDailyQuests(player)` — gece yarısı yenilenir, 3 rastgele görev
  - `updateQuestProgress(player, type, amount)` — her aksiyon sonrası artır
  - Tümünü tamamla → 5 Antik Kristal ödülü
  - `getDailyQuests(player)` — mevcut görevler + progress

### 3.7 Günlük Görevler API
- [ ] `GET /api/quests/daily` — mevcut görevler
- [ ] `POST /api/quests/claim` — tüm görevler tamamlandığında ödül al

### 3.8 Liderlik Tablosu Backend
- [ ] `src/lib/game/leaderboard.ts`
  - 4 kategori:
    - Seviye (top 100)
    - Galibiyet (top 100)
    - Öldürme (top 100)
    - Başarı Puanı (top 100)
  - Haftalık reset (Pazar gece yarısı)
  - `getLeaderboard(category, limit)` — top N oyuncu
  - `getPlayerRank(playerId, category)` — oyuncunun sırası
  - Mock oyuncular ekle (gerçek rakip hissi için)

### 3.9 Liderlik API
- [ ] `GET /api/leaderboard?category=level|wins|kills|achievements&limit=100`

### 3.10 Günlük Hava Olayı Backend
- [ ] `src/lib/game/weather.ts`
  - 3 tip (GDD'den):
    - Asit Yağmuru: Crafting süreleri %20 uzun, drop şansı %10 düşük
    - Radyasyon Fırtınası: PvP hasar %15 yüksek, eşya dayanıklılık %2 hızlı düşer
    - Altın Saat: Tüm ödüller %50 fazla, drop şansı %25 yüksek
  - `getDailyWeather()` — bugünün olayı (UTC gece yarısı seçilir)
  - Çarpanları crafting/combat/loot koduna entegre et

### 3.11 Hava API
- [ ] `GET /api/weather` — bugünün olayı + çarpanlar

### 3.12 Anti-Cheat Backend
- [ ] `src/lib/game/anticheat.ts`
  - `checkRateLimit(playerId, action)` — son 1 saatte aksiyon sayısı
  - Hızlı savaş: 1 saatte 100+ PvP = incelemeye al (flag)
  - Anormal kazanç: 1 saatte 10x normal Hurda = flag
  - Karaborsa: 1 saatte 50+ ilan = pazar yasağı (1 saat)
  - `flagPlayer(playerId, reason)` — Player.flagCount artır
  - 3 flag = otomatik 24 saat ban

### 3.13 Anti-Cheat API
- [ ] `GET /api/dev/flags` — admin (Faz 3'te dev-only)

### 3.14 Sefer UI
- [ ] `src/components/game/expedition-view.tsx`
  - 4 bölge kartı (level kısıtlı, risk yüzdesi, süre, potansiyel ödül)
  - Aktif sefer listesi (progress bar, süre kalan)
  - "Başlat", "Topla", "İptal", "Hızlandır" butonları
  - Hızlandırma seçenekleri (Reklam/Kristal)

### 3.15 Başarımlar UI
- [ ] `src/components/game/achievements-view.tsx`
  - 4 kategori filtre
  - Her kategoride başarımlar (kazanılmış/kazanılmamış)
  - Progress göstergesi (örn: "10/50 sefer")
  - Toplam puan kartı
  - Rarity renkli border (Common/Rare/Epic/Legendary)

### 3.16 Günlük Görevler UI
- [ ] `src/components/game/quests-view.tsx`
  - 3 görev kartı (progress bar, hedef, ödül)
  - "Ödül Al" butonu (hepsi tamamlandığında)
  - Yenilenme sayacı (gece yarısı)

### 3.17 Liderlik UI
- [ ] `src/components/game/leaderboard-view.tsx`
  - 4 kategori tab (Seviye, Galibiyet, Öldürme, Başarı)
  - Top 100 liste (rank, isim, faction, seviye, değer)
  - Kendi sıran (üstte sabit)
  - Madalya (1-2-3)

### 3.18 Hava Olayı UI
- [ ] Dashboard'a hava olayı banner'ı ekle
- [ ] Çarpanları göster (bonus/penalty)

### 3.19 Navigation Güncellemesi
- [ ] Nav'e "Sefer", "Başarımlar", "Görevler", "Liderlik" ekle
- [ ] Dashboard'a hızlı erişim kartları

### 3.20 i18n + Worklog
- [ ] Tüm Faz 3 metinleri TR+EN
- [ ] Worklog Faz 3 kaydı

---

## 🧪 FAZ 3 - TEST (3T)

- [ ] Lint & type kontrol
- [ ] Dev server doğrulama
- [ ] Expedition: start/complete/cancel/speedup
- [ ] Başarımlar: otomatik tetiklenme (savaş sonrası)
- [ ] Görevler: progress tracking, claim
- [ ] Liderlik: sıralama doğru, kategori değişimi
- [ ] Hava olayı: günlük değişim, çarpan uygulama

---

## ✅ FAZ 3 - FİNAL TEST (3F)

- [ ] Uçtan uca: savaş → görev progress → başarım tetikle → sefer → hava etkisi
- [ ] Hata durumları: level altı sefer, dolu slot, süre dolmadan complete
- [ ] Performance: API < 200ms
- [ ] Responsive + sticky footer
- [ ] Documentation + Faz 4 notu

---

## 📊 Faz 3 Tamamlanma Kriterleri

1. ✅ 4 bölge sefer sistemi (gerçek süre + risk + ödül)
2. ✅ En az 15 başarım, 4 kategori, otomatik tetiklenme
3. ✅ 3 günlük görev, yenilenme, toplu ödül
4. ✅ 4 kategori liderlik tablosu (top 100)
5. ✅ Günlük hava olayı (3 tip, çarpanlar)
6. ✅ Anti-cheat temel kuralları (rate limit + flag)
7. ✅ Tüm yeni view'lar mobile-responsive
8. ✅ TR/EN çevirileri tam
9. ✅ Lint hatasız
