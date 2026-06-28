// Wasteland: Scrap & Glory - Karaborsa (Black Market)
// İlan verme, satın alma, takas, komisyon

import { db } from "@/lib/db";
import { MAX_DURABILITY } from "./constants";

// ============================================================
// İLAN VERME
// ============================================================

export interface ListingDuration {
  hours: number;
  cost: number; // Hurda olarak ilan süresi ücreti
}

export const LISTING_DURATIONS: ListingDuration[] = [
  { hours: 1, cost: 0 },
  { hours: 4, cost: 10 },
  { hours: 12, cost: 25 },
  { hours: 24, cost: 50 },
];

export const FREE_LISTING_LIMIT = 5;
export const PREMIUM_LISTING_LIMIT = 15;

export interface ListResult {
  ok: boolean;
  listing?: {
    id: string;
    itemId: string;
    price: number;
    currency: string;
    expiresAt: Date;
  };
  error?: string;
}

/** İlanı ver — fee = fiyat * 0.05 (Scrap) veya 0.03 (Tech-Part) */
export async function createListing(
  sellerId: string,
  itemId: string,
  price: number,
  currency: "SCRAP" | "TECH_PART",
  durationHours: number
): Promise<ListResult> {
  if (price <= 0) return { ok: false, error: "Fiyat 0'dan büyük olmalı" };
  if (price > 999999) return { ok: false, error: "Fiyat çok yüksek" };

  const item = await db.item.findFirst({ where: { id: itemId, ownerId: sellerId } });
  if (!item) return { ok: false, error: "Eşya bulunamadı" };
  if (item.state === "EQUIPPED") return { ok: false, error: "Kuşanılan eşya satılamaz" };
  if (item.state === "LISTED" || item.state === "LOCKED") return { ok: false, error: "Eşya zaten satılık/kilitli" };
  if (item.state === "BROKEN") return { ok: false, error: "Kırık eşya satılamaz" };
  if (item.protected) return { ok: false, error: "Korumalı eşya satılamaz" };

  const seller = await db.player.findUnique({ where: { id: sellerId } });
  if (!seller) return { ok: false, error: "Satıcı bulunamadı" };

  // İlan limiti kontrolü
  const activeListings = await db.marketListing.count({
    where: { sellerId, status: "ACTIVE" },
  });
  const limit = FREE_LISTING_LIMIT; // Premium Faz 3'te
  if (activeListings >= limit) {
    return { ok: false, error: `İlan limiti (${limit}) doldu` };
  }

  // Süre ücreti
  const duration = LISTING_DURATIONS.find((d) => d.hours === durationHours) ?? LISTING_DURATIONS[0];
  if (seller.scrap < duration.cost) {
    return { ok: false, error: "İlan süresi ücreti yetersiz" };
  }

  // Komisyon (listing fee) = fiyat * komisyon oranı
  const feeRate = currency === "SCRAP" ? 0.05 : 0.03;
  const listingFee = Math.floor(price * feeRate);

  // Scrap'tan süre ücreti + listing fee düş
  const totalScrapCost = duration.cost + (currency === "SCRAP" ? listingFee : 0);
  if (seller.scrap < totalScrapCost) {
    return { ok: false, error: "Hurda yetersiz (ilan ücreti)" };
  }

  // Transaction: eşyayı LOCKED yap, listing oluştur, ücret düş
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  const [_, listing] = await db.$transaction([
    db.item.update({
      where: { id: itemId },
      data: { state: "LISTED", listedPrice: price },
    }),
    db.player.update({
      where: { id: sellerId },
      data: { scrap: { decrement: totalScrapCost } },
    }),
    db.marketListing.create({
      data: {
        sellerId,
        itemId,
        price,
        currency,
        listedAt: now,
        expiresAt,
        durationHours,
        status: "ACTIVE",
      },
    }),
  ]);

  return {
    ok: true,
    listing: {
      id: listing.id,
      itemId: listing.itemId,
      price: listing.price,
      currency: listing.currency,
      expiresAt: listing.expiresAt,
    },
  };
}

// ============================================================
// SATIN ALMA
// ============================================================

export interface BuyResult {
  ok: boolean;
  item?: { id: string; name: string };
  error?: string;
  totalPaid?: number;
  sellerReceived?: number;
  commission?: number;
}

