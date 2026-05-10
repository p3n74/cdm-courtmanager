/** Subdivision homeowner address for display: Phase N, Block N, Lot N. */
export function formatOwnerAddressTriple(
  phase: number | null | undefined,
  block: number | null | undefined,
  lot: number | null | undefined,
): string | null {
  if (phase == null || block == null || lot == null) {
    return null;
  }
  return `Phase ${phase}, Block ${block}, Lot ${lot}`;
}
