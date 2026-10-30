-- CreateTable
CREATE TABLE "AiAssessment" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "changeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "severity" "ChangeSeverity" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiAssessment_changeId_key" ON "AiAssessment"("changeId");

-- CreateIndex
CREATE INDEX "AiAssessment_analysisId_idx" ON "AiAssessment"("analysisId");

-- CreateIndex
CREATE INDEX "AiAssessment_analysisId_severity_idx" ON "AiAssessment"("analysisId", "severity");

-- AddForeignKey
ALTER TABLE "AiAssessment" ADD CONSTRAINT "AiAssessment_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAssessment" ADD CONSTRAINT "AiAssessment_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "Change"("id") ON DELETE CASCADE ON UPDATE CASCADE;
