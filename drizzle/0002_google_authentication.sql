ALTER TABLE `users` MODIFY COLUMN `microsoft_subject` varchar(73);--> statement-breakpoint
ALTER TABLE `users` ADD `google_subject` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_google_subject_unique` UNIQUE(`google_subject`);