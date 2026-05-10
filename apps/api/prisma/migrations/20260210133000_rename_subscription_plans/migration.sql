-- Rename active subscription plan enum values from pro/business to starter/growth.
-- Business remains in the enum as a future plan, but existing business subscribers are mapped to growth.

ALTER TYPE "Plan" RENAME TO "Plan_old";

CREATE TYPE "Plan" AS ENUM ('free', 'starter', 'growth', 'business');

ALTER TABLE "Organization"
  ALTER COLUMN "plan" DROP DEFAULT,
  ALTER COLUMN "plan" TYPE "Plan" USING (
    CASE "plan"::text
      WHEN 'pro' THEN 'starter'
      WHEN 'business' THEN 'growth'
      ELSE "plan"::text
    END
  )::"Plan",
  ALTER COLUMN "plan" SET DEFAULT 'free';

ALTER TABLE "Payment"
  ALTER COLUMN "plan" TYPE "Plan" USING (
    CASE "plan"::text
      WHEN 'pro' THEN 'starter'
      WHEN 'business' THEN 'growth'
      ELSE "plan"::text
    END
  )::"Plan";

DROP TYPE "Plan_old";
