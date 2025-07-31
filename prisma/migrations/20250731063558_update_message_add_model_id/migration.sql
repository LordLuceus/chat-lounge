-- AlterTable
ALTER TABLE `message` ADD COLUMN `modelId` VARCHAR(100) NULL;

-- AddForeignKey
ALTER TABLE `message` ADD CONSTRAINT `message_modelId_model_id_fk` FOREIGN KEY (`modelId`) REFERENCES `model`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
