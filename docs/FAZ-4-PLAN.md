# FAZ 4 PLAN: Klan, Raid, İntikam & Gerçek Zamanlı Sohbet

> **Strateji:** Socket.io mini-service (port 3003) + sosyal sistemler.
> Socket.io gerçek zamanlı klan sohbeti + raid için kullanılır.

---

## 🎯 Faz 4 Hedefleri

1. **Socket.io Mini-Service** — Port 3003, klan sohbeti + raid gerçek zamanlı
2. **Klan Sistemi** — Kurma, üye yönetimi, sohbet, sandık
3. **Grup Raid** — Boss HP, toplam hasar, 24 saat süre, ödül dağılımı
4. **İntikam Sistemi** — revenge linki, kaybedilen eşyayı geri alma
5. **Haftalık Etkinlikler** — Global boss, hava olayı boost
6. **Arkadaşlık Sistemi** — Arkadaş ekle, günlük hediye

---

## 📦 FAZ 4 - GELİŞTİRME (4.x)

### 4.1 DB Şema Güncellemeleri
- [ ] `Clan` modeli (name, leaderId, description, level, treasury)
- [ ] `ClanMember` modeli (clanId, playerId, role, joinedAt)
- [ ] `ClanMessage` modeli (clanId, senderId, content, createdAt) — history için
- [ ] `RaidBoss` modeli (code, name, maxHp, currentHp, expiresAt, status)
- [ ] `RaidContribution` modeli (raidId, playerId, damage, createdAt)
- [ ] `RevengeLink` modeli (victimId, killerId, itemId, expiresAt, used)
- [ ] `Friendship` modeli (playerId, friendId, status, dailyGiftAt)
- [ ] `GlobalBoss` modeli (haftalık boss, tek kayıt)
- [ ] Player'a `clanId` ekle
- [ ] `db:push`

### 4.2 Socket.io Mini-Service
- [ ] `mini-services/chat-service/` klasörü
- [ ] `package.json` (socket.io, bun)
- [ ] `index.ts` — port 3003, klan odaları
  - `join-clan` (clanId) → odaya katıl
  - `clan-message` (content) → odaya yayın
  - `raid-join` (raidId) → raid odası
  - `raid-attack` (damage) → boss HP güncelle, yayın
  - `leave-clan` → oda çık
- [ ] Caddy path `/` ile çalışır (XTransformPort=3003)

