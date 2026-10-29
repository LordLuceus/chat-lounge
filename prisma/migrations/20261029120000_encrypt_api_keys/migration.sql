-- API keys are now stored encrypted (AES-256-GCM, see src/lib/server/api-key-crypto.ts).
-- The `key` column becomes `encryptedKey`, keeping its data: rows still holding a
-- plaintext key are re-encrypted by the server the next time it starts (and on
-- first use), so no key material is handled in SQL.

-- A key is unique per user and provider; the old unique index on the key value
-- itself does not hold for ciphertext and is dropped. Duplicate (user, provider)
-- rows cannot be created by the app and are unreachable when they exist; any
-- stragglers are removed, keeping the most recently updated row.
DELETE `older` FROM `apiKey` AS `older`
  JOIN `apiKey` AS `newer`
    ON `older`.`userId` = `newer`.`userId`
   AND `older`.`provider` = `newer`.`provider`
   AND (`older`.`updatedAt` < `newer`.`updatedAt`
        OR (`older`.`updatedAt` = `newer`.`updatedAt` AND `older`.`id` < `newer`.`id`));

-- DropIndex
DROP INDEX `apiKey_key_unique` ON `apiKey`;

-- AlterTable (rename keeps existing values; widened for ciphertext)
ALTER TABLE `apiKey` CHANGE `key` `encryptedKey` VARCHAR(1024) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `apiKey_userId_provider_unique` ON `apiKey`(`userId`, `provider`);
