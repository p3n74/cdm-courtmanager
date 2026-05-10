export type HomeownerLotRow = {
  phase: number | null;
  block: number | null;
  lot: number | null;
};

/** Count reservations on the manage-day list that match this phase–block–lot (join must be populated). */
export function countHomeownerReservationsOnManageDay(
  reservations: HomeownerLotRow[],
  homeowner: { phase: number; block: number; lot: number },
): number {
  return reservations.filter(
    (r) => r.phase === homeowner.phase && r.block === homeowner.block && r.lot === homeowner.lot,
  ).length;
}
