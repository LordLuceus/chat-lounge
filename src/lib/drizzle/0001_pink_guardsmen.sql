CREATE TABLE `agentUser` (
	`agentId` text NOT NULL,
	`userId` text NOT NULL,
	`lastUsedAt` integer,
	`isOwner` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	PRIMARY KEY(`agentId`, `userId`),
	FOREIGN KEY (`agentId`) REFERENCES `agent`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

INSERT INTO `agentUser` (`agentId`, `userId`, `lastUsedAt`, `isOwner`, `createdAt`, `updatedAt`)
SELECT `id`, `userId`, `lastUsedAt`, `true`, `createdAt`, `updatedAt`
FROM `agent`;
--> statement-breakpoint

CREATE TABLE `conversationUser_new` (
	`conversationId` text NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	PRIMARY KEY(`conversationId`, `userId`),
	FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

INSERT INTO `conversationUser_new` (`conversationId`, `userId`, `createdAt`, `updatedAt`)
SELECT `conversationId`, `userId`, `createdAt`, `updatedAt`
FROM `conversationUser`;
--> statement-breakpoint

DROP TABLE `conversationUser`;
--> statement-breakpoint

ALTER TABLE `conversationUser_new` RENAME TO `conversationUser`;
--> statement-breakpoint

ALTER TABLE `agent` ADD `visibility` text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `agent` DROP COLUMN `lastUsedAt`;--> statement-breakpoint