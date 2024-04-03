CREATE TABLE `model` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`tokenLimit` integer NOT NULL,
	`createdAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

INSERT INTO model (id, name, provider, tokenLimit) VALUES('mistral-large-latest','Mistral Large','mistral',32000);
INSERT INTO model (id, name, provider, tokenLimit) VALUES('mistral-medium-latest','Mistral Medium','mistral',32000);
INSERT INTO model (id, name, provider, tokenLimit) VALUES('mistral-small-latest','Mistral Small','mistral',32000);
INSERT INTO model (id, name, provider, tokenLimit) VALUES('gpt-4-turbo-preview','GPT 4 Turbo','openai',128000);
INSERT INTO model (id, name, provider, tokenLimit) VALUES('gpt-4','GPT 4','openai',8192);
INSERT INTO model (id, name, provider, tokenLimit) VALUES('gpt-3.5-turbo','GPT 3.5 Turbo','openai',16385);
