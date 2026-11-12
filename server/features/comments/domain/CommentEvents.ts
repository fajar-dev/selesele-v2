/** Signals committed changes to connected page viewers. */
export interface CommentEvents {
  commentsChanged(pageId: string): Promise<void>
}
