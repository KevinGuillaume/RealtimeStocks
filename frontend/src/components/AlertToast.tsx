import { useEffect } from "react";
import { dismissAlertEvent as dismissAlertEventAction } from "../store/alertsSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { formatPrice } from "../utilities/format";

const AUTO_DISMISS_MS = 6000;

export function AlertToast() {
  const alertEvents = useAppSelector((state) => state.alerts.alertEvents);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (alertEvents.length === 0) return;
    const timer = setTimeout(() => dispatch(dismissAlertEventAction(0)), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [alertEvents, dispatch]);

  if (alertEvents.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex w-72 flex-col gap-2">
      {alertEvents.map((event, index) => (
        <div
          key={`${event.alert_id}-${event.timestamp}`}
          className="flex items-start justify-between gap-2 rounded-lg border border-emerald-500/40 bg-slate-900 px-4 py-3 text-sm shadow-lg"
        >
          <span className="text-slate-100">
            <strong>{event.symbol}</strong> {event.condition.replace("_", " ")} {formatPrice(event.threshold)} —
            now {formatPrice(event.price)}
          </span>
          <button
            type="button"
            onClick={() => dispatch(dismissAlertEventAction(index))}
            className="shrink-0 text-slate-500 hover:text-slate-300"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
