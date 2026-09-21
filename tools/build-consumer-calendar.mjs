import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(fs.readFileSync(path.join(root, "source/consumer-calendar-seed.json"), "utf8"));
const weather = JSON.parse(fs.readFileSync(path.join(root, "source/apparel-weather-normals.json"), "utf8"));
const spending = JSON.parse(fs.readFileSync(path.join(root, "source/consumer-spending.json"), "utf8"));
const superIp = JSON.parse(fs.readFileSync(path.join(root, "data/super-ip-us.json"), "utf8"));
const byId = new Map(superIp.records.map((record) => [record.id, record]));

const DAY = 86400000;
const parseDate = (value) => value ? new Date(`${value}T00:00:00Z`) : null;
const isoDate = (date) => date.toISOString().slice(0, 10);
const addDays = (value, days) => isoDate(new Date(parseDate(value).getTime() + days * DAY));
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));

function linearForecast(history, targetYear) {
  const points = history.filter((point) => Number.isFinite(point.value) && Number.isFinite(point.year));
  if (points.length < 3) return null;
  const meanYear = points.reduce((sum, point) => sum + point.year, 0) / points.length;
  const meanValue = points.reduce((sum, point) => sum + point.value, 0) / points.length;
  const denominator = points.reduce((sum, point) => sum + (point.year - meanYear) ** 2, 0);
  if (!denominator) return null;
  const slope = points.reduce((sum, point) => sum + (point.year - meanYear) * (point.value - meanValue), 0) / denominator;
  const intercept = meanValue - slope * meanYear;
  const value = Math.max(0, intercept + slope * targetYear);
  const meanAbsoluteResidual = points.reduce((sum, point) => {
    const fitted = intercept + slope * point.year;
    return sum + Math.abs(point.value - fitted);
  }, 0) / points.length;
  const spread = Math.max(meanAbsoluteResidual, value * 0.03);
  return {
    year: targetYear,
    value: round(value),
    lower: round(Math.max(0, value - spread)),
    upper: round(value + spread),
    status: "model_estimate",
    statusLabel: "趋势预估",
    method: "OLS_LINEAR",
    historyPoints: points.length,
    slopePerYear: round(slope),
    meanAbsoluteResidual: round(meanAbsoluteResidual),
  };
}

function trendMetrics(history) {
  const points = history.filter((point) => Number.isFinite(point.value) && Number.isFinite(point.year)).sort((a, b) => a.year - b.year);
  if (points.length < 2) return { cagr: null, latestYoY: null };
  const first = points[0];
  const last = points.at(-1);
  const periods = last.year - first.year;
  const cagr = first.value > 0 && periods > 0 ? (last.value / first.value) ** (1 / periods) - 1 : null;
  const previous = points.at(-2);
  const latestYoY = previous.value > 0 ? last.value / previous.value - 1 : null;
  return {
    cagr: Number.isFinite(cagr) ? round(cagr, 4) : null,
    latestYoY: Number.isFinite(latestYoY) ? round(latestYoY, 4) : null,
  };
}

function enrichSpendingProfile(id, profile) {
  const history = [...(profile.history || [])].sort((a, b) => a.year - b.year);
  const metrics = trendMetrics(history);
  const target = profile.target?.mode === "official"
    ? {
        year: profile.targetYear,
        value: profile.target.value,
        lower: null,
        upper: null,
        status: profile.target.status || "official_report",
        statusLabel: profile.target.status === "official_partial_season" ? "官方阶段值" : "官方报告值",
        method: "OFFICIAL",
        historyPoints: history.length,
      }
    : linearForecast(history, profile.targetYear);
  return {
    id,
    ...profile,
    history,
    target,
    trend: metrics,
    coverage: {
      historyPoints: history.length,
      expectedPoints: 5,
      completeFiveYears: history.length >= 5 && !(profile.missingYears || []).length,
      missingYears: profile.missingYears || [],
    },
  };
}

const spendingProfiles = Object.fromEntries(Object.entries(spending.profiles).map(([id, profile]) => [id, enrichSpendingProfile(id, profile)]));

function spendingForEvent(eventId) {
  const binding = spending.eventBindings[eventId];
  if (!binding) {
    return {
      status: "unavailable",
      headlineZh: spending.unavailable.defaultHeadline,
      noteZh: spending.unavailable.eventNotes[eventId] || spending.unavailable.defaultNote,
    };
  }
  if (!spendingProfiles[binding.profile]) throw new Error(`${eventId} references missing spending profile: ${binding.profile}`);
  return {
    status: "available",
    profileId: binding.profile,
    relationship: binding.relationship,
    relationshipLabel: binding.relationshipLabel,
    noteZh: binding.noteZh,
  };
}

