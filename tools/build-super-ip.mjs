import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const sourcePath = path.join(projectRoot, "source", "super-ip-us-seed.json");
const surveyPath = path.join(projectRoot, "source", "yougov-us-fame.json");
const visualProfilesPath = path.join(projectRoot, "source", "super-ip-visual-profiles.json");
const dataRoot = path.join(projectRoot, "data");
const catalogPath = path.join(dataRoot, "catalog.json");
const entitiesRoot = path.join(dataRoot, "entities");

const [seed, surveySnapshot, visualProfiles, catalog] = await Promise.all([
  fs.readFile(sourcePath, "utf8").then(JSON.parse),
  fs.readFile(surveyPath, "utf8").then(JSON.parse),
  fs.readFile(visualProfilesPath, "utf8").then(JSON.parse),
  fs.readFile(catalogPath, "utf8").then(JSON.parse),
]);

const DEFAULTS = {
  "需授权": {
    useRoute: "仅作选题、构图语言和文化语义研究；商品化前取得权利人授权。",
    avoid: "不得直接使用名称、角色造型、Logo、口号、海报、剧照、专辑封面或授权商品画稿。",
  },
  "联盟 / 球队授权": {
    useRoute: "研究城市文化、运动场景、配色关系与球迷仪式；实际商品需联盟或球队授权。",
    avoid: "不得直接使用队名、联盟名、Logo、球衣版式、吉祥物、奖杯或转播画面。",
  },
  "姓名肖像授权": {
    useRoute: "研究人物时代、运动动作和文化影响；商业使用前核验姓名、肖像、签名、号码及代言权。",
    avoid: "不得直接使用本人面部、姓名、签名、标志动作、球衣号码或造成代言误认。",
  },
  "文化公域 · 逐素材核验": {
    useRoute: "可从公共文化母题、历史原作或已进入公版的具体版本继续研究与原创转化。",
    avoid: "公域母题不覆盖现代改编、现代角色造型、修复图、摄影复制、商标和平台规则。",
  },
  "政府 / 公共符号 · 逐项核验": {
    useRoute: "研究历史语境与公共文化符号；逐项核验政府标志、官方背书和特殊法规。",
    avoid: "不得造成政府、军队、国家队或公共机构认可、授权或官方合作的误认。",
  },
};

const ENTERTAINMENT_CATEGORIES = new Set([
  "动画 / 角色",
  "电影 / 电视",
  "游戏 / 玩具",
  "音乐",
  "人物 / 文娱名人",
  "文学 / 书籍",
  "文学 / 公域角色",
  "舞台 / 活动",
  "网络 / 媒体",
  "宗教 / 神话",
  "艺术 / 公共文化",
]);

function stableId(value) {
  const slug = String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\p{Script=Han}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 8);
  return `us-ip-${slug || "entity"}-${hash}`;
}

function parseItem(raw) {
  if (typeof raw === "string") {
    const [name, nameZh = "", aliases = ""] = raw.split("|").map((part) => part.trim());
    return { name, nameZh, aliases: aliases ? aliases.split(",").map((item) => item.trim()).filter(Boolean) : [] };
  }
  return raw;
}

function normalizeLookup(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/\([^)]*\)/g, "")
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9\p{Script=Han}]+/gu, " ")
    .trim();
}

const catalogById = new Map((catalog.records || []).map((item) => [item.id, item]));
const publicVisualIndex = new Map();
const entityFiles = (await fs.readdir(entitiesRoot)).filter((name) => name.endsWith(".json"));
for (const fileName of entityFiles) {
  const payload = JSON.parse(await fs.readFile(path.join(entitiesRoot, fileName), "utf8"));
  const entity = payload.entity;
  if (!entity?.coverImage) continue;
  const cover = catalogById.get(entity.coverRecordId) || {};
  const visual = {
    image: entity.coverImage,
    entityId: entity.id,
    title: entity.name,
    sourceUrl: cover.sourceUrl || "visual.html",
    sourceLabel: cover.sourceLabel || "本地公版视觉库",
    evidenceLevel: cover.evidenceLevel || "待复核",
  };
  for (const candidate of [entity.name, ...(entity.aliases || [])]) {
    const key = normalizeLookup(candidate);
    if (key && !publicVisualIndex.has(key)) publicVisualIndex.set(key, visual);
  }
}

