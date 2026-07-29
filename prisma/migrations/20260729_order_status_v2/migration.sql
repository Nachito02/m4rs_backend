-- AlterEnum: replace PENDING/CONFIRMED with IN_PREPARATION/READY
-- Converts any existing PENDING or CONFIRMED orders to IN_PREPARATION
BEGIN;

CREATE TYPE "OrderStatus_new" AS ENUM ('IN_PREPARATION', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED');

ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Order"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING (
    CASE "status"::text
      WHEN 'PENDING'    THEN 'IN_PREPARATION'
      WHEN 'CONFIRMED'  THEN 'IN_PREPARATION'
      ELSE "status"::text
    END
  )::"OrderStatus_new";

ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";

ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'IN_PREPARATION';

COMMIT;
