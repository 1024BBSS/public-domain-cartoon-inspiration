import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { writeRelationData } from "./relations.mjs";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

const allowedProjectNames = new Set(["public-domain-cartoon-online-v1", "public-domain-cartoon-online-v1-build"]);
if (!allowedProjectNames.has(path.basename(projectRoot))) {
  throw new Error(`Refusing to build outside the expected project: ${projectRoot}`);
}

const workspaceRoot = path.resolve(projectRoot, "../..");
const gatewayRoot = path.join(workspaceRoot, "outputs/public-domain-lan-gateway-v1");
const snapshotPath = path.join(gatewayRoot, "data/agent-snapshot.json");
const assetManifestPath = path.join(gatewayRoot, "data/asset-manifest.json");
const eagleImagesRoot = "/Users/wenshanchen/Pictures/idea.library/images";
const designSystemRoot = "/Users/wenshanchen/Documents/design-system/kit";
const imageOutputRoot = path.join(projectRoot, "images");
const dataOutputRoot = path.join(projectRoot, "data");
const supplementalPaths = [
  path.join(projectRoot, "source", "cartoon-ip-supplement.json"),
  path.join(projectRoot, "source", "ghost-commercial-supplement.json"),
  path.join(projectRoot, "source", "halloween-classics-supplement.json"),
];
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pd-cartoon-build-"));

const ALLOWED_RIGHTS = new Set([
  "期限届满",
  "未续期",
  "公版 / 开放馆藏",
  "公版文件",
  "CC0 / 公版开放馆藏",
  "Public Domain / LOC",
]);

const CARTOON_RE = /动画|漫画|卡通|角色|连环画|rubber hose|fleischer|popeye|betty|mickey|童话冒险|早期彩色/i;
const CARTOON_WORK_RE = /动画|橡皮管|silly|fleischer|连环画|卡通|童话冒险|早期彩色/i;
const LIVE_ACTION_RE = /captain z|黑白实拍|1930年代电影|好莱坞幕后|a star is born/i;
const CATALOG_LIVE_ACTION_RE = /电影画面|电影早期视觉|默片版本|黑白电影|实拍|好莱坞|metropolis|the kid|the general|caligari|phantom of the opera|a trip to the moon/i;

function hashText(value, length = 20) {
  return createHash("sha256").update(value).digest("hex").slice(0, length);
}

function compact(values) {
  return [...new Set(values.filter(Boolean))];
}

function textOf(item) {
  return [
    item.name,
    item.title,
    item.titleZh,
    item.version,
    item.year,
    item.group,
    item.keep,
    item.avoid,
    item.visualDirection,
    item.copyrightType,
    item.copyrightRoute,
    ...(item.styles || []),
    ...(item.scenes || []),
    ...(item.holidays || []),
    ...(item.characters || []),
  ].filter(Boolean).join(" ");
}

function classificationTextOf(item) {
  return [
    item.name,
    item.title,
    item.titleZh,
    item.version,
    item.year,
    item.group,
    ...(item.styles || []),
    ...(item.scenes || []),
    ...(item.holidays || []),
    ...(item.characters || []),
  ].filter(Boolean).join(" ");
}

function isCatalogCartoon(item) {
  const text = textOf(item);
  const versionFacts = [item.name, item.version, ...(item.styles || [])].filter(Boolean).join(" ");
  const isLiveAction = CATALOG_LIVE_ACTION_RE.test(versionFacts);
  return CARTOON_RE.test(text) && !LIVE_ACTION_RE.test(text) && !isLiveAction;
}

function isCartoonWork(work) {
  const text = textOf(work);
  return CARTOON_WORK_RE.test(text) && !LIVE_ACTION_RE.test(text);
}

function classifyTags(item, kind, work = {}) {
  const text = `${classificationTextOf(item)} ${classificationTextOf(work)}`;
  const tags = [];

  if (kind === "动画画面" || /动画|橡皮管|fleischer|silly symphonies|早期彩色/i.test(text)) tags.push("早期动画");
  if (/漫画|连环画|comic|strip|角色|betty|mickey|popeye|alice|oz|兔|猫|犬|mouse/i.test(text)) tags.push("漫画 / 角色");
  if (/童话|寓言|alice|wonderland|oz|cinderella|fairy|rabbit|cheshire|puss in boots|鹅妈妈/i.test(text)) tags.push("童话 / 寓言");
  if (/动物|猫|狗|犬|兔|鼠|鸟|鱼|昆虫|猩猩|猴|frog|mouse|rabbit|cat|dog|animal|fish|bird/i.test(text)) tags.push("动物 / 自然");
  if (/万圣|halloween|witch|ghost|骷髅|南瓜|怪谈|梦魇|幽灵|吸血鬼|狼人|frankenstein/i.test(text)) tags.push("万圣节");
  if (/圣诞|christmas|winter|雪|驯鹿|santa|noel|nativity|玩具店/i.test(text)) tags.push("圣诞 / 冬季");
  if (/怪诞|魔法|巫|鬼|monster|nightmare|mysterious|超现实|变形|夜间/i.test(text)) tags.push("怪诞 / 魔法");
  if (/神话|宗教|圣经|耶稣|基督|天使|圣母|pan|myth|bible|jesus|christ|angel|madonna/i.test(text)) tags.push("宗教 / 神话");

  return compact(tags.length ? tags : ["漫画 / 角色"]);
}