export async function buyListing(buyerId: string, listingId: string): Promise<BuyResult> {
  const listing = await db.marketListing.findUnique({
    where: { id: listingId },
    include: { item: true, seller: true },
  });
  if (!listing) return { ok: false, error: "İlan bulunamadı" };
  if (listing.status !== "ACTIVE") return { ok: false, error: "İlan aktif değil" };
  if (listing.sellerId === buyerId) return { ok: false, error: "Kendi ilanını alamazsın" };
  if (listing.expiresAt < new Date()) {
    await db.marketListing.update({ where: { id: listingId }, data: { status: "EXPIRED" } });
    return { ok: false, error: "İlan süresi dolmuş" };
  }

  const buyer = await db.player.findUnique({ where: { id: buyerId } });
  if (!buyer) return { ok: false, error: "Alıcı bulunamadı" };

  // Komisyon: alıcı fiyatın tamamını öder, satıcı (fiyat - komisyon) alır
  const feeRate = listing.currency === "SCRAP" ? 0.05 : 0.03;
  const commission = Math.floor(listing.price * feeRate);
  const sellerReceives = listing.price - commission;

  // Alıcının yeterli parası var mı?
  if (listing.currency === "SCRAP") {
    if (buyer.scrap < listing.price) return { ok: false, error: "Yetersiz Hurda" };
  } else {
    if (buyer.techPart < listing.price) return { ok: false, error: "Yetersiz Tech-Part" };
  }

  // Transaction: alıcıdan düş, satıcıya ekle, eşya transfer
  const buyerUpdate = listing.currency === "SCRAP"
    ? { scrap: { decrement: listing.price } }
    : { techPart: { decrement: listing.price } };
  const sellerUpdate = listing.currency === "SCRAP"
    ? { scrap: { increment: sellerReceives } }
    : { techPart: { increment: sellerReceives } };

  await db.$transaction([
    db.player.update({ where: { id: buyerId }, data: buyerUpdate }),
    db.player.update({ where: { id: listing.sellerId }, data: sellerUpdate }),
    db.item.update({
      where: { id: listing.itemId },
      data: { ownerId: buyerId, state: "IN_INVENTORY", listedPrice: null },
    }),
    db.marketListing.update({
      where: { id: listingId },
      data: {
        status: "SOLD",
        buyerId,
        soldAt: new Date(),
        soldPrice: listing.price,
      },
    }),
  ]);

  return {
    ok: true,
    item: { id: listing.item.id, name: listing.item.name },
    totalPaid: listing.price,
    sellerReceived: sellerReceives,
    commission,
  };
}

/** İlanı iptal et — eşya IN_INVENTORY'ye döner */
export async function cancelListing(sellerId: string, listingId: string): Promise<{ ok: boolean; error?: string }> {
  const listing = await db.marketListing.findFirst({
    where: { id: listingId, sellerId },
  });
  if (!listing) return { ok: false, error: "İlan bulunamadı" };
  if (listing.status !== "ACTIVE") return { ok: false, error: "İlan aktif değil" };

  await db.$transaction([
    db.item.update({
      where: { id: listing.itemId },
      data: { state: "IN_INVENTORY", listedPrice: null },
    }),
    db.marketListing.update({
      where: { id: listingId },
      data: { status: "CANCELLED" },
    }),
  ]);

  return { ok: true };
}

// ============================================================
// İLAN LİSTELEME
// ============================================================

export interface MarketListingDTO {
  id: string;
  price: number;
  currency: string;
  listedAt: Date;
  expiresAt: Date;
  durationHours: number;
  item: {
    id: string;
    name: string;
    rarity: string;
    element: string;
    slot: string;
    baseDamage: number;
    baseArmor: number;
    baseHpBonus: number;
    upgradeLevel: number;
    icon: string;
  };
  seller: {
    id: string;
    name: string;
    faction: string;
    level: number;
  };
}

