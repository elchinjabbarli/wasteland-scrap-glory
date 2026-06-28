# FAZ 1 PLAN: MVP - Karakter, Inventory & Temel PvP

> **Strateji:** $0 bütçe, server-authoritative, mock Telegram auth, pixel-art tema, TR+EN dil, responsive mobile-first.
> **Alt Fazlar:** Faz 1 Geliştirme → Faz 1 Test → Faz 1 Final Test

---

## 🎯 Teknoloji Kararları (Faz 1 İçin)

| Karar | Seçim | Gerekçe |
|---|---|---|
| Oyun Motoru | **Next.js + React UI** (Phaser YOK) | Savaşlar server-side auto-battler, frontend sadece combat log animasyonu |
| Veritabanı | **Prisma + SQLite** | $0, lokal, zaten kurulu |
| Telegram Auth | **Mock Auth** (`?tg_user=xxx` query) | Gerçek bot olmadan dev, production'da gerçek Telegram WebApp API eklenecek |
| Gerçek Zamanlı | **Yok** (Faz 1'de) | PvP asenkron, Socket.io Faz 4'e bırakıldı |
| i18n | **next-intl (TR + EN)** | 7 dil Faz 5'te eklenecek, altyapı hazır olsun |
| Pixel Art | **CSS-based pixel estetiği + emoji/SVG** | CC0 assetler Faz 2'de eklenecek |
| Animasyon | **Framer Motion** (zaten kurulu) | Savaş tur animasyonları için |

---

## 📦 FAZ 1 - GELİŞTİRME (1.x)

### 1.1 Veritabanı Şeması (Prisma)
- [ ] `Player` modeli (telegramId, name, faction, level, xp, stats, currency, state, createdAt)
- [ ] `Item` modeli (templateId, name, slot, rarity, element, baseStats, upgradeLevel, durability, ownerId, state)
- [ ] `ItemTemplate` modeli (sabit eşya şablonları, seed data)
- [ ] `CombatLog` modeli (playerId, opponentId, result, rounds JSON, rewards, createdAt)
- [ ] `Loadout` modeli (playerId, weaponItemId, armorItemId, sideToolItemId, companionItemId)
- [ ] `Session` modeli (mock auth için, telegramId → playerId eşlemesi)
- [ ] `db:push` çalıştır
- [ ] Seed data: 3 fraksiyon başlangıç eşyası, 5-10 PvE rakip şablonu

### 1.2 Telegram Mock Auth API
- [ ] `src/lib/auth.ts` - mock session yönetimi (cookie veya header based)
- [ ] `POST /api/auth/login` - `{ tgUserId, tgUsername, tgName }` alır, player oluşturur/seçer, session döner
- [ ] `POST /api/auth/logout`
- [ ] `GET /api/auth/me` - mevcut session'dan player döner
- [ ] `src/lib/get-current-player.ts` - server-side helper
- [ ] Mock: dev ortamında URL `?tg_user=demo1&tg_name=Demo` ile otomatik login

### 1.3 Karakter Oluşturma Backend
- [ ] `POST /api/player/create` - `{ name, faction }` alır
- [ ] Faction validasyonu (BOZKIR | COL | FAVELA)
- [ ] İsim validasyonu (3-20 karakter, unique)
- [ ] Başlangıç eşyası otomatik inventory'ye eklenir
- [ ] Başlangıç stats'leri (STR/AGI/END/INT/LCK/CHR = 5'er)
- [ ] Başlangıç currency (100 Scrap, 0 Tech-Part, 0 Crystal)

### 1.4 Karakter İstatistik & Formül Motoru
- [ ] `src/lib/game/stats.ts` - tüm formüller
  - `requiredXp(level)` = `100 * (level ^ 1.5)`
  - `physicalDamage(base, str)` = `base * (1 + str * 0.05)`
  - `maxHp(end)` = `100 + (end * 10)`
  - `critChance(lck)` = `min(lck * 0.3%, 25%)`
  - `evasionChance(agi)` = `min(agi * 0.5%, 30%)`
  - `attackSpeed(base, agi)` = `base * (1 + agi * 0.03)`
  - `prestigeBonus(prestigeLevel)` = `1 + (prestigeLevel * 0.02)`
  - `upgradedStat(base, upgradeLevel)` = `base * (1 + upgradeLevel * 0.05)`
- [ ] `src/lib/game/player-stats.ts` - player + loadout'tan türetilmiş stats hesabı
- [ ] Birim testleri (formüllerin doğruluğu)

