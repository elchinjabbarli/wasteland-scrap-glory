# GAME DESIGN DOCUMENT (GDD) - DETAYLI VE KESİNTİSİZ VERSİYON

## Proje Adı: Wasteland: Scrap & Glory
## Versiyon: 2.0.0 (Detaylı)

| Alan | Değer |
|---|---|
| Hedef Platform | Telegram Mini App (TMA) / Mobile Web |
| Bütçe Kısıtlaması | $0 - $10 (Sadece ücretsiz tier servisler ve CC0/Open-source assetler kullanılacaktır) |
| Bakım Vizyonu | "Zero-Maintenance" - Geliştirici müdahalesi olmadan 10+ yıl yaşayacak, prosedürel ve oyuncu-odaklı sistemler. |
| Hedef Kitle | 16-35 yaş, Telegram aktif kullanıcıları (TR, RU, MENA, LATAM) |
| Desteklenen Diller | Türkçe, İngilizce, Rusça, Farsça, Arapça, İspanyolca, Portekizce (RTL desteği şarttır) |

---

# 1. OYUNUN HİKAYESİ VE DÜNYA LORE'U

## 1.1. Arka Plan Hikayesi
Yıl 2147. "Büyük Çöküş" olarak bilinen küresel bir felaketten 50 yıl sonra dünya, radyasyon, asit yağmurları ve kıt kaynaklarla dolu bir çorak araziye (Wasteland) dönüşmüştür. Medeniyet çökmüş, hayatta kalanlar küçük gruplar halinde hayatta kalmaya çalışmaktadır. Eski dünyanın teknolojisi artık birer "antika" değil, hayatta kalmanın anahtarıdır.

## 1.2. Dünya Durumu
- **Radyasyon Bölgeleri:** Haritanın bazı kısımları yüksek radyasyon içerir. Burada uzun süre kalmak karaktere sürekli hasar verir ama nadir eşyalar düşer.
- **Terk Edilmiş Şehirler:** Eski medeniyetin kalıntıları. Yüksek seviye Tech-Part ve elektronik eşya bulunur ama "Mutant" düşmanlar yaşar.
- **Çöl Vadileri:** Su kaynaklarının kuruduğu bölgeler. Hafif zırhlar ve zehir temalı silahlar burada bulunur.
- **Dağ Sığınakları:** Yüksek irtifa, düşük sıcaklık. Ağır zırhlar ve mekanik yoldaşlar burada üretilir.

## 1.3. Fraksiyonlar (Lore-Based)
Oyuncular oyuna başlarken bir fraksiyon seçer. Bu seçim sadece kozmetiktir, istatistik etkilemez.

### 1.3.1. Bozkır Nomadları (Steppe Nomads)
- **Kültür:** Orta Asya/Türk/Rus etkileşimli. Göçebe yaşam tarzı.
- **Görsel Stil:** Mekanik zırhlar, metalik renkler, kürk detaylar.
- **Karakter Arketipi:** "Demir Yürek" - Ağır zırhlar, yavaş ama güçlü silahlar.

### 1.3.2. Çöl Akıncıları (Desert Raiders)
- **Kültür:** Arap/Fars etkileşimli. Çölde hayatta kalma uzmanları.
- **Görsel Stil:** Yırtık pırtık kıyafetler, kum tonları, zehir ve kum fırtınası temalı silahlar.
- **Karakter Arketipi:** "Kum Fırtınası" - Hafif zırhlar, hızlı saldırı, zehir/durum etkileri.

### 1.3.3. Favela Hayatta Kalanları (Favela Survivors)
- **Kültür:** LATAM (Brezilya) etkileşimli. Şehir kalıntılarında yaşayan gençler.
- **Görsel Stil:** Renkli, neon, hurda malzemeden yapılmış çılgın silahlar, elektronik parçalar.
- **Karakter Arketipi:** "Hack'çi" - Teknoloji tabanlı yetenekler, tuzaklar, drone yoldaşlar.

---

# 2. KARAKTER SİSTEMİ VE ARKETİPLER

## 2.1. Karakter Oluşturma
Oyuncu oyuna ilk girdiğinde:
1. **İsim:** Telegram kullanıcı adını otomatik alır ama değiştirebilir.
2. **Fraksiyon Seçimi:** Bozkır, Çöl veya Favela (Sadece görsel).
3. **Başlangıç Ekipmanı:** Her fraksiyonun kendine özgü 1 Common eşyası verilir.

