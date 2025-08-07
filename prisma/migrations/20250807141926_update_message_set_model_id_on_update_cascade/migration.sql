-- DropForeignKey
ALTER TABLE `message` DROP FOREIGN KEY `message_modelId_model_id_fk`;

-- DropIndex
DROP INDEX `message_modelId_model_id_fk` ON `message`;

-- AddForeignKey
ALTER TABLE `message` ADD CONSTRAINT `message_modelId_model_id_fk` FOREIGN KEY (`modelId`) REFERENCES `model`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
