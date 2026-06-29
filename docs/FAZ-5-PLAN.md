# FAZ 5 PLAN: Çoklu Dil, Kozmetikler, Etkinlikler & Polish

> **Strateji:** GDD'nin son fazı — 7 dile çıkış, kozmetik rozetler, haftalık etkinlikler,
> daha fazla eşya, Telegram WebApp entegrasyon hazırlığı.

---

## 🎯 Faz 5 Hedefleri

1. **Çoklu Dil (7 dil + RTL)** — TR, EN + RU, FA, AR (RTL), ES, PT
2. **Kozmetik Rozetler & Profil** — Başarım rozetleri, unvanlar, profil özelleştirme
3. **Daha Fazla ItemTemplate** — 25 → 50+ eşya (yeni silah/zırh/yoldaş)
4. **Haftalık Etkinlikler** — Çift XP haftası, boss boost, drop boost
5. **Telegram WebApp Entegrasyon Hazırlığı** — Gerçek auth için altyapı (mock fallback)
6. **Gelişmiş Anti-Cheat** — Anormal davranış tespiti, otomatik yavaşlatma
7. **Onboarding Tutrorial** — İlk girişte adım adım rehber
8. **UI Polish** — Daha detaylı animasyonlar, ses efektleri (placeholder)

---

## 📦 FAZ 5 - GELİŞTİRME (5.x)

### 5.1 DB Şema Güncellemeleri
- [ ] `PlayerBadge` modeli (playerId, badgeCode, unlockedAt)
- [ ] `PlayerTitle` modeli (playerId, titleCode, isActive)
- [ ] `WeeklyEvent` modeli (week, type, multiplier, description)
- [ ] Player'a `activeTitle`, `tutorialStep` ekle
- [ ] `db:push`

### 5.2 Çoklu Dil Genişletme
- [ ] `src/i18n/messages/ru.json` (Rusça)
- [ ] `src/i18n/messages/fa.json` (Farsça)
- [ ] `src/i18n/messages/ar.json` (Arapça — RTL)
- [ ] `src/i18n/messages/es.json` (İspanyolca)
- [ ] `src/i18n/messages/pt.json` (Portekizce)
- [ ] i18n store'a RTL desteği (ar/fa için dir=rtl)
- [ ] Dil değiştirici 7 dile çıkar
- [ ] layout.tsx'te `<html dir>` dinamik

### 5.3 Rozet & Unvan Sistemi
- [ ] `src/lib/game/badges.ts`
  - 10+ rozet (ilk kan, ilk craft, ilk raid, prestij, serial_killer vb.)
  - Otomatik tetiklenme (başarımlarla entegre)
  - Profil'de gösterim
- [ ] Unvanlar (title): "Çaylak", "Gazi", "Efsane", "Klan Lideri", "Boss Katili"
  - Koşullarına göre otomatik açılır
  - Profil'de aktif unvan seçimi
- [ ] `GET /api/player/badges` — rozetler + unvanlar
- [ ] `POST /api/player/set-title` — aktif unvan değiştir

### 5.4 Daha Fazla ItemTemplate
- [ ] loot.ts'ye 25+ yeni eşya seed:
  - WEAPON: katana, plasma_cannon, tesla_coil, ice_spear, poison_bow, chain_saw, flame_thrower
  - ARMOR: kevlar_vest, radiation_suit, power_armor_mk2, scrap_heavy, stealth_cloak
  - SIDE_TOOL: emp_pulse, shield_matrix, adrenaline_shot, cryo_grenade, toxin_vial
  - COMPANION: war_wolf, laser_turret, mutant_bear, drone_squad, cyber_dog
- [ ] Element-specific versiyonlar (fire katana, ice spear, poison bow)
- [ ] Faction-specific ekipman (Bozkır ağır, Çöl hızlı, Favela tech)

