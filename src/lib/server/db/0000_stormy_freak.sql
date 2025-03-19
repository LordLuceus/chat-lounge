CREATE TABLE `agentUser` (
	`agentId` varchar(36) NOT NULL,
	`userId` varchar(100) NOT NULL,
	`lastUsedAt` timestamp,
	`isOwner` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentUser_agentId_userId_pk` PRIMARY KEY(`agentId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `agent` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(255),
	`instructions` text NOT NULL,
	`visibility` varchar(20) NOT NULL DEFAULT 'private',
	`type` varchar(20) NOT NULL DEFAULT 'default',
	`greeting` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `apiKey` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(100) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`key` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apiKey_id` PRIMARY KEY(`id`),
	CONSTRAINT `apiKey_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `conversationUser` (
	`conversationId` varchar(36) NOT NULL,
	`userId` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversationUser_conversationId_userId_pk` PRIMARY KEY(`conversationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `conversation` (
	`id` varchar(36) NOT NULL,
	`agentId` varchar(36),
	`modelId` varchar(100),
	`name` varchar(255) NOT NULL,
	`currentNode` varchar(36),
	`isImporting` boolean NOT NULL DEFAULT false,
	`isPinned` boolean NOT NULL DEFAULT false,
	`folderId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `folder` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`userId` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `folder_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message` (
	`id` varchar(36) NOT NULL,
	`conversationId` varchar(36) NOT NULL,
	`userId` varchar(100),
	`content` text NOT NULL,
	`role` varchar(20) NOT NULL,
	`parentId` varchar(36),
	`isInternal` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `message_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `model` (
	`id` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`tokenLimit` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `model_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sharedConversation` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(100) NOT NULL,
	`conversationId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`agentId` varchar(36),
	`sharedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sharedConversation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sharedMessage` (
	`id` varchar(36) NOT NULL,
	`sharedConversationId` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`role` varchar(20) NOT NULL,
	`parentId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sharedMessage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(100) NOT NULL,
	`username` varchar(50) NOT NULL,
	`email` varchar(100),
	`image` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `agentUser` ADD CONSTRAINT `agentUser_agentId_agent_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agentUser` ADD CONSTRAINT `agentUser_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent` ADD CONSTRAINT `agent_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `apiKey` ADD CONSTRAINT `apiKey_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversationUser` ADD CONSTRAINT `conversationUser_conversationId_conversation_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversationUser` ADD CONSTRAINT `conversationUser_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_agentId_agent_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_modelId_model_id_fk` FOREIGN KEY (`modelId`) REFERENCES `model`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_currentNode_message_id_fk` FOREIGN KEY (`currentNode`) REFERENCES `message`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation` ADD CONSTRAINT `conversation_folderId_folder_id_fk` FOREIGN KEY (`folderId`) REFERENCES `folder`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `folder` ADD CONSTRAINT `folder_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message` ADD CONSTRAINT `message_conversationId_conversation_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message` ADD CONSTRAINT `message_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message` ADD CONSTRAINT `message_parentId_message_id_fk` FOREIGN KEY (`parentId`) REFERENCES `message`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sharedConversation` ADD CONSTRAINT `sharedConversation_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sharedConversation` ADD CONSTRAINT `sharedConversation_conversationId_conversation_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sharedConversation` ADD CONSTRAINT `sharedConversation_agentId_agent_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sharedMessage` ADD CONSTRAINT `sharedMessage_sharedConversationId_sharedConversation_id_fk` FOREIGN KEY (`sharedConversationId`) REFERENCES `sharedConversation`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sharedMessage` ADD CONSTRAINT `sharedMessage_parentId_sharedMessage_id_fk` FOREIGN KEY (`parentId`) REFERENCES `sharedMessage`(`id`) ON DELETE cascade ON UPDATE no action;