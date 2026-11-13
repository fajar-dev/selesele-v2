export interface ImageAuthorization {
  register(filename: string, userId: string, pageId: string): Promise<void>
  canUpload(pageId: string, userId: string): Promise<boolean>
  canRead(filename: string, userId: string): Promise<boolean>
}
