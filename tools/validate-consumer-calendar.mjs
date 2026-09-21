import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/consumer-calendar.json"), "utf8"));
const superIp = JSON.parse(fs.readFileSync(path.join(root, "data/super-ip-us.json"), "utf8"));
const validIds = new Set(superIp.records.map((record) => record.id));
const spendingProfiles = data.spendingModel?.profiles || {};
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
  const spending = event.spendingPower;
  if (!spending || !["available", "unavailable"].includes(spending.status)) errors.push(`${event.id}: missing spending status`);
  if (spending?.status === "available") {
    const profile = spendingProfiles[spending.profileId];
    if (!profile) errors.push(`${event.id}: missing spending profile ${spending.profileId}`);
    if (!spending.relationshipLabel) errors.push(`${event.id}: missing spending relationship label`);
    if (!profile?.target || !Number.isFinite(profile.target.value)) errors.push(`${event.id}: spending profile missing target value`);
  }
  if (spending?.status === "unavailable" && !spending.headlineZh) errors.push(`${event.id}: unavailable spending needs explicit headline`);
}

if (!data.paydayModel?.frequencies?.length) errors.push("missing payday model");
if (!data.spendingModel?.methodology?.comparisonRule) errors.push("missing spending comparison boundary");
if (Object.keys(spendingProfiles).length < 10) errors.push("spending profile coverage is unexpectedly low");
for (const [id, profile] of Object.entries(spendingProfiles)) {
  if (profile.id !== id) errors.push(`${id}: spending profile id mismatch`);
  if (!profile.labelZh || !profile.scopeZh || profile.unit !== "USD_B") errors.push(`${id}: incomplete spending definition`);
  if (!profile.sources?.length || profile.sources.some((source) => !source.url?.startsWith("http"))) errors.push(`${id}: invalid spending sources`);
  if (!profile.target || !Number.isFinite(profile.target.value) || !Number.isFinite(profile.target.year)) errors.push(`${id}: missing target amount`);
  if (profile.target?.status === "model_estimate") {
    if (!Number.isFinite(profile.target.lower) || !Number.isFinite(profile.target.upper)) errors.push(`${id}: model estimate missing range`);
    if ((profile.history || []).length < 3) errors.push(`${id}: model estimate needs at least three historical points`);
  }
  if (profile.coverage?.completeFiveYears && profile.history.length < 5) errors.push(`${id}: invalid five-year coverage flag`);
}
if (data.counts?.spendingAvailable + data.counts?.spendingUnavailable !== data.events.length) errors.push("spending coverage counts do not reconcile");
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
console.log(`Validated consumer calendar: ${data.events.length} events, ${data.counts.relatedIps} IP links, ${data.counts.spendingAvailable} spending links.`);
