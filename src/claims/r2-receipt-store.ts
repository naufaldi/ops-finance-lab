// Infra: foto struk di R2.
import type { ReceiptStore } from "./ports";

export class R2ReceiptStore implements ReceiptStore {
  constructor(private readonly bucket: R2Bucket) {}

  async put(key: string, body: ArrayBuffer, contentType: string) {
    await this.bucket.put(key, body, { httpMetadata: { contentType } });
  }

  async get(key: string) {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    return { body: obj.body, contentType: obj.httpMetadata?.contentType ?? "application/octet-stream" };
  }

  async delete(key: string) {
    await this.bucket.delete(key);
  }
}
