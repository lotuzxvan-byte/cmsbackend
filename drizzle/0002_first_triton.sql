CREATE TABLE `auth_credentials` (
	`member_id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`must_change` integer NOT NULL,
	`revision` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `limits_expiry` ON `auth_limits` (`expires`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`revision` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_member` ON `auth_sessions` (`member_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry` ON `auth_sessions` (`expires`);