function sourceLabel(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("archive.org")) return "Internet Archive";
    if (host.includes("wikimedia.org") || host.includes("wikipedia.org")) return "Wikimedia";
    if (host.includes("loc.gov")) return "Library of Congress";
    if (host.includes("si.edu")) return "Smithsonian";
    if (host.includes("artic.edu")) return "Art Institute of Chicago";
    if (host.includes("metmuseum.org")) return "The Met";
    if (host.includes("duke.edu")) return "Duke CSPD";
    return host;
  } catch {
    return "来源页";
  }
}

function genericAvoid(rightsStatus) {
  if (rightsStatus === "未续期") {
    return "只取该未续期作品首次出现的具体表达；避开后续受保护造型、现代修复、品牌标志与易造成官方授权误认的商品化呈现。";
  }
  return "避开后期新增造型、现代修复、重新配色、品牌标志与易造成官方授权误认的商品化呈现。";
}

function resolveSource(imageKey, assetManifest) {
  const eagleId = String(imageKey || "").startsWith("eagle:")
    ? String(imageKey).slice("eagle:".length)
    : assetManifest.keys[imageKey];
  if (!eagleId) throw new Error(`No Eagle item for ${imageKey}`);

  const infoDir = path.join(eagleImagesRoot, `${eagleId}.info`);
  const metadataPath = path.join(infoDir, "metadata.json");
  if (!existsSync(metadataPath)) throw new Error(`Missing Eagle metadata: ${eagleId}`);

  return fs.readFile(metadataPath, "utf8").then(async (raw) => {
    const metadata = JSON.parse(raw);
    let sourcePath = path.join(infoDir, `${metadata.name}.${metadata.ext}`);
    if (!existsSync(sourcePath)) {
      const files = (await fs.readdir(infoDir)).filter((name) => name !== "metadata.json" && !name.includes("_thumbnail"));
      if (!files.length) throw new Error(`Missing Eagle source file: ${eagleId}`);
      sourcePath = path.join(infoDir, files[0]);
    }
    return { eagleId, metadata, sourcePath };
  });
}

async function run(command, args) {
  try {
    await execFileAsync(command, args, { maxBuffer: 4 * 1024 * 1024 });
  } catch (error) {
    const details = error.stderr || error.stdout || error.message;
    throw new Error(`${command} failed: ${details}`);
  }
}

async function convertImage(job) {
  const { metadata, sourcePath } = await resolveSource(job.imageKey, job.assetManifest);
  const outputPath = path.join(imageOutputRoot, job.outputName);
  let inputPath = sourcePath;

  if (String(metadata.ext).toLowerCase() === "gif") {
    inputPath = path.join(tempRoot, `${job.outputName}.png`);
    await run("/usr/bin/sips", ["-s", "format", "png", sourcePath, "--out", inputPath]);
  }

  const width = Number(metadata.width) || 0;
  const height = Number(metadata.height) || 0;
  const args = ["-quiet", "-mt", "-q", "74"];
  if (Math.max(width, height) > 960) {
    if (width >= height) args.push("-resize", "960", "0");
    else args.push("-resize", "0", "960");
  }
  args.push(inputPath, "-o", outputPath);
  await run("/opt/homebrew/bin/cwebp", args);
  return (await fs.stat(outputPath)).size;
}

const snapshot = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
const assetManifest = JSON.parse(await fs.readFile(assetManifestPath, "utf8"));
const worksById = new Map(snapshot.collections.gallery.map((work) => [work.id, work]));

const supplementalDatasets = [];
for (const sourcePath of supplementalPaths) {
  if (!existsSync(sourcePath)) continue;
  supplementalDatasets.push(JSON.parse(await fs.readFile(sourcePath, "utf8")));
}

function parseYearSort(value) {
  const text = String(value || "").trim();
  const fullYear = text.match(/(?:^|\D)((?:1[0-9]{3}|20[0-9]{2}))(?:\D|$)/);
  if (fullYear) return Number(fullYear[1]);
  const englishCentury = text.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+century\b/i);
  if (englishCentury) return (Number(englishCentury[1]) - 1) * 100;
  const chineseCentury = text.match(/(\d{1,2})\s*世纪/);
  if (chineseCentury) return (Number(chineseCentury[1]) - 1) * 100;
  return 9999;
}

