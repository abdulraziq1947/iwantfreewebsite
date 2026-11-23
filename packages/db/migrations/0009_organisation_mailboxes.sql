CREATE TABLE `organisation_mailboxes` (
	`id` text PRIMARY KEY NOT NULL,
	`organisation_id` text NOT NULL,
	`email_address` text NOT NULL,
	`username` text,
	`webmail_url` text,
	`imap_host` text,
	`imap_port` integer DEFAULT 993,
	`imap_security` text DEFAULT 'ssl',
	`smtp_host` text,
	`smtp_port` integer DEFAULT 465,
	`smtp_security` text DEFAULT 'ssl',
	`pop_host` text,
	`pop_port` integer DEFAULT 995,
	`pop_security` text DEFAULT 'ssl',
	`status` text DEFAULT 'pending' NOT NULL,
	`customer_notes` text,
	`admin_notes` text,
	`provisioned_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organisation_mailboxes_org_uidx` ON `organisation_mailboxes` (`organisation_id`);