export async function getActiveListings(filter?: {
  slot?: string;
  rarity?: string;
  currency?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "price_asc" | "price_desc" | "newest" | "rarity";
  limit?: number;
  offset?: number;
}): Promise<{ listings: MarketListingDTO[]; total: number }> {
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (filter?.currency) where.currency = filter.currency;

  // Item bazlı filtreler — join gerek
  const itemWhere: Record<string, unknown> = {};
  if (filter?.rarity) itemWhere.rarity = filter.rarity;

  const listings = await db.marketListing.findMany({
    where: {
      ...where,
      item: { ...itemWhere },
    },
    include: {
      item: { include: { template: true } },
      seller: true,
    },
    orderBy: filter?.sortBy === "price_asc"
      ? { price: "asc" }
      : filter?.sortBy === "price_desc"
      ? { price: "desc" }
      : filter?.sortBy === "newest"
      ? { listedAt: "desc" }
      : { listedAt: "desc" },
    take: filter?.limit ?? 30,
    skip: filter?.offset ?? 0,
  });

  const total = await db.marketListing.count({ where: { ...where, item: { ...itemWhere } } });

  // Slot filter post-query (template'den)
  let result: MarketListingDTO[] = listings.map((l) => ({
    id: l.id,
    price: l.price,
    currency: l.currency,
    listedAt: l.listedAt,
    expiresAt: l.expiresAt,
    durationHours: l.durationHours,
    item: {
      id: l.item.id,
      name: l.item.name,
      rarity: l.item.rarity,
      element: l.item.element,
      slot: l.item.template?.slot ?? "WEAPON",
      baseDamage: l.item.baseDamage,
      baseArmor: l.item.baseArmor,
      baseHpBonus: l.item.baseHpBonus,
      upgradeLevel: l.item.upgradeLevel,
      icon: l.item.icon,
    },
    seller: {
      id: l.seller.id,
      name: l.seller.name,
      faction: l.seller.faction,
      level: l.seller.level,
    },
  }));

  if (filter?.slot) {
    result = result.filter((r) => r.item.slot === filter.slot);
  }
  if (filter?.minPrice !== undefined) {
    result = result.filter((r) => r.price >= filter.minPrice!);
  }
  if (filter?.maxPrice !== undefined) {
    result = result.filter((r) => r.price <= filter.maxPrice!);
  }

  return { listings: result, total: result.length };
}

/** Kendi ilanların */
export async function getMyListings(sellerId: string) {
  const listings = await db.marketListing.findMany({
    where: { sellerId, status: "ACTIVE" },
    include: { item: { include: { template: true } } },
    orderBy: { listedAt: "desc" },
  });
  return listings;
}

// ============================================================
// TAKAS SİSTEMİ
// ============================================================

export interface TradeOfferResult {
  ok: boolean;
  tradeId?: string;
  error?: string;
}

/** Takas teklifi gönder */
export async function createTradeOffer(
  fromPlayerId: string,
  toPlayerId: string,
  offeredItemIds: string[],
  requestedItemIds: string[]
): Promise<TradeOfferResult> {
  if (fromPlayerId === toPlayerId) return { ok: false, error: "Kendine takas yapamazsın" };
  if (offeredItemIds.length === 0 || requestedItemIds.length === 0) {
    return { ok: false, error: "Her iki taraf da en az 1 eşya içermeli" };
  }
  if (offeredItemIds.length > 5 || requestedItemIds.length > 5) {
    return { ok: false, error: "Taraf başına en fazla 5 eşya" };
  }

  const toPlayer = await db.player.findUnique({ where: { id: toPlayerId } });
  if (!toPlayer) return { ok: false, error: "Hedef oyuncu bulunamadı" };

  // Teklif edilen eşyaların sahibi fromPlayer mı?
  const offeredItems = await db.item.findMany({
    where: { id: { in: offeredItemIds }, ownerId: fromPlayerId },
  });
  if (offeredItems.length !== offeredItemIds.length) {
    return { ok: false, error: "Bazı eşyalar bulunamadı veya sana ait değil" };
  }
  for (const it of offeredItems) {
    if (it.state === "EQUIPPED") return { ok: false, error: "Kuşanılan eşya takas edilemez" };
    if (it.state === "LISTED" || it.state === "LOCKED") return { ok: false, error: "Kilitli eşya takas edilemez" };
    if (it.protected) return { ok: false, error: "Korumalı eşya takas edilemez" };
  }

  // Talep edilen eşyaların sahibi toPlayer mı?
  const requestedItems = await db.item.findMany({
    where: { id: { in: requestedItemIds }, ownerId: toPlayerId },
  });
  if (requestedItems.length !== requestedItemIds.length) {
    return { ok: false, error: "Talep edilen bazı eşyalar bulunamadı" };
  }
  for (const it of requestedItems) {
    if (it.state === "EQUIPPED") return { ok: false, error: "Hedef oyuncunun kuşandığı eşya talep edilemez" };
    if (it.state === "LISTED" || it.state === "LOCKED") return { ok: false, error: "Hedef oyuncunun kilitli eşyası talep edilemez" };
    if (it.protected) return { ok: false, error: "Hedef oyuncunun korumalı eşyası talep edilemez" };
  }

  // Trade oluştur
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat geçerli

  const trade = await db.tradeOffer.create({
    data: {
      fromPlayerId,
      toPlayerId,
      status: "PENDING",
      expiresAt,
      items: {
        create: [
          ...offeredItemIds.map((itemId) => ({ itemId, side: "OFFERED" })),
          ...requestedItemIds.map((itemId) => ({ itemId, side: "REQUESTED" })),
        ],
      },
    },
  });

  // Eşyaları LOCKED yap
  await db.item.updateMany({
    where: { id: { in: [...offeredItemIds, ...requestedItemIds] } },
    data: { state: "LOCKED" },
  });

  return { ok: true, tradeId: trade.id };
}

