export type ImageExtension = 'png' | 'jpg' | 'gif' | 'webp'
export interface ImageStore {
  write(data: Uint8Array, extension: ImageExtension): Promise<string>
  size(filename: string): Promise<number | null>
  read(filename: string): Promise<Uint8Array | null>
}