for (const record of catalog.records || []) {
  if (!record.image) continue;
  const visual = {
    image: record.image,
    entityId: "",
    title: record.title,
    sourceUrl: record.sourceUrl || "visual.html",
    sourceLabel: record.sourceLabel || "本地公版视觉库",
    evidenceLevel: record.evidenceLevel || "待复核",
  };
  for (const candidate of [record.title, ...(record.characters || [])]) {
    const key = normalizeLookup(candidate);
    if (key && !publicVisualIndex.has(key)) publicVisualIndex.set(key, visual);
  }
}

const PUBLIC_VISUAL_ALIASES = new Map([
  ["alice in wonderland", "alice"],
  ["steamboat willie mickey", "mickey mouse"],
  ["jesus christ", "jesus"],
  ["nativity of jesus", "nativity"],
  ["zeus", "奥林匹斯诸神"],
  ["hera", "奥林匹斯诸神"],
  ["athena", "奥林匹斯诸神"],
  ["apollo", "奥林匹斯诸神"],
  ["ares", "奥林匹斯诸神"],
  ["aphrodite", "奥林匹斯诸神"],
  ["hermes", "奥林匹斯诸神"],
  ["poseidon", "奥林匹斯诸神"],
  ["hades", "奥林匹斯诸神"],
  ["demeter", "奥林匹斯诸神"],
  ["artemis", "奥林匹斯诸神"],
]);

function findPublicVisual(record) {
  if (record.rightsLane !== "文化公域 · 逐素材核验" && !record.rightsLane.startsWith("政府 / 公共符号")) return null;
  for (const candidate of [record.name, record.nameZh, ...(record.aliases || [])]) {
    const normalized = normalizeLookup(candidate);
    const alias = PUBLIC_VISUAL_ALIASES.get(normalized) || normalized;
    const exact = publicVisualIndex.get(alias);
    if (exact) return exact;
  }
  return null;
}

const overrideByName = new Map((seed.overrides || []).map((item) => [item.name, item]));
const surveyByName = new Map((surveySnapshot.records || []).map((item) => [item.targetName, item]));
const sTierNames = new Set(seed.sTierNames || []);
const seen = new Set();
const seedLookup = new Set();
const records = [];

for (const group of seed.groups || []) {
  const defaults = DEFAULTS[group.rightsLane];
  if (!defaults) throw new Error(`Unknown rights lane: ${group.rightsLane}`);
  for (const raw of group.items || []) {
    const item = parseItem(raw);
    if (!item.name) throw new Error(`Unnamed item in ${group.category} / ${group.subcategory}`);
    for (const candidate of [item.name, ...(item.aliases || [])]) {
      const lookupKey = normalizeLookup(candidate);
      if (lookupKey) seedLookup.add(lookupKey);
    }
    const dedupeKey = item.name.normalize("NFKC").toLocaleLowerCase("en-US");
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const override = overrideByName.get(item.name) || {};
    const survey = surveyByName.get(item.name) || null;
    const groupVisual = visualProfiles.groupProfiles?.[group.subcategory] || {};
    const itemVisual = visualProfiles.itemOverrides?.[item.name] || {};
    let record = {
      id: stableId(item.name),
      name: item.name,
      nameZh: item.nameZh || "",
      aliases: item.aliases || [],
      category: group.category,
      subcategory: group.subcategory,
      entityType: group.entityType,
      usTier: item.usTier || (sTierNames.has(item.name) ? "S｜美国全民级候选" : group.usTier),
      reachStatus: "美国高知名候选 · 待同口径量化",
      rightsLane: group.rightsLane,
      rightsOwnerContext: group.rightsOwnerContext || "待复核",
      useRoute: item.useRoute || group.useRoute || defaults.useRoute,
      avoid: item.avoid || group.avoid || defaults.avoid,
      motifs: item.motifs || group.motifs || [],
      sourceLabel: group.sourceLabel,
      sourceUrl: group.sourceUrl,
      sourceRole: group.sourceRole || "类别或权利核验入口；不是知名度人数证明",
      evidenceStatus: "待补美国同口径人数证据",
      evidenceType: "编辑候选",
      evidenceValue: null,
      evidenceUnit: "",
      evidenceDate: seed.researchDate,
      evidenceUrl: "",
      visualStatus: "未收录受保护图像",
      surveyFamePercent: survey?.famePercent ?? null,
      surveyPopularityPercent: survey?.popularityPercent ?? null,
      surveyPopulationEquivalent: survey?.adultPopulationEquivalent ?? null,
      surveyQualifies100m: survey?.qualifies100mEquivalent ?? false,
      surveyPeriod: survey?.period || "",
      surveySourceUrl: survey?.sourcePage || "",
      surveySourceLabel: survey ? "YouGov Ratings · US Fame" : "",
      visualElements: itemVisual.elements || groupVisual.elements || item.motifs || group.motifs || [],
      visualPalette: itemVisual.palette || groupVisual.palette || ["#111111", "#555555", "#AAAAAA", "#F2F2F2"],
      visualComposition: itemVisual.composition || groupVisual.composition || "中心主体 + 单一识别道具",
      visualImage: "",
      visualImageMode: "visual-dna",
      visualSourceUrl: "",
      visualSourceLabel: "视觉 DNA 编辑标签",
      visualRightsNote: "仅用于检索与构图研究，不是可直接复制的商品画稿。",
      coverageLane: "curated-seed",
      ...override,
    };
    if (survey && !record.reachStatus.startsWith("100M+")) {
      record.reachStatus = `美国认知调查 · Fame ${survey.famePercent}%`;
      record.evidenceStatus = "全国认知调查已核验；直接人数待补";
      record.evidenceType = "YouGov Fame（美国成年人）";
    }
    const publicVisual = findPublicVisual(record);
    if (publicVisual) {
      record.visualImage = publicVisual.image;
      record.visualImageMode = "public-domain-library";
      record.visualSourceUrl = publicVisual.sourceUrl;
      record.visualSourceLabel = `${publicVisual.sourceLabel} · 证据 ${publicVisual.evidenceLevel}`;
      record.visualStatus = "本地公版视觉库 · 仍须逐图核验";
      record.visualRightsNote = "仅当前具体历史图像进入视觉库；现代改编、修复、配色和商标不随之开放。";
    } else if (survey?.imageUrl) {
      record.visualImage = survey.imageUrl;
      record.visualImageMode = "recognition-reference";
      record.visualSourceUrl = survey.sourcePage;
      record.visualSourceLabel = "YouGov 识别参考图";
      record.visualStatus = "外部识别参考图 · 不可作生产素材";
      record.visualRightsNote = "该图只帮助识别研究对象；图片、角色、肖像、Logo 与商品化权利仍需另行授权。";
    }
    records.push(record);
  }
}

