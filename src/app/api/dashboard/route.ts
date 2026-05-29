import { NextResponse } from "next/server";
import { db } from "@/db";
import { finishedGoods, cartons, batches, orders, orderLines, products } from "@/db/schema";
import { eq, gte, sql, and, ne } from "drizzle-orm";

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // Today's label generation
    const todayLabels = await db.select({
      count: sql<number>`count(*)::int`,
      pieces: sql<number>`coalesce(sum(${finishedGoods.quantity}), 0)::int`,
    }).from(finishedGoods).where(gte(finishedGoods.createdAt, todayStart));

    // Yesterday's labels
    const yesterdayLabels = await db.select({
      pieces: sql<number>`coalesce(sum(${finishedGoods.quantity}), 0)::int`,
    }).from(finishedGoods).where(
      and(gte(finishedGoods.createdAt, yesterdayStart), sql`${finishedGoods.createdAt} < ${todayStart}`)
    );

    // This week's labels
    const weekLabels = await db.select({
      pieces: sql<number>`coalesce(sum(${finishedGoods.quantity}), 0)::int`,
    }).from(finishedGoods).where(gte(finishedGoods.createdAt, weekStart));

    // Carton stats
    const cartonStats = await db.select({
      status: cartons.status,
      count: sql<number>`count(*)::int`,
    }).from(cartons).groupBy(cartons.status);

    // Batch stats
    const batchStats = await db.select({
      status: batches.status,
      count: sql<number>`count(*)::int`,
    }).from(batches).groupBy(batches.status);

    // Open orders with lines
    const openOrders = await db.query.orders.findMany({
      where: sql`${orders.status} in ('open', 'in_progress')`,
      with: { lines: true },
      orderBy: orders.createdAt,
    });

    // Labels per product in last 7 days (for pace calculation)
    const recentByProduct = await db.select({
      productId: finishedGoods.productId,
      pieces: sql<number>`coalesce(sum(${finishedGoods.quantity}), 0)::int`,
      labels: sql<number>`count(*)::int`,
    }).from(finishedGoods)
      .where(gte(finishedGoods.createdAt, weekStart))
      .groupBy(finishedGoods.productId);

    // Labels per product TODAY
    const todayByProduct = await db.select({
      productId: finishedGoods.productId,
      pieces: sql<number>`coalesce(sum(${finishedGoods.quantity}), 0)::int`,
    }).from(finishedGoods)
      .where(gte(finishedGoods.createdAt, todayStart))
      .groupBy(finishedGoods.productId);

    // Last label per product (for idle detection)
    const lastLabelPerProduct = await db.select({
      productId: finishedGoods.productId,
      lastCreated: sql<string>`max(${finishedGoods.createdAt})`,
    }).from(finishedGoods).groupBy(finishedGoods.productId);

    // Build pace map: productId → avg pieces per day over last 7 days
    const paceMap = new Map<string, number>();
    for (const row of recentByProduct) {
      paceMap.set(row.productId, Math.round(row.pieces / 7));
    }

    const lastLabelMap = new Map<string, Date>();
    for (const row of lastLabelPerProduct) {
      lastLabelMap.set(row.productId, new Date(row.lastCreated));
    }

    const todayMap = new Map<string, number>();
    for (const row of todayByProduct) {
      todayMap.set(row.productId, row.pieces);
    }

    // Build AI insights — purely data-driven
    const insights: {
      type: "warning" | "info" | "success" | "danger";
      title: string;
      detail: string;
    }[] = [];

    for (const order of openOrders) {
      const totalTarget = order.lines.reduce((s, l) => s + l.targetQty, 0);
      const totalActual = order.lines.reduce((s, l) => s + (l.actualQty ?? 0), 0);
      const remaining = totalTarget - totalActual;
      const daysSinceCreated = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24));

      for (const line of order.lines) {
        if (line.status === "completed") continue;
        if (!line.productId) continue;

        const lineRemaining = line.targetQty - (line.actualQty ?? 0);
        const dailyPace = paceMap.get(line.productId) ?? 0;
        const lastLabel = lastLabelMap.get(line.productId);
        const daysIdle = lastLabel
          ? Math.floor((now.getTime() - lastLabel.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const todayPieces = todayMap.get(line.productId) ?? 0;

        // Idle product with open order
        if (daysIdle !== null && daysIdle >= 2 && line.actualQty === 0) {
          insights.push({
            type: "warning",
            title: `${line.productName}${line.colorCategory ? " – " + line.colorCategory : ""} not started`,
            detail: `Order "${order.title}" needs ${line.targetQty} pcs. No labels generated yet.`,
          });
        } else if (daysIdle !== null && daysIdle >= 1 && (line.actualQty ?? 0) > 0) {
          insights.push({
            type: "warning",
            title: `${line.productName}${line.colorCategory ? " – " + line.colorCategory : ""} idle for ${daysIdle}d`,
            detail: `${line.actualQty ?? 0}/${line.targetQty} pcs done. ${lineRemaining} pcs remaining for order "${order.title}".`,
          });
        }

        // Pace-based completion estimate
        if (dailyPace > 0 && lineRemaining > 0) {
          const daysToComplete = Math.ceil(lineRemaining / dailyPace);
          if (daysToComplete > 3) {
            insights.push({
              type: "info",
              title: `${line.productName}${line.colorCategory ? " – " + line.colorCategory : ""}: ~${daysToComplete} days to complete`,
              detail: `At current pace (${dailyPace} pcs/day), ${lineRemaining} remaining pcs for "${order.title}" will be done in ~${daysToComplete} days.`,
            });
          }
        }

        // Active today
        if (todayPieces > 0 && lineRemaining > 0) {
          insights.push({
            type: "info",
            title: `${line.productName}${line.colorCategory ? " – " + line.colorCategory : ""}: ${todayPieces} pcs today`,
            detail: `${lineRemaining} pcs still needed for order "${order.title}".`,
          });
        }
      }

      // Order nearly complete
      if (totalTarget > 0) {
        const pct = Math.round((totalActual / totalTarget) * 100);
        if (pct >= 90 && pct < 100) {
          insights.push({
            type: "success",
            title: `"${order.title}" is ${pct}% complete`,
            detail: `Only ${remaining} pieces left across all lines.`,
          });
        }
      }
    }

    // Deduplicate and limit insights
    const seen = new Set<string>();
    const uniqueInsights = insights.filter(i => {
      if (seen.has(i.title)) return false;
      seen.add(i.title);
      return true;
    }).slice(0, 8);

    return NextResponse.json({
      today: {
        labels: todayLabels[0]?.count ?? 0,
        pieces: todayLabels[0]?.pieces ?? 0,
      },
      yesterday: {
        pieces: yesterdayLabels[0]?.pieces ?? 0,
      },
      week: {
        pieces: weekLabels[0]?.pieces ?? 0,
      },
      cartons: Object.fromEntries(cartonStats.map(r => [r.status, r.count])),
      batches: Object.fromEntries(batchStats.map(r => [r.status, r.count])),
      openOrders: openOrders.map(o => ({
        id: o.id,
        title: o.title,
        buyerName: o.buyerName,
        status: o.status,
        totalTarget: o.lines.reduce((s, l) => s + l.targetQty, 0),
        totalActual: o.lines.reduce((s, l) => s + (l.actualQty ?? 0), 0),
        lines: o.lines.length,
        completedLines: o.lines.filter(l => l.status === "completed").length,
      })),
      insights: uniqueInsights,
    });
  } catch (e) {
    console.error("Dashboard error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
