/*
  Warnings:

  - You are about to alter the column `visibility` on the `agent` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(0))`.
  - You are about to alter the column `type` on the `agent` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(1))`.
  - You are about to alter the column `provider` on the `apiKey` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(4))`.
  - You are about to alter the column `provider` on the `model` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(4))`.

*/
-- AlterTable
ALTER TABLE `agent` MODIFY `visibility` ENUM('public', 'private', 'hidden') NOT NULL DEFAULT 'private',
    MODIFY `type` ENUM('default', 'character') NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE `apiKey` MODIFY `provider` ENUM('mistral', 'openai', 'elevenlabs', 'google', 'anthropic') NOT NULL;

-- AlterTable
ALTER TABLE `model` MODIFY `provider` ENUM('mistral', 'openai', 'elevenlabs', 'google', 'anthropic') NOT NULL;