## 2.2. Karakter İstatistikleri (Stats)

### 2.2.1. Birincil İstatistikler (Primary Stats)
1. **Güç (Strength - STR):** Fiziksel silahların hasarını artırır.
   - Formül: `Fiziksel_Hasar = Temel_Hasar * (1 + STR * 0.05)`
2. **Çeviklik (Agility - AGI):** Saldırı hızını ve kaçış (evasion) şansını artırır.
   - Formül: `Saldırı_Hızı = Temel_Hız * (1 + AGI * 0.03)`, `Kaçış_Şansı = min(AGI * 0.5%, 30%)`
3. **Dayanıklılık (Endurance - END):** Maksimum HP ve zehir/radyasyon direncini artırır.
   - Formül: `Maks_HP = 100 + (END * 10)`
4. **Zeka (Intelligence - INT):** Enerji silahlarının ve büyülerin hasarını, enerji miktarını artırır.
   - Formül: `Enerji_Hasar = Temel_Hasar * (1 + INT * 0.05)`, `Maks_Enerji = 50 + (INT * 5)`

### 2.2.2. İkincil İstatistikler (Secondary Stats)
5. **Şans (Luck - LCK):** Kritik vuruş şansını ve nadir eşya düşme oranını artırır.
   - Formül: `Kritik_Şansı = min(LCK * 0.3%, 25%)`, `Nadir_Drop_Bonus = LCK * 0.1%`
6. **Karizma (Charisma - CHR):** Karaborsa fiyatlarını iyileştirir ve grup raid ödüllerini artırır.
   - Formül: `Satis_Fiyati_Bonus = CHR * 0.2%`, `Raid_Odul_Bonus = CHR * 0.5%`

## 2.3. Seviye Atlama (Leveling)
- **XP Kazanımı:** PvP savaşlarından 50-200 XP, Seferlerden 100-500 XP, Grup Raid'lerden 300-1000 XP.
- **Seviye Başına Gerekli XP:** `Gerekli_XP = 100 * (Seviye ^ 1.5)`
- **Maksimum Seviye:** 100 (Prestige yapılmadıkça).
- **Seviye Atlama Ödülü:** Her seviyede 1 "Stat Point" kazanılır.

---

# 3. SAVAŞ SİSTEMİ DETAYLARI (COMBAT SYSTEM)

## 3.1. Savaş Akışı (Combat Flow)
Savaş tamamen otomatiktir (Auto-Battler). Oyuncu sadece başlangıçta Loadout'u belirler.

### 3.1.1. Savaş Başlangıcı
1. Oyuncu "Savaşa Başla" butonuna basar.
2. Frontend, sunucuya oyuncunun Loadout'unu (Silah, Zırh, Yan Araç, Yoldaş ID'leri) gönderir.
3. Sunucu, rakibin Loadout'unu veritabanından çeker (PvP) veya prosedürel olarak üretir (PvE).
4. Sunucu, savaş simülasyonunu başlatır (metin tabanlı).

### 3.1.2. Savaş Simülasyonu (Server-Side)
Sunucu, her "tur" (round) için şu hesaplamaları yapar:
1. **Hız Kontrolü:** `Önce_Saldıran = (Oyuncu_AGI + Silah_Hızı) > (Rakip_AGI + Silah_Hızı) ? Oyuncu : Rakip`
2. **Saldırı Hesaplama:** `Temel_Hasar = Silah_Hasar * (1 + STR/INT * 0.05)`, `Kritik_Kontrol = random(0, 100) < (LCK * 0.3)`, `Kaçış_Kontrol = random(0, 100) < (Rakip_AGI * 0.5)`, `Gerçek_Hasar = Kaçış_Kontrol ? 0 : max(Hasar - Rakip_Zırh, 1)`
3. **HP Güncelleme:** `Rakip_HP = max(Rakip_HP - Gerçek_Hasar, 0)`
4. **Özel Yetenek Kontrolü:** Yan Araç veya Yoldaş'ın özel yeteneği tetiklenebilir mi?
5. **Tur Sonu Kontrolü:** `Oyuncu_HP == 0 or Rakip_HP == 0 ? Savaş_Bitti : Sonraki_Tur`

