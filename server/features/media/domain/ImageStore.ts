export type ImageExtension = 'png' | 'jpg' | 'gif' | 'webp'
export interface ImageStore {
  write(data: Uint8Array, extension: ImageExtension): Promise<string>
  read(filename: string): Promise<Uint8Array | null>
}
