CREATE TABLE `ai_conversation_messages` (
	`id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`role` varchar(12) NOT NULL,
	`content` longtext NOT NULL,
	`sources` json NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_conversation_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_conversations` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`title` varchar(120) NOT NULL,
	`revision` int NOT NULL DEFAULT 0,
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_templates` (
	`id` varchar(36) NOT NULL,
	`workspace_id` varchar(36) NOT NULL,
	`source_page_id` varchar(36) NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` varchar(500) NOT NULL,
	`icon` varchar(32) NOT NULL,
	`content` longtext NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notifications` ADD `thread_id` varchar(36);--> statement-breakpoint
ALTER TABLE `pages` ADD `archived_at` timestamp;--> statement-breakpoint
ALTER TABLE `ai_conversation_messages` ADD CONSTRAINT `ai_conversation_messages_conversation_id_ai_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_conversations` ADD CONSTRAINT `ai_conversations_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_conversations` ADD CONSTRAINT `ai_conversations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_templates` ADD CONSTRAINT `workspace_templates_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_templates` ADD CONSTRAINT `workspace_templates_source_page_id_pages_id_fk` FOREIGN KEY (`source_page_id`) REFERENCES `pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `conversation_message_order` ON `ai_conversation_messages` (`conversation_id`,`id`);--> statement-breakpoint
CREATE INDEX `conversations_owner_time` ON `ai_conversations` (`user_id`,`workspace_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `workspace_templates_workspace` ON `workspace_templates` (`workspace_id`);