### 3.1.3. Savaş Sonu (Resolution)
- **Kazanma:** `Kazanilan_XP = 50 + (Rakip_Seviye - Oyuncu_Seviye) * 10`, `Kazanilan_Hurda = 20 + (Rakip_Seviye * 5)`, `Tech_Part_Drop_Şansı = min(5% + (Rakip_Seviye * 0.5%), 25%)`
- **Kaybetme (Permadeath Riski):** `Eşya_Düşme_Şansı = max(5% - (Zırh_Seviyesi * 0.5%), 0%)`. Eğer eşya düşerse, bu eşya "Korumasız" (Unprotected) olmalıdır.

### 3.1.4. Combat Log (Savaş Kaydı)
Sunucu, savaşın her turunu bir JSON dizisi olarak saklar. Frontend bu logu okuyarak animasyonları oynatır.

## 3.2. Durum Etkileri (Status Effects)
Savaş sırasında karakterlere uygulanabilen geçici etkiler:

### 3.2.1. Olumsuz Etkiler (Debuffs)
1. **Zehir (Poison):** Her tur 5 HP azalır. Süre: 3 tur.
2. **Yanma (Burn):** Her tur 8 HP azalır, saldırı hızı %10 düşer. Süre: 2 tur.
3. **Donma (Freeze):** 1 tur boyunca saldırı yapılamaz. Süre: 1 tur.
4. **Sersemletme (Stun):** 1 tur boyunca hem saldırı hem savunma yapılamaz. Süre: 1 tur.

### 3.2.2. Olumlu Etkiler (Bufflar)
1. **Hızlanma (Haste):** Saldırı hızı %20 artar. Süre: 3 tur.
2. **Güçlendirme (Empower):** Hasar %15 artar. Süre: 3 tur.
3. **Kalkan (Shield):** 50 puanlık ek HP. Süre: Savaş sonuna kadar.
4. **Rejenerasyon (Regen):** Her tur 10 HP yenilenir. Süre: 5 tur.

## 3.3. Element Sistemi
Silahlar ve zırhlar 4 elementten birine sahip olabilir:
- **Fiziksel (Physical):** Nötr.
- **Ateş (Fire):** Buz elementine %20 fazla hasar verir.
- **Buz (Ice):** Ateş elementine %20 fazla hasar verir.
- **Zehir (Poison):** Fiziksel elemente %20 fazla hasar verir.

---

# 4. EŞYA SİSTEMİ DETAYLARI (ITEM SYSTEM)

## 4.1. Eşya Slotları
1. **Ana Silah (Primary Weapon):** Hasar, Saldırı Hızı, Element. Her savaşta %5 dayanıklılık kaybeder.
2. **Zırh (Armor):** Maks HP, Hasar Azaltma. Her savaşta %3 dayanıklılık kaybeder.
3. **Yan Araç/Büyü (Side Tool):** Kullanıldığında %10 dayanıklılık kaybeder.
4. **Yoldaş (Pet/Companion):** Kendi HP'si ve hasarı vardır. Ölürse 24 saat yaralı kalır.

## 4.2. Eşya Nadirliği (Rarity)
1. **Common (Yaygın) - Gri Renk:** Drop Şansı %60, İstatistik Aralığı %80-100.
2. **Rare (Nadir) - Mavi Renk:** Drop Şansı %25, İstatistik Aralığı %100-130.
3. **Epic (Destansı) - Mor Renk:** Drop Şansı %10, İstatistik Aralığı %130-170.
4. **Legendary (Efsanevi) - Altın Renk:** Drop Şansı %5, İstatistik Aralığı %170-250. Permadeath riski taşır.

## 4.3. Prosedürel Eşya Üretimi (Loot Generation)
`İsim = [Ön-Ek] + [Temel_Eşya] + [Son-Ek]`
- **Ön-Ekler:** "Paslı", "Lanetli", "Kutsal", "Efsanevi"
- **Son-Ekler:** "+1", "+2", "of the Wasteland", "of Fire"

## 4.4. Eşya Dayanıklılığı (Durability)
Her eşyanın bir dayanıklılık değeri vardır (Maks: 100). 0'a düştüğünde "Kırık" olur. Kırık eşya Hurda karşılığı satılabilir veya Tech-Part ile tamir edilebilir.

