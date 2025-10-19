-- AlterTable
ALTER TABLE `model` ADD COLUMN `deprecated` BOOLEAN NOT NULL DEFAULT false AFTER `supportsTools`;
