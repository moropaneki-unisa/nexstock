DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskStatus') THEN
    CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'blocked', 'done');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskPriority') THEN
    CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Task" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'todo',
  "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
  "category" TEXT,
  "dueAt" TIMESTAMP(3),
  "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
  "reminderAt" TIMESTAMP(3),
  "reminderSentAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_organizationId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_userId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Task_organizationId_userId_idx" ON "Task"("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "Task_organizationId_status_idx" ON "Task"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Task_userId_dueAt_idx" ON "Task"("userId", "dueAt");
CREATE INDEX IF NOT EXISTS "Task_reminderEnabled_reminderAt_reminderSentAt_idx" ON "Task"("reminderEnabled", "reminderAt", "reminderSentAt");
