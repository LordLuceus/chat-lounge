/*
  Warnings:

  - You are about to alter the column `role` on the `message` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(0))`.

*/
-- AlterTable
ALTER TABLE `message` MODIFY `role` ENUM('user', 'assistant') NOT NULL;
