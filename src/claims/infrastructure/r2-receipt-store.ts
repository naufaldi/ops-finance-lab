import type { ReceiptStore } from "../application/ports";

export function r2ReceiptStore(bucket: R2Bucket): ReceiptStore {
  return {
    async put(key, body, contentType) {
      await bucket.put(key, body, { httpMetadata: { contentType } });
    },
    async get(key) {
      const obj = await bucket.get(key);
      return obj ? { body: obj.body, contentType: obj.httpMetadata?.contentType } : null;
    },
    async delete(key) {
      await bucket.delete(key);
    },
  };
}