function operationPlan(event) {
  const leadDays = Math.max(45, Number(event.leadDays) || 90);
  const seasonStart = event.seasonStart;
  const seasonEnd = event.seasonEnd;
  const peakStart = event.peakStart || event.eventStart || seasonStart;
  const peakEnd = event.peakEnd || event.eventEnd || seasonEnd;
  const researchStart = addDays(seasonStart, -leadDays);
  const designStart = addDays(seasonStart, -Math.round(leadDays * 0.66));
  const sampleStart = addDays(seasonStart, -Math.round(leadDays * 0.38));
  const launchStart = addDays(seasonStart, -Math.min(21, Math.round(leadDays * 0.18)));
  return [
    { key: "research", label: "研究", start: researchStart, end: addDays(designStart, -1), action: "验证需求、权利入口和可用图源" },
    { key: "design", label: "定款", start: designStart, end: addDays(sampleStart, -1), action: "锁定题材、版型、价格带和视觉方向" },
    { key: "sample", label: "样品", start: sampleStart, end: addDays(launchStart, -1), action: "完成样品、成本、内容与技术验收" },
    { key: "launch", label: "上架", start: launchStart, end: addDays(peakStart, -1), action: "小批上架、素材测试、补库存与履约检查" },
    { key: "scale", label: "放量", start: peakStart, end: peakEnd, action: "围绕高峰放量，逐日看转化、退货和库存" },
    { key: "tail", label: "收尾", start: addDays(peakEnd, 1), end: seasonEnd, action: "清尾货、复盘、保留可跨季资产" }
  ].filter((stage) => parseDate(stage.start) <= parseDate(stage.end));
}

function relatedIp(record) {
  return {
    id: record.id,
    name: record.name,
    nameZh: record.nameZh,
    category: record.category,
    rightsLane: record.rightsLane,
    visualImage: record.visualImage,
    visualStatus: record.visualStatus,
    sourceUrl: record.sourceUrl,
    searchUrl: `index.html?q=${encodeURIComponent(record.nameZh || record.name)}`
  };
}

const events = seed.events.map((event) => {
  const missing = (event.ipIds || []).filter((id) => !byId.has(id));
  if (missing.length) throw new Error(`${event.id} references missing IP ids: ${missing.join(", ")}`);
  const { regions, regionNote, ...eventCore } = event;
  return {
    ...eventCore,
    regionalAffinityHint: {
      status: "编辑线索，不是销量、人口或天气需求",
      scores: regions,
      note: regionNote
    },
    spendingPower: spendingForEvent(event.id),
    operations: operationPlan(event),
    relatedIps: (event.ipIds || []).map((id) => relatedIp(byId.get(id))),
    visualLinks: (event.visualQueries || []).map((query) => ({
      label: query,
      url: `visual.html?view=images&q=${encodeURIComponent(query)}`
    }))
  };
}).sort((a, b) => a.seasonStart.localeCompare(b.seasonStart) || a.nameZh.localeCompare(b.nameZh, "zh-CN"));

const { logisticsDefinition, ...weatherModel } = weather;

const data = {
  schemaVersion: seed.schemaVersion,
  generatedAt: new Date().toISOString(),
  market: seed.market,
  asOf: seed.asOf,
  scope: seed.scope,
  methodology: seed.methodology,
  paydayModel: seed.paydayModel,
  spendingModel: {
    asOf: spending.asOf,
    currency: spending.currency,
    methodology: spending.methodology,
    profiles: spendingProfiles,
  },
  geographyModel: {
    weather: weatherModel,
    logistics: logisticsDefinition,
    customerOrders: {
      status: "待接真实订单",
      requiredFields: ["订单日期", "目的州", "目的 ZIP", "SKU / 品类", "件数", "销售额", "仓库 ZIP"],
      rule: "只有州 / ZIP 订单可用于计算客户地区占比；‘约 80% 在美东’仅作为待核说法。"
    },
    censusReference: {
      role: "人口统计比较口径，不用于定义货代‘美东’",
      sourceLabel: "U.S. Census Bureau · Regions and Divisions",
      sourceUrl: "https://www.census.gov/programs-surveys/economic-census/guidance-geographies/levels.html"
    }
  },
  counts: {
    events: events.length,
    relatedIps: events.reduce((sum, event) => sum + event.relatedIps.length, 0),
    spendingProfiles: Object.keys(spendingProfiles).length,
    spendingAvailable: events.filter((event) => event.spendingPower.status === "available").length,
    spendingUnavailable: events.filter((event) => event.spendingPower.status === "unavailable").length,
    weatherMarkets: weatherModel.markets.length,
    types: Object.fromEntries([...new Set(events.map((event) => event.type))].map((type) => [type, events.filter((event) => event.type === type).length]))
  },
  events
};

fs.writeFileSync(path.join(root, "data/consumer-calendar.json"), `${JSON.stringify(data, null, 2)}\n`);
fs.writeFileSync(path.join(root, "data/consumer-calendar.js"), `window.CONSUMER_CALENDAR_DATA = ${JSON.stringify(data)};\n`);
console.log(`Built consumer calendar: ${events.length} events, ${data.counts.relatedIps} IP links, ${data.counts.spendingAvailable} spending links.`);
