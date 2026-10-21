export const CATEGORIES = ["transport", "hotel", "makan_klien", "lainnya"] as const;
export type Category = (typeof CATEGORIES)[number];

export type ClaimStatus = "submitted" | "approved" | "rejected";

export type ClaimInput = {
  category: Category;
  amount: number;
  claim_date: string;
  merchant: string;
  note: string;
};

// Satu baris tabel claims.
export type Claim = ClaimInput & {
  id: number;
  user_id: number;
  receipt_key: string | null;
  status: ClaimStatus;
  created_at: string;
};
