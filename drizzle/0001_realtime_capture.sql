INSERT INTO realtime_clock (id, sequence) VALUES ('global', 0);
--> statement-breakpoint
CREATE TRIGGER capture_workspaces_insert AFTER INSERT ON workspaces FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.id, NULL, 'workspaces');INSERT INTO realtime_events (id, workspace_id, user_id, topic) SELECT UUID(), NEW.id, user_id, 'workspaces' FROM workspace_members WHERE workspace_id = NEW.id AND user_id IS NOT NULL; END;
--> statement-breakpoint
CREATE TRIGGER capture_workspaces_update AFTER UPDATE ON workspaces FOR EACH ROW BEGIN IF NOT (NEW.name <=> OLD.name) OR NOT (NEW.description <=> OLD.description) OR NOT (NEW.icon <=> OLD.icon) OR NOT (NEW.deleted_at <=> OLD.deleted_at) OR NOT (NEW.archived_at <=> OLD.archived_at) OR NOT (NEW.settings <=> OLD.settings) THEN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.id, NULL, 'workspaces');INSERT INTO realtime_events (id, workspace_id, user_id, topic) SELECT UUID(), NEW.id, user_id, 'workspaces' FROM workspace_members WHERE workspace_id = NEW.id AND user_id IS NOT NULL; END IF; END;
--> statement-breakpoint
CREATE TRIGGER capture_workspaces_delete BEFORE DELETE ON workspaces FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), OLD.id, NULL, 'workspaces');INSERT INTO realtime_events (id, workspace_id, user_id, topic) SELECT UUID(), OLD.id, user_id, 'workspaces' FROM workspace_members WHERE workspace_id = OLD.id AND user_id IS NOT NULL; END;
--> statement-breakpoint
CREATE TRIGGER capture_folders_insert AFTER INSERT ON folders FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'folders'); END;
--> statement-breakpoint
CREATE TRIGGER capture_folders_update AFTER UPDATE ON folders FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'folders'); END;
--> statement-breakpoint
CREATE TRIGGER capture_folders_delete BEFORE DELETE ON folders FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), OLD.workspace_id, NULL, 'folders'); END;
--> statement-breakpoint
CREATE TRIGGER capture_items_insert AFTER INSERT ON items FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'items'); END;
--> statement-breakpoint
CREATE TRIGGER capture_items_update AFTER UPDATE ON items FOR EACH ROW BEGIN IF NOT (NEW.title <=> OLD.title) OR NOT (NEW.description <=> OLD.description) OR NOT (NEW.icon <=> OLD.icon) OR NOT (NEW.folder_id <=> OLD.folder_id) OR NOT (NEW.access_mode <=> OLD.access_mode) OR NOT (NEW.archived_at <=> OLD.archived_at) OR NOT (NEW.deleted_at <=> OLD.deleted_at) THEN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'items'); END IF; END;
--> statement-breakpoint
CREATE TRIGGER capture_items_delete BEFORE DELETE ON items FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), OLD.workspace_id, NULL, 'items'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_documents_insert AFTER INSERT ON item_documents FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'content'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_documents_update AFTER UPDATE ON item_documents FOR EACH ROW BEGIN IF NOT (NEW.markdown <=> OLD.markdown) OR NOT (NEW.state <=> OLD.state) THEN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'content'); END IF; END;
--> statement-breakpoint
CREATE TRIGGER capture_item_documents_delete BEFORE DELETE ON item_documents FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = OLD.item_id), NULL, 'content'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_canvases_insert AFTER INSERT ON item_canvases FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'content'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_canvases_update AFTER UPDATE ON item_canvases FOR EACH ROW BEGIN IF NOT (NEW.revision <=> OLD.revision) THEN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'content'); END IF; END;
--> statement-breakpoint
CREATE TRIGGER capture_item_canvases_delete BEFORE DELETE ON item_canvases FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = OLD.item_id), NULL, 'content'); END;
--> statement-breakpoint
CREATE TRIGGER capture_comment_threads_insert AFTER INSERT ON comment_threads FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'comments'); END;
--> statement-breakpoint
CREATE TRIGGER capture_comment_threads_update AFTER UPDATE ON comment_threads FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'comments'); END;
--> statement-breakpoint
CREATE TRIGGER capture_comment_threads_delete BEFORE DELETE ON comment_threads FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = OLD.item_id), NULL, 'comments'); END;
--> statement-breakpoint
CREATE TRIGGER capture_comments_insert AFTER INSERT ON comments FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT i.workspace_id FROM items i JOIN comment_threads t ON t.item_id = i.id WHERE t.id = NEW.thread_id), NULL, 'comments'); END;
--> statement-breakpoint
CREATE TRIGGER capture_comments_update AFTER UPDATE ON comments FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT i.workspace_id FROM items i JOIN comment_threads t ON t.item_id = i.id WHERE t.id = NEW.thread_id), NULL, 'comments'); END;
--> statement-breakpoint
CREATE TRIGGER capture_comments_delete BEFORE DELETE ON comments FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT i.workspace_id FROM items i JOIN comment_threads t ON t.item_id = i.id WHERE t.id = OLD.thread_id), NULL, 'comments'); END;
--> statement-breakpoint
CREATE TRIGGER capture_workspace_members_insert AFTER INSERT ON workspace_members FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'members');INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NEW.user_id, 'access'); END;
--> statement-breakpoint
CREATE TRIGGER capture_workspace_members_update AFTER UPDATE ON workspace_members FOR EACH ROW BEGIN IF NOT (NEW.user_id <=> OLD.user_id) OR NOT (NEW.email <=> OLD.email) OR NOT (NEW.role <=> OLD.role) OR NOT (NEW.suspended_at <=> OLD.suspended_at) THEN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'members');INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NEW.user_id, 'access'); END IF; END;
--> statement-breakpoint
CREATE TRIGGER capture_workspace_members_delete BEFORE DELETE ON workspace_members FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), OLD.workspace_id, NULL, 'members');INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), OLD.workspace_id, OLD.user_id, 'access'); END;
--> statement-breakpoint
CREATE TRIGGER capture_member_groups_insert AFTER INSERT ON member_groups FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'groups'); END;
--> statement-breakpoint
CREATE TRIGGER capture_member_groups_update AFTER UPDATE ON member_groups FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'groups'); END;
--> statement-breakpoint
CREATE TRIGGER capture_member_groups_delete BEFORE DELETE ON member_groups FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), OLD.workspace_id, NULL, 'groups'); END;
--> statement-breakpoint
CREATE TRIGGER capture_member_group_members_insert AFTER INSERT ON member_group_members FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM workspace_members WHERE id = NEW.member_id), NULL, 'groups'); END;
--> statement-breakpoint
CREATE TRIGGER capture_member_group_members_update AFTER UPDATE ON member_group_members FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM workspace_members WHERE id = NEW.member_id), NULL, 'groups'); END;
--> statement-breakpoint
CREATE TRIGGER capture_member_group_members_delete BEFORE DELETE ON member_group_members FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM workspace_members WHERE id = OLD.member_id), NULL, 'groups'); END;
--> statement-breakpoint
CREATE TRIGGER capture_resource_grants_insert AFTER INSERT ON resource_grants FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'access'); END;
--> statement-breakpoint
CREATE TRIGGER capture_resource_grants_update AFTER UPDATE ON resource_grants FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'access'); END;
--> statement-breakpoint
CREATE TRIGGER capture_resource_grants_delete BEFORE DELETE ON resource_grants FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), OLD.workspace_id, NULL, 'access'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_preferences_insert AFTER INSERT ON item_preferences FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, NEW.user_id, 'library'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_preferences_update AFTER UPDATE ON item_preferences FOR EACH ROW BEGIN IF NOT (NEW.favorite_at <=> OLD.favorite_at) OR NOT (NEW.visited_at <=> OLD.visited_at) THEN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, NEW.user_id, 'library'); END IF; END;
--> statement-breakpoint
CREATE TRIGGER capture_item_preferences_delete BEFORE DELETE ON item_preferences FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, OLD.user_id, 'library'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_links_insert AFTER INSERT ON item_links FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.source_id), NULL, 'relations'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_links_update AFTER UPDATE ON item_links FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.source_id), NULL, 'relations'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_links_delete BEFORE DELETE ON item_links FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = OLD.source_id), NULL, 'relations'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_versions_insert AFTER INSERT ON item_versions FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'versions'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_versions_update AFTER UPDATE ON item_versions FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'versions'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_versions_delete BEFORE DELETE ON item_versions FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = OLD.item_id), NULL, 'versions'); END;
--> statement-breakpoint
CREATE TRIGGER capture_notifications_insert AFTER INSERT ON notifications FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, NEW.user_id, 'notifications'); END;
--> statement-breakpoint
CREATE TRIGGER capture_notifications_update AFTER UPDATE ON notifications FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, NEW.user_id, 'notifications'); END;
--> statement-breakpoint
CREATE TRIGGER capture_notifications_delete BEFORE DELETE ON notifications FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, OLD.user_id, 'notifications'); END;
--> statement-breakpoint
CREATE TRIGGER capture_workspace_activity_insert AFTER INSERT ON workspace_activity FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'activity'); END;
--> statement-breakpoint
CREATE TRIGGER capture_workspace_activity_update AFTER UPDATE ON workspace_activity FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'activity'); END;
--> statement-breakpoint
CREATE TRIGGER capture_workspace_activity_delete BEFORE DELETE ON workspace_activity FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), OLD.workspace_id, NULL, 'activity'); END;
--> statement-breakpoint
CREATE TRIGGER capture_workspace_templates_insert AFTER INSERT ON workspace_templates FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'templates'); END;
--> statement-breakpoint
CREATE TRIGGER capture_workspace_templates_update AFTER UPDATE ON workspace_templates FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NULL, 'templates'); END;
--> statement-breakpoint
CREATE TRIGGER capture_workspace_templates_delete BEFORE DELETE ON workspace_templates FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), OLD.workspace_id, NULL, 'templates'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_attachments_insert AFTER INSERT ON item_attachments FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'attachments'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_attachments_update AFTER UPDATE ON item_attachments FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'attachments'); END;
--> statement-breakpoint
CREATE TRIGGER capture_item_attachments_delete BEFORE DELETE ON item_attachments FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = OLD.item_id), NULL, 'attachments'); END;
--> statement-breakpoint
CREATE TRIGGER capture_related_items_insert AFTER INSERT ON related_items FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.source_id), NULL, 'relations');INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.target_id), NULL, 'relations'); END;
--> statement-breakpoint
CREATE TRIGGER capture_related_items_update AFTER UPDATE ON related_items FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.source_id), NULL, 'relations');INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.target_id), NULL, 'relations'); END;
--> statement-breakpoint
CREATE TRIGGER capture_related_items_delete BEFORE DELETE ON related_items FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = OLD.source_id), NULL, 'relations');INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = OLD.target_id), NULL, 'relations'); END;
--> statement-breakpoint
CREATE TRIGGER capture_saved_searches_insert AFTER INSERT ON saved_searches FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, NEW.user_id, 'library'); END;
--> statement-breakpoint
CREATE TRIGGER capture_saved_searches_update AFTER UPDATE ON saved_searches FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, NEW.user_id, 'library'); END;
--> statement-breakpoint
CREATE TRIGGER capture_saved_searches_delete BEFORE DELETE ON saved_searches FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, OLD.user_id, 'library'); END;
--> statement-breakpoint
CREATE TRIGGER capture_conversations_insert AFTER INSERT ON conversations FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NEW.user_id, 'conversations'); END;
--> statement-breakpoint
CREATE TRIGGER capture_conversations_update AFTER UPDATE ON conversations FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NEW.user_id, 'conversations'); END;
--> statement-breakpoint
CREATE TRIGGER capture_conversations_delete BEFORE DELETE ON conversations FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), OLD.workspace_id, OLD.user_id, 'conversations'); END;
--> statement-breakpoint
CREATE TRIGGER capture_conversation_messages_insert AFTER INSERT ON conversation_messages FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM conversations WHERE id = NEW.conversation_id), (SELECT user_id FROM conversations WHERE id = NEW.conversation_id), 'conversations'); END;
--> statement-breakpoint
CREATE TRIGGER capture_conversation_messages_update AFTER UPDATE ON conversation_messages FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM conversations WHERE id = NEW.conversation_id), (SELECT user_id FROM conversations WHERE id = NEW.conversation_id), 'conversations'); END;
--> statement-breakpoint
CREATE TRIGGER capture_conversation_messages_delete BEFORE DELETE ON conversation_messages FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM conversations WHERE id = OLD.conversation_id), (SELECT user_id FROM conversations WHERE id = OLD.conversation_id), 'conversations'); END;
--> statement-breakpoint
CREATE TRIGGER capture_document_presence_insert AFTER INSERT ON document_presence FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'presence'); END;
--> statement-breakpoint
CREATE TRIGGER capture_document_presence_update AFTER UPDATE ON document_presence FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'presence'); END;
--> statement-breakpoint
CREATE TRIGGER capture_document_presence_delete BEFORE DELETE ON document_presence FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = OLD.item_id), NULL, 'presence'); END;
--> statement-breakpoint
CREATE TRIGGER capture_canvas_presence_insert AFTER INSERT ON canvas_presence FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'presence'); END;
--> statement-breakpoint
CREATE TRIGGER capture_canvas_presence_update AFTER UPDATE ON canvas_presence FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = NEW.item_id), NULL, 'presence'); END;
--> statement-breakpoint
CREATE TRIGGER capture_canvas_presence_delete BEFORE DELETE ON canvas_presence FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), (SELECT workspace_id FROM items WHERE id = OLD.item_id), NULL, 'presence'); END;
--> statement-breakpoint
CREATE TRIGGER capture_users_insert AFTER INSERT ON users FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, NEW.id, 'session');INSERT INTO realtime_events (id, workspace_id, user_id, topic) SELECT UUID(), workspace_id, NULL, 'members' FROM workspace_members WHERE user_id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER capture_users_update AFTER UPDATE ON users FOR EACH ROW BEGIN IF NOT (NEW.name <=> OLD.name) OR NOT (NEW.email <=> OLD.email) OR NOT (NEW.avatar <=> OLD.avatar) OR NOT (NEW.is_active <=> OLD.is_active) OR NOT (NEW.invitation_email <=> OLD.invitation_email) THEN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, NEW.id, 'session');INSERT INTO realtime_events (id, workspace_id, user_id, topic) SELECT UUID(), workspace_id, NULL, 'members' FROM workspace_members WHERE user_id = NEW.id; END IF; END;
--> statement-breakpoint
CREATE TRIGGER capture_users_delete BEFORE DELETE ON users FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, OLD.id, 'session');INSERT INTO realtime_events (id, workspace_id, user_id, topic) SELECT UUID(), workspace_id, NULL, 'members' FROM workspace_members WHERE user_id = OLD.id; END;
--> statement-breakpoint
CREATE TRIGGER capture_sessions_insert AFTER INSERT ON sessions FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, NEW.user_id, 'session'); END;
--> statement-breakpoint
CREATE TRIGGER capture_sessions_update AFTER UPDATE ON sessions FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, NEW.user_id, 'session'); END;
--> statement-breakpoint
CREATE TRIGGER capture_sessions_delete BEFORE DELETE ON sessions FOR EACH ROW BEGIN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NULL, OLD.user_id, 'session'); END;
--> statement-breakpoint
CREATE TRIGGER capture_member_preferences AFTER UPDATE ON workspace_members FOR EACH ROW BEGIN IF NOT (NEW.notifications <=> OLD.notifications) THEN INSERT INTO realtime_events (id, workspace_id, user_id, topic) VALUES (UUID(), NEW.workspace_id, NEW.user_id, 'settings'); END IF; END;