function supplementalRecords(data) {
  const output = [];
  for (const work of data.works || []) {
    if (!Array.isArray(work.frames) || !work.frames.length) {
      throw new Error(`Supplemental work has no frames: ${work.id || work.title}`);
    }
    const common = {
      title: work.title,
      year: work.year,
      yearSort: parseYearSort(work.year),
      rightsStatus: work.rightsStatus,
      copyrightRoute: work.copyrightRoute,
      evidenceLevel: work.evidenceLevel || "待复核",
      imageRights: work.imageRights || "以来源页为准",
      sourceLabel: work.sourceLabel || sourceLabel(work.sourceUrl),
      licenseUrl: work.licenseUrl || "",
      usage: work.usage || "从该作品的具体角色表达与画面关系中提炼题材。",
      avoid: work.avoid || genericAvoid(work.rightsStatus),
      styles: compact(work.styles || []),
      scenes: compact(work.scenes || []),
      holidays: compact(work.holidays || []),
      characters: compact(work.characters || []),
      tags: compact(work.tags || ["早期动画", "漫画 / 角色"]),
      awarenessScore: Number(work.awarenessScore) || 0,
      awarenessLevel: work.awarenessLevel || "待复核",
      registrationNumber: work.registrationNumber || "",
      renewalSearch: work.renewalSearch || "",
      evidenceSources: compact(work.evidenceSources || []),
      riskFlags: compact(work.riskFlags || []),
      researchDate: work.researchDate || data.researchDate || "",
      supplementalSourceVersion: data.sourceVersion || "",
    };
    const first = work.frames[0];
    output.push({
      ...common,
      id: `catalog-supplement-${work.id}`,
      kind: "主档",
      subtitle: work.subtitle || `${work.year} 具体作品版本`,
      sourceUrl: work.sourceUrl,
      imageKey: `eagle:${first.eagleItemId}`,
    });
    work.frames.forEach((frame, index) => {
      const sourceUrl = frame.sourceUrl || (frame.seconds === undefined
        ? work.sourceUrl
        : `${work.sourceUrl}#frame-${frame.seconds}s`);
      output.push({
        ...common,
        id: `frame-supplement-${work.id}-${String(index + 1).padStart(3, "0")}`,
        kind: "动画画面",
        subtitle: frame.subtitle || `画面 ${String(index + 1).padStart(3, "0")}`,
        sourceUrl,
        imageKey: `eagle:${frame.eagleItemId}`,
      });
    });
  }
  return output;
}

const catalogRecords = snapshot.collections.catalog
  .filter((item) => ALLOWED_RIGHTS.has(item.rightsStatus) && isCatalogCartoon(item))
  .map((item) => ({
    id: `catalog-${item.id}`,
    kind: "主档",
    title: item.name || item.title,
    subtitle: item.version || item.group || "",
    year: item.year || "待复核",
    yearSort: Number(item.yearSort) || Number.parseInt(item.year, 10) || 9999,
    rightsStatus: item.rightsStatus,
    copyrightRoute: item.copyrightRoute || item.copyrightType || item.rightsStatus,
    evidenceLevel: item.evidenceLevel || "待复核",
    imageRights: item.imageRights || "以来源页为准",
    sourceUrl: item.sourceUrl || item.source || "",
    sourceLabel: sourceLabel(item.sourceUrl || item.source || ""),
    licenseUrl: "",
    usage: item.visualDirection || item.keep || "从该版本的画面关系中提炼题材并重新绘制。",
    avoid: item.avoid || genericAvoid(item.rightsStatus),
    styles: compact(item.styles || []),
    scenes: compact(item.scenes || []),
    holidays: compact(item.holidays || []),
    characters: [],
    tags: classifyTags(item, "主档"),
    awarenessScore: Number(item.awarenessScore) || 0,
    awarenessLevel: item.awarenessLevel || "待复核",
    imageKey: item.imageKey,
  }));

