import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/consumer-calendar.json"), "utf8"));
const superIp = JSON.parse(fs.readFileSync(path.join(root, "data/super-ip-us.json"), "utf8"));
const validIds = new Set(superIp.records.map((record) => record.id));
const errors = [];
const ids = new Set();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

for (const event of data.events || []) {
  if (!event.id || ids.has(event.id)) errors.push(`duplicate or missing event id: ${event.id}`);
  ids.add(event.id);
  for (const field of ["eventStart", "eventEnd", "seasonStart", "seasonEnd", "peakStart", "peakEnd"]) {
    if (!datePattern.test(event[field] || "")) errors.push(`${event.id}: invalid ${field}`);
  }
  if (event.anchorDate && !datePattern.test(event.anchorDate)) errors.push(`${event.id}: invalid anchorDate`);
  if (event.seasonStart > event.seasonEnd) errors.push(`${event.id}: reversed season`);
  if (event.peakStart > event.peakEnd) errors.push(`${event.id}: reversed peak`);
  if (!event.sourceUrl?.startsWith("http")) errors.push(`${event.id}: missing source URL`);
  for (const ip of event.relatedIps || []) {
    if (!validIds.has(ip.id)) errors.push(`${event.id}: missing linked IP ${ip.id}`);
    if (!ip.visualImage) errors.push(`${event.id}: linked IP without visual ${ip.id}`);
  }
  if (!event.operations?.length) errors.push(`${event.id}: missing operations`);
  if (!event.regionalAffinityHint?.status) errors.push(`${event.id}: missing regional-affinity boundary`);
}

if (!data.paydayModel?.frequencies?.length) errors.push("missing payday model");
const weather = data.geographyModel?.weather;
if (!weather?.markets?.length) errors.push("missing apparel-weather markets");
if (!weather?.sourcePage?.startsWith("https://www.ncei.noaa.gov/")) errors.push("weather source is not NOAA NCEI");
if (weather?.historyWindow?.years?.length !== 5) errors.push("weather history must use five complete years");
if (weather?.historyWindow?.start !== "2021-01-01" || weather?.historyWindow?.end !== "2025-12-31") errors.push("unexpected five-year weather window");
const coveredStates = new Set();
for (const market of weather?.markets || []) {
  if (!market.id || !market.labelZh) errors.push("weather market missing identity");
  if (market.monthly?.length !== 12) errors.push(`${market.id}: expected 12 monthly normals`);
  for (const row of market.monthly || []) {
    if (!Number.isFinite(row.highF) || !Number.isFinite(row.lowF) || !Number.isFinite(row.meanF)) errors.push(`${market.id}: missing temperature normal for month ${row.month}`);
  }
  for (const state of market.states || []) {
    if (coveredStates.has(state)) errors.push(`duplicate weather-state coverage: ${state}`);
    coveredStates.add(state);
  }
}
if (coveredStates.size !== 51) errors.push(`weather-state coverage expected 50 states + DC, got ${coveredStates.size}`);
if (!data.geographyModel?.logistics?.eastCoastCore?.length) errors.push("missing logistics East Coast core");
if (!data.geographyModel?.customerOrders?.requiredFields?.length) errors.push("missing customer order data contract");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Validated consumer calendar: ${data.events.length} events, ${data.counts.relatedIps} IP links.`);
