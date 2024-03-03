/*
  Warnings:

  - A unique constraint covering the columns `[iv]` on the table `ApiKey` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `iv` to the `ApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "iv" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_iv_key" ON "ApiKey"("iv");