---

# 5. CRAFTING SİSTEMİ DETAYLARI (ÜRETİM)

## 5.1. Malzeme Tipleri
1. **Hurda Metal:** Common eşyalardan düşer.
2. **Elektronik Parça:** Rare eşyalardan düşer.
3. **Tech-Part:** Epic/Legendary eşyalardan düşer.
4. **Antik Kristal Tozu:** Legendary eşyalar parçalandığında elde edilir.

## 5.2. Eşya Üretimi (Crafting Recipes)
- **Common:** 100 Hurda Metal, 10 dakika, %100 başarı.
- **Rare:** 50 Hurda + 20 Elektronik, 1 saat, %80 başarı.
- **Epic:** 30 Elektronik + 10 Tech-Part, 4 saat, %50 başarı.
- **Legendary:** 50 Tech-Part + 5 Kristal Tozu, 12 saat, %20 başarı.

## 5.3. Eşya Yükseltme (Upgrading)
Her eşya +1'den +10'a kadar yükseltilebilir. Her seviye temel istatistiği %5 artırır. +7 ve üzeri başarısızlıklarda eşya kırılabilir.

## 5.4. Eşya Parçalama (Salvage)
İstenmeyen eşyalar parçalanarak malzeme elde edilebilir.

---

# 6. KARABORSA EKONOMİSİ DETAYLARI (BLACK MARKET)

## 6.1. Para Birimleri
- **Hurda (Scrap):** Soft currency.
- **Tech-Part:** Mid currency.
- **Antik Kristal:** Hard currency (Sadece IAP/Reklam).

## 6.2. Komisyon Oranları (Tax)
- **Hurda ile Satış:** %5 komisyon.
- **Tech-Part ile Satış:** %3 komisyon.
- **Takas (Trade):** %1 komisyon.

## 6.3. İlan Verme (Listing)
- **İlan Süreleri:** 1 Saat (Ücretsiz), 4 Saat (10 Hurda), 12 Saat (25 Hurda), 24 Saat (50 Hurda).
- **İlan Limiti:** Ücretsiz 5, Premium 15.

## 6.4. Takas Sistemi (Trade)
İki oyuncu birbirine eşya teklif edebilir. Takas sırasında eşyalar kilitlenir.

---

# 7. SEFER SİSTEMİ DETAYLARI (EXPEDITION SYSTEM)

## 7.1. Sefer Slotları
- **Ücretsiz:** 1 slot.
- **Premium:** 3 slot.

## 7.2. Bölge Tipleri (Zone Types)
1. **Radyasyon Vadisi (Seviye 1-30):** %10 Radyasyon Zehirlenmesi riski.
2. **Terk Edilmiş Şehir (Seviye 30-60):** %20 Mutant Saldırısı riski.
3. **Dağ Sığınağı (Seviye 60-90):** %30 Pusuya Düşme riski.
4. **Nükleer Santral (Seviye 90-100):** %50 Kritik Arıza riski.

## 7.3. Sefer Sonuçları
- **Başarılı:** Hurda, Tech-Part ve Eşya Drop.
- **Başarısız:** Karakter "Yaralı" olur (24 saat PvP yasağı).

## 7.4. Sefer Hızlandırma
- **Reklam İzle:** Süreyi %50 azalt (Günde 3 kez).
- **Antik Kristal Öde:** Süreyi %100 azalt.

---

# 8. PRESTIGE SİSTEMİ DETAYLARI (META-PROGRESSION)

## 8.1. Prestige Temelleri
Oyuncu Seviye 100'e ulaştığında "Prestige" yapabilir.
- **Kayıplar:** Seviye 1'e düşer, Common/Rare eşyalar silinir, Hurda/Elektronik silinir.
- **Kazanımlar:** Kalıcı +%2 Hasar/HP, Kozmetik Rozetler, Ekstra Slotlar.

## 8.2. Prestige Formülü
- `Toplam_Bonus = Prestige_Seviyesi * 0.02`
- `Gerçek_Hasar = Temel_Hasar * (1 + Toplam_Bonus)`

---

# 9. SOSYAL SİSTEMLER DETAYLARI (SOCIAL SYSTEMS)

## 9.1. Arkadaşlık Sistemi
- Günlük Hediye (Enerji Paketi) ve Grup Savaşı Bonusu (%10 ekstra ödül).

