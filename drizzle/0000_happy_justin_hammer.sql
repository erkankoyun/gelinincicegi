CREATE TABLE `advisor_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`email` text,
	`phone` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`email_sent_at` integer
);
--> statement-breakpoint
CREATE TABLE `api_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`count` integer NOT NULL
);
