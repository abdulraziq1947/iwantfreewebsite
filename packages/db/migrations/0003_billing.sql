CREATE TABLE `checkout_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`organisation_id` text NOT NULL,
	`stripe_session_id` text NOT NULL,
	`stripe_price_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_sessions_stripe_session_uidx` ON `checkout_sessions` (`stripe_session_id`);
--> statement-breakpoint
CREATE INDEX `checkout_sessions_org_id_idx` ON `checkout_sessions` (`organisation_id`);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`organisation_id` text NOT NULL,
	`stripe_subscription_id` text NOT NULL,
	`stripe_customer_id` text NOT NULL,
	`stripe_price_id` text NOT NULL,
	`status` text NOT NULL,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`current_period_start` integer,
	`current_period_end` integer,
	`canceled_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_stripe_subscription_uidx` ON `subscriptions` (`stripe_subscription_id`);
--> statement-breakpoint
CREATE INDEX `subscriptions_org_id_idx` ON `subscriptions` (`organisation_id`);
--> statement-breakpoint
CREATE TABLE `stripe_events` (
	`stripe_event_id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`processed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `asset_transfer_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`organisation_id` text NOT NULL,
	`subscription_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`scheduled_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`period_end_at` integer,
	`completed_at` integer,
	`admin_notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `asset_transfer_tasks_org_id_idx` ON `asset_transfer_tasks` (`organisation_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_transfer_tasks_org_open_uidx` ON `asset_transfer_tasks` (`organisation_id`) WHERE `status` IN ('pending', 'in_progress');
