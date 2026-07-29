import { dismissAlertEvent as dismissAlertEventAction } from "../store/alertsSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { formatPrice } from "../utilities/format";

export function AlertToast() {
  const alertEvents = useAppSelector((state) => state.alerts.alertEvents);
  const dispatch = useAppDispatch();

  if (alertEvents.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex w-72 flex-col gap-2">
      {alertEvents.map((event, index) => (
        <div
          key={`${event.alert_id}-${event.timestamp}`}
          className="flex items-start justify-between gap-2 rounded-lg border border-[var(--stx-accent)]/40 bg-[var(--stx-surface)] px-4 py-3 text-sm shadow-lg"
        >
          <span className="text-[var(--stx-text)]">
            <strong>{event.symbol}</strong> {event.condition.replace("_", " ")} {formatPrice(event.threshold)} —
            now {formatPrice(event.price)}
          </span>
          <button
            type="button"
            onClick={() => dispatch(dismissAlertEventAction(index))}
            className="shrink-0 text-[var(--stx-text-dim)] hover:text-[var(--stx-text)]"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
