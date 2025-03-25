-- CreateIndex
CREATE FULLTEXT INDEX `conversation_name_idx` ON `conversation`(`name`);

-- CreateIndex
CREATE FULLTEXT INDEX `message_content_idx` ON `message`(`content`);
