# FAZ 2 PLAN: Crafting, Upgrade, Karaborsa & Prestige

> **Strateji:** Faz 1 MVP'sinin üzerine ekonomi derinliği + meta-progression ekler.
> **Alt Fazlar:** Faz 2 Geliştirme → Faz 2 Test → Faz 2 Final Test

---

## 🎯 Faz 2 Hedefleri

1. **Crafting Sistemi** — 4 rarity tarif, gerçek zamanlı süre, başarı şansı
2. **Eşya Yükseltme** — +1 → +10, +7+ kırılma riski, malzeme maliyeti
3. **Karaborsa (Black Market)** — İlan verme, satın alma, takas, komisyon
4. **Prestige Sistemi** — Sv 100'de prestige, kalıcı +%2 bonus, kayıp/kazanç
5. **Stat Point Dağıtım** — Her seviyede 1 point, STR/AGI/END/INT/LCK/CHR
6. **Ek ItemTemplate'ler** — Daha fazla silah/zırh/yan araç/yoldaş çeşitliliği
7. **Eşya Tamir** — Kırık eşyaları Tech-Part ile tamir et
8. **Reklam Ödülü** — Günlük sandık, sefer hızlandırma (mock)

---

## 📦 FAZ 2 - GELİŞTİRME (2.x)

### 2.1 DB Şema Güncellemeleri
- [ ] `CraftingJob` modeli (playerId, recipeRarity, startedAt, finishesAt, status, resultItemId?)
- [ ] `MarketListing` modeli (sellerId, itemId, price, currency, listedAt, expiresAt, status)
- [ ] `TradeOffer` modeli (fromPlayerId, toPlayerId, offeredItemIds[], requestedItemIds[], status, expiresAt)
- [ ] `PrestigeLog` modeli (playerId, prestigeLevel, prestigeAt, stats snapshot)
- [ ] `StatAllocationLog` (opsiyonel — audit için)
- [ ] Player'a `dailyChestClaimedAt`, `adWatchCount` alanları ekle
- [ ] Item'a `listedPrice` alanı ekle (market için)
- [ ] `db:push` çalıştır

### 2.2 Crafting Backend
- [ ] `src/lib/game/crafting.ts` — crafting logic
  - `startCrafting(player, rarity)` → CraftingJob oluştur, malzeme düş
  - `getCraftingJobs(playerId)` → aktif/tamamlanmamış işler
  - `completeCrafting(jobId)` → süre dolmuşsa eşya üret, başarı şansı uygula
  - `cancelCrafting(jobId)` → iptal, %50 malzeme iade