### 4.3 Klan Backend
- [ ] `src/lib/game/clan.ts`
  - `createClan(playerId, name, description)` — 1000 Hurda + 100 Tech-Part
  - `joinClan(playerId, clanId)` — onay gerekli (Faz 4'te direkt)
  - `leaveClan(playerId)`
  - `kickMember(leaderId, memberId)`
  - `transferLeadership(leaderId, newLeaderId)`
  - `getClan(clanId)` — üyeler, hazne, seviye
  - `getClanMessages(clanId, limit)` — son mesajlar
  - `sendClanMessage(playerId, clanId, content)`
  - Min 5, Max 50 üye
  - Klan seviyesi: üye sayısı + hazne katkısı ile artar

### 4.4 Klan API
- [ ] `POST /api/clan/create` — klan kur
- [ ] `GET /api/clan/mine` — kendi klanın
- [ ] `GET /api/clan/list` — klan listesi (aranabilir)
- [ ] `POST /api/clan/join` — `{ clanId }` — katıl
- [ ] `POST /api/clan/leave` — ayrıl
- [ ] `POST /api/clan/kick` — `{ memberId }` — kov (leader)
- [ ] `POST /api/clan/message` — `{ content }` — mesaj gönder
- [ ] `GET /api/clan/messages` — son mesajlar
- [ ] `POST /api/clan/donate` — `{ amount }` — hazneye hurda bağışla

### 4.5 Raid Backend
- [ ] `src/lib/game/raid.ts`
  - `createRaid(playerId, bossCode)` — boss HP = üye sayısı * 10000
  - `attackRaid(playerId, raidId, damage)` — boss HP düş, contribution kaydet
  - `getActiveRaids()` — aktif raid'ler
  - `getRaid(raidId)` — boss HP + top katkıda bulunanlar
  - 24 saat süre, süre dolunca otomatik sonuçlandır
  - Ödül: en çok hasar verenler Epic/Rare eşya
- [ ] `POST /api/raid/start` — `{ bossCode }` — raid başlat
- [ ] `POST /api/raid/attack` — `{ raidId }` — saldır (loadout damage)
- [ ] `GET /api/raid/active` — aktif raid'ler
- [ ] `GET /api/raid/[id]` — raid detayı

### 4.6 İntikam Backend
- [ ] `src/lib/game/revenge.ts`
  - PvP kaybedince %5 şansla RevengeLink oluştur (eğer eşya düşmüşse)
  - `createRevengeLink(victimId, killerId, itemId)` — 24 saat geçerli
  - `getRevengeLink(linkId)` — link detayı
  - `performRevenge(victimId, linkId)` — intikam savaşı
    - Kazanırsa: kaybedilen eşyayı geri al + katilden 1 eşya daha çal
    - Kaybederse: link consumed (bir şans)
- [ ] `GET /api/revenge/links` — aktif intikam linklerin
- [ ] `POST /api/revenge/perform` — `{ linkId }` — intikam savaşı

### 4.7 Arkadaşlık Backend
- [ ] `src/lib/game/friends.ts`
  - `sendFriendRequest(playerId, targetId)`
  - `acceptFriendRequest(playerId, requestId)`
  - `rejectFriendRequest(playerId, requestId)`
  - `removeFriend(playerId, friendId)`
  - `getFriends(playerId)` — arkadaş listesi
  - `sendDailyGift(playerId, friendId)` — Enerji Paketi / Hurda
- [ ] `GET /api/friends/list`
- [ ] `GET /api/friends/requests`
- [ ] `POST /api/friends/add` — `{ targetId }`
- [ ] `POST /api/friends/accept` — `{ requestId }`
- [ ] `POST /api/friends/reject` — `{ requestId }`
- [ ] `POST /api/friends/gift` — `{ friendId }`

### 4.8 Haftalık Global Boss
- [ ] `src/lib/game/global-boss.ts`
  - Haftalık tek boss (HP: 1.000.000)
  - İlk 100 hasarcıya Legendary eşya
  - Pazar gece yarısı reset
- [ ] `GET /api/global-boss` — mevcut boss + sıralama
- [ ] `POST /api/global-boss/attack` — saldır

### 4.9 Klan UI
- [ ] `src/components/game/clan-view.tsx`
  - Klan yoksa: kurma formu + klan listesi
  - Klan varsa: üyeler, sohbet, hazne, ayarlar
  - Socket.io entegrasyonu (gerçek zamanlı mesaj)

### 4.10 Raid UI
- [ ] `src/components/game/raid-view.tsx`
  - Aktif raid'ler (boss HP bar, süre)
  - "Saldır" butonu (loadout damage)
  - Top katkıda bulunanlar
  - Socket.io (boss HP gerçek zamanlı)

### 4.11 İntikam & Arkadaşlar UI
- [ ] `src/components/game/social-view.tsx`
  - İntikam linkleri
  - Arkadaş listesi
  - Arkadaş ekle (ID ile)

### 4.12 Navigation + i18n
- [ ] Nav'e "Klan", "Raid", "Sosyal" ekle
- [ ] TR+EN çevirileri

### 4.13 Worklog
- [ ] Faz 4 kayıt

---

## 🧪 FAZ 4 - TEST (4T)

- [ ] Lint
- [ ] Socket.io mini-service çalışıyor (port 3003)
- [ ] Klan: create/join/leave/kick/message
- [ ] Raid: start/attack/complete
- [ ] İntikam: link oluştur/perform
- [ ] Arkadaş: add/accept/gift

---

## ✅ FAZ 4 - FİNAL TEST (4F)

- [ ] E2E: klan kur → üye al → sohbet → raid başlat → saldır → ödül
- [ ] Hata durumları: dolu klan, geçersiz link, banlı üye
- [ ] Documentation + Faz 5 notu
