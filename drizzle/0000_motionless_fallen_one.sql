CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`number` text NOT NULL,
	`currency` text NOT NULL,
	`type` text NOT NULL,
	`balance` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `accounts_tenant` ON `accounts` (`tenant`);--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_tenant` ON `audit` (`tenant`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`account_id` text NOT NULL,
	`beneficiary` text NOT NULL,
	`bank` text NOT NULL,
	`number` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`rail` text NOT NULL,
	`reference` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`maker` text NOT NULL,
	`approver` text,
	`op` text,
	`direction` text NOT NULL,
	`batch` text,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payments_tenant_date` ON `payments` (`tenant`,`date`);--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `records_tenant_kind` ON `records` (`tenant`,`kind`);