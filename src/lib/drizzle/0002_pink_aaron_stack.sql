CREATE TABLE `sharedConversation` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`conversationId` text NOT NULL,
	`name` text NOT NULL,
	`sharedAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sharedMessage` (
	`id` text PRIMARY KEY NOT NULL,
	`sharedConversationId` text NOT NULL,
	`content` text NOT NULL,
	`role` text NOT NULL,
	`parentId` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`sharedConversationId`) REFERENCES `sharedConversation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parentId`) REFERENCES `sharedMessage`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `conversation` DROP COLUMN `isShared`;