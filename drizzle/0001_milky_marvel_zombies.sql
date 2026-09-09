CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`last_login` text
);
--> statement-breakpoint
CREATE INDEX `members_tenant` ON `members` (`tenant`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_email` ON `members` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_identity` ON `members` (`user_id`);