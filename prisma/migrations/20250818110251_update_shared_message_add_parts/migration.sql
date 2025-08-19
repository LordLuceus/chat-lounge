-- AlterTable
ALTER TABLE `sharedMessage` ADD COLUMN `parts` JSON AFTER `content`;

-- Migrate content to parts
UPDATE `sharedMessage` SET `parts` = JSON_ARRAY(JSON_OBJECT('type', 'text', 'text', `content`));

-- Set parts as NOT NULL
ALTER TABLE `sharedMessage` MODIFY COLUMN `parts` JSON NOT NULL;