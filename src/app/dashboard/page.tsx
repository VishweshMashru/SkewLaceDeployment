"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, QrCode, ClipboardList, Archive, TrendingUp, TrendingDown, Minus, AlertTriangle, Info, CheckCircle, Zap, RefreshCw } from "lucide-react";

function StatCard({ label, value, sub, color, icon: Icon, href }: {
  label: string; value: number | string; sub?: string; color: string; icon: any; href?: string;
}) {
  const inner = (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 ${href ? "hover:shadow-sm transition-all" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ProgressBar({ actual, target }: { actual: number; target: number }) {
  const pct = Math.min(100, target > 0 ? Math.round((actual / target) * 100) : 0);
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : pct >= 30 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: pct + "%" }} />
    </div>
  );
}

const insightStyles: Record<string, { bg: string; border: string; Icon: any; iconColor: string }> = {
  warning: { bg: "bg-amber-50",   border: "border-amber-200",   Icon: AlertTriangle, iconColor: "text-amber-500"   },
  danger:  { bg: "bg-red-50",     border: "border-red-200",     Icon: AlertTriangle, iconColor: "text-red-500"     },
  info:    { bg: "bg-blue-50",    border: "border-blue-200",    Icon: Info,          iconColor: "text-blue-500"    },
  success: { bg: "bg-emerald-50", border: "border-emerald-200", Icon: CheckCircle,   iconColor: "text-emerald-500" },
};

