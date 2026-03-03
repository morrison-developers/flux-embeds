-- CreateTable
CREATE TABLE "ShavonLloydContactSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "message" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShavonLloydContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShavonLloydContactSubmission_createdAt_idx" ON "ShavonLloydContactSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "ShavonLloydContactSubmission_email_idx" ON "ShavonLloydContactSubmission"("email");