- [ ] Tarifeler (GDD'den):
  - Common: 100 Hurda, 10dk, %100
  - Rare: 50 Hurda + 20 Elektronik, 1sa, %80
  - Epic: 30 Elektronik + 10 Tech-Part, 4sa, %50
  - Legendary: 50 Tech-Part + 5 Kristal Tozu, 12sa, %20
- [ ] Başarısızlık durumunda %50 malzeme iade
- [ ] Başarı durumunda prosedürel eşya üret (loot.ts kullanarak)

### 2.3 Crafting API
- [ ] `GET /api/crafting/jobs` — oyuncunun aktif işleri
- [ ] `POST /api/crafting/start` — `{ rarity }` → iş başlat
- [ ] `POST /api/crafting/complete` — `{ jobId }` → tamamlanan işi sonuçlandır
- [ ] `POST /api/crafting/cancel` — `{ jobId }` → iptal

### 2.4 Eşya Yükseltme Backend
- [ ] `src/lib/game/upgrade.ts` — upgrade logic
  - `upgradeItem(item)` → +1 seviye, malzeme maliyeti, başarı şansı
  - Maliyet: upgradeLevel * (10 Hurda + 1 Elektronik)
  - Başarı şansı: +1-6 = %100, +7 = %80, +8 = %60, +9 = %40, +10 = %20
  - +7+ başarısızlıkta eşya kırılma riski (%30)
  - Kırılan eşya → state=BROKEN, salvage edilebilir ama upgrade sıfırlanır
- [ ] `POST /api/upgrade/item` — `{ itemId }` → yükseltme dene

### 2.5 Eşya Tamir Backend
- [ ] `repairItem(item)` — Tech-Part maliyeti = (100 - durability) / 10
- [ ] `POST /api/upgrade/repair` — `{ itemId }` → tamir et

### 2.6 Karaborsa Backend
- [ ] `src/lib/game/market.ts` — market logic
- [ ] İlan verme: fee = fiyat * 0.05 (Hurda) veya 0.03 (Tech-Part)
- [ ] İlan süreleri: 1sa (ücretsiz), 4sa (10 Hurda), 12sa (25 Hurda), 24sa (50 Hurda)
- [ ] İlan limiti: ücretsiz 5, premium 15
- [ ] Satın alma: alıcıdan fiyat + komisyon, satıcıya fiyat - komisyon
- [ ] Takas: iki oyuncu eşya teklif eder, %1 komisyon
- [ ] Anti-manipülasyon: 1 saatte 50+ ilan = yasa

### 2.7 Karaborsa API
- [ ] `GET /api/market/listings` — tüm aktif ilanlar (filtreli)
- [ ] `POST /api/market/list` — `{ itemId, price, currency, duration }` → ilan ver
- [ ] `POST /api/market/buy` — `{ listingId }` → satın al
- [ ] `POST /api/market/cancel` — `{ listingId }` → ilanı iptal
- [ ] `GET /api/market/my-listings` — kendi ilanların
- [ ] `POST /api/market/trade/offer` — `{ toPlayerId, offeredItemIds, requestedItemIds }`
- [ ] `POST /api/market/trade/accept` — `{ tradeId }`
- [ ] `POST /api/market/trade/reject` — `{ tradeId }`

### 2.8 Prestige Backend
- [ ] `src/lib/game/prestige.ts` — prestige logic
  - `canPrestige(player)` → level >= 100 check
  - `prestige(player)` → level=1, xp=0, Common/Rare eşyalar sil, Hurda/Elektronik sil
  - Kalıcı bonus: prestige * 0.02 (hasar/HP çarpanı)
  - Kazanım: +1 prestige, ekstra slot (Faz 3'te), kozmetik rozet
- [ ] `POST /api/prestige/perform` — prestige yap

### 2.9 Stat Point Dağıtım Backend
- [ ] `allocateStat(player, stat, points)` → statPoints düş, stat artır
- [ ] `POST /api/player/allocate-stat` — `{ stat, points }` → dağıt

### 2.10 Günlük Ödüller & Reklam Backend
- [ ] `claimDailyChest(player)` → 24sa cooldown, scrap + malzeme ver
- [ ] `watchAd(player)` → günlük 3 kez, her biri scrap/kristal ver
- [ ] `POST /api/rewards/daily-chest` — günlük sandık al
- [ ] `POST /api/rewards/watch-ad` — reklam izle ödülü

### 2.11 Ek ItemTemplate Seed'leri
- [ ] 10+ yeni silah (katana, çelik kalkan, lazer tabancası, plazma baltası, vs.)
- [ ] 8+ yeni zırh (kevlar, radyasyon suit, power armor mk2, vs.)
- [ ] 6+ yeni yan araç (emp bomba, shield booster, heal drone, vs.)
- [ ] 5+ yeni yoldaş (skorpion, mutant ayı, sentry bot, vs.)
- [ ] Element-specific eşyalar (Fire/Ice/Poison temalı)

### 2.12 Crafting UI
- [ ] `src/components/game/crafting-view.tsx`
- [ ] 4 tarif kartı (Common/Rare/Epic/Legendary) — malzeme maliyeti, süre, başarı şansı
- [ ] Aktif iş listesi (progress bar ile süre takibi)
- [ ] "Üret" butonu (malzeme yetersizse disabled)
- [ ] "Topla" butonu (süre dolmuş iş için)
- [ ] Crafting animasyonu (süre dolduğunda)

### 2.13 Upgrade & Repair UI
- [ ] `src/components/game/upgrade-view.tsx`
- [ ] Eşya seçici (inventory'den)
- [ ] Mevcut stats → yükseltilmiş stats önizleme
- [ ] Maliyet gösterimi
- [ ] Başarı şansı göstergesi (+7+ için warning)
- [ ] "Yükselt" butonu + animasyon
- [ ] Tamir sekmesi (kırık eşyalar için)

### 2.14 Karaborsa UI
- [ ] `src/components/game/market-view.tsx`
- [ ] **İlanlar tabı:** tüm aktif ilanlar, filtre (slot/rarity/price), sırala
- [ ] **İlan Ver tabı:** eşya seç, fiyat gir, süre seç, komisyon göster
- [ ] **İlanlarım tabı:** kendi ilanların, iptal butonu
- [ ] **Takas tabı:** oyuncu ara, teklif gönder
- [ ] Satın alma onay modalı (komisyon dahil toplam fiyat)
- [ ] Real-time fiyat güncelleme (refetch)

### 2.15 Prestige UI
- [ ] `src/components/game/prestige-view.tsx`
- [ ] Mevcut prestige seviyesi + bonus
- [ ] "Prestige Yap" butonu (level 100'de aktif)
- [ ] Uyarı: kaybedilecekler listesi (Common/Rare eşyalar, Hurda, Elektronik)
- [ ] Onay dialog (2 adımlı)
- [ ] Prestige animasyonu

### 2.16 Stat Dağıtım UI
- [ ] `src/components/game/stat-allocation-view.tsx`
- [ ] 6 stat kartı (STR/AGI/END/INT/LCK/CHR)
- [ ] Her birinde "+1" butonu (statPoints > 0 iken)
- [ ] Mevcut değer + dağıtım sonrası önizleme
- [ ] Türetilmiş stat'lar (HP, crit, evasion) canlı güncelleme

### 2.17 Navigation Güncellemesi
- [ ] Ana nav'e "Üret", "Pazar", "Prestij" ekle (ya da alt menü)
- [ ] Dashboard'a hızlı erişim kartları
- [ ] Header'da stat point indicator (varsa)

### 2.18 Onboarding Genişletme
- [ ] İlk girişte crafting/market kısa tanıtım tooltips
- [ ] İlk prestige'e kadar progress göster

### 2.19 i18n Genişletme
- [ ] Tüm Faz 2 metinleri için TR+EN çevirileri
- [ ] Crafting, upgrade, market, prestige, stat bölümleri

### 2.20 Worklog Güncelleme
- [ ] Faz 2 geliştirme kaydı

---

## 🧪 FAZ 2 - TEST (2T)

### 2T.1 Lint & Type Kontrol
- [ ] `bun run lint` hatasız
- [ ] TypeScript strict mode

### 2T.2 Dev Server Doğrulama
- [ ] Server çalışıyor, `/` 200

### 2T.3 Crafting API Test
- [ ] Start crafting (yetersiz malzeme → 400)
- [ ] Start crafting (yeterli → job oluşturuldu)
- [ ] Complete (süre dolmamış → 400)
- [ ] Complete (süre dolmuş → eşya üretildi)
- [ ] Cancel (malzeme iade)

### 2T.4 Upgrade API Test
- [ ] +1 → +6 (başarı garantili)
- [ ] +7 dene (bazen kırılır)
- [ ] Kırık eşya yükseltme denemesi → 400
- [ ] Tamir → durability 100

### 2T.5 Market API Test
- [ ] İlan ver (fee düşüldü)
- [ ] Başka oyuncu satın al (komisyon doğru)
- [ ] İlan iptal
- [ ] Trade teklif gönder/kabul/reddet

### 2T.6 Prestige Test
- [ ] Level < 100 → prestige yapamaz
- [ ] Level 100 → prestige yapar, level=1, bonus kalıcı

### 2T.7 Stat Dağıtım Test
- [ ] statPoints=0 → dağıtamaz
- [ ] statPoints=5 → 5 point dağıt, stat'lar artar

### 2T.8 Formül Doğrulama
- [ ] Crafting süreleri GDD'ye uygun
- [ ] Upgrade maliyetleri doğru
- [ ] Market komisyonları doğru (%5/%3/%1)

---

## ✅ FAZ 2 - FİNAL TEST (2F)

### 2F.1 Uçtan Uca Akış
- [ ] Savaş → kazan → malzeme topla → crafting başlat → bekle → eşya al
- [ ] Eşya yükselt (+1 → +5 başarılı)
- [ ] Kırık eşyayı tamir et
- [ ] İlan ver → başkası satın al
- [ ] Level 100'e ulaş (dev shortcut) → prestige yap
- [ ] Stat point dağıt

### 2F.2 Hata Durumları
- [ ] Yetersiz malzeme ile crafting
- [ ] Süre dolmadan complete
- [ ] Olmayan ilanı satın alma
- [ ] Kendi ilanını satın alma
- [ ] Level 100 altında prestige

### 2F.3 Performance
- [ ] Crafting listesi < 200ms
- [ ] Market listesi < 500ms (100+ ilan ile)
- [ ] Upgrade animasyonu smooth

### 2F.4 Responsive & Sticky Footer
- [ ] Tüm yeni view'lar mobile uyumlu
- [ ] Footer sticky kalmış

### 2F.5 Documentation
- [ ] worklog.md Faz 2 tamamlanma kaydı
- [ ] FAZ-2-PLAN.md checkbox'ları işaretli
- [ ] Faz 3 planı için kısa not

---

## 📊 Faz 2 Tamamlanma Kriterleri

1. ✅ 4 rarity crafting tarifleri çalışıyor (gerçek süre ile)
2. ✅ Eşya +1 → +10 yükseltme, +7+ kırılma riski
3. ✅ Kırık eşya tamir edilebilir
4. ✅ Karaborsa'da ilan/satın al/takas çalışıyor
5. ✅ Prestige sistemi (Sv 100'de, kalıcı bonus)
6. ✅ Stat point dağıtım UI
7. ✅ Günlük sandık + reklam ödülü
8. ✅ 25+ yeni ItemTemplate
9. ✅ Tüm yeni view'lar mobile-responsive
10. ✅ TR/EN çevirileri tam
11. ✅ Lint hatasız
12. ✅ API'ler curl ile doğrulandı
