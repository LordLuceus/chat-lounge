-- DropForeignKey
ALTER TABLE `message` DROP FOREIGN KEY `message_parentId_message_id_fk`;

-- DropForeignKey
ALTER TABLE `sharedMessage` DROP FOREIGN KEY `sharedMessage_parentId_sharedMessage_id_fk`;

-- AddForeignKey
ALTER TABLE `message` ADD CONSTRAINT `message_parentId_message_id_fk` FOREIGN KEY (`parentId`) REFERENCES `message`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sharedMessage` ADD CONSTRAINT `sharedMessage_parentId_sharedMessage_id_fk` FOREIGN KEY (`parentId`) REFERENCES `sharedMessage`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
