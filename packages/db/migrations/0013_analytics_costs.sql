CREATE TABLE `product_events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`organisation_id` text,
	`user_id` text,
	`properties_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `product_events_name_idx` ON `product_events` (`name`);
--> statement-breakpoint
CREATE INDEX `product_events_created_at_idx` ON `product_events` (`created_at`);
--> statement-breakpoint
CREATE INDEX `product_events_org_id_idx` ON `product_events` (`organisation_id`);
--> statement-breakpoint
CREATE TABLE `organisation_costs` (
	`organisation_id` text PRIMARY KEY NOT NULL,
	`domain_annual_pence` integer DEFAULT 0 NOT NULL,
	`mailbox_monthly_pence` integer DEFAULT 0 NOT NULL,
	`hosting_monthly_pence` integer DEFAULT 0 NOT NULL,
	`other_monthly_pence` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade
);
