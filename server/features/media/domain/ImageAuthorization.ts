export interface ImageAuthorization {
  register(filename: string, userId: string, itemId: string): Promise<void>
  canUpload(itemId: string, userId: string): Promise<boolean>
  canRead(filename: string, userId: string): Promise<boolean>
}