/** Takas teklifini kabul et — eşyalar takas edilir, %1 komisyon */
export async function acceptTradeOffer(toPlayerId: string, tradeId: string): Promise<TradeOfferResult> {
  const trade = await db.tradeOffer.findUnique({
    where: { id: tradeId },
    include: { items: true },
  });
  if (!trade) return { ok: false, error: "Takas bulunamadı" };
  if (trade.toPlayerId !== toPlayerId) return { ok: false, error: "Bu takas sana değil" };
  if (trade.status !== "PENDING") return { ok: false, error: "Takas zaten sonuçlanmış" };
  if (trade.expiresAt < new Date()) {
    await db.tradeOffer.update({ where: { id: tradeId }, data: { status: "EXPIRED", resolvedAt: new Date() } });
    return { ok: false, error: "Takas süresi dolmuş" };
  }

  const offeredItemIds = trade.items.filter((i) => i.side === "OFFERED").map((i) => i.itemId);
  const requestedItemIds = trade.items.filter((i) => i.side === "REQUESTED").map((i) => i.itemId);

  // Eşyalar hala geçerli mi? (bu süreçte silinmemiş olmalı)
  const allItems = await db.item.findMany({
    where: { id: { in: [...offeredItemIds, ...requestedItemIds] } },
  });
  if (allItems.length !== offeredItemIds.length + requestedItemIds.length) {
    return { ok: false, error: "Bazı eşyalar artık mevcut değil" };
  }

  // Transfer: offeredItems → toPlayer, requestedItems → fromPlayer
  await db.$transaction([
    db.item.updateMany({
      where: { id: { in: offeredItemIds } },
      data: { ownerId: toPlayerId, state: "IN_INVENTORY" },
    }),
    db.item.updateMany({
      where: { id: { in: requestedItemIds } },
      data: { ownerId: trade.fromPlayerId, state: "IN_INVENTORY" },
    }),
    db.tradeOffer.update({
      where: { id: tradeId },
      data: { status: "ACCEPTED", resolvedAt: new Date() },
    }),
  ]);

  return { ok: true };
}

/** Takas teklifini reddet — eşyalar unlock edilir */
export async function rejectTradeOffer(toPlayerId: string, tradeId: string): Promise<TradeOfferResult> {
  const trade = await db.tradeOffer.findUnique({
    where: { id: tradeId },
    include: { items: true },
  });
  if (!trade) return { ok: false, error: "Takas bulunamadı" };
  if (trade.toPlayerId !== toPlayerId) return { ok: false, error: "Bu takas sana değil" };
  if (trade.status !== "PENDING") return { ok: false, error: "Takas zaten sonuçlanmış" };

  // Eşyaları unlock
  const allItemIds = trade.items.map((i) => i.itemId);
  await db.item.updateMany({
    where: { id: { in: allItemIds }, state: "LOCKED" },
    data: { state: "IN_INVENTORY" },
  });

  await db.tradeOffer.update({
    where: { id: tradeId },
    data: { status: "REJECTED", resolvedAt: new Date() },
  });

  return { ok: true };
}

/** Takas teklifini iptal et (gönderen tarafından) */
export async function cancelTradeOffer(fromPlayerId: string, tradeId: string): Promise<TradeOfferResult> {
  const trade = await db.tradeOffer.findUnique({
    where: { id: tradeId },
    include: { items: true },
  });
  if (!trade) return { ok: false, error: "Takas bulunamadı" };
  if (trade.fromPlayerId !== fromPlayerId) return { ok: false, error: "Bu takası sen göndermedin" };
  if (trade.status !== "PENDING") return { ok: false, error: "Takas zaten sonuçlanmış" };

  const allItemIds = trade.items.map((i) => i.itemId);
  await db.item.updateMany({
    where: { id: { in: allItemIds }, state: "LOCKED" },
    data: { state: "IN_INVENTORY" },
  });

  await db.tradeOffer.update({
    where: { id: tradeId },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });

  return { ok: true };
}

/** Oyuncunun gelen takas teklifleri */
export async function getIncomingTrades(playerId: string) {
  const trades = await db.tradeOffer.findMany({
    where: { toPlayerId: playerId, status: "PENDING" },
    include: {
      fromPlayer: true,
      items: { include: { item: { include: { template: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return trades;
}

/** Oyuncunun gönderdiği takas teklifleri */
export async function getOutgoingTrades(playerId: string) {
  const trades = await db.tradeOffer.findMany({
    where: { fromPlayerId: playerId, status: "PENDING" },
    include: {
      toPlayer: true,
      items: { include: { item: { include: { template: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return trades;
}
