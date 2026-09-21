import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const dataset = JSON.parse(await fs.readFile(path.join(projectRoot, "data", "super-ip-us.json"), "utf8"));
const records = dataset.records || [];
const errors = [];

if (records.length < 6000) errors.push(`候选不足 6000：${records.length}`);
const sports = records.filter((item) => item.category === "体育运动");
if (sports.length < 100) errors.push(`体育不足 100：${sports.length}`);
const usMassTier = records.filter((item) => item.usTier?.startsWith("S"));
if (usMassTier.length < 5500) errors.push(`美国全民级候选不足 5500：${usMassTier.length}`);
const direct100m = records.filter((item) => item.reachStatus?.startsWith("100M+"));
if (direct100m.length < 3) errors.push(`100M+ 实测不足 3：${direct100m.length}`);
const survey100m = records.filter((item) => item.surveyQualifies100m === true);
if (survey100m.length < 5500) errors.push(`100M+ 认知等效不足 5500：${survey100m.length}`);
const visualReferences = records.filter((item) => Boolean(item.visualImage));
if (visualReferences.length < 5500) errors.push(`视觉参考图不足 5500：${visualReferences.length}`);

const categoryMinimums = {
  "电影 / 电视": 1800,
  "人物 / 文娱名人": 1800,
  "音乐": 1000,
  "文学 / 书籍": 250,
  "网络 / 媒体": 180,
  "舞台 / 活动": 100,
  "游戏 / 玩具": 150,
};
for (const [category, minimum] of Object.entries(categoryMinimums)) {
  const count = records.filter((item) => item.category === category).length;
  if (count < minimum) errors.push(`${category} 不足 ${minimum}：${count}`);
}

const recordKeys = new Set();
const ids = new Set();
for (const item of records) {
  const nameKey = String(item.name || "").normalize("NFKC").toLocaleLowerCase("en-US");
  const recordKey = `${nameKey}|${item.entityType}|${item.category}`;
  if (!item.id || ids.has(item.id)) errors.push(`ID 缺失或重复：${item.id || item.name}`);
  if (!item.name || recordKeys.has(recordKey)) errors.push(`同类型记录缺失或重复：${item.name || item.id}`);
  ids.add(item.id);
  recordKeys.add(recordKey);
  for (const field of ["category", "subcategory", "usTier", "rightsLane", "useRoute", "avoid", "sourceLabel", "sourceUrl", "evidenceStatus"]) {
    if (!item[field]) errors.push(`${item.name} 缺字段 ${field}`);
  }
  if (!Array.isArray(item.visualElements) || item.visualElements.length < 3) errors.push(`${item.name} 视觉元素少于 3`);
  if (!Array.isArray(item.visualPalette) || item.visualPalette.length < 4) errors.push(`${item.name} 色板少于 4`);
  if (!item.visualComposition) errors.push(`${item.name} 缺构图提示`);
  if (item.reachStatus?.startsWith("100M+")) {
    if (!(item.evidenceValue >= 100000000)) errors.push(`${item.name} 的 100M+ 人数无效`);
    if (!item.evidenceUrl || !item.evidenceType || !item.evidenceDate) errors.push(`${item.name} 的 100M+ 证据不完整`);
  }
  if (item.visualImageMode === "recognition-reference") {
    if (!item.surveySourceUrl || !item.visualSourceUrl || !item.visualRightsNote) errors.push(`${item.name} 的识别参考图边界不完整`);
  }
  if (item.visualImageMode === "public-domain-library" && !["文化公域 · 逐素材核验", "政府 / 公共符号 · 逐项核验"].includes(item.rightsLane)) {
    errors.push(`${item.name} 的公版图库与权利入口冲突`);
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
    survey100mEquivalent: survey100m.length,
    visualReferences: visualReferences.length,
    uniqueIds: ids.size,
    uniqueRecordKeys: recordKeys.size,
  }, null, 2)}\n`);
}
