-- CreateTable
CREATE TABLE `utilityModel` (
    `provider` ENUM('mistral', 'openai', 'elevenlabs', 'google', 'anthropic', 'xai', 'openrouter') NOT NULL,
    `modelId` VARCHAR(100) NOT NULL,
    `updatedAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`provider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
