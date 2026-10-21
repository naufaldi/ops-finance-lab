import type { ClaimDeps } from "./ports";

export type ChangeStatusResult = { ok: true } | { ok: false; error: string };

// Hanya klaim submitted yang berubah. Hak admin ditegakkan di interface.
export async function changeStatus({ repo }: Pick<ClaimDeps, "repo">, input: { id: number; status: string }): Promise<ChangeStatusResult> {
  if (input.status !== "approved" && input.status !== "rejected") return { ok: false, error: "status tidak valid" };
  await repo.setStatusIfSubmitted(input.id, input.status);
  return { ok: true };
}
