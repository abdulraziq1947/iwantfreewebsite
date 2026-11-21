ALTER TABLE `account_activation_tokens` ADD `email_sent_at` integer;
--> statement-breakpoint
ALTER TABLE `account_activation_tokens` ADD `last_email_attempt_at` integer;
--> statement-breakpoint
ALTER TABLE `account_activation_tokens` ADD `email_send_count` integer DEFAULT 0 NOT NULL;
