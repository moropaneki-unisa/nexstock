-- Keep only one generated launch-checklist task per user/org/title when duplicates already exist.
WITH ranked_launch_tasks AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId", "userId", "title"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM "Task"
  WHERE "description" LIKE '%ChatGPT prompt:%'
)
DELETE FROM "Task"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_launch_tasks
  WHERE row_number > 1
);

-- Defensive database guard for rapid double-clicks / concurrent requests.
-- The service already checks existing titles before createMany(), but this trigger
-- makes launch-checklist creation idempotent at the database layer too.
CREATE OR REPLACE FUNCTION prevent_duplicate_launch_checklist_task()
RETURNS trigger AS $$
BEGIN
  IF NEW."description" IS NOT NULL
    AND NEW."description" LIKE '%ChatGPT prompt:%'
    AND EXISTS (
      SELECT 1
      FROM "Task"
      WHERE "organizationId" = NEW."organizationId"
        AND "userId" = NEW."userId"
        AND "title" = NEW."title"
        AND "description" LIKE '%ChatGPT prompt:%'
    )
  THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Task_prevent_duplicate_launch_checklist_task" ON "Task";

CREATE TRIGGER "Task_prevent_duplicate_launch_checklist_task"
BEFORE INSERT ON "Task"
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_launch_checklist_task();
