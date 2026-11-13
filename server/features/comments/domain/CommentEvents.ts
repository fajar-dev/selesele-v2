/** Signals committed changes to connected item viewers. */
export interface CommentEvents {
  commentsChanged(itemId: string): Promise<void>
}
