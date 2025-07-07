-- AlterTable
ALTER TABLE `apiKey` MODIFY `provider` ENUM('mistral', 'openai', 'elevenlabs', 'google', 'anthropic', 'xai') NOT NULL;

-- AlterTable
ALTER TABLE `model` MODIFY `provider` ENUM('mistral', 'openai', 'elevenlabs', 'google', 'anthropic', 'xai') NOT NULL;
