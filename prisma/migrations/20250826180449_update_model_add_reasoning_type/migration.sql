/*
  Warnings:

  - You are about to drop the column `thinkingAvailable` on the `model` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `model` DROP COLUMN `thinkingAvailable`,
    ADD COLUMN `reasoningType` ENUM('none', 'hybrid', 'full') NOT NULL DEFAULT 'none' AFTER `tokenLimit`;