const universeSeen = new Set();
for (const survey of surveySnapshot.universeRecords || []) {
  const name = survey.youGovName?.trim();
  if (!name) continue;
  const normalizedName = normalizeLookup(name);
  if (!normalizedName || seedLookup.has(normalizedName)) continue;
  const compositeKey = `${normalizedName}|${normalizeLookup(survey.primaryType)}|${normalizeLookup(survey.category)}`;
  if (universeSeen.has(compositeKey)) continue;
  universeSeen.add(compositeKey);
  const defaults = DEFAULTS[survey.rightsLane] || DEFAULTS["需授权"];
  records.push({
    id: stableId(`${name}|${survey.primaryType}|${survey.category}|${survey.sourceCategory}`),
    name,
    nameZh: "",
    aliases: [],
    category: survey.category,
    subcategory: survey.subcategory,
    entityType: survey.entityType || survey.primaryType || "文娱主体",
    usTier: survey.usTier || "S｜美国全民级候选",
    reachStatus: `美国认知调查 · Fame ${survey.famePercent}%`,
    rightsLane: survey.rightsLane || "需授权",
    rightsOwnerContext: survey.rightsOwnerContext || "具体版权、商标、肖像与授权主体待复核",
    useRoute: defaults.useRoute,
    avoid: defaults.avoid,
    motifs: survey.visualElements || [],
    sourceLabel: survey.sourceLabel || "YouGov Ratings · US Fame",
    sourceUrl: survey.sourcePage,
    sourceRole: survey.sourceRole || "美国全国认知与识别来源；不是商业授权或可生产素材证明",
    evidenceStatus: "全国认知调查已核验；直接人数待补",
    evidenceType: "YouGov Fame（美国成年人）",
    evidenceValue: null,
    evidenceUnit: "",
    evidenceDate: survey.period,
    evidenceUrl: "",
    visualStatus: survey.imageUrl ? "外部识别参考图 · 不可作生产素材" : "视觉 DNA · 无外部图源",
    surveyFamePercent: survey.famePercent,
    surveyPopularityPercent: survey.popularityPercent,
    surveyPopulationEquivalent: survey.adultPopulationEquivalent,
    surveyQualifies100m: survey.qualifies100mEquivalent,
    surveyPeriod: survey.period,
    surveySourceUrl: survey.sourcePage,
    surveySourceLabel: "YouGov Ratings · US Fame",
    visualElements: survey.visualElements || ["主体轮廓", "标志道具", "年代线索", "标题结构"],
    visualPalette: survey.visualPalette || ["#080808", "#F4F4F4", "#B3261E", "#315C7D"],
    visualComposition: survey.visualComposition || "中心主体 + 单一识别道具 + 标题留白",
    visualImage: survey.imageUrl || "",
    visualImageMode: survey.imageUrl ? "recognition-reference" : "visual-dna",
    visualSourceUrl: survey.imageUrl ? survey.sourcePage : "",
    visualSourceLabel: survey.imageUrl ? "YouGov 识别参考图" : "视觉 DNA 编辑标签",
    visualRightsNote: survey.imageUrl
      ? "该图只帮助识别研究对象；图片、角色、肖像、Logo 与商品化权利仍需另行授权。"
      : "仅用于检索与构图研究，不是可直接复制的商品画稿。",
    coverageLane: "survey-entertainment-universe",
    surveyEntityType: survey.primaryType || "",
    surveyEntitySlug: survey.sourceEntitySlug || "",
  });
}

