/*
  Warnings:

  - The primary key for the `agent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `agentUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `apiKey` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `conversation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `conversationUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `folder` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `message` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sharedConversation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sharedMessage` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `agentUser` DROP FOREIGN KEY `agentUser_agentId_agent_id_fk`;

-- DropForeignKey
ALTER TABLE `conversation` DROP FOREIGN KEY `conversation_agentId_agent_id_fk`;

-- DropForeignKey
ALTER TABLE `conversation` DROP FOREIGN KEY `conversation_currentNode_message_id_fk`;

-- DropForeignKey
ALTER TABLE `conversation` DROP FOREIGN KEY `conversation_folderId_folder_id_fk`;

-- DropForeignKey
ALTER TABLE `conversationUser` DROP FOREIGN KEY `conversationUser_conversationId_conversation_id_fk`;

-- DropForeignKey
ALTER TABLE `message` DROP FOREIGN KEY `message_conversationId_conversation_id_fk`;

-- DropForeignKey
ALTER TABLE `message` DROP FOREIGN KEY `message_parentId_message_id_fk`;

-- DropForeignKey
ALTER TABLE `sharedConversation` DROP FOREIGN KEY `sharedConversation_agentId_agent_id_fk`;

-- DropForeignKey
ALTER TABLE `sharedConversation` DROP FOREIGN KEY `sharedConversation_conversationId_conversation_id_fk`;

-- DropForeignKey
ALTER TABLE `sharedMessage` DROP FOREIGN KEY `sharedMessage_parentId_sharedMessage_id_fk`;

-- DropForeignKey
ALTER TABLE `sharedMessage` DROP FOREIGN KEY `sharedMessage_sharedConversationId_sharedConversation_id_fk`;

-- AlterTable
ALTER TABLE `agent` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `agentUser` DROP PRIMARY KEY,
    MODIFY `agentId` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`agentId`, `userId`);

-- AlterTable
ALTER TABLE `apiKey` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `conversation` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `agentId` CHAR(36) NULL,
    MODIFY `currentNode` CHAR(36) NULL,
    MODIFY `folderId` CHAR(36) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `conversationUser` DROP PRIMARY KEY,
    MODIFY `conversationId` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`conversationId`, `userId`);

-- AlterTable
ALTER TABLE `folder` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `message` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `conversationId` CHAR(36) NOT NULL,
    MODIFY `parentId` CHAR(36) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `sharedConversation` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `conversationId` CHAR(36) NOT NULL,
    MODIFY `agentId` CHAR(36) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `sharedMessage` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `sharedConversationId` CHAR(36) NOT NULL,
    MODIFY `parentId` CHAR(36) NULL,
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `agentUser` ADD CONSTRAINT `agentUser_agentId_agent_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_agentId_agent_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_folderId_folder_id_fk` FOREIGN KEY (`folderId`) REFERENCES `folder`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_currentNode_message_id_fk` FOREIGN KEY (`currentNode`) REFERENCES `message`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `conversationUser` ADD CONSTRAINT `conversationUser_conversationId_conversation_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `message` ADD CONSTRAINT `message_conversationId_conversation_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `message` ADD CONSTRAINT `message_parentId_message_id_fk` FOREIGN KEY (`parentId`) REFERENCES `message`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sharedConversation` ADD CONSTRAINT `sharedConversation_agentId_agent_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sharedConversation` ADD CONSTRAINT `sharedConversation_conversationId_conversation_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sharedMessage` ADD CONSTRAINT `sharedMessage_parentId_sharedMessage_id_fk` FOREIGN KEY (`parentId`) REFERENCES `sharedMessage`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sharedMessage` ADD CONSTRAINT `sharedMessage_sharedConversationId_sharedConversation_id_fk` FOREIGN KEY (`sharedConversationId`) REFERENCES `sharedConversation`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