## 9.2. Grup Raid Sistemi (Group Raids)
Telegram gruplarında `/raid` komutu ile başlatılır.
- Boss HP: `Grup_Üye_Sayısı * 10000`. 24 saat sürer. En çok hasar verenler Epic/Rare eşya kazanır.

## 9.3. İntikam Sistemi (Revenge System)
Öldürülen oyuncuya `t.me/[BotUsername]?start=revenge_[KillerID]_[ItemID]` linki üretilir.
İntikam savaşı kazanılırsa kaybedilen eşya geri alınır ve katilden 1 eşya daha çalınır.

## 9.4. Klan Sistemi (Clan System)
- **Maliyet:** 1000 Hurda + 100 Tech-Part.
- **Min:** 5, **Max:** 50 üye.
- Klan Sohbeti, Klan Sandığı ve Haftalık Klan Savaşları.

---

# 10. GÖRSEL VE SES TASARIMI (ART & AUDIO)

## 10.1. Görsel Stil
- **Sanat Tarzı:** Post-Apokaliptik Pixel Art (16-bit).
- **Renk Paleti:** Koyu gri, paslı turuncu, radyasyon yeşili, neon mavi, kan kırmızısı.

## 10.2. Karakter Tasarımı
- **Boyut:** 64x64 pixel (savaş), 128x128 pixel (profil).
- **Animasyonlar:** Idle (4 kare), Saldırı (6 kare), Hasar Alma (3 kare), Ölüm (8 kare).

