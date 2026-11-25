ALTER TABLE `pending_orders` ADD `reminder_sent_at` integer;--> statement-breakpoint
ALTER TABLE `pending_orders` ADD `reminder_send_count` integer DEFAULT 0 NOT NULL;
