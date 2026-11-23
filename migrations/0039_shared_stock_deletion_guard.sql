-- Keep the established active-entry deletion error before checking shared-stock dependencies.
-- Preserve 0038, which has already been applied locally. No data or audit snapshots are rewritten.
DROP TRIGGER shared_stock_preserve_catalog;
CREATE TRIGGER shared_stock_preserve_catalog BEFORE UPDATE ON events WHEN OLD.kind='product_category' BEGIN
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM product_stock_entries WHERE event_id=OLD.id AND deleted_at IS NULL)
 THEN RAISE(ABORT,'STOCK_HAS_ENTRIES') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM product_stock_members m WHERE m.event_id=OLD.id
 AND ((SELECT count(*) FROM product_stock_members WHERE stock_id=m.stock_id)>1
 OR coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=m.event_id AND product_id=m.product_id),0)!=0)
 AND (NEW.deleted_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.products') WHERE json_extract(value,'$.id')=m.product_id)))
 THEN RAISE(ABORT,'STOCK_PRODUCT_IN_USE') END;
END;
