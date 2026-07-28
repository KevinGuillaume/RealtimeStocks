import { useEffect, useRef } from "react";
import { CandlestickSeries, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { useStockStore } from "../store/stockStore";
import { API_URL } from "../config";
import { formatPrice } from "../utilities/format";

interface HistoricalBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartProps {
  symbol: string;
}

export function Chart({ symbol }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const latestBar = useStockStore((state) => state.symbols[symbol]?.bar);
  const symbolState = useStockStore((state) => state.symbols[symbol]);
  const referencePrice = useStockStore((state) => state.referencePrices[symbol]);

  const price = symbolState?.trade?.price ?? symbolState?.bar?.close ?? symbolState?.quote?.ask_price;
  const change =
    price !== undefined && referencePrice ? ((price - referencePrice) / referencePrice) * 100 : undefined;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#020617" }, textColor: "#cbd5e1" },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
      width: containerRef.current.clientWidth,
      height: 420,
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#f87171",
      borderVisible: false,
      wickUpColor: "#34d399",
      wickDownColor: "#f87171",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    lastTimeRef.current = null;
    seriesRef.current?.setData([]);

    fetch(`${API_URL}/bars/${symbol}?timeframe=1Min&limit=200`)
      .then((res) => res.json())
      .then((bars: HistoricalBar[]) => {
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
  }, [symbol]);

  useEffect(() => {
    if (!latestBar || !seriesRef.current) return;

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
  }, [latestBar]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      <div className="flex items-baseline gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2">
        <span className="font-mono text-lg tabular-nums text-slate-100">{formatPrice(price)}</span>
        <span
          className={`font-mono text-sm tabular-nums ${
            change === undefined ? "text-slate-500" : change >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {change === undefined ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
        </span>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