### 5.5 Haftalık Etkinlikler
- [ ] `src/lib/game/weekly-event.ts`
  - 4 tip etkinlik (haftalık rotasyon):
    - Çift XP Haftası (XP × 2)
    - Boss Boost (raid/global boss HP × 0.8, ödül × 1.5)
    - Drop Festivali (drop şansı × 1.5)
    - Hızlı Crafting (süre × 0.5)
  - Haftalık tek kayıt (Pazar gece yarısı reset)
  - Combat/crafting/expedition'a entegre
- [ ] `GET /api/weekly-event` — mevcut etkinlik

### 5.6 Telegram WebApp Entegrasyon Hazırlığı
- [ ] `src/lib/telegram.ts` — Telegram WebApp SDK wrapper
  - `getTelegramUser()` — gerçek tg_user verisi (varsa)
  - `mockFallback()` — dev ortamı için mock
  - `initData` validation (production için)
- [ ] `src/components/game/telegram-provider.tsx` — client-side provider
- [ ] Layout'ta Telegram script yükle
- [ ] Mock auth → gerçek auth geçişi (env bazlı)

### 5.7 Gelişmiş Anti-Cheat
- [ ] `src/lib/game/anticheat.ts` genişlet
  - Anormal kazanç tespiti (z-score)
  - Otomatik yavaşlatma (rate limit dinamik)
  - Şüpheli hareket log'u
  - `/api/dev/audit-log` — admin görüntüleme

### 5.8 Onboarding Tutorial
- [ ] `src/components/game/tutorial.tsx`
  - 5 adım:
    1. Karakter oluştur (existing onboarding)
    2. İlk savaş (battle'a yönlendir)
    3. İlk eşya kuşan (inventory)
    4. İlk crafting (crafting)
    5. İlk sefer (expedition)
  - Her adımda tooltip + "Atla" butonu
  - Tamamlayınca 100 Hurda ödülü
- [ ] Player'a `tutorialStep` (0-5) takibi

### 5.9 UI Polish
- [ ] Daha detaylı savaş animasyonları (screen shake, flash)
- [ ] Eşya açılış animasyonu (loot reveal)
- [ ] Level up animasyonu (confetti effect)
- [ ] Başarım açılış animasyonu (badge reveal)
- [ ] Toast bildirimleri geliştir

### 5.10 Profile Geliştirmeleri
- [ ] Rozet gösterim grid'i
- [ ] Unvan seçici
- [ ] İstatistik grafiği (savaş galibiyet oranı, seviye ilerlemesi)
- [ ] Sosyal linkler (Telegram username)

### 5.11 i18n + Worklog
- [ ] Tüm Faz 5 metinleri TR+EN (diğer 5 dil anahtarlar)
- [ ] Worklog Faz 5 kaydı

---

## 🧪 FAZ 5 - TEST (5T)

- [ ] Lint
- [ ] Tüm diller yükleniyor (TR/EN/RU/FA/AR/ES/PT)
- [ ] RTL Arabic doğru render
- [ ] Rozetler tetikleniyor
- [ ] Haftalık etkinlik çarpanları uygulanıyor
- [ ] Yeni eşyalar craft edilebiliyor

---

## ✅ FAZ 5 - FİNAL TEST (5F)

- [ ] E2E: tüm akış + yeni özellikler
- [ ] 7 dilde render
- [ ] Documentation + production notu
- [ ] GDD tamamlanma kontrolü

---

## 📊 Faz 5 Tamamlanma Kriterleri

1. ✅ 7 dil destekleniyor (TR/EN/RU/FA/AR/ES/PT)
2. ✅ RTL (Arapça/Farsça) doğru render
3. ✅ 10+ rozet + 5+ unvan
4. ✅ 50+ ItemTemplate
5. ✅ Haftalık etkinlik sistemi (4 tip)
6. ✅ Telegram WebApp entegrasyon hazırlığı
7. ✅ Onboarding tutorial (5 adım)
8. ✅ UI animasyonları geliştirilmiş
