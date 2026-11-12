export interface EmailProcessor {
  deliverNext(): Promise<boolean>
}
