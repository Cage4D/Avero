-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('live', 'teaser');

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "status" "ModelStatus" NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Model_code_key" ON "Model"("code");
