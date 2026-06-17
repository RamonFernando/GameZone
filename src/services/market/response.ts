export type MarketExternalSource = "CheapShark" | "RAWG" | "GameZone";

export type MarketResponseMeta = {
  externalSource: MarketExternalSource;
  fallbackUsed: boolean;
  cachedForSeconds: number;
};

export function createMarketMeta(meta: MarketResponseMeta) {
  return meta;
}
