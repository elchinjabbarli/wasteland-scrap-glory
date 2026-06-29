# FAZ 6 PLAN: İçerik Genişletme & Derinleştirme

> GDD tamamlandı. Bu faz GDD dışı yeni sistemler + content genişletmesi içerir.

---

## 🎯 Faz 6 Hedefleri

1. **PvP Turnuva Sistemi** — Haftalık turnuva, eleme turu, ödül havuzu
2. **Dünya Olayları (Random Events)** — Rastgele boss istilası, caravan, meteor
3. **Eşya Setleri** — 2/4/6 parça set bonusları
4. **İstatistik Grafikleri** — Savaş galibiyet oranı, seviye ilerlemesi (chart.js)
5. **Ses Efektleri** — Savaş, level up, crafting (Web Audio API)
6. **Daha Fazla Boss** — 5+ yeni raid boss, 3+ yeni global boss
7. **PvE Hikaye Modu** — 10 bölümlük senaryo, her bölüm 3 dalga
8. **Profil Özelleştirme** — Avatar renkleri, banner, unvan kombinasyonu

---

## 📦 FAZ 6 - GELİŞTİRME (6.x)

### 6.1 PvP Turnuva Sistemi
- [ ] `Tournament` model (week, type, participants, bracket, status)
- [ ] `TournamentMatch` model (round, playerA, playerB, winner, score)
- [ ] Haftalık otomatik turnuva başlatma
- [ ] Eleme turu (16 → 8 → 4 → 2 → 1)
- [ ] Ödül havuzu (katılım ücreti × 0.9)
- [ ] Turnuva API + UI

### 6.2 Dünya Olayları
- [ ] `WorldEvent` model (type, expiresAt, status, participants)
- [ ] 4 tip:
  - Boss İstilası (herkes aynı boss'a saldırır)
  - Caravan (koruma görevi)
  - Meteor Düşüşü (rastgele bölge, nadir eşya)
  - Radyasyon Patlaması (geçici buff/penalty)
- [ ] Saatlik rastgele tetiklenme
- [ ] Tüm oyunculara bildirim (Socket.io)

### 6.3 Eşya Setleri
- [ ] `ItemSet` model (code, name, pieces, bonus)
- [ ] 5 set:
  - Bozkır Seti (2: +10% hasar, 4: +20% HP)
  - Çöl Seti (2: +15% hız, 4: zehir immün)
  - Favela Seti (2: +10% kritik, 4: +1 yoldaş)
  - Radyasyon Seti (2: +25% radyasyon direnci)
  - Efsanevi Set (2: +15% tüm, 4: özel yetenek)
- [ ] Set bonus otomatik hesaplama

### 6.4 İstatistik Grafikleri
- [ ] Profile'a grafik sekmesi
- [ ] Chart.js ile:
  - Son 30 gün savaş galibiyet oranı
  - Seviye ilerleme curve
  - Hasar dağılımı (element bazlı)
  - Kaynak kazanımı (günlük)

### 6.5 Ses Efektleri
- [ ] `src/lib/audio.ts` — Web Audio API wrapper
- [ ] SFX:
  - Savaş: sword hit, crit, evade, win, lose
  - Crafting: hammer, success, fail
  - Level up: fanfare
  - UI: button click, tab switch, notification
- [ ] Ses açma/kapama ayarı (localStorage)
- [ ] Mock sesler (oscillator) — production'da gerçek asset

### 6.6 Daha Fazla Boss
- [ ] 5 yeni raid boss:
  - Çelik Dev (2.5x HP)
  - Radyasyon Canavarı (3x HP, poison)
  - Buz Trolü (2x HP, freeze)
  - Ateş İblisi (2.2x HP, burn)
  - Karanlık Şövalye (3.5x HP, stun)
- [ ] 3 yeni global boss:
  - Çorak Tanrısı (2M HP)
  - Antik Makine (3M HP)
  - Yok Eden (5M HP)

### 6.7 PvE Hikaye Modu
- [ ] `StoryChapter` model (number, title, waves, rewards)
- [ ] 10 bölüm:
  1. Uyanış (tutorial benzeri)
  2. İlk Kan
  3. Çöplük
  4. Mutant Sürüsü
  5. Radyasyon Vadisi
  6. Terk Edilmiş Şehir
  7. Dağ Geçidi
  8. Nükleer Santral
  9. Karanlık Klan
  10. Final: Çorak Efendisi
- [ ] Her bölüm 3 dalga (düşman difficulty artan)
- [ ] Bölüm tamamlayınca: hikaye ödülü + sonraki bölüm aç

### 6.8 Profil Özelleştirme
- [ ] Avatar renk seçimi (10 renk)
- [ ] Banner seçimi (5 banner)
- [ ] Unvan + rozet kombinasyonu önizleme
- [ ] Profil paylaşım linki

---

## 🧪 FAZ 6 - TEST & FİNAL
- [ ] Lint
- [ ] API testleri
- [ ] UI render
- [ ] Documentation