if (records.length < 300) throw new Error(`Expected at least 300 records, got ${records.length}`);
const sportsCount = records.filter((item) => item.category === "体育运动").length;
if (sportsCount < 100) throw new Error(`Expected at least 100 sports records, got ${sportsCount}`);

const countBy = (key) => records.reduce((counts, record) => {
  const value = record[key] || "未分类";
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {});

const dataset = {
  schemaVersion: "1.2",
  sourceVersion: `${seed.sourceVersion}+${surveySnapshot.sourceVersion}`,
  generatedAt: new Date().toISOString(),
  market: "United States",
  title: "美国超级 IP 与权利机会库",
  scope: "美国高知名文娱、角色、影视、电视、音乐、演员、书籍、舞台、媒体、游戏、体育与文化母题候选。知名度、具体人数证据、视觉参考与商业授权结论分开。",
  methodology: {
    rule: "100M+ 直接人数只显示公开且口径明确的美国人数；100M+ 认知等效由 YouGov Fame 百分比乘以 2020 美国成年人口推算，二者分开显示。",
    surveySource: "YouGov Ratings",
    surveySourceUrl: "https://yougov.com/en-us/ratings",
    surveySourceVersion: surveySnapshot.sourceVersion,
    surveyBoundary: "Fame 是美国成年人调查认知率，不是独立观众、销量、购买人数或商业授权。",
    adultPopulationReference: 258343281,
    adultPopulationDate: "2020-04-01",
    adultPopulationSource: "U.S. Census Bureau",
    adultPopulationUrl: "https://www.census.gov/library/stories/2021/08/united-states-adult-population-grew-faster-than-nations-total-population-from-2010-to-2020.html",
    rightsSources: [
      {
        label: "U.S. Copyright Office · Duration of Copyright",
        url: "https://www.copyright.gov/circs/circ15a.pdf",
      },
      {
        label: "USPTO · Trademark, patent, or copyright",
        url: "https://www.uspto.gov/trademarks/basics/trademark-patent-copyright",
      },
      {
        label: "USPTO · Name, image, and likeness",
        url: "https://www.uspto.gov/trademarks/name-image-and-likeness",
      },
    ],
    note: "该库用于研究、筛选与授权路由，不构成法律意见或自动商用许可。",
  },
  counts: {
    records: records.length,
    curatedRecords: records.filter((item) => item.coverageLane === "curated-seed").length,
    surveyUniverseRecords: records.filter((item) => item.coverageLane === "survey-entertainment-universe").length,
    entertainmentRecords: records.filter((item) => ENTERTAINMENT_CATEGORIES.has(item.category)).length,
    sports: sportsCount,
    direct100mEvidence: records.filter((item) => item.reachStatus.startsWith("100M+")).length,
    surveyEvidence: records.filter((item) => Number.isFinite(item.surveyFamePercent)).length,
    survey100mEquivalent: records.filter((item) => item.surveyQualifies100m).length,
    visualReferences: records.filter((item) => item.visualImage).length,
    publicDomainVisuals: records.filter((item) => item.visualImageMode === "public-domain-library").length,
    recognitionReferenceVisuals: records.filter((item) => item.visualImageMode === "recognition-reference").length,
    byCategory: countBy("category"),
    byRightsLane: countBy("rightsLane"),
    byUsTier: countBy("usTier"),
  },
  records,
};

await fs.mkdir(dataRoot, { recursive: true });
await fs.writeFile(path.join(dataRoot, "super-ip-us.json"), `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
await fs.writeFile(path.join(dataRoot, "super-ip-us.js"), `window.SUPER_IP_US_DATA = ${JSON.stringify(dataset)};\n`, "utf8");
process.stdout.write(`${JSON.stringify(dataset.counts, null, 2)}\n`);
