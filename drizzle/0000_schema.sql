CREATE TABLE `canvas_presence` (
	`session_id` varchar(36) NOT NULL,
	`item_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`cursor` json,
	`selected` json NOT NULL,
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `canvas_presence_session_id` PRIMARY KEY(`session_id`)
);
--> statement-breakpoint
CREATE TABLE `item_canvases` (
	`item_id` varchar(36) NOT NULL,
	`content` json NOT NULL,
	`summary` longtext NOT NULL,
	`revision` int NOT NULL DEFAULT 0,
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `item_canvases_item_id` PRIMARY KEY(`item_id`)
);
--> statement-breakpoint
CREATE TABLE `comment_threads` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36) NOT NULL,
	`quote` text NOT NULL,
	`anchor` json NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`resolved_at` timestamp(3),
	`resolved_by` varchar(36),
	CONSTRAINT `comment_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` varchar(36) NOT NULL,
	`thread_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`role` varchar(12) NOT NULL,
	`content` longtext NOT NULL,
	`sources` json NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `conversation_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`pinned` boolean NOT NULL DEFAULT false,
	`title` varchar(120) NOT NULL,
	`revision` int NOT NULL DEFAULT 0,
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_images` (
	`filename` varchar(48) NOT NULL,
	`item_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `document_images_filename` PRIMARY KEY(`filename`)
);
--> statement-breakpoint
CREATE TABLE `document_presence` (
	`item_id` varchar(36) NOT NULL,
	`client_id` bigint unsigned NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`state` mediumblob NOT NULL,
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `document_presence_item_id_client_id_pk` PRIMARY KEY(`item_id`,`client_id`)
);
--> statement-breakpoint
CREATE TABLE `item_documents` (
	`item_id` varchar(36) NOT NULL,
	`markdown` longtext NOT NULL,
	`state` mediumblob,
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `item_documents_item_id` PRIMARY KEY(`item_id`)
);
--> statement-breakpoint
CREATE TABLE `email_deliveries` (
	`id` varchar(36) NOT NULL,
	`deduplication_key` varchar(180) NOT NULL,
	`recipient` varchar(255) NOT NULL,
	`recipient_user_id` varchar(36),
	`workspace_id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`member_id` varchar(36),
	`kind` varchar(20) NOT NULL,
	`title` varchar(320) NOT NULL,
	`activity` json,
	`delivery_mode` varchar(12) NOT NULL DEFAULT 'immediate',
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
CREATE TABLE `folders` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`access_mode` enum('inherit','restricted') NOT NULL DEFAULT 'inherit',
	`icon` varchar(32),
	`description` varchar(2000) NOT NULL DEFAULT '',
	`deleted_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `folders_id` PRIMARY KEY(`id`),
	CONSTRAINT `folders_workspace_identity_unique` UNIQUE(`id`,`workspace_id`)
);
--> statement-breakpoint
CREATE TABLE `item_attachments` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`mime` varchar(100) NOT NULL,
	`size` int NOT NULL,
	`data` mediumblob NOT NULL,
	`anchor` json,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `item_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `item_links` (
	`source_id` varchar(36) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	CONSTRAINT `item_links_source_id_target_id_pk` PRIMARY KEY(`source_id`,`target_id`)
);
--> statement-breakpoint
CREATE TABLE `item_mentions` (
	`item_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `item_mentions_item_id_user_id_pk` PRIMARY KEY(`item_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `item_preferences` (
	`user_id` varchar(36) NOT NULL,
	`item_id` varchar(36) NOT NULL,
	`favorite_at` timestamp(3),
	`visited_at` timestamp(3),
	CONSTRAINT `item_preferences_user_id_item_id_pk` PRIMARY KEY(`user_id`,`item_id`)
);
--> statement-breakpoint
CREATE TABLE `item_versions` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36) NOT NULL,
	`content` longtext NOT NULL,
	`author_id` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `item_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`kind` enum('document','kanban','whiteboard','diagram') NOT NULL DEFAULT 'document',
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`folder_id` varchar(36),
	`access_mode` enum('inherit','restricted') NOT NULL DEFAULT 'inherit',
	`title` varchar(255) NOT NULL,
	`description` varchar(2000) NOT NULL DEFAULT '',
	`icon` varchar(32),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`archived_at` timestamp(3),
	`deleted_at` timestamp(3),
	CONSTRAINT `items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `member_group_members` (
	`group_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	CONSTRAINT `member_group_members_group_id_member_id_pk` PRIMARY KEY(`group_id`,`member_id`)
);
--> statement-breakpoint
CREATE TABLE `member_groups` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` varchar(500) NOT NULL DEFAULT '',
	CONSTRAINT `member_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_groups_name_unique` UNIQUE(`workspace_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`thread_id` varchar(36),
	`kind` varchar(20) NOT NULL,
	`title` varchar(320) NOT NULL,
	`deduplication_key` varchar(120) NOT NULL,
	`read_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_dedup` UNIQUE(`user_id`,`deduplication_key`)
);
--> statement-breakpoint
CREATE TABLE `realtime_clock` (
	`id` varchar(16) NOT NULL,
	`sequence` bigint unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `realtime_clock_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `realtime_events` (
	`id` varchar(36) NOT NULL,
	`sequence` bigint unsigned,
	`workspace_id` varchar(36),
	`user_id` varchar(36),
	`topic` varchar(24) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `realtime_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `realtime_events_sequence` UNIQUE(`sequence`)
);
--> statement-breakpoint
CREATE TABLE `related_items` (
	`id` varchar(36) NOT NULL,
	`source_id` varchar(36) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`source_anchor` json,
	`target_anchor` json,
	`anchor_key` varchar(160) NOT NULL,
	`label` varchar(120) NOT NULL DEFAULT 'Related',
	`created_by` varchar(36) NOT NULL,
	CONSTRAINT `related_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `relation_unique` UNIQUE(`source_id`,`target_id`,`anchor_key`)
);
--> statement-breakpoint
CREATE TABLE `resource_grants` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`folder_id` varchar(36),
	`member_id` varchar(36),
	`group_id` varchar(36),
	`level` enum('none','view','comment','edit') NOT NULL,
	`expires_at` timestamp(3),
	CONSTRAINT `resource_grants_id` PRIMARY KEY(`id`),
	CONSTRAINT `resource_grants_item_member` UNIQUE(`item_id`,`member_id`),
	CONSTRAINT `resource_grants_item_group` UNIQUE(`item_id`,`group_id`),
	CONSTRAINT `resource_grants_folder_member` UNIQUE(`folder_id`,`member_id`),
	CONSTRAINT `resource_grants_folder_group` UNIQUE(`folder_id`,`group_id`),
	CONSTRAINT `resource_grants_resource_check` CHECK((`resource_grants`.`item_id` is null) <> (`resource_grants`.`folder_id` is null)),
	CONSTRAINT `resource_grants_subject_check` CHECK((`resource_grants`.`member_id` is null) <> (`resource_grants`.`group_id` is null))
);
--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`query` varchar(160) NOT NULL,
	`workspace_id` varchar(36),
	`filters` json NOT NULL,
	CONSTRAINT `saved_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
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
	`last_login_at` timestamp(3),
	`created_at` timestamp(3) DEFAULT (now()),
	`updated_at` timestamp(3) DEFAULT (now()),
	`invitation_email` boolean NOT NULL DEFAULT true,
	`is_active` boolean DEFAULT true,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_microsoft_subject_unique` UNIQUE(`microsoft_subject`)
);
--> statement-breakpoint
CREATE TABLE `workspace_activity` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`actor_name` varchar(255) NOT NULL,
	`subject_member_id` varchar(36),
	`item_id` varchar(36),
	`folder_id` varchar(36),
	`action` varchar(40) NOT NULL,
	`target` varchar(320) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`email` varchar(255) NOT NULL,
	`invited_by` varchar(36),
	`suspended_at` timestamp(3),
	`last_active_at` timestamp(3),
	`role` enum('owner','admin','member','viewer') NOT NULL DEFAULT 'member',
	`notifications` json,
	`joined_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_members_identity_unique` UNIQUE(`workspace_id`,`user_id`),
	CONSTRAINT `workspace_members_email_unique` UNIQUE(`workspace_id`,`email`)
);
--> statement-breakpoint
CREATE TABLE `workspace_templates` (
	`kind` enum('document','kanban','whiteboard','diagram') NOT NULL,
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`source_item_id` varchar(36) NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` varchar(500) NOT NULL,
	`icon` varchar(32) NOT NULL,
	`content` longtext NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` varchar(2000) NOT NULL DEFAULT '',
	`icon` varchar(32) NOT NULL DEFAULT '🏡',
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`deleted_at` timestamp(3),
	`archived_at` timestamp(3),
	`settings` json,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `canvas_presence` ADD CONSTRAINT `canvas_presence_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `canvas_presence` ADD CONSTRAINT `canvas_presence_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_canvases` ADD CONSTRAINT `item_canvases_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_threads` ADD CONSTRAINT `comment_threads_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_threads` ADD CONSTRAINT `comment_threads_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_threads` ADD CONSTRAINT `comment_threads_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_thread_id_comment_threads_id_fk` FOREIGN KEY (`thread_id`) REFERENCES `comment_threads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_images` ADD CONSTRAINT `document_images_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_images` ADD CONSTRAINT `document_images_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_presence` ADD CONSTRAINT `document_presence_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_presence` ADD CONSTRAINT `document_presence_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_documents` ADD CONSTRAINT `item_documents_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_deliveries` ADD CONSTRAINT `email_deliveries_recipient_user_id_users_id_fk` FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_deliveries` ADD CONSTRAINT `email_deliveries_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_deliveries` ADD CONSTRAINT `email_deliveries_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_deliveries` ADD CONSTRAINT `email_deliveries_member_id_workspace_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `workspace_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `folders` ADD CONSTRAINT `folders_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_attachments` ADD CONSTRAINT `item_attachments_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_attachments` ADD CONSTRAINT `item_attachments_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_links` ADD CONSTRAINT `item_links_source_id_items_id_fk` FOREIGN KEY (`source_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_links` ADD CONSTRAINT `item_links_target_id_items_id_fk` FOREIGN KEY (`target_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_mentions` ADD CONSTRAINT `item_mentions_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_mentions` ADD CONSTRAINT `item_mentions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_preferences` ADD CONSTRAINT `item_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_preferences` ADD CONSTRAINT `item_preferences_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_versions` ADD CONSTRAINT `item_versions_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_versions` ADD CONSTRAINT `item_versions_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_folder_workspace_fk` FOREIGN KEY (`folder_id`,`workspace_id`) REFERENCES `folders`(`id`,`workspace_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_group_members` ADD CONSTRAINT `member_group_members_group_id_member_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `member_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_group_members` ADD CONSTRAINT `member_group_members_member_id_workspace_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `workspace_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_groups` ADD CONSTRAINT `member_groups_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `related_items` ADD CONSTRAINT `related_items_source_id_items_id_fk` FOREIGN KEY (`source_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `related_items` ADD CONSTRAINT `related_items_target_id_items_id_fk` FOREIGN KEY (`target_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `related_items` ADD CONSTRAINT `related_items_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_grants` ADD CONSTRAINT `resource_grants_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_grants` ADD CONSTRAINT `resource_grants_item_id_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_grants` ADD CONSTRAINT `resource_grants_folder_id_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_grants` ADD CONSTRAINT `resource_grants_member_id_workspace_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `workspace_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_grants` ADD CONSTRAINT `resource_grants_group_id_member_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `member_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_searches` ADD CONSTRAINT `saved_searches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_activity` ADD CONSTRAINT `workspace_activity_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_invited_by_users_id_fk` FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_templates` ADD CONSTRAINT `workspace_templates_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_templates` ADD CONSTRAINT `workspace_templates_source_item_id_items_id_fk` FOREIGN KEY (`source_item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `canvas_presence_item` ON `canvas_presence` (`item_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `comment_threads_item_index` ON `comment_threads` (`item_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `comments_thread_index` ON `comments` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `conversation_message_order` ON `conversation_messages` (`conversation_id`,`id`);--> statement-breakpoint
CREATE INDEX `conversations_owner_time` ON `conversations` (`user_id`,`workspace_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `document_presence_expiry` ON `document_presence` (`updated_at`);--> statement-breakpoint
CREATE INDEX `email_deliveries_pending` ON `email_deliveries` (`state`,`available_at`);--> statement-breakpoint
CREATE INDEX `email_deliveries_lease` ON `email_deliveries` (`state`,`lease_until`);--> statement-breakpoint
CREATE INDEX `folders_workspace_index` ON `folders` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `attachments_item` ON `item_attachments` (`item_id`);--> statement-breakpoint
CREATE INDEX `item_links_target` ON `item_links` (`target_id`);--> statement-breakpoint
CREATE INDEX `item_preferences_recent` ON `item_preferences` (`user_id`,`visited_at`);--> statement-breakpoint
CREATE INDEX `item_versions_item_time` ON `item_versions` (`item_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `items_workspace_folder_index` ON `items` (`workspace_id`,`folder_id`);--> statement-breakpoint
CREATE INDEX `member_group_members_member_index` ON `member_group_members` (`member_id`);--> statement-breakpoint
CREATE INDEX `notifications_inbox` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `realtime_events_retention` ON `realtime_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `relation_target` ON `related_items` (`target_id`);--> statement-breakpoint
CREATE INDEX `resource_grants_workspace_index` ON `resource_grants` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `saved_search_user` ON `saved_searches` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_index` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_index` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `workspace_activity_workspace_index` ON `workspace_activity` (`workspace_id`,`id`);--> statement-breakpoint
CREATE INDEX `workspace_members_user_index` ON `workspace_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `workspace_members_email_index` ON `workspace_members` (`email`);--> statement-breakpoint
CREATE INDEX `workspace_templates_workspace` ON `workspace_templates` (`workspace_id`);