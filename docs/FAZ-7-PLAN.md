# FAZ 7 PLAN: GDD Eksiklerini Tamamlama

> GDD'nin her bölümü detaylı incelendi. Aşağıdaki eksikler tespit edildi.

---

## 🔴 KRİTİK EKSİKLER (Yapılmalı)

### 7.1 Companion Ölünce 24 Saat Yaralı (Bölüm 4.1)
- [ ] Combat'ta companion HP 0'a düşerse, player 24 saat "INJURED" olmalı
- [ ] Bu süre boyunca companion kullanılamaz

### 7.2 Prestige Ekstra Slotlar (Bölüm 8.1)
- [ ] Prestige başına +1 sefer slotu (max 3)
- [ ] Prestige başına +1 crafting slotu (max 5)
- [ ] Prestige başına +2 market ilan limiti

### 7.3 Arkadaşlık Grup Savaşı Bonusu %10 (Bölüm 9.1)
- [ ] Arkadaşınla aynı savaşa girince %10 ekstra ödül
- [ ] PvP'de arkadaş listesindeki birini yenince bonus

### 7.4 Telegram /raid Komutu (Bölüm 9.2)
- [ ] Telegram bot webhook (/raid komutu)
- [ ] Grup ID'den klan raid başlatma
- [ ] Deep link ile TMA'ya yönlendirme

### 7.5 Haftalık Klan Savaşları (Bölüm 9.4)
- [ ] ClanWar modeli (clanA, clanB, status, scoreA, scoreB)
- [ ] Haftalık eşleştirme (benzer seviye klanlar)
- [ ] 48 saat savaş, toplam hasar belirler
- [ ] "Haftanın Şampiyonu" rozeti

### 7.6 Eksik Başarımlar (Bölüm 12)
- [ ] İntikamcı (1 intikam al)
- [ ] Boss Katili (1 raid boss öldür)
- [ ] Koleksiyoncu (50 eşya topla)
- [ ] Lider (klan kur)
- [ ] Dost Canlısı (5 arkadaş edin)
- [ ] Klan Savaşçısı (1 klan savaşına katıl)

### 7.7 Günlük Sandık Reklam 2x (Bölüm 13.1)
- [ ] Sandık aldıktan sonra reklam izleyip 2x ödül

### 7.8 Raporlama Sistemi (Bölüm 14.3)
- [ ] PlayerReport modeli (reporterId, targetId, reason)
- [ ] 3 rapor = otomatik inceleme modu
- [ ] /api/report/player endpoint

### 7.9 Analitik/Event Tracking (Bölüm 15)
- [ ] EventLog modeli (playerId, eventType, data JSON, timestamp)
- [ ] Track: user_login, battle_start, battle_end, item_crafted, market_listing, market_purchase, ad_watched, iap_purchase
- [ ] /api/dev/analytics (admin dashboard)

### 7.10 Ses Efektleri (Bölüm 10.4)
- [ ] src/lib/audio.ts — Web Audio API
- [ ] SFX: sword hit, crit, evade, win, lose, craft, level up, UI click
- [ ] Ses açma/kapama ayarı (localStorage)

### 7.11 Combat States (Bölüm 17.2)
- [ ] WAITING, ROUND_START, ATTACK_PHASE, DEFENSE_PHASE, STATUS_EFFECT_PHASE, ROUND_END, COMBAT_END
- [ ] combat.ts'te round akışına state'leri ekle

---

## 🟡 ORTA DÜZEY EKSİKLER

### 7.12 Maks Enerji Sistemi (Bölüm 2.2)
- [ ] Enerji (50 + INT * 5) combat'ta kullanılmıyor
- [ ] Enerji silahları enerji tüketmeli, yoksa enerji=0 iken kullanılamaz

### 7.13 Premium Sefer Slotu (Bölüm 7.1)
- [ ] Prestige 1+ = 2 slot, Prestige 3+ = 3 slot

### 7.14 Rarity Renk Kodları GDD'ye Uyumu (Bölüm 10.3)
- [ ] Common: #9ca3af → #808080
- [ ] Rare: #3b82f6 → #0070DD
- [ ] Epic: #a855f7 → #A335EE
- [ ] Legendary: #f59e0b → #FF8000

### 7.15 Player States Kullanımı (Bölüm 17.1)
- [ ] IN_COMBAT: savaş sırasında
- [ ] IN_EXPEDITION: sefer sırasında
- [ ] IN_CRAFTING: crafting sırasında
- [ ] IN_MARKET: pazar sırasında (listing)

---

## 🟢 DÜŞÜK ÖNCELİK (Teknoloji kararları)

### 7.16 Karakter Animasyonları (Bölüm 10.2)
- [ ] CSS sprite animation (idle, attack, damage, death)
- [ ] 4 fraksiyon için farklı sprite setleri

### 7.17 @twa-dev/sdk Entegrasyonu (Bölüm 16.1)
- [ ] npm install @twa-dev/sdk
- [ ] TelegramProvider'da gerçek SDK kullan
