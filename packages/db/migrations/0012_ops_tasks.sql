ALTER TABLE `domain_registration_tasks` ADD `renews_at` integer;
--> statement-breakpoint
CREATE TABLE `ops_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`organisation_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`due_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ops_tasks_org_id_idx` ON `ops_tasks` (`organisation_id`);
--> statement-breakpoint
CREATE INDEX `ops_tasks_kind_status_idx` ON `ops_tasks` (`kind`,`status`);
--> statement-breakpoint
CREATE INDEX `ops_tasks_due_at_idx` ON `ops_tasks` (`due_at`);
