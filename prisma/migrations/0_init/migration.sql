-- CreateTable
CREATE TABLE `agent` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NULL,
    `instructions` TEXT NOT NULL,
    `visibility` VARCHAR(20) NOT NULL DEFAULT 'private',
    `type` VARCHAR(20) NOT NULL DEFAULT 'default',
    `greeting` TEXT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `agent_userId_user_id_fk`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agentUser` (
    `agentId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(100) NOT NULL,
    `lastUsedAt` TIMESTAMP(0) NULL,
    `isOwner` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `agentUser_userId_user_id_fk`(`userId`),
    PRIMARY KEY (`agentId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `apiKey` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(100) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `key` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `apiKey_key_unique`(`key`),
    INDEX `apiKey_userId_user_id_fk`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation` (
    `id` VARCHAR(36) NOT NULL,
    `agentId` VARCHAR(36) NULL,
    `modelId` VARCHAR(100) NULL,
    `name` VARCHAR(255) NOT NULL,
    `currentNode` VARCHAR(36) NULL,
    `isImporting` BOOLEAN NOT NULL DEFAULT false,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `folderId` VARCHAR(36) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `conversation_agentId_agent_id_fk`(`agentId`),
    INDEX `conversation_currentNode_message_id_fk`(`currentNode`),
    INDEX `conversation_folderId_folder_id_fk`(`folderId`),
    INDEX `conversation_modelId_model_id_fk`(`modelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversationUser` (
    `conversationId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(100) NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `conversationUser_userId_user_id_fk`(`userId`),
    PRIMARY KEY (`conversationId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `folder` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `userId` VARCHAR(100) NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `folder_userId_user_id_fk`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message` (
    `id` VARCHAR(36) NOT NULL,
    `conversationId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(100) NULL,
    `content` TEXT NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    `parentId` VARCHAR(36) NULL,
    `isInternal` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `message_conversationId_conversation_id_fk`(`conversationId`),
    INDEX `message_parentId_message_id_fk`(`parentId`),
    INDEX `message_userId_user_id_fk`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model` (
    `id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `tokenLimit` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sharedConversation` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(100) NOT NULL,
    `conversationId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `agentId` VARCHAR(36) NULL,
    `sharedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `sharedConversation_agentId_agent_id_fk`(`agentId`),
    INDEX `sharedConversation_conversationId_conversation_id_fk`(`conversationId`),
    INDEX `sharedConversation_userId_user_id_fk`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sharedMessage` (
    `id` VARCHAR(36) NOT NULL,
    `sharedConversationId` VARCHAR(36) NOT NULL,
    `content` TEXT NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    `parentId` VARCHAR(36) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `sharedMessage_parentId_sharedMessage_id_fk`(`parentId`),
    INDEX `sharedMessage_sharedConversationId_sharedConversation_id_fk`(`sharedConversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(100) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NULL,
    `image` TEXT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `user_username_unique`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `agent` ADD CONSTRAINT `agent_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `agentUser` ADD CONSTRAINT `agentUser_agentId_agent_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `agentUser` ADD CONSTRAINT `agentUser_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `apiKey` ADD CONSTRAINT `apiKey_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_agentId_agent_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_folderId_folder_id_fk` FOREIGN KEY (`folderId`) REFERENCES `folder`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_modelId_model_id_fk` FOREIGN KEY (`modelId`) REFERENCES `model`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_currentNode_message_id_fk` FOREIGN KEY (`currentNode`) REFERENCES `message`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `conversationUser` ADD CONSTRAINT `conversationUser_conversationId_conversation_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `conversationUser` ADD CONSTRAINT `conversationUser_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `folder` ADD CONSTRAINT `folder_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `message` ADD CONSTRAINT `message_conversationId_conversation_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `message` ADD CONSTRAINT `message_parentId_message_id_fk` FOREIGN KEY (`parentId`) REFERENCES `message`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `message` ADD CONSTRAINT `message_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sharedConversation` ADD CONSTRAINT `sharedConversation_agentId_agent_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sharedConversation` ADD CONSTRAINT `sharedConversation_conversationId_conversation_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sharedConversation` ADD CONSTRAINT `sharedConversation_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sharedMessage` ADD CONSTRAINT `sharedMessage_parentId_sharedMessage_id_fk` FOREIGN KEY (`parentId`) REFERENCES `sharedMessage`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sharedMessage` ADD CONSTRAINT `sharedMessage_sharedConversationId_sharedConversation_id_fk` FOREIGN KEY (`sharedConversationId`) REFERENCES `sharedConversation`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

