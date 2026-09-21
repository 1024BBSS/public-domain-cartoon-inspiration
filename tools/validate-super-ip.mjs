import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const dataset = JSON.parse(await fs.readFile(path.join(projectRoot, "data", "super-ip-us.json"), "utf8"));
const records = dataset.records || [];
const errors = [];

if (records.length < 300) errors.push(`候选不足 300：${records.length}`);
const sports = records.filter((item) => item.category === "体育运动");
if (sports.length < 100) errors.push(`体育不足 100：${sports.length}`);
const usMassTier = records.filter((item) => item.usTier?.startsWith("S"));
if (usMassTier.length < 200) errors.push(`美国全民级候选不足 200：${usMassTier.length}`);
const direct100m = records.filter((item) => item.reachStatus?.startsWith("100M+"));
if (direct100m.length < 3) errors.push(`100M+ 实测不足 3：${direct100m.length}`);

const names = new Set();
const ids = new Set();
for (const item of records) {
  const nameKey = String(item.name || "").normalize("NFKC").toLocaleLowerCase("en-US");
  if (!item.id || ids.has(item.id)) errors.push(`ID 缺失或重复：${item.id || item.name}`);
  if (!item.name || names.has(nameKey)) errors.push(`名称缺失或重复：${item.name || item.id}`);
  ids.add(item.id);
  names.add(nameKey);
  for (const field of ["category", "subcategory", "usTier", "rightsLane", "useRoute", "avoid", "sourceLabel", "sourceUrl", "evidenceStatus"]) {
    if (!item[field]) errors.push(`${item.name} 缺字段 ${field}`);
  }
  if (item.reachStatus?.startsWith("100M+")) {
    if (!(item.evidenceValue >= 100000000)) errors.push(`${item.name} 的 100M+ 人数无效`);
    if (!item.evidenceUrl || !item.evidenceType || !item.evidenceDate) errors.push(`${item.name} 的 100M+ 证据不完整`);
  }
}

if (errors.length) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({
    result: "PASS",
    records: records.length,
    sports: sports.length,
    usMassTier: usMassTier.length,
    direct100mEvidence: direct100m.length,
    uniqueIds: ids.size,
    uniqueNames: names.size,
  }, null, 2)}\n`);
}
