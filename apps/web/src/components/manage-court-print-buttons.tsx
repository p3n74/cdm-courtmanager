import { Button } from "@cdm-pickleball/ui/components/button";
import { Printer } from "lucide-react";

/** Set on `<html>` while printing from manage courts so CSS can show tennis or pickleball only. */
export const MANAGE_PRINT_SCOPE_ATTR = "data-manage-print-scope";

export type ManageCourtPrintSport = "tennis" | "pickleball";

export function beginManageCourtPrint(sport: ManageCourtPrintSport) {
  document.documentElement.setAttribute(MANAGE_PRINT_SCOPE_ATTR, sport);
  requestAnimationFrame(() => window.print());
}

/** Clears scoped print attribute (also run on window `afterprint`). */
export function clearManageCourtPrintScope() {
  document.documentElement.removeAttribute(MANAGE_PRINT_SCOPE_ATTR);
}

export function ManageCourtPrintTennisButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2 print:hidden"
      aria-label="Print tennis court schedule for this date, or save as PDF"
      onClick={() => beginManageCourtPrint("tennis")}
    >
      <Printer className="size-4 shrink-0" aria-hidden />
      Print tennis
    </Button>
  );
}

export function ManageCourtPrintPickleballButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2 print:hidden"
      aria-label="Print pickleball court schedule for this date, or save as PDF"
      onClick={() => beginManageCourtPrint("pickleball")}
    >
      <Printer className="size-4 shrink-0" aria-hidden />
      Print pickleball
    </Button>
  );
}
