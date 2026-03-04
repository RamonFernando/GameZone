UPDATE "Product"
SET
  "cardSubtitle" = CASE
    WHEN TRIM(COALESCE("cardSubtitle", '')) = '' THEN 'Código digital oficial'
    ELSE "cardSubtitle"
  END,
  "platform" = CASE
    WHEN TRIM(COALESCE("platform", '')) = '' THEN 'PC'
    ELSE "platform"
  END,
  "region" = CASE
    WHEN TRIM(COALESCE("region", '')) = '' THEN 'EUROPA'
    ELSE "region"
  END,
  "storeLabel" = CASE
    WHEN TRIM(COALESCE("storeLabel", '')) = '' THEN 'Steam'
    ELSE "storeLabel"
  END;
