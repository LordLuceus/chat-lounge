-- AlterTable
ALTER TABLE `message` ADD COLUMN `content` MEDIUMTEXT AFTER `parts`;

-- CreateIndex
CREATE FULLTEXT INDEX `message_content_idx` ON `message`(`content`);

-- Populate content with text from parts
UPDATE `message`
SET `content` = JSON_UNQUOTE(JSON_EXTRACT(`parts`, '$[0].text'))
WHERE JSON_EXTRACT(`parts`, '$[0].text') IS NOT NULL;

-- Mark the column as NOT NULL
ALTER TABLE `message` MODIFY COLUMN `content` MEDIUMTEXT NOT NULL;