export default function DashboardPage() {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchDashboard() {
    const res = await fetch("/api/dashboard");
    setData(await res.json());
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (!data || data.error) return (
    <div className="text-center py-12">
      <p className="text-red-500 font-medium">Failed to load dashboard</p>
      <p className="text-xs text-slate-400 mt-1">{data?.error ?? "Unknown error"}</p>
      <button onClick={() => { setLoading(true); fetchDashboard(); }}
        className="mt-4 text-sm text-blue-600 hover:underline">Try again</button>
    </div>
  );

  const todayVsYesterday = (data.yesterday?.pieces ?? 0) > 0
    ? Math.round(((data.today.pieces - data.yesterday.pieces) / data.yesterday.pieces) * 100)
    : null;

  const cartonOpen     = data.cartons?.open ?? 0;
  const cartonSealed   = data.cartons?.sealed ?? 0;
  const batchPreparing = data.batches?.preparing ?? 0;
  const openOrders     = data.openOrders ?? [];
  const aiSuggestions  = data.aiSuggestions ?? [];
  const ruleInsights   = data.insights ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={() => { setRefreshing(true); fetchDashboard(); }} disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-xl bg-white border border-slate-200">
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Today */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mb-2">Today</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Labels Generated" value={data.today.labels} icon={QrCode}
            color="bg-emerald-50 text-emerald-600"
            sub={`${data.today.pieces} pieces`} />
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Pieces Today</p>
              {todayVsYesterday !== null && (
                todayVsYesterday > 0
                  ? <TrendingUp size={14} className="text-emerald-500" />
                  : todayVsYesterday < 0
                    ? <TrendingDown size={14} className="text-red-400" />
                    : <Minus size={14} className="text-slate-400" />
              )}
            </div>
            <p className="text-2xl font-black text-slate-800">{data.today.pieces}</p>
            <p className={`text-xs mt-0.5 ${todayVsYesterday !== null && todayVsYesterday > 0 ? "text-emerald-600" : todayVsYesterday !== null && todayVsYesterday < 0 ? "text-red-500" : "text-slate-400"}`}>
              {todayVsYesterday !== null
                ? `${todayVsYesterday > 0 ? "+" : ""}${todayVsYesterday}% vs yesterday`
                : `Yesterday: ${data.yesterday.pieces} pcs`}
            </p>
          </div>
        </div>
        <div className="mt-3 bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">This Week</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{data.week.pieces} <span className="text-sm font-normal text-slate-400">pieces</span></p>
            <p className="text-xs text-slate-400">Avg {data.week.pieces > 0 ? Math.round(data.week.pieces / 7) : 0} pcs/day over 7 days</p>
          </div>
          <Zap size={20} className="text-amber-400" />
        </div>
      </div>

      {/* Open orders */}
      {openOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Open Orders</p>
            <Link href="/orders" className="text-xs text-blue-600 font-medium">View all</Link>
          </div>
          <div className="space-y-2">
            {openOrders.map((order: any) => {
              const pct = order.totalTarget > 0 ? Math.round((order.totalActual / order.totalTarget) * 100) : 0;
              return (
                <Link key={order.id} href={"/orders/" + order.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 block hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{order.title}</p>
                      {order.buyerName && <p className="text-xs text-slate-400">{order.buyerName}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-violet-600">{pct}%</p>
                      <p className="text-xs text-slate-400">{order.completedLines}/{order.lines} lines</p>
                    </div>
                  </div>
                  <ProgressBar actual={order.totalActual} target={order.totalTarget} />
                  <p className="text-xs text-slate-400 mt-1">{order.totalActual}/{order.totalTarget} pcs</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Operations */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mb-2">Operations</p>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Open" value={cartonOpen} icon={Box}
            color="bg-violet-50 text-violet-600" href="/cartons" sub="cartons" />
          <StatCard label="Sealed" value={cartonSealed} icon={Box}
            color="bg-amber-50 text-amber-600" href="/cartons" sub="cartons" />
          <StatCard label="Batches" value={batchPreparing} icon={Archive}
            color="bg-blue-50 text-blue-600" href="/batches" sub="active" />
        </div>
      </div>

      {/* AI Suggestions */}
      <div>
        <div className="flex items-center gap-2 px-1 mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI Suggestions</p>
          <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
            <span>✦</span> Based on your data only
          </span>
        </div>
        {!aiSuggestions || aiSuggestions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
            <CheckCircle size={28} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-sm font-medium text-slate-700">Nothing to flag</p>
            <p className="text-xs text-slate-400 mt-1">Link orders to products and generate labels to see AI suggestions.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {aiSuggestions.map((s: any, i: number) => {
              const style = insightStyles[s.type] ?? insightStyles.info;
              return (
                <div key={i} className={`rounded-2xl border p-4 flex items-start gap-3 ${style.bg} ${style.border}`}>
                  <style.Icon size={16} className={`${style.iconColor} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{s.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Insights */}
      <div>
        <div className="flex items-center gap-2 px-1 mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Insights</p>
          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">Rule-based</span>
        </div>
        {ruleInsights.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
            <CheckCircle size={28} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-sm font-medium text-slate-700">All good</p>
            <p className="text-xs text-slate-400 mt-1">No issues detected. Link orders to products to see production insights.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ruleInsights.map((insight: any, i: number) => {
              const s = insightStyles[insight.type] ?? insightStyles.info;
              return (
                <div key={i} className={`rounded-2xl border p-4 flex items-start gap-3 ${s.bg} ${s.border}`}>
                  <s.Icon size={16} className={`${s.iconColor} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{insight.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{insight.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mb-2">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/finished-goods", label: "Generate Labels", sub: "New QR label",    color: "bg-emerald-50 text-emerald-600", Icon: QrCode       },
            { href: "/cartons",        label: "Pack Carton",     sub: "Add to carton",   color: "bg-violet-50 text-violet-600",  Icon: Box          },
            { href: "/orders",         label: "Orders",          sub: "Track progress",  color: "bg-blue-50 text-blue-600",      Icon: ClipboardList },
            { href: "/batches",        label: "Batches",         sub: "Manage dispatch", color: "bg-amber-50 text-amber-600",    Icon: Archive      },
          ].map(({ href, label, sub, color, Icon }) => (
            <Link key={href} href={href}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:shadow-sm transition-all">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="text-xs text-slate-400">{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}