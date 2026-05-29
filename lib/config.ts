export const ALLOWED_EMAILS = [
  "blakereagan@gmail.com",
  "amandareagan302@gmail.com",
] as const;

export type Ledger = "blake" | "amanda";

export const LEDGERS: { id: Ledger; label: string }[] = [
  { id: "blake", label: "Blake" },
  { id: "amanda", label: "Amanda" },
];

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (ALLOWED_EMAILS as readonly string[]).includes(email.toLowerCase());
}
