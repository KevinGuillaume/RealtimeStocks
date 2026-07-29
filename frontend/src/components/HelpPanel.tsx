import { useState } from "react";
import { getStoredInstructionsOpen, setStoredInstructionsOpen } from "../utilities/storage";

export function HelpPanel() {
  const [open, setOpen] = useState(getStoredInstructionsOpen);

  const toggle = (event: React.SyntheticEvent<HTMLDetailsElement>) => {
    const next = event.currentTarget.open;
    setOpen(next);
    setStoredInstructionsOpen(next);
  };

  return (
    <details
      open={open}
      onToggle={toggle}
      className="shrink-0 border-b border-[var(--stx-divider)] bg-[var(--stx-surface)] px-4"
    >
      <summary className="cursor-pointer select-none list-none py-2 text-sm font-medium text-[var(--stx-text-dim)] hover:text-[var(--stx-text)]">
        <span className="inline-block w-3 transition-transform [details[open]_&]:rotate-90">›</span> How to use
        this
      </summary>
      <ul className="list-disc space-y-1 py-2.5 pl-6 text-sm text-[var(--stx-text-dim)]">
        <li>
          Add a ticker with the <strong className="text-[var(--stx-text)]">+</strong> field in the bottom-left,
          it's checked against real price data before it's added.
        </li>
        <li>Click a symbol in the watchlist to load its chart and set it as the active symbol for new alerts.</li>
        <li>
          <strong className="text-[var(--stx-text)]">Last</strong> and{" "}
          <strong className="text-[var(--stx-text)]">Chg%</strong> update live while the market's open; Chg% is
          relative to that day's opening price.
        </li>
        <li>
          Create an alert on the right for a price crossing a threshold or moving a % from baseline, it fires once,
          then deactivates.
        </li>
        <li>
          Optional: connect a Slack webhook (see the warning banner if it's missing) to also get alert
          notifications there.
        </li>
      </ul>
    </details>
  );
}