## 10.3. Arayüz (UI) Tasarımı
- **Stil:** Minimalist, "hurda metal" dokulu.
- **Font:** Pixel font (Press Start 2P).
- **Nadirlik Renk Kodları:** Common (#808080), Rare (#0070DD), Epic (#A335EE), Legendary (#FF8000).

## 10.4. Ses Tasarımı
- **Müzik:** Ambient, karanlık (CC0).
- **Ses Efektleri:** Metalik silah sesleri, ağır zırh sesleri, retro 8-bit UI sesleri.

---

# 11. KULLANICI DENEYİMİ (UX) AKIŞI

## 11.1. İlk 5 Dakika (Onboarding)
Giriş -> Telegram Auth -> Fraksiyon Seçimi -> İlk Sefer (2 saat) -> İlk PvP Savaş -> İlk Ödül.

## 11.2. İlk 1 Saat
3-4 PvP, Seviye 5, İlk Rare eşya, Karaborsa keşfi, Günlük görevler.

## 11.3. İlk 1 Gün
Seviye 15-20, Prestige düşüncesi, Gruba katılma, İlk Grup Raid.

## 11.4. İlk 1 Hafta
Seviye 50-60, İlk Epic üretim/takas, Klan kurma/katılma.

---

# 12. BAŞARILAR VE KOLEKSİYON SİSTEMİ (ACHIEVEMENTS)

## 12.1. Başarı Kategorileri
- **Savaş:** İlk Kan, Seri Katil, İntikamcı, Boss Katili.
- **Keşif:** Gezgin, Hayatta Kalan, Hazine Avcısı.
- **Ekonomi:** Tüccar, Üretici, Koleksiyoncu.
- **Sosyal:** Lider, Dost Canlısı, Klan Savaşçısı.

## 12.2. Başarı Puanı
Common (10p), Rare (25p), Epic (50p), Legendary (100p). Toplam puan Liderlik Tablosunda gösterilir.

---

# 13. GÜNLÜK/HAFTALIK ETKİNLİKLER (EVENTS)

## 13.1. Günlük Etkinlikler
- **Günlük Görevler:** 3 PvP, 1 Sefer, 1 Pazar işlemi. Ödül: 5 Antik Kristal.
- **Günlük Sandık:** Reklam ile 2x yapılabilir.
- **Günlük Hava Olayı:** Asit Yağmuru, Radyasyon Fırtınası, Altın Saat.

## 13.2. Haftalık Etkinlikler
- **Haftalık Klan Savaşı:** 48 saat sürer. Kazanan klana "Haftanın Şampiyonu" rozeti.
- **Haftalık Boss:** Global boss (HP: 1.000.000). İlk 100 hasarcıya Legendary eşya.
- **Haftalık Liderlik Tablosu:** Pazar gecesi sıfırlanır.

---

# 14. ANTI-CHEAT VE GÜVENLİK KURALLARI

## 14.1. Server-Authoritative Mimari
Tüm kritik hesaplamalar sunucuda yapılır. İstemci sadece görseldir.

## 14.2. Hile Tespit Sistemleri
- **Hızlı Savaş:** 1 saatte 100+ PvP = 24 saat Ban.
- **Anormal Kazanım:** 1 saatte 10x normal Hurda = Hesap İncelemeye alınır.
- **Karaborsa Manipülasyonu:** 1 saatte 50+ ilan = 24 saat Pazar yasağı.

## 14.3. Raporlama Sistemi
3 rapor alan hesap otomatik olarak inceleme moduna alınır.

---

# 15. VERİ ANALİTİĞİ VE METRİKLER (ANALYTICS)

## 15.1. Temel Metrikler (KPIs)
- **Oyuncu:** DAU, MAU, Retention (Day 1: %40+, Day 7: %20+, Day 30: %10+).
- **Gelir:** ARPU, ARPDAU, Ad Watch Rate (%60+), IAP Conversion (%2-5).
- **Oyun İçi:** Ortalama Seviye, Prestige Oranı, Karaborsa Hacmi, Grup Raid Katılımı.

## 15.2. Olay Takibi (Event Tracking)
`user_login`, `battle_start`, `battle_end`, `item_crafted`, `market_listing`, `market_purchase`, `ad_watched`, `iap_purchase`.

---

# 16. TEKNİK GEREKSİNİMLER (TECHNICAL REQUIREMENTS)

## 16.1. Frontend Gereksinimleri
- **Motor:** Phaser 3
- **Dil:** TypeScript
- **UI:** React/Vue
- **Telegram SDK:** @twa-dev/sdk
- **Min Ekran:** 320x480
- **Maks Yükleme:** 3 sn.

## 16.2. Backend Gereksinimleri
- **Runtime:** Node.js
- **Framework:** Fastify/Express
- **DB:** Supabase (PostgreSQL)
- **Socket.io** (PvP/Raid için)
- **Auth:** Telegram Web App API

## 16.3. Bütçe Kısıtlaması ($0 - $10)
- **Hosting:** Vercel/Render (Free Tier).
- **DB:** Supabase (Free Tier - 500MB).
- **Domain:** Alt domain kullanılacak.
- **Assetler:** Sadece CC0/Open-source.
- **Reklam:** Telegram Ads veya AdMob Web.

---

# 17. SÖZLÜK VE DEĞİŞKEN TANIMLARI (AI AGENT İÇİN)

## 17.1. Oyuncu Durumları (Player States)
- `IDLE`: Boşta.
- `IN_EXPEDITION`: Seferde.
- `IN_COMBAT`: Savaşta.
- `IN_MARKET`: Karaborsa'da.
- `IN_CRAFTING`: Üretimde.
- `INJURED`: Yaralı.

## 17.2. Savaş Durumları (Combat States)
- `WAITING`, `ROUND_START`, `ATTACK_PHASE`, `DEFENSE_PHASE`, `STATUS_EFFECT_PHASE`, `ROUND_END`, `COMBAT_END`.

## 17.3. Eşya Durumları (Item States)
- `IN_INVENTORY`, `EQUIPPED`, `LISTED`, `LOCKED`, `BROKEN`.

## 17.4. Temel Formüller
- `Gerekli_XP = 100 * (Seviye ^ 1.5)`
- `Fiziksel_Hasar = Temel_Hasar * (1 + STR * 0.05)`
- `Maks_HP = 100 + (END * 10)`
- `Kritik_Şansı = min(LCK * 0.3%, 25%)`
- `Prestige_Bonus = 1 + (Prestige_Seviyesi * 0.02)`
- `Yükseltilmiş_İstatistik = Temel_İstatistik * (1 + Yükseltme_Seviyesi * 0.05)`
- `Karaborsa_Komisyonu = Satış_Fiyatı * 0.05`

## 17.5. Veritabanı İlişkileri (Temel)
- `players` -> `inventory` (1:N)
- `inventory` -> `market_listings` (1:1)
- `players` -> `clan_members` (1:1)
- `clans` -> `clan_members` (1:N)
