-- CreateTable
CREATE TABLE `deletedModel` (
    `id` VARCHAR(100) NOT NULL,
    `provider` ENUM('mistral', 'openai', 'elevenlabs', 'google', 'anthropic', 'xai', 'openrouter') NOT NULL,
    `deletedAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

