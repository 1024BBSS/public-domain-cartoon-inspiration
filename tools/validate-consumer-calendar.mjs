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
  for (const key of ["west", "midwest", "northeast", "south"]) {
    if (!Number.isFinite(event.regions?.[key])) errors.push(`${event.id}: missing region ${key}`);
  }
}

if (!data.paydayModel?.frequencies?.length) errors.push("missing payday model");
if (!data.regionModel?.regions?.length) errors.push("missing region model");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Validated consumer calendar: ${data.events.length} events, ${data.counts.relatedIps} IP links.`);
