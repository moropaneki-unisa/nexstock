CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'blocked', 'done');
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE "Task" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_organizationId_userId_idx" ON "Task"("organizationId", "userId");
CREATE INDEX "Task_organizationId_status_idx" ON "Task"("organizationId", "status");
CREATE INDEX "Task_userId_dueAt_idx" ON "Task"("userId", "dueAt");
CREATE INDEX "Task_reminderEnabled_reminderAt_reminderSentAt_idx" ON "Task"("reminderEnabled", "reminderAt", "reminderSentAt");

ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
