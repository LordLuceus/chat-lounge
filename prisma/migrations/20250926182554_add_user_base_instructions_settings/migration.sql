-- AlterTable
ALTER TABLE `user` ADD COLUMN `customBaseInstructions` TEXT NULL,
    ADD COLUMN `useBaseInstructions` BOOLEAN NOT NULL DEFAULT false;
