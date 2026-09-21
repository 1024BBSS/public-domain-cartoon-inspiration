import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const dataset = JSON.parse(await fs.readFile(path.join(projectRoot, "data", "super-ip-us.json"), "utf8"));
const records = dataset.records || [];
const errors = [];

if (dataset.schemaVersion !== "1.3") errors.push(`Schema 应为 1.3：${dataset.schemaVersion}`);

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
if (visualReferences.length !== records.length) errors.push(`仍有无图记录：${records.length - visualReferences.length}`);
const religionLineages = records.filter((item) => item.category === "宗教 / 神话");
for (const item of religionLineages) {
  const images = item.visualImages || [];
  if (images.length < 3) errors.push(`${item.name} 历史视觉少于 3 件：${images.length}`);
  if (new Set(images.map((image) => image.sourceUrl).filter(Boolean)).size < 3) errors.push(`${item.name} 独立视觉来源少于 3 个`);
  if (new Set(images.map((image) => image.creator).filter(Boolean)).size < 3) errors.push(`${item.name} 艺术家 / 创作者少于 3 位`);
}

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
  for (const field of ["category", "subcategory", "taxonomyLevel2", "taxonomyLevel3", "taxonomySource", "taxonomyConfidence", "usTier", "rightsLane", "useRoute", "avoid", "sourceLabel", "sourceUrl", "evidenceStatus"]) {
    if (!item[field]) errors.push(`${item.name} 缺字段 ${field}`);
  }
  if (!Array.isArray(item.taxonomyLevel2Options) || !item.taxonomyLevel2Options.includes(item.taxonomyLevel2)) errors.push(`${item.name} 二级分类选项无主分类`);
  if (!Array.isArray(item.taxonomyLevel3Options) || !item.taxonomyLevel3Options.includes(item.taxonomyLevel3)) errors.push(`${item.name} 三级分类选项无主题`);
  if (!Array.isArray(item.taxonomyPaths) || !item.taxonomyPaths.some((path) => path.level2 === item.taxonomyLevel2 && path.level3 === item.taxonomyLevel3)) errors.push(`${item.name} 分类路径缺少主路径`);
  for (const path of item.taxonomyPaths || []) {
    if (!item.taxonomyLevel2Options.includes(path.level2) || !item.taxonomyLevel3Options.includes(path.level3)) errors.push(`${item.name} 分类路径与选项不一致`);
  }
  if (!Array.isArray(item.visualElements) || item.visualElements.length < 3) errors.push(`${item.name} 视觉元素少于 3`);
  if (!Array.isArray(item.visualPalette) || item.visualPalette.length < 4) errors.push(`${item.name} 色板少于 4`);
  if (!item.visualComposition) errors.push(`${item.name} 缺构图提示`);
  if (item.category === "宗教 / 神话" && (!Array.isArray(item.visualImages) || item.visualImages.length < 3)) {
    errors.push(`${item.name} 缺历史视觉版本数组`);
  }
  for (const visual of item.visualImages || []) {
    for (const field of ["imageUrl", "sourceUrl", "sourceLabel", "title", "creator", "date", "visualType", "license", "licenseClass"]) {
      if (!visual[field]) errors.push(`${item.name} 的视觉版本缺字段 ${field}`);
    }
  }
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

const coarseBuckets = new Set(["电影全景", "电视节目全景", "音乐人全景", "电子游戏全景", "演员与银幕人物", "主持人与电视人物"]);
const coarseTaxonomy = records.filter((item) => coarseBuckets.has(item.taxonomyLevel2) || coarseBuckets.has(item.taxonomyLevel3));
if (coarseTaxonomy.length) errors.push(`仍有旧全景桶进入新分类：${coarseTaxonomy.length}`);

const pendingTaxonomy = records.filter((item) => item.taxonomyConfidence === "待复核");
if (pendingTaxonomy.length > Math.ceil(records.length * 0.02)) errors.push(`分类待复核超过 2%：${pendingTaxonomy.length}`);

const categoryDepthMinimums = {
  "动画 / 角色": [4, 6],
  "电影 / 电视": [5, 10],
  "人物 / 文娱名人": [6, 10],
  音乐: [8, 5],
  "游戏 / 玩具": [5, 8],
  "文学 / 书籍": [3, 8],
  "文学 / 公域角色": [6, 5],
  "舞台 / 活动": [4, 5],
  "网络 / 媒体": [3, 7],
  体育运动: [10, 5],
  "宗教 / 神话": [7, 4],
  "艺术 / 公共文化": [5, 6],
  "品牌 / 广告角色": [4, 4],
  公共符号: [5, 5],
};
for (const [category, [minimumL2, minimumL3]] of Object.entries(categoryDepthMinimums)) {
  const categoryRecords = records.filter((item) => item.category === category);
  const level2 = new Set(categoryRecords.flatMap((item) => item.taxonomyLevel2Options || []));
  const level3 = new Set(categoryRecords.flatMap((item) => item.taxonomyLevel3Options || []));
  if (level2.size < minimumL2) errors.push(`${category} 二级分类不足 ${minimumL2}：${level2.size}`);
  if (level3.size < minimumL3) errors.push(`${category} 三级分类不足 ${minimumL3}：${level3.size}`);
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
    visualSourceImages: records.reduce((sum, item) => sum + Math.max(item.visualImages?.length || 0, item.visualImage ? 1 : 0), 0),
    religionLineages: religionLineages.length,
    taxonomyA: records.filter((item) => item.taxonomyConfidence === "A").length,
    taxonomyB: records.filter((item) => item.taxonomyConfidence === "B").length,
    taxonomyPending: pendingTaxonomy.length,
    uniqueIds: ids.size,
    uniqueRecordKeys: recordKeys.size,
  }, null, 2)}\n`);
}
