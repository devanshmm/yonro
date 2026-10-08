-- CreateEnum
CREATE TYPE "XPSource" AS ENUM ('TASK_COMPLETION', 'FOCUS_SESSION', 'HABIT_COMPLETION', 'GOAL_MILESTONE', 'STREAK_MILESTONE', 'ACHIEVEMENT');

-- AlterTable
ALTER TABLE "FocusSession" ADD COLUMN     "verifiedSeconds" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "showOnLeaderboards" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "XPTransaction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "XPSource" NOT NULL,
    "sourceId" VARCHAR(200) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "productivityDate" VARCHAR(10) NOT NULL,
    "rewardDate" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XPTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" UUID NOT NULL,
    "key" VARCHAR(60) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "icon" VARCHAR(40) NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "achievementId" UUID NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationProfile" (
    "userId" UUID NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "streakValidUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamificationProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "FocusRun" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "targetSeconds" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resumedAt" TIMESTAMP(3),
    "activeMilliseconds" INTEGER NOT NULL DEFAULT 0,
    "state" VARCHAR(12) NOT NULL DEFAULT 'RUNNING',

    CONSTRAINT "FocusRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "XPTransaction_userId_createdAt_idx" ON "XPTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "XPTransaction_userId_rewardDate_source_idx" ON "XPTransaction"("userId", "rewardDate", "source");

-- CreateIndex
CREATE INDEX "XPTransaction_createdAt_source_idx" ON "XPTransaction"("createdAt", "source");

-- CreateIndex
CREATE UNIQUE INDEX "XPTransaction_userId_source_sourceId_key" ON "XPTransaction"("userId", "source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_key_key" ON "Achievement"("key");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_unlockedAt_idx" ON "UserAchievement"("userId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "FocusRun_userId_state_idx" ON "FocusRun"("userId", "state");

-- AddForeignKey
ALTER TABLE "XPTransaction" ADD CONSTRAINT "XPTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamificationProfile" ADD CONSTRAINT "GamificationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusRun" ADD CONSTRAINT "FocusRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000001', 'FIRST_TASK', 'First victory', 'Complete your first XP-eligible planned task.', 'sword', 25);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000002', 'FIRST_FOCUS', 'In the zone', 'Finish your first server-timed focus session of at least 5 minutes.', 'focus', 25);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000003', 'FIRST_HABIT', 'A new ritual', 'Meet your first habit target.', 'gem', 25);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000004', 'FIRST_GOAL', 'Mission accomplished', 'Complete every milestone of a goal with at least one milestone.', 'flag', 50);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000005', 'FIRST_MILESTONE', 'One step closer', 'Complete your first goal milestone.', 'flag', 25);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000006', 'SEVEN_DAY_STREAK', 'Seven-day spark', 'Build a 7-day productivity streak.', 'flame', 0);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000007', 'FOURTEEN_DAY_STREAK', 'Momentum maker', 'Build a 14-day productivity streak.', 'flame', 0);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000008', 'THIRTY_DAY_STREAK', 'Unstoppable', 'Build a 30-day productivity streak.', 'crown', 0);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000009', 'SIXTY_DAY_STREAK', 'Iron resolve', 'Build a 60-day productivity streak.', 'shield', 0);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000010', 'HUNDRED_DAY_STREAK', 'Century legend', 'Build a 100-day productivity streak.', 'crown', 0);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000011', 'TEN_FOCUS_HOURS', 'Deep-work explorer', 'Accumulate 10 hours of server-timed focus.', 'focus', 100);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000012', 'HUNDRED_FOCUS_HOURS', 'Focus master', 'Accumulate 100 hours of server-timed focus.', 'focus', 250);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000013', 'HUNDRED_TASKS', 'Century builder', 'Earn task XP on 100 distinct planned tasks.', 'sword', 100);

INSERT INTO "Achievement" ("id", "key", "name", "description", "icon", "xpReward") VALUES ('00000000-0000-4000-8000-000000000014', 'FIVE_HUNDRED_TASKS', 'Master builder', 'Earn task XP on 500 distinct planned tasks.', 'shield', 250);