### 1.5 Prosedürel Eşya Üretimi (Loot Generation)
- [ ] `src/lib/game/loot.ts`
  - `generateItem(rarityHint?, levelHint?)` fonksiyonu
  - Ön-ekler: Paslı, Lanetli, Kutsal, Efsanevi
  - Son-ekler: +1, +2, of the Wasteland, of Fire, of Ice, of Poison
  - Rarity roll: %60 Common, %25 Rare, %10 Epic, %5 Legendary
  - İstatistik aralıkları rarity'ye göre
  - Element random ataması (Physical, Fire, Ice, Poison)
- [ ] `POST /api/dev/loot-test` - test endpoint (rastgele 10 eşya üretir)

### 1.6 Inventory Sistemi Backend
- [ ] `GET /api/inventory` - oyuncunun tüm eşyaları
- [ ] `POST /api/inventory/equip` - `{ itemId, slot }` - eşyayı kuşan
- [ ] `POST /api/inventory/unequip` - `{ slot }` - kuşanılanı çıkar
- [ ] `POST /api/inventory/salvage` - `{ itemId }` - parçala, malzeme ver
- [ ] Slot validasyonu (WEAPON | ARMOR | SIDE_TOOL | COMPANION)
- [ ] Eşya state validasyonu (IN_INVENTORY olmalı)
- [ ] Loadout güncelleme

### 1.7 Savaş Simülasyon Motoru (Server-Side)
- [ ] `src/lib/game/combat.ts`
  - `simulateCombat(playerA, loadoutA, playerB, loadoutB)` fonksiyonu
  - Round-bazlı simülasyon (max 50 tur)
  - Hız kontrolü (AGI + weapon speed)
  - Saldırı hesaplama (kritik, evasion, armor reduction)
  - Element etkileri (%20 bonus/malus)
  - Status effect'ler (Poison, Burn, Freeze, Stun, Haste, Empower, Shield, Regen)
  - Companion otomatik saldırı
  - Round log: `{ round, attacker, target, damage, crit, evaded, effects[], hpA, hpB }`
  - Sonuç: `{ winner, loser, xpGained, scrapGained, itemDropped?, combatLog[] }`
- [ ] Anti-cheat: max 50 round limit (infinite loop koruması)
- [ ] Deterministik olmayan (random), ama test edilebilir (seed parametresi)

### 1.8 PvP Eşleştirme & Savaş API
- [ ] `GET /api/matchmaking/opponents` - benzer seviyede 5 mock rakip üretir
- [ ] `POST /api/combat/pvp` - `{ opponentId }` - savaş başlat
  - Loadout'ları çek
  - Simülasyonu çalıştır
  - Sonuçları DB'ye kaydet (CombatLog)
  - XP/Scrap/Item ödüllerini uygula
  - Eşya dayanıklılığını azalt
  - Permadeath riski (kaybederse % eşya düşürme şansı)
  - Combat log'u döndür
- [ ] Rate limit: oyuncu başına saniyede 1 savaş (anti-spam)

### 1.9 Combat Log API
- [ ] `GET /api/combat/history` - oyuncunun son 20 savaşı
- [ ] `GET /api/combat/[id]` - tek bir savaş detayı (round-by-round)

### 1.10 Ana Layout & Tema
- [ ] `src/app/layout.tsx` güncelle - oyun meta'ları, font (Press Start 2P yerine mono), sticky footer wrapper
- [ ] `src/app/globals.css` - post-apokaliptik renk paleti (koyu gri, paslı turuncu, radyasyon yeşili, neon mavi)
- [ ] `src/components/game/pixel-panel.tsx` - pixel-art dokulu panel bileşeni
- [ ] `src/components/game/rarity-badge.tsx` - rarity renkli rozet (Common gri, Rare mavi, Epic mor, Legendary altın)
- [ ] `src/components/game/stat-bar.tsx` - stat göstergesi
- [ ] Sticky footer: alt navigasyon (Ana Sayfa, Savaş, Inventory, Profil)

### 1.11 Onboarding / Karakter Oluşturma UI
- [ ] Eğer oyuncunun karakteri yoksa `src/components/game/onboarding.tsx` göster
- [ ] 3 fraksiyon kartı (görsel + arketip açıklaması)
- [ ] İsim input + validasyon
- [ ] "Wasteland'e Adım At" butonu
- [ ] Başarı animasyonu (Framer Motion)

