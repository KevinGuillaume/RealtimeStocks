import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { fetchBars } from "../api/bars";
import { useAppSelector } from "../store/hooks";
import { formatPrice } from "../utilities/format";

// lightweight-charts formats its time axis in UTC by default, regardless of
// the browser's timezone — these render every tick/crosshair label in local
// time instead, using the same UTC-seconds `time` values already in use.
function localTickFormatter(time: UTCTimestamp, tickMarkType: TickMarkType): string {
  const date = new Date(time * 1000);
  switch (tickMarkType) {
    case TickMarkType.Year:
      return date.toLocaleDateString([], { year: "numeric" });
    case TickMarkType.Month:
      return date.toLocaleDateString([], { month: "short" });
    case TickMarkType.DayOfMonth:
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    default:
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

function localCrosshairFormatter(time: UTCTimestamp): string {
  return new Date(time * 1000).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

interface ChartProps {
  symbol: string;
}

const TIMEFRAMES = [
  { key: "1D", timeframe: "1Min", limit: 390, live: true },
  { key: "1W", timeframe: "15Min", limit: 130, live: false },
  { key: "1M", timeframe: "1Day", limit: 22, live: false },
  { key: "1Y", timeframe: "1Week", limit: 52, live: false },
] as const;

type TimeframeKey = (typeof TIMEFRAMES)[number]["key"];

export function Chart({ symbol }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [timeframeKey, setTimeframeKey] = useState<TimeframeKey>("1D");
  const timeframe = TIMEFRAMES.find((tf) => tf.key === timeframeKey)!;

  const latestBar = useAppSelector((state) => state.marketData.symbols[symbol]?.bar);
  const symbolState = useAppSelector((state) => state.marketData.symbols[symbol]);
  const referencePrice = useAppSelector((state) => state.watchlist.referencePrices[symbol]);

  const price = symbolState?.trade?.price ?? symbolState?.bar?.close ?? symbolState?.quote?.ask_price;
  const change =
    price !== undefined && referencePrice ? ((price - referencePrice) / referencePrice) * 100 : undefined;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#14151f" }, textColor: "#b2b6ca" },
      grid: { vertLines: { color: "rgba(233,233,237,0.06)" }, horzLines: { color: "rgba(233,233,237,0.06)" } },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      localization: { timeFormatter: localCrosshairFormatter },
      timeScale: { timeVisible: true, secondsVisible: false, tickMarkFormatter: localTickFormatter },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#7fd4a8",
      downColor: "#e28b8b",
      borderVisible: false,
      wickUpColor: "#7fd4a8",
      wickDownColor: "#e28b8b",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    };
    window.addEventListener("resize", handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    lastTimeRef.current = null;
    seriesRef.current?.setData([]);

    fetchBars(symbol, timeframe.timeframe, timeframe.limit)
      .then((bars) => {
        if (cancelled || !seriesRef.current) return;
        seriesRef.current.setData(
          bars.map((bar) => ({
            time: bar.time as UTCTimestamp,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          })),
        );
        if (bars.length > 0) {
          lastTimeRef.current = bars[bars.length - 1].time;
        }
        chartRef.current?.timeScale().fitContent();
      })
      .catch(() => {
        if (!cancelled) seriesRef.current?.setData([]);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe.timeframe, timeframe.limit]);

  useEffect(() => {
    if (!timeframe.live || !latestBar || !seriesRef.current) return;

    const time = Math.floor(new Date(latestBar.timestamp).getTime() / 1000);
    if (lastTimeRef.current !== null && time < lastTimeRef.current) return;
    lastTimeRef.current = time;

    seriesRef.current.update({
      time: time as UTCTimestamp,
      open: latestBar.open,
      high: latestBar.high,
      low: latestBar.low,
      close: latestBar.close,
    });
  }, [latestBar, timeframe.live]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[var(--stx-divider)] bg-[var(--stx-surface)]">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--stx-divider)] px-4 py-2.5">
        <span className="text-sm font-medium">{symbol}</span>
        <div className="ml-auto flex overflow-hidden rounded-md border border-[var(--stx-divider)]">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              type="button"
              onClick={() => setTimeframeKey(tf.key)}
              className={`border-l border-[var(--stx-divider)] px-2.5 py-1 text-xs first:border-l-0 ${
                tf.key === timeframeKey
                  ? "text-[var(--stx-accent)] shadow-[inset_0_0_0_1px_var(--stx-accent)]"
                  : "text-[var(--stx-text-dim)] hover:bg-white/[0.04]"
              }`}
            >
              {tf.key}
            </button>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-baseline gap-2 px-4 py-2.5">
        <span className="font-mono text-lg tabular-nums">{formatPrice(price)}</span>
        <span
          className={`font-mono text-sm tabular-nums ${
            change === undefined ? "text-[var(--stx-text-dim)]" : change >= 0 ? "text-[var(--stx-up)]" : "text-[var(--stx-down)]"
          }`}
        >
          {change === undefined ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
        </span>
      </div>
      <div ref={containerRef} className="min-h-0 w-full flex-1" />
    </div>
  );
}
