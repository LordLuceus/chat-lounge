-- AlterTable
ALTER TABLE `model` ADD COLUMN `releaseDate` DATE NULL,
    ADD COLUMN `reviewStatus` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `isAdmin` BOOLEAN NOT NULL DEFAULT false;

