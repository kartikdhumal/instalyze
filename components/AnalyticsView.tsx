"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatChatDate, formatMonthYear, formatHour } from "@/lib/formatDate";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { Bar, BarChart, Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, LabelList } from "recharts";
import { useTheme } from "next-themes";
import type { AnalyticsResult, LabelCount } from "@/lib/analytics";

const CHART_LABEL_MIN_WIDTH = 70;
const CHART_LABEL_MAX_WIDTH = 150;

function chartLabelWidth(items: LabelCount[]): number {
  const longest = items.reduce((max, item) => Math.max(max, item.label.length), 0);
  return Math.min(CHART_LABEL_MAX_WIDTH, Math.max(CHART_LABEL_MIN_WIDTH, longest * 7));
}

function dayCount(days: number): string {
  return days === 1 ? "1 Day" : `${days} Days`;
}

function countLabel(value: unknown, suffix = ""): string {
  if (value === null || value === undefined) return "";
  return Number(value).toLocaleString() + suffix;
}

const PDF_MARGIN_MM = 8;
const PDF_GAP_MM = 4;
const EXPORT_HIDDEN_CLASSES = ["recharts-tooltip-wrapper", "recharts-tooltip-cursor"];

interface CapturedBlock {
  data: string;
  width: number;
  height: number;
}

const isExportVisible = (node: Node): boolean =>
  !(node instanceof HTMLElement || node instanceof SVGElement) ||
  !EXPORT_HIDDEN_CLASSES.some((cls) => (node as Element).classList.contains(cls));

async function captureBlock(block: HTMLElement, isLight: boolean): Promise<CapturedBlock> {
  const bgColor = isLight ? "#f0f4f8" : "#080b0f";
  const data = await toPng(block, { backgroundColor: bgColor, pixelRatio: 2, filter: isExportVisible });
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not prepare the PDF image."));
    img.src = data;
  });
  return { data, width: img.width, height: img.height };
}

function paintPageBackground(pdf: jsPDF, isLight: boolean) {
  const bgRGB: [number, number, number] = isLight ? [240, 244, 248] : [8, 11, 15];
  pdf.setFillColor(...bgRGB);
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), "F");
}

