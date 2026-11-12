CREATE TABLE `email_deliveries` (
	`id` varchar(36) NOT NULL,
	`deduplication_key` varchar(180) NOT NULL,
	`recipient` varchar(255) NOT NULL,
	`recipient_user_id` varchar(36),
	`workspace_id` varchar(36) NOT NULL,
	`page_id` varchar(36),
	`invitation_id` varchar(36),
	`invitation_expires_at` timestamp,
	`kind` varchar(20) NOT NULL,
	`title` varchar(320) NOT NULL,
	`state` varchar(16) NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`available_at` timestamp(3) NOT NULL DEFAULT (now()),
	`lease_until` timestamp(3),
	`lease_token` varchar(36),
	`completed_at` timestamp(3),
	`last_error` varchar(80),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `email_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_deliveries_dedup` UNIQUE(`deduplication_key`)
);
--> statement-breakpoint
ALTER TABLE `email_deliveries` ADD CONSTRAINT `email_deliveries_recipient_user_id_users_id_fk` FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_deliveries` ADD CONSTRAINT `email_deliveries_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_deliveries` ADD CONSTRAINT `email_deliveries_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_deliveries` ADD CONSTRAINT `email_deliveries_invitation_id_workspace_invitations_id_fk` FOREIGN KEY (`invitation_id`) REFERENCES `workspace_invitations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `email_deliveries_pending` ON `email_deliveries` (`state`,`available_at`);--> statement-breakpoint
CREATE INDEX `email_deliveries_lease` ON `email_deliveries` (`state`,`lease_until`);