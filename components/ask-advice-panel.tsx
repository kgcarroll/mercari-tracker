import type { AskAdvice } from "@/lib/ask";
import { formatMoney } from "@/lib/format";

const actionCopy: Record<AskAdvice["action"], string> = {
  relist: "List solo",
  bundle: "Bundle instead",
  hold: "Hold",
  drop: "Drop price",
};

export function AskAdvicePanel({ advice }: { advice: AskAdvice }) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Suggested ask</p>
        <p className="text-xs text-muted-foreground">{actionCopy[advice.action]}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{advice.label}</p>
          <p className="font-medium">{formatMoney(advice.ask)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Floor</p>
          <p className="font-medium">{formatMoney(advice.floor)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Profit at ask</p>
          <p className="font-medium">{formatMoney(advice.profitAtAsk)}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{advice.reason}</p>
      <p className="text-xs text-muted-foreground">
        Copy the suggested ask onto Mercari. Leave sale price at 0 here until it sells.
      </p>
    </div>
  );
}
