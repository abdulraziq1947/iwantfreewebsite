CREATE TABLE `upload_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`pending_order_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`pending_order_id`) REFERENCES `pending_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `upload_sessions_token_hash_uidx` ON `upload_sessions` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `upload_sessions_pending_order_id_idx` ON `upload_sessions` (`pending_order_id`);
--> statement-breakpoint
CREATE TABLE `customer_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`pending_order_id` text,
	`organisation_id` text,
	`category` text NOT NULL,
	`original_filename` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`r2_key` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`pending_order_id`) REFERENCES `pending_orders`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_uploads_r2_key_uidx` ON `customer_uploads` (`r2_key`);
--> statement-breakpoint
CREATE INDEX `customer_uploads_pending_order_id_idx` ON `customer_uploads` (`pending_order_id`);
--> statement-breakpoint
CREATE INDEX `customer_uploads_organisation_id_idx` ON `customer_uploads` (`organisation_id`);
--> statement-breakpoint
CREATE TABLE `upload_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL
);
