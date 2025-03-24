-- CreateIndex
CREATE FULLTEXT INDEX `agent_name_description_idx` ON `agent`(`name`, `description`);
