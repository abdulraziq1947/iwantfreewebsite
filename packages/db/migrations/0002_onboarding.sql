CREATE TABLE `onboarding_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`organisation_id` text NOT NULL,
	`current_step` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`data_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_profiles_org_uidx` ON `onboarding_profiles` (`organisation_id`);
--> statement-breakpoint
CREATE INDEX `onboarding_profiles_org_id_idx` ON `onboarding_profiles` (`organisation_id`);