const galleryRecords = snapshot.collections.galleryAssets
  .filter((asset) => {
    const work = worksById.get(asset.workId);
    return ALLOWED_RIGHTS.has(asset.rightsStatus) && work && isCartoonWork(work);
  })
  .map((asset) => {
    const work = worksById.get(asset.workId);
    const frame = asset.id.match(/(\d{3})$/)?.[1] || "";
    const sourceUrl = asset.sourceUrl || asset.sourcePage || work.sourceUrl || work.evidenceUrl || "";
    return {
      id: `frame-${asset.id}`,
      kind: "动画画面",
      title: work.titleZh || work.title,
      subtitle: frame ? `画面 ${frame}` : "动画画面",
      year: work.year || "待复核",
      yearSort: Number.parseInt(work.year, 10) || 9999,
      rightsStatus: asset.rightsStatus,
      copyrightRoute: asset.rightsStatus === "未续期" ? "美国旧法未续期" : (work.basis || asset.copyrightType || asset.rightsStatus),
      evidenceLevel: asset.rightsStatus === "未续期" ? "B" : "A",
      imageRights: work.archiveLicense ? "来源页标记为 Public Domain" : "以来源页为准",
      sourceUrl,
      sourceLabel: sourceLabel(sourceUrl),
      licenseUrl: work.archiveLicense || "",
      usage: compact([...(work.styles || []), ...(work.scenes || [])]).slice(0, 4).join(" · ") || "从该画面的动作、轮廓或场景关系中提炼题材。",
      avoid: genericAvoid(asset.rightsStatus),
      styles: compact(work.styles || []),
      scenes: compact(work.scenes || []),
      holidays: compact(work.holidays || []),
      characters: compact(work.characters || []),
      tags: classifyTags(asset, "动画画面", work),
      awarenessScore: 0,
      awarenessLevel: "待复核",
      imageKey: asset.imageKey,
    };
  });

const addedSupplementalRecords = supplementalDatasets.flatMap(supplementalRecords);
const records = [...catalogRecords, ...galleryRecords, ...addedSupplementalRecords];
const imageNames = new Map();
for (const record of records) {
  if (!imageNames.has(record.imageKey)) imageNames.set(record.imageKey, `${hashText(record.imageKey)}.webp`);
}

await fs.mkdir(imageOutputRoot, { recursive: true });
await fs.mkdir(dataOutputRoot, { recursive: true });

const jobs = [...imageNames.entries()].map(([imageKey, outputName]) => ({ imageKey, outputName, assetManifest }));
let cursor = 0;
let completed = 0;
let imageBytes = 0;

async function worker() {
  while (cursor < jobs.length) {
    const index = cursor++;
    const convertedBytes = await convertImage(jobs[index]);
    imageBytes += convertedBytes;
    completed += 1;
    if (completed % 80 === 0 || completed === jobs.length) {
      process.stdout.write(`Converted ${completed}/${jobs.length}\n`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(8, jobs.length) }, () => worker()));

const publicRecords = records.map(({ imageKey, ...record }) => ({
  ...record,
  image: `images/${imageNames.get(imageKey)}`,
}));

const by = (key) => publicRecords.reduce((counts, record) => {
  const values = Array.isArray(record[key]) ? record[key] : [record[key]];
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {});

const dataset = {
  schemaVersion: "1.0",
  sourceVersion: snapshot.sourceVersion,
  generatedAt: new Date().toISOString(),
  scope: "美国市场公版卡通视觉灵感；只含已确认期限届满、未续期、公共领域或 CC0 路径，排除待复核项。",
  records: publicRecords,
};

const catalogJson = `${JSON.stringify(dataset, null, 2)}\n`;
await fs.writeFile(path.join(dataOutputRoot, "catalog.json"), catalogJson, "utf8");
await fs.writeFile(
  path.join(dataOutputRoot, "catalog.js"),
  `window.PUBLIC_DOMAIN_CARTOON_DATA = ${JSON.stringify(dataset)};\n`,
  "utf8",
);

const relationResult = await writeRelationData(projectRoot, dataset);

const manifest = {
  schemaVersion: "1.0",
  generatedAt: dataset.generatedAt,
  sourceVersion: dataset.sourceVersion,
  publicScope: dataset.scope,
  counts: {
    records: publicRecords.length,
    uniqueImages: imageNames.size,
    imageBytes,
    byKind: by("kind"),
    byRights: by("rightsStatus"),
    byTag: by("tags"),
  },
  catalogSha256: createHash("sha256").update(catalogJson).digest("hex"),
  relationsSha256: relationResult.sha256,
  relationCounts: relationResult.relations.counts,
  supplemental: {
    sourceVersions: supplementalDatasets.map((data) => data.sourceVersion || "unknown"),
    workCount: supplementalDatasets.reduce((sum, data) => sum + (data.works || []).length, 0),
    recordCount: addedSupplementalRecords.length,
  },
  exclusions: ["未续期待复核", "公版线索 · 待复核", "仍受版权保护", "Eagle 本地路径", "内部证据附件"],
};
await fs.writeFile(path.join(projectRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

await fs.copyFile(path.join(designSystemRoot, "tokens.css"), path.join(projectRoot, "assets/tokens.css"));
await fs.copyFile(path.join(designSystemRoot, "components.css"), path.join(projectRoot, "assets/components.css"));
await fs.writeFile(path.join(projectRoot, ".nojekyll"), "", "utf8");
await fs.rm(tempRoot, { recursive: true, force: true });

process.stdout.write(`${JSON.stringify(manifest.counts, null, 2)}\n`);
