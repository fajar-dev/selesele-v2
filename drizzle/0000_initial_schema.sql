CREATE TABLE `comment_threads` (
	`id` varchar(36) NOT NULL,
	`page_id` varchar(36) NOT NULL,
	`quote` text NOT NULL,
	`anchor` json NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`resolved_at` timestamp,
	`resolved_by` varchar(36),
	CONSTRAINT `comment_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` varchar(36) NOT NULL,
	`thread_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `page_documents` (
	`page_id` varchar(36) NOT NULL,
	`markdown` longtext NOT NULL,
	`state` mediumblob,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `page_documents_page_id` PRIMARY KEY(`page_id`)
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`icon` varchar(32),
	`description` varchar(2000) NOT NULL DEFAULT '',
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `folders_id` PRIMARY KEY(`id`),
	CONSTRAINT `folders_workspace_identity_unique` UNIQUE(`id`,`workspace_id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`page_id` varchar(36),
	`kind` varchar(20) NOT NULL,
	`title` varchar(320) NOT NULL,
	`deduplication_key` varchar(120) NOT NULL,
	`read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_dedup` UNIQUE(`user_id`,`deduplication_key`)
);
--> statement-breakpoint
CREATE TABLE `page_activity` (
	`user_id` varchar(36) NOT NULL,
	`page_id` varchar(36) NOT NULL,
	`favorite_at` timestamp,
	`visited_at` timestamp,
	CONSTRAINT `page_activity_user_id_page_id_pk` PRIMARY KEY(`user_id`,`page_id`)
);
--> statement-breakpoint
CREATE TABLE `page_links` (
	`source_id` varchar(36) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	CONSTRAINT `page_links_source_id_target_id_pk` PRIMARY KEY(`source_id`,`target_id`)
);
--> statement-breakpoint
CREATE TABLE `page_mentions` (
	`page_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `page_mentions_page_id_user_id_pk` PRIMARY KEY(`page_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `page_versions` (
	`id` varchar(36) NOT NULL,
	`page_id` varchar(36) NOT NULL,
	`markdown` longtext NOT NULL,
	`author_id` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `page_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`folder_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`description` varchar(2000) NOT NULL DEFAULT '',
	`icon` varchar(32),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `pages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `sessions_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`microsoft_subject` varchar(73) NOT NULL,
	`name` varchar(255),
	`avatar` text,
	`last_login_ip` varchar(45),
	`last_login_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`is_active` boolean DEFAULT true,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_microsoft_subject_unique` UNIQUE(`microsoft_subject`)
);
--> statement-breakpoint
CREATE TABLE `workspace_invitations` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`role` enum('admin','member') NOT NULL DEFAULT 'member',
	`invited_by` varchar(36) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_invitation_email_unique` UNIQUE(`workspace_id`,`email`)
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_members_identity_unique` UNIQUE(`workspace_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` varchar(2000) NOT NULL DEFAULT '',
	`icon` varchar(32) NOT NULL DEFAULT '🏡',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `comment_threads` ADD CONSTRAINT `comment_threads_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_threads` ADD CONSTRAINT `comment_threads_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_threads` ADD CONSTRAINT `comment_threads_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_thread_id_comment_threads_id_fk` FOREIGN KEY (`thread_id`) REFERENCES `comment_threads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_documents` ADD CONSTRAINT `page_documents_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `folders` ADD CONSTRAINT `folders_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_activity` ADD CONSTRAINT `page_activity_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_activity` ADD CONSTRAINT `page_activity_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_links` ADD CONSTRAINT `page_links_source_id_pages_id_fk` FOREIGN KEY (`source_id`) REFERENCES `pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_links` ADD CONSTRAINT `page_links_target_id_pages_id_fk` FOREIGN KEY (`target_id`) REFERENCES `pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_mentions` ADD CONSTRAINT `page_mentions_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_mentions` ADD CONSTRAINT `page_mentions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_versions` ADD CONSTRAINT `page_versions_page_id_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_versions` ADD CONSTRAINT `page_versions_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pages` ADD CONSTRAINT `pages_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pages` ADD CONSTRAINT `pages_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pages` ADD CONSTRAINT `pages_folder_workspace_fk` FOREIGN KEY (`folder_id`,`workspace_id`) REFERENCES `folders`(`id`,`workspace_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_invitations` ADD CONSTRAINT `workspace_invitations_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_invitations` ADD CONSTRAINT `workspace_invitations_invited_by_users_id_fk` FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `comment_threads_page_index` ON `comment_threads` (`page_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `comments_thread_index` ON `comments` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `folders_workspace_index` ON `folders` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `notifications_inbox` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `page_activity_recent` ON `page_activity` (`user_id`,`visited_at`);--> statement-breakpoint
CREATE INDEX `page_links_target` ON `page_links` (`target_id`);--> statement-breakpoint
CREATE INDEX `page_versions_page_time` ON `page_versions` (`page_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `pages_workspace_folder_index` ON `pages` (`workspace_id`,`folder_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_index` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_index` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `workspace_invitation_email_index` ON `workspace_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `workspace_members_user_index` ON `workspace_members` (`user_id`);