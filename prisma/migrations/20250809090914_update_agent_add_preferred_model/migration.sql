-- AlterTable
ALTER TABLE `agent` ADD COLUMN `preferredModelId` VARCHAR(100) NULL;

-- AddForeignKey
ALTER TABLE `agent` ADD CONSTRAINT `agent_preferredModelId_model_id_fk` FOREIGN KEY (`preferredModelId`) REFERENCES `model`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
