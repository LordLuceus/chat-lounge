/*
  Warnings:

  - You are about to drop the column `iv` on the `ApiKey` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ApiKey_iv_key";

-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "iv";