export function AnalyticsView({ data }: { readonly data: AnalyticsResult }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const chartColors = {
    tooltipBg: isLight ? "#ffffff" : "#0f1117",
    tooltipBorder: isLight ? "#c8d0dc" : "#2d3148",
    tooltipText: isLight ? "#1a2030" : "#e2e8f0",
    gridStroke: isLight ? "#dde3ec" : "#2d3148",
    axisTickFill: isLight ? "#5a6478" : "#94a3b8",
    labelFill: isLight ? "#1a2030" : "#e2e8f0",
    labelSecondary: isLight ? "#5a6478" : "#94a3b8",
    cursor: isLight ? "#e2e8f0" : "#252837",
    processingBg: isLight ? "#f4f9fd" : "#161b22",
    processingBorder: isLight ? "#dbe7ef" : "#2d3148",
    processingText: isLight ? "#1a2030" : "#e2e8f0",
    processingSubText: isLight ? "#5a6478" : "#94a3b8",
    series: isLight
      ? ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"]
      : ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
    personPastels: isLight
      ? ["#93c5fd", "#fca5a5", "#86efac", "#fcd34d", "#c4b5fd", "#f9a8d4", "#67e8f9", "#fdba74"]
      : ["#60a5fa", "#f87171", "#4ade80", "#facc15", "#a78bfa", "#f472b6", "#22d3ee", "#fb923c"],
  };

  const seriesColorFor = (label: string, fallbackIndex: number) => {
    const order = data?.userAggregates?.messages?.findIndex((u) => u.label === label) ?? -1;
    const slot = order >= 0 ? order : fallbackIndex;
    return chartColors.series[slot % chartColors.series.length];
  };

  const EMOJI_CHART_COLORS = isLight
    ? ["#f5c542"]
    : ["#fbbf24"];

  const PERSON_CHART_COLORS = isLight
    ? ["#16a34a", "#9f1239"]
    : ["#4ade80", "#f43f5e"];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const exportToPDF = async () => {
    const element = document.getElementById("analytics-export-area");
    if (!element) return;

    setIsExporting(true);


    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const blocks = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-block]"));
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pageWidth - PDF_MARGIN_MM * 2;
      const usableBottom = pageHeight - PDF_MARGIN_MM;
      const columnWidth = (usableWidth - PDF_GAP_MM) / 2;
      let columnTops = [PDF_MARGIN_MM, PDF_MARGIN_MM];

      paintPageBackground(pdf, isLight);

      for (const block of blocks) {
        const captured = await captureBlock(block, isLight);
        const height = Math.min((captured.height * columnWidth) / captured.width, usableBottom - PDF_MARGIN_MM);
        let column = columnTops[0] <= columnTops[1] ? 0 : 1;
        let top = columnTops[column];

        if (top + height > usableBottom) {
          pdf.addPage();
          paintPageBackground(pdf, isLight);
          columnTops = [PDF_MARGIN_MM, PDF_MARGIN_MM];
          column = 0;
          top = PDF_MARGIN_MM;
        }

        const x = column === 0 ? PDF_MARGIN_MM : PDF_MARGIN_MM + columnWidth + PDF_GAP_MM;
        pdf.addImage(captured.data, "PNG", x, top, columnWidth, height);
        columnTops[column] = top + height + PDF_GAP_MM;
      }

      const safeName = data?.chatName
        ? data.chatName.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_").trim() || "chat"
        : "chat";
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${safeName}_${timestamp}.pdf`;

      pdf.save(filename);
      toast.success("PDF downloaded successfully!");
    } catch (err: unknown) {
      console.error("PDF Export Error:", err);
      toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  const renderBarList = (
    title: string,
    items: LabelCount[],
    barColor: string,
    titleColor: string,
    suffix: string = "",
    colorByPerson: boolean = false,
  ) => {
    const hasData = items?.some(item => item.count > 0);
    if (!hasData) return null;
    const validItems = items || [];
    const gradId = "color-" + title.replace(/[^a-zA-Z0-9]/g, '');
    const sliced = validItems.slice(0, 8);

    const maxCount = sliced.reduce((m, item) => Math.max(m, item.count), 0);
    const personColorIdx = (item: LabelCount) =>
      item.count === maxCount ? 0 : 1;

    const chartData = colorByPerson
      ? sliced.map((item) => ({
          ...item,
          fill: isExporting
            ? PERSON_CHART_COLORS[personColorIdx(item)]
            : `url(#${gradId}-p${personColorIdx(item)})`,
        }))
      : sliced;

    return (
      <div data-pdf-block className="bg-card border border-border rounded-xl p-4 mb-6 break-inside-avoid h-fit w-full">
        <h2 className="font-display text-lg font-semibold mb-3 text-foreground tracking-[-0.3px]">
          {title}
        </h2>
        <div style={{ height: `${Math.max(60, Math.min(validItems.length, 8) * 35)}px` }} className="w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
              <defs>
                {colorByPerson && !isExporting && [0, 1].map((colorIdx) => {
                  const c = PERSON_CHART_COLORS[colorIdx];
                  return (
                    <linearGradient key={colorIdx} id={`${gradId}-p${colorIdx}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor={c} stopOpacity={isLight ? 0.75 : 1} />
                      <stop offset="95%" stopColor={c} stopOpacity={isLight ? 0.28 : 0.65} />
                    </linearGradient>
                  );
                })}
                {!colorByPerson && (
                  <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="5%" stopColor={barColor} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={titleColor} stopOpacity={0.4} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={chartColors.gridStroke} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="label"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: chartColors.axisTickFill, fontSize: 12, fontWeight: 500 }}
                width={chartLabelWidth(validItems)}
              />
              <RechartsTooltip
                contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder, color: chartColors.tooltipText, borderRadius: '8px' }}
                itemStyle={{ color: colorByPerson ? chartColors.tooltipText : barColor, fontWeight: 'bold' }}
                cursor={{ fill: chartColors.cursor, opacity: 0.5 }}
                formatter={(val) => val !== undefined && val !== null ? Number(val).toLocaleString() + suffix : "0" + suffix}
              />
              <Bar
                dataKey="count"
                fill={colorByPerson ? PERSON_CHART_COLORS[0] : (isExporting ? barColor : `url(#${gradId})`)}
                radius={[0, 4, 4, 0]}
                barSize={20}
                isAnimationActive={!isExporting}
                animationDuration={1500}
              >
                <LabelList
                  dataKey="count"
                  position="right"
                  fill={chartColors.labelFill}
                  fontSize={12}
                  formatter={(value: unknown) => countLabel(value, suffix)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderPersonBarList = (
    title: string,
    items: LabelCount[],
    suffix: string = "",
  ) => renderBarList(title, items, "", "", suffix, true);

  const isGroupChat = data?.userAggregates?.messages?.length > 2;

  const funCardCount = data?.funAnalytics
    ? 2
      + (isGroupChat ? 2 : 0)
      + ((data.funAnalytics.silentSince?.days ?? 0) > 0 ? 1 : 0)
      + ((data.funAnalytics.longestInactivePeriod?.days ?? 0) > 0 ? 1 : 0)
    : 0;
  const funGridCols: Record<number, string> = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-1 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-1 md:grid-cols-3 lg:grid-cols-6",
  };

  const top10DaysData = data?.top10MostActiveDays
    ? data.top10MostActiveDays.map(d => ({
      date: formatChatDate(d.label),
      messages: d.count
    }))
    : [];

  const monthlyTimelineData = data?.monthlyStats
    ? data.monthlyStats.map(m => ({
      month: formatMonthYear(m.label),
      messages: m.count
    }))
    : [];

  const yearLabelMonths = new Set<string>();
  {
    let lastYear = '';
    for (const d of monthlyTimelineData) {
      const yr = d.month.split(' ')[1];
      if (yr && yr !== lastYear) { yearLabelMonths.add(d.month); lastYear = yr; }
    }
  }

  let timelineTicks: string[] | undefined = undefined;
  if (monthlyTimelineData.length > 0) {
    const total = monthlyTimelineData.length;
    if (total > 24) {
      if (isMobile) {
        // Crowded mobile view shows year-only labels, so emit exactly one
        // tick per year (its first month) to avoid duplicate year labels.
        timelineTicks = Array.from(yearLabelMonths);
      } else {
        const ticks: string[] = [];
        const step = 4;
        for (let i = 0; i < total; i += step) {
          ticks.push(monthlyTimelineData[i].month);
        }
        if (ticks[ticks.length - 1] !== monthlyTimelineData[total - 1].month) {
          ticks[ticks.length - 1] = monthlyTimelineData[total - 1].month;
        }
        timelineTicks = ticks;
      }
    } else {
      if (isMobile) {
        if (total <= 6) {
          timelineTicks = monthlyTimelineData.map(d => d.month);
        } else {
          const ticks: string[] = [];
          const numTicks = 5;
          const step = Math.max(1, Math.floor((total - 1) / (numTicks - 1)));
          for (let i = 0; i < total; i += step) {
            ticks.push(monthlyTimelineData[i].month);
          }
          if (ticks[ticks.length - 1] !== monthlyTimelineData[total - 1].month) {
            ticks[ticks.length - 1] = monthlyTimelineData[total - 1].month;
          }
          timelineTicks = ticks;
        }
      } else {
        timelineTicks = monthlyTimelineData.map(d => d.month);
      }
    }
  }

  const tickYearLabels = new Set<string>();
  {
    let previousYear = '';
    for (const tick of timelineTicks ?? []) {
      const yr = tick.split(' ')[1];
      if (yr && yr !== previousYear) { tickYearLabels.add(tick); previousYear = yr; }
    }
  }

  const top10WordsData = data?.topWords
    ? [...data.topWords].sort((a, b) => b.count - a.count).slice(0, 10).map(d => ({
      word: d.label,
      count: d.count
    }))
    : [];

  const hourlyChartData = data?.hourlyStats
    ? data.hourlyStats.map(h => ({
      time: formatHour(h.label),
      messages: h.count
    }))
    : [];
  return (
    <div className="bg-background pb-12">
      <div className="container max-w-screen-2xl mx-auto w-full px-4 pt-4 flex justify-end">
          <Button onClick={exportToPDF} disabled={isExporting} variant="outline" className="gap-2 cursor-pointer text-foreground">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Analytics
          </Button>
      </div>
      <main id="analytics-export-area" className="container max-w-screen-2xl mx-auto w-full p-4 md:p-4 mt-2">

        {data.funAnalytics && (
          <div className="mb-6">
            <div className={`grid gap-4 ${funGridCols[funCardCount] ?? "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"}`}>
              <div data-pdf-block className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-3xl mb-2">✍🏻</span>
                <h3 className="font-medium text-sm text-fun-title mb-2">The Essay Writer</h3>
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="text-xl font-extrabold text-fun-value leading-none">
                    {data.funAnalytics.essayWriter.user}
                  </span>
                  {data.funAnalytics.essayWriter.value && (
                    <span className="text-[11px] text-fun-desc leading-tight">
                      Avg. {data.funAnalytics.essayWriter.value}
                    </span>
                  )}
                </div>
              </div>

              {isGroupChat && (
                <>
                  <div data-pdf-block className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl mb-2">👑</span>
                    <h3 className="font-medium text-sm text-fun-title mb-2">Most Active Member</h3>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-xl font-extrabold text-fun-value">
                        {data.userAggregates.messages[0]?.label || "-"}
                      </span>
                    </div>
                  </div>
                  <div data-pdf-block className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl mb-2">😴</span>
                    <h3 className="font-medium text-sm text-fun-title mb-2">Least Active Member</h3>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-xl font-extrabold text-fun-value">
                        {data.userAggregates.messages[data.userAggregates.messages.length - 1]?.label || "-"}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {data.funAnalytics.silentSince && data.funAnalytics.silentSince.days > 0 && (
                <div data-pdf-block className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl mb-2">💤</span>
                  <h3 className="font-medium text-sm text-fun-title mb-2">Silent Since</h3>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-xl font-extrabold text-fun-value leading-none">
                      {dayCount(data.funAnalytics.silentSince.days)}
                    </span>
                    <span className="text-[11px] text-fun-desc leading-tight">
                      Since {data.funAnalytics.silentSince.date}
                    </span>
                  </div>
                </div>
              )}

              <div data-pdf-block className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-3xl mb-2">🗓️</span>
                <h3 className="font-medium text-sm text-fun-title mb-2">Longest Streak</h3>
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="text-xl font-extrabold text-fun-value leading-none">
                    {dayCount(data.funAnalytics.longestStreak)}
                  </span>
                  {data.funAnalytics.longestStreakFrom && (
                    <span className="text-[11px] text-fun-desc leading-tight">
                      {data.funAnalytics.longestStreakFrom} - {data.funAnalytics.longestStreakTo}
                    </span>
                  )}
                </div>
              </div>

              {data.funAnalytics.longestInactivePeriod && data.funAnalytics.longestInactivePeriod.days > 0 && (
                <div data-pdf-block className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl mb-2">⏳</span>
                  <h3 className="font-medium text-sm text-fun-title mb-2">Longest Inactive Period</h3>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-xl font-extrabold text-fun-value leading-none">
                      {dayCount(data.funAnalytics.longestInactivePeriod.days)}
                    </span>
                    <span className="text-[11px] text-fun-desc leading-tight">
                      {data.funAnalytics.longestInactivePeriod.from} - {data.funAnalytics.longestInactivePeriod.to}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {monthlyTimelineData.length > 0 && (
          <div data-pdf-block className="bg-card border border-border rounded-xl p-5 mb-6 break-inside-avoid">
            <h2 className="font-display text-lg font-semibold mb-3 text-foreground tracking-[-0.3px]">
              Chat History Timeline
            </h2>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                <AreaChart data={monthlyTimelineData} margin={{ top: 10, right: 5, left: -5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTimeline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isLight ? "#2a78d6" : "#3987e5"} stopOpacity={isLight ? 0.6 : 0.7} />
                      <stop offset="95%" stopColor={isLight ? "#2a78d6" : "#3987e5"} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.gridStroke} />
                  <XAxis
                    dataKey="month"
                    stroke={chartColors.axisTickFill}
                    tick={{ fill: chartColors.axisTickFill, fontSize: 11 }}
                    tickMargin={12}
                    axisLine={false}
                    tickLine={false}
                    ticks={timelineTicks}
                    interval={isMobile ? "preserveStartEnd" : 0}
                    padding={{ right: 20 }}
                    tickFormatter={(value) => {
                      if (!value) return '';
                      const parts = value.split(' ');
                      if (parts.length < 2) return value;
                      const [month, year] = parts;
                      if (monthlyTimelineData.length > 24 && isMobile) return year;
                      if (tickYearLabels.has(value)) return `${month} '${year.slice(2)}`;
                      return month;
                    }}
                  />
                  <YAxis
                    stroke={chartColors.axisTickFill}
                    tick={{ fill: chartColors.axisTickFill, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => value.toLocaleString()}
                    width={35}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder, color: chartColors.tooltipText, borderRadius: '8px' }}
                    itemStyle={{ color: isLight ? '#2a78d6' : '#3987e5', fontWeight: 'bold' }}
                    cursor={{ stroke: chartColors.cursor, strokeWidth: 2, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    stroke={isLight ? "#2a78d6" : "#3987e5"}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTimeline)"
                    name="Messages"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {data.topEmojisPerUser && data.topEmojisPerUser.length > 0 && (
          <div data-pdf-block className="bg-card border border-border rounded-xl p-5 mb-6 break-inside-avoid">
                <h2 className="font-display text-lg font-semibold mb-3 text-foreground tracking-[-0.3px]">
                  Top emojis by User
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {data.topEmojisPerUser.map((u, i) => {
                    const chartData = u.emojis.slice(0, 7).map(e => ({
                      emoji: e.label,
                      count: e.count
                    }));
                    const color = EMOJI_CHART_COLORS[i % EMOJI_CHART_COLORS.length];
                    const chartHeight = Math.min(Math.max(chartData.length * 44, 80), 280);

                    return (
                      <div key={i} className="flex flex-col p-4 bg-muted/20 rounded-xl border border-border/50">
                        <h3 className="font-bold text-foreground mb-4 border-b border-border/50 pb-2">{u.user}</h3>
                        <div style={{ height: chartHeight }} className="w-full">
                          <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id={`colorEmoji-${i}`} x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="5%" stopColor={color} stopOpacity={isLight ? 0.75 : 1} />
                                  <stop offset="95%" stopColor={color} stopOpacity={isLight ? 0.28 : 0.72} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={chartColors.gridStroke} />
                              <XAxis type="number" hide />
                              <YAxis
                                dataKey="emoji"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 20 }}
                                width={40}
                              />
                              <RechartsTooltip
                                contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder, color: chartColors.tooltipText, borderRadius: '8px' }}
                                itemStyle={{ color: chartColors.tooltipText, fontWeight: 'bold' }}
                                cursor={{ fill: chartColors.cursor, opacity: 0.5 }}
                              />
                              <Bar
                                dataKey="count"
                                fill={`url(#colorEmoji-${i})`}
                                radius={[0, 4, 4, 0]}
                                name="Sent"
                                barSize={18}
                                isAnimationActive={true}
                                animationDuration={1500}
                              >
                                <LabelList
                                  dataKey="count"
                                  position="right"
                                  fill={chartColors.labelFill}
                                  fontSize={10}
                                  formatter={(value: unknown) => countLabel(value)}
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {top10DaysData.length > 0 && (
            <div data-pdf-block className="bg-card border border-border rounded-xl p-5 break-inside-avoid">
              <h2 className="font-display text-lg font-semibold mb-3 text-foreground tracking-[-0.3px]">
                Most Active Days
              </h2>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                  <BarChart data={top10DaysData} layout="vertical" margin={{ top: 0, right: 20, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMessages" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={isLight ? "#0284c7" : "#075985"} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={isLight ? "#7dd3fc" : "#38bdf8"} stopOpacity={0.65} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={chartColors.gridStroke} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="date"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartColors.axisTickFill, fontSize: 11, fontWeight: 500 }}
                      width={100}
                    />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder, color: chartColors.tooltipText, borderRadius: '8px' }}
                      itemStyle={{ color: isLight ? '#0284c7' : '#38bdf8', fontWeight: 'bold' }}
                      cursor={{ fill: chartColors.cursor, opacity: 0.5 }}
                    />
                    <Bar
                      dataKey="messages"
                      fill="url(#colorMessages)"
                      radius={[0, 4, 4, 0]}
                      name="Messages"
                      barSize={20}
                      isAnimationActive={true}
                      animationDuration={1500}
                    >
                      <LabelList
                        dataKey="messages"
                        position="right"
                        fill={chartColors.labelFill}
                        fontSize={10}
                        formatter={(value: unknown) => countLabel(value)}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {hourlyChartData.length > 0 && (
            <div data-pdf-block className="bg-card border border-border rounded-xl p-5 break-inside-avoid">
              <h2 className="font-display text-lg font-semibold mb-3 text-foreground tracking-[-0.3px]">
                Messages by hour
              </h2>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                  <AreaChart data={hourlyChartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6ee7b7" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#a7f3d0" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.gridStroke} />
                    <XAxis
                      dataKey="time"
                      stroke={chartColors.axisTickFill}
                      tick={{ fill: chartColors.axisTickFill, fontSize: 12 }}
                      tickMargin={12}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={20}
                    />
                    <YAxis
                      stroke={chartColors.axisTickFill}
                      tick={{ fill: chartColors.axisTickFill, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => value.toLocaleString()}
                      width={35}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }} className="border rounded-lg p-3 shadow-xl">
                              <p style={{ color: chartColors.tooltipText }} className="font-bold mb-1">{label}</p>
                              <p className="text-[#34d399] font-bold">
                                {payload[0].name} : {payload[0].value?.toLocaleString()}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                      cursor={{ stroke: chartColors.cursor, strokeWidth: 2, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="messages"
                      stroke="#34d399"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorHourly)"
                      name="Messages"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {data.dayOfWeekStats && data.dayOfWeekStats.length > 0 && (
            <div data-pdf-block className="bg-card border border-border rounded-xl p-5  break-inside-avoid">
              <h2 className="font-display text-lg font-semibold mb-3 text-foreground tracking-[-0.3px]">
                Messages per day of the week
              </h2>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                  <BarChart data={data.dayOfWeekStats} margin={{ top: 20, right: 5, left: 5, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorDays" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#fed7aa" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.gridStroke} />
                    <XAxis
                      dataKey="label"
                      stroke={chartColors.axisTickFill}
                      tick={{ fill: chartColors.axisTickFill, fontSize: 12 }}
                      tickMargin={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke={chartColors.axisTickFill}
                      tick={{ fill: chartColors.axisTickFill, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => value.toLocaleString()}
                      width={35}
                    />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder, color: chartColors.tooltipText, borderRadius: '8px' }}
                      itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                      cursor={{ fill: chartColors.cursor, opacity: 0.5 }}
                    />
                    <Bar
                      dataKey="count"
                      fill={isExporting ? "#f97316" : "url(#colorDays)"}
                      radius={[6, 6, 0, 0]}
                      name="Messages"
                      isAnimationActive={true}
                      animationDuration={1500}
                    >
                      <LabelList
                        dataKey="count"
                        position="top"
                        fill={chartColors.labelFill}
                        fontSize={10}
                        formatter={(value: unknown) => countLabel(value)}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}


          {top10WordsData.length > 0 && (
            <div data-pdf-block className="bg-card border border-border rounded-xl p-5 break-inside-avoid">
              <h2 className="font-display text-lg font-semibold mb-3 text-foreground tracking-[-0.3px]">
                Most used words (&gt; 3 letters)
              </h2>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                  <BarChart data={top10WordsData} layout="vertical" margin={{ top: 0, right: 40, left: 7, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWords" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.55} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={chartColors.gridStroke} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="word"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartColors.axisTickFill, fontSize: 11, fontWeight: 500 }}
                      width={45}
                    />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder, color: chartColors.tooltipText, borderRadius: '8px' }}
                      itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                      cursor={{ fill: chartColors.cursor, opacity: 0.5 }}
                    />
                    <Bar
                      dataKey="count"
                      fill="url(#colorWords)"
                      radius={[0, 4, 4, 0]}
                      name="Mentions"
                      barSize={20}
                      isAnimationActive={true}
                      animationDuration={1500}
                    >
                      <LabelList
                        dataKey="count"
                        position="right"
                        fill={chartColors.labelFill}
                        fontSize={10}
                        formatter={(value: unknown) => countLabel(value)}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {data.shares.total > 0 && (
          <section className="mb-6">
            <h2 className="font-display text-xl font-semibold mb-1 text-foreground tracking-[-0.3px]">Reels and Posts</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {data.shares.total.toLocaleString()} reels and posts were shared in this chat. Instagram does not export the
              videos, so these come from who shared them, the creator and the caption.
            </p>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
              {renderPersonBarList("Reels and posts shared", data.shares.perUser)}
              {renderPersonBarList("Messages that are reels or posts", data.shares.shareRatePerUser, "%")}
              {renderPersonBarList("Reactions on shared reels", data.shares.reactionsPerUser)}
              {renderBarList("Top creators shared", data.shares.topCreators, "#f9a8d4", "#fce7f3")}
              {renderBarList("Top hashtags in captions", data.shares.topHashtags, "#a5b4fc", "#e0e7ff")}
            </div>
          </section>
        )}

        <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
















          {renderPersonBarList("Messages per user",    data.userAggregates.messages)}
          {renderPersonBarList("Media files per user", data.userAggregates.media)}
          {renderPersonBarList("Emojis per user",      data.userAggregates.emojis)}
          {renderPersonBarList("Links per user",        data.userAggregates.links)}
          {renderPersonBarList("Questions asked",       data.userAggregates.questions)}
          {renderPersonBarList("Laughs",                data.userAggregates.laughs)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {renderBarList("Most linked websites", data.topWebsites, "#f5d0fe", "#fae8ff")}

          {data.topWebsitesPerUser && data.topWebsitesPerUser.length > 0 && (
            <div data-pdf-block className="break-inside-avoid mb-6 bg-card border border-border rounded-xl p-5 col-span-full">
              <h2 className="font-display text-lg font-semibold mb-3 text-foreground tracking-[-0.3px]">
                Top websites per user
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                {data.topWebsitesPerUser.map((u, i) => {
                  const chartData = u.websites.slice(0, 5).map(e => ({
                    website: e.label,
                    count: e.count
                  }));
                  const color = seriesColorFor(u.user, i);

                  return (
                    <div key={i} className="flex flex-col p-4 bg-muted/20 rounded-xl border border-border/50">
                      <h3 className="font-bold text-foreground mb-3 border-b border-border/50 pb-2">{u.user}</h3>
                      <div style={{ height: `${Math.max(60, chartData.length * 35)}px` }} className="w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`colorWeb-${i}`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="5%" stopColor={color} stopOpacity={isLight ? 0.75 : 1} />
                                <stop offset="95%" stopColor={color} stopOpacity={isLight ? 0.28 : 0.72} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={chartColors.gridStroke} />
                            <XAxis type="number" hide />
                            <YAxis
                              dataKey="website"
                              type="category"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: chartColors.axisTickFill, fontSize: 11 }}
                              width={110}
                            />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder, color: chartColors.tooltipText, borderRadius: '8px' }}
                              itemStyle={{ color: chartColors.tooltipText, fontWeight: 'bold' }}
                              cursor={{ fill: chartColors.cursor, opacity: 0.5 }}
                            />
                            <Bar
                              dataKey="count"
                              fill={`url(#colorWeb-${i})`}
                              radius={[0, 4, 4, 0]}
                              name="Links"
                              barSize={18}
                              animationDuration={1500}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
