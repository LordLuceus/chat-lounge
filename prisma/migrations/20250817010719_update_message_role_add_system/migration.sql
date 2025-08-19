-- AlterTable
ALTER TABLE `message` MODIFY `role` ENUM('user', 'assistant', 'system') NOT NULL;
