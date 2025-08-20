-- Add new JSON column (temporarily nullable)
ALTER TABLE `message` ADD COLUMN `parts` JSON NULL AFTER `userId`;

-- Migrate existing content to parts as JSON array with one text element
UPDATE `message` 
SET `parts` = JSON_ARRAY(JSON_OBJECT('type', 'text', 'text', `content`));

-- Convert parts to NOT NULL now that all rows are populated
ALTER TABLE `message` MODIFY COLUMN `parts` JSON NOT NULL;

-- Remove obsolete content column and associated fulltext index
ALTER TABLE `message` DROP COLUMN `content`;
