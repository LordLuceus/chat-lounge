-- AlterTable
ALTER TABLE `agent` ADD COLUMN `verbosity` ENUM('concise', 'default', 'verbose') NULL DEFAULT 'default';