### 1.12 Dashboard (Ana Sayfa) UI
- [ ] `src/components/game/dashboard.tsx`
- [ ] Üst bar: karakter adı, seviye, faction ikonu, currency (Scrap/Tech-Part/Crystal)
- [ ] Karakter kartı: avatar (faction'a göre), HP/XP bar, stats özeti
- [ ] Hızlı aksiyonlar: "Savaşa Başla", "Envanter", "Profil"
- [ ] Günlük özet kartı (Faz 1'de placeholder)

### 1.13 Savaş UI (Loadout + Simülasyon)
- [ ] `src/components/game/battle-arena.tsx`
- [ ] **Loadout Seçimi Ekranı:** weapon/armor/sideTool/companion slotları, dropdown ile seç
- [ ] **Rakip Seçimi Ekranı:** 5 mock rakip listesi (seviye, güç göstergesi)
- [ ] **Simülasyon Ekranı:**
  - İki karakter yan yana (solda oyuncu, sağda rakip)
  - HP bar'lar canlı güncellenir
  - Round log'u (kayan metin): "Round 3: Sen Paslı Kılıç ile 45 hasar verdin (KRİTİK!)"
  - Element efekti görselleri (ateş kıvılcımı, buz parçası, zehir dumanı)
  - Round-by-round ilerleme (otomatik play, pause/skip butonu)
- [ ] **Sonuç Ekranı:** kazandın/kaybettin, ödüller, "Tekrar Savaş" / "Ana Sayfa"

### 1.14 Inventory UI
- [ ] `src/components/game/inventory.tsx`
- [ ] Grid layout: eşyalar rarity renkli kartlar halinde
- [ ] Filtre: slot tipine göre (Tümü / Silah / Zırh / Yan Araç / Yoldaş)
- [ ] Sırala: rarity'ye göre, seviyeye göre
- [ ] Eşya kartı: isim, rarity, element, stats, upgrade, durability bar
- [ ] Tıkla → eşya detay modal: Kuşan / Parçala butonları
- [ ] Loadout görünümü (üstte 4 slot, kuşanılan eşyalar)
- [ ] Malzeme stoğu (Hurda, Elektronik, Tech-Part, Kristal Tozu)

### 1.15 Profil UI
- [ ] `src/components/game/profile.tsx`
- [ ] Karakter detayları: faction, seviye, XP, prestige
- [ ] 6 stat (STR/AGI/END/INT/LCK/CHR) görsel bars
- [ ] İstatistikler: toplam savaş, galibiyet oranı, öldürülen rakip
- [ ] Son 5 savaş geçmişi kısa özet
- [ ] Başarımlar placeholder (Faz 1'de boş grid)

### 1.16 Root Page (`src/app/page.tsx`)
- [ ] Tüm akışı birleştiren tek sayfa
- [ ] State machine: ONBOARDING → DASHBOARD → BATTLE_LOADOUT → BATTLE_MATCH → BATTLE_SIM → BATTLE_RESULT → INVENTORY / PROFILE
- [ ] Zustand store: `useGameState` (currentView, currentPlayer, loadout, lastCombat)
- [ ] React Query: server state (player, inventory, opponents, combat history)
- [ ] Mock auth: sayfa açılışta `?tg_user=` yoksa demo login
- [ ] Sticky alt navigasyon ile view değiştirme

### 1.17 Pixel-Art Görsel Assetler (CSS-based)
- [ ] Faction renk şemaları (Bozkır: metalik gri+tip kürk; Çöl: kum+yeşil; Favela: neon+magenta)
- [ ] Karakter avatar placeholder'ları (SVG, faction'a göre)
- [ ] Silah ikonları (lucide-react ile: Sword, Shield, Zap, PawPrint)
- [ ] Element ikonları (Flame, Snowflake, Skull, Circle)
- [ ] Currency ikonları (Recycle = Scrap, Cpu = Tech-Part, Gem = Crystal)
- [ ] Background: subtle noise + radyasyon yeşili gradient

### 1.18 i18n Altyapı (TR + EN)
- [ ] `src/i18n/messages/tr.json` ve `en.json` (Faz 1 metinleri)
- [ ] `src/i18n/request.ts` - next-intl config
- [ ] Dil değiştirici (header'da TR/EN toggle)
- [ ] Tüm UI metinleri `t('key')` ile

### 1.19 Dev Log & Worklog
- [ ] `/home/z/my-project/worklog.md` başlat (Faz 1 başlangıç kaydı)
- [ ] Her alt-task bitiminde worklog güncelle

---

## 🧪 FAZ 1 - TEST (1T)

### 1T.1 Lint & Type Kontrol
- [ ] `bun run lint` çalıştır, hataları düzelt
- [ ] TypeScript strict mode hatası yok

### 1T.2 Dev Server Doğrulama
- [ ] `bun run dev` başlat, log'da hata yok
- [ ] `/` route 200 dönüyor

### 1T.3 API Endpoint Testleri (curl/manual)
- [ ] Auth login/create/get-me akışı
- [ ] Inventory listele/equip/unequip/salvage
- [ ] Matchmaking + PvP savaş başlatma
- [ ] Combat history

### 1T.4 Formül Doğrulama
- [ ] `requiredXp(1)=100, requiredXp(10)=3162, requiredXp(100)=100000`
- [ ] `maxHp(5)=150, maxHp(20)=300`
- [ ] `critChance(10)=3%, critChance(100)=25% (cap)`
- [ ] Loot generation: 100 eşya üret, rarity dağılımı yaklaşık %60/25/10/5

### 1T.5 Savaş Simülasyon Doğrulama
- [ ] 2 dengeli oyuncu → savaş ~5-15 tur sürer
- [ ] HP 0'a ulaşınca savaş biter
- [ ] Combat log round sayısı = actual rounds
- [ ] Random seed ile tekrarlanabilir

### 1T.6 Database Bütünlük
- [ ] Eşya transferi sırasında orphan kalmaz
- [ ] Loadout referansı geçerli
- [ ] Salvage sonrası eşya DB'den silinir, malzeme artar

### 1T.7 Responsive & Sticky Footer Test
- [ ] Mobile (320px) görünüm düzgün
- [ ] Desktop (1280px) görünüm düzgün
- [ ] Footer kısa içerikte altta sabit, uzun içerikte itiliyor

---

## ✅ FAZ 1 - FİNAL TEST (1F)

### 1F.1 Uçtan Uca Akış Testi (Agent Browser)
- [ ] Sayfa aç → onboarding → fraksiyon seç → isim gir → dashboard
- [ ] Dashboard → savaşa başla → loadout seç → rakip seç → simülasyon izle → sonuç
- [ ] Savaş sonrası XP/Scrap arttı mı kontrol
- [ ] Inventory → eşya kuşan → tekrar savaş → sonuç farklı mı
- [ ] Profil → stats güncel mi

### 1F.2 Hata Durumları Test
- [ ] İsimsiz login → onboarding göster
- [ ] Geçersiz faction → hata mesajı
- [ ] Silahsız savaş → uyarı
- [ ] Kırık eşyayı kuşanma → engellendi
- [ ] Olmayan rakip ID → 404

### 1F.3 Performance Check
- [ ] Sayfa açılış < 3 sn
- [ ] Savaş simülasyonu < 500ms (server-side)
- [ ] Combat log animasyonu smooth (60fps)

### 1F.4 Cross-Browser & Mobile
- [ ] Chrome desktop test
- [ ] Mobile viewport test (375px)
- [ ] Dark/light tema görünüm

### 1F.5 Documentation
- [ ] `worklog.md` Faz 1 tamamlanma kaydı
- [ ] `docs/FAZ-1-PLAN.md` checkbox'ları işaretli
- [ ] Faz 2 planı için kısa not

---

## 📊 Faz 1 Tamamlanma Kriterleri (Definition of Done)

1. ✅ Yeni oyuncu Telegram mock auth ile giriş yapabilir
2. ✅ 3 fraksiyondan birini seçip karakter oluşturabilir
3. ✅ Karakterine başlangıç eşyası verilir
4. ✅ Inventory'de eşyaları görüp kuşanabilir/çıkarabilir/parçalayabilir
5. ✅ Benzer seviyede mock rakiplerle PvP savaşı başlatabilir
6. ✅ Savaş server-side simüle edilir, combat log frontend'de animasyonlu gösterilir
7. ✅ Kazan/kaybet durumunda XP/Scrap/eşya ödülleri doğru uygulanır
8. ✅ Formüller GDD'ye birebir uyar
9. ✅ Mobile-responsive + sticky footer
10. ✅ TR/EN dil desteği
11. ✅ `bun run lint` hatasız
12. ✅ Agent Browser ile uçtan uca test başarılı
