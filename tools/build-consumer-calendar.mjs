import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(fs.readFileSync(path.join(root, "source/consumer-calendar-seed.json"), "utf8"));
const superIp = JSON.parse(fs.readFileSync(path.join(root, "data/super-ip-us.json"), "utf8"));
const byId = new Map(superIp.records.map((record) => [record.id, record]));

const DAY = 86400000;
const parseDate = (value) => value ? new Date(`${value}T00:00:00Z`) : null;
const isoDate = (date) => date.toISOString().slice(0, 10);
const addDays = (value, days) => isoDate(new Date(parseDate(value).getTime() + days * DAY));

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
  return {
    ...event,
    operations: operationPlan(event),
    relatedIps: (event.ipIds || []).map((id) => relatedIp(byId.get(id))),
    visualLinks: (event.visualQueries || []).map((query) => ({
      label: query,
      url: `visual.html?view=images&q=${encodeURIComponent(query)}`
    }))
  };
}).sort((a, b) => a.seasonStart.localeCompare(b.seasonStart) || a.nameZh.localeCompare(b.nameZh, "zh-CN"));

const data = {
  schemaVersion: seed.schemaVersion,
  generatedAt: new Date().toISOString(),
  market: seed.market,
  asOf: seed.asOf,
  scope: seed.scope,
  methodology: seed.methodology,
  paydayModel: seed.paydayModel,
  regionModel: seed.regionModel,
  counts: {
    events: events.length,
    relatedIps: events.reduce((sum, event) => sum + event.relatedIps.length, 0),
    types: Object.fromEntries([...new Set(events.map((event) => event.type))].map((type) => [type, events.filter((event) => event.type === type).length]))
  },
  events
};

fs.writeFileSync(path.join(root, "data/consumer-calendar.json"), `${JSON.stringify(data, null, 2)}\n`);
fs.writeFileSync(path.join(root, "data/consumer-calendar.js"), `window.CONSUMER_CALENDAR_DATA = ${JSON.stringify(data)};\n`);
console.log(`Built consumer calendar: ${events.length} events, ${data.counts.relatedIps} IP links.`);
