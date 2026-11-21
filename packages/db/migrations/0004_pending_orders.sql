CREATE TABLE `pending_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_token` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`email` text,
	`full_name` text,
	`phone` text,
	`trading_name` text,
	`questionnaire_json` text DEFAULT '{}' NOT NULL,
	`questionnaire_step` integer DEFAULT 0 NOT NULL,
	`domain_mode` text,
	`domain_name` text,
	`domain_acknowledged` integer DEFAULT false NOT NULL,
	`domain_last_checked_at` integer,
	`domain_last_available` integer,
	`terms_version` text,
	`terms_accepted_at` integer,
	`marketing_opt_in` integer DEFAULT false NOT NULL,
	`stripe_customer_id` text,
	`stripe_checkout_session_id` text,
	`stripe_price_id` text,
	`organisation_id` text,
	`user_id` text,
	`paid_at` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pending_orders_resume_token_uidx` ON `pending_orders` (`resume_token`);
--> statement-breakpoint
CREATE INDEX `pending_orders_email_idx` ON `pending_orders` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `pending_orders_stripe_session_uidx` ON `pending_orders` (`stripe_checkout_session_id`);
--> statement-breakpoint
CREATE TABLE `domain_registration_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`organisation_id` text NOT NULL,
	`pending_order_id` text,
	`domain_name` text NOT NULL,
	`domain_mode` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_notes` text,
	`registered_at` integer,
	`connected_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pending_order_id`) REFERENCES `pending_orders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `domain_registration_tasks_org_id_idx` ON `domain_registration_tasks` (`organisation_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `domain_registration_tasks_org_open_uidx` ON `domain_registration_tasks` (`organisation_id`) WHERE `status` IN ('pending', 'in_progress', 'registered');
--> statement-breakpoint
CREATE TABLE `account_activation_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organisation_id` text NOT NULL,
	`pending_order_id` text,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pending_order_id`) REFERENCES `pending_orders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_activation_tokens_hash_uidx` ON `account_activation_tokens` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `account_activation_tokens_user_id_idx` ON `account_activation_tokens` (`user_id`);
