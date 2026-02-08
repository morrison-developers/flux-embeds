-- CreateTable
CREATE TABLE "Board" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "defaultGameId" TEXT,
  "topTeamLabel" TEXT NOT NULL,
  "sideTeamLabel" TEXT NOT NULL,
  "columnMarkers" JSONB NOT NULL,
  "rowMarkers" JSONB NOT NULL,
  "assignments" JSONB NOT NULL,
  "themeDefaults" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardOwner" (
  "id" TEXT NOT NULL,
  "boardId" TEXT NOT NULL,
  "initials" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "bgColor" TEXT NOT NULL,
  "textColor" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BoardOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterWinner" (
  "id" TEXT NOT NULL,
  "boardId" TEXT NOT NULL,
  "quarter" INTEGER NOT NULL,
  "ownerId" TEXT,
  "homeScore" INTEGER NOT NULL,
  "awayScore" INTEGER NOT NULL,
  "gamePeriodRecorded" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QuarterWinner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoardOwner_boardId_initials_key" ON "BoardOwner"("boardId", "initials");

-- CreateIndex
CREATE INDEX "BoardOwner_boardId_sortOrder_idx" ON "BoardOwner"("boardId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterWinner_boardId_quarter_key" ON "QuarterWinner"("boardId", "quarter");

-- CreateIndex
CREATE INDEX "QuarterWinner_boardId_idx" ON "QuarterWinner"("boardId");

-- AddForeignKey
ALTER TABLE "BoardOwner"
ADD CONSTRAINT "BoardOwner_boardId_fkey"
FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterWinner"
ADD CONSTRAINT "QuarterWinner_boardId_fkey"
FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterWinner"
ADD CONSTRAINT "QuarterWinner_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "BoardOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
