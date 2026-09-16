import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const eagleRoot = "/Users/wenshanchen/Pictures/idea.library/images";
const publicDomainPath = path.join(projectRoot, "source/album-public-domain.json");
const licenseOnlyPath = path.join(projectRoot, "source/album-license-only.json");
const eagleRockPath = path.join(projectRoot, "source/eagle-rock-lineage.json");
const westernCountryPath = path.join(projectRoot, "source/western-country-lineage.json");
const imageRoot = path.join(projectRoot, "album-images");
const dataRoot = path.join(projectRoot, "data");

if (!existsSync(publicDomainPath) || !existsSync(licenseOnlyPath) || !existsSync(eagleRockPath) || !existsSync(westernCountryPath)) {
  throw new Error("Album source files are missing. Run tools/import-grok-intake.mjs first.");
}

const publicDomainSource = JSON.parse(await fs.readFile(publicDomainPath, "utf8"));
const licenseOnlySource = JSON.parse(await fs.readFile(licenseOnlyPath, "utf8"));
const eagleRockSource = JSON.parse(await fs.readFile(eagleRockPath, "utf8"));
const westernCountrySource = JSON.parse(await fs.readFile(westernCountryPath, "utf8"));
await fs.mkdir(imageRoot, { recursive: true });
await fs.mkdir(dataRoot, { recursive: true });

function hashText(value, length = 20) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, length);
}

function visualFamily(value) {
  const type = String(value || "");
  if (/拼贴|剪贴/.test(type)) return "拼贴 / 混合媒介";
  if (/卡通|插画|绘画|民间图像|神话/.test(type)) return "插画 / 角色";
  if (/纯字排|字排/.test(type) && !/肖像|人物|动物/.test(type)) return "字体 / 排版";
  if (/抽象|几何|波形|宇宙|光谱|数码|运动模糊/.test(type)) return "图形 / 抽象";
  if (/物件|白底/.test(type)) return "物件 / 概念";
  if (/摄影|肖像|群像|人物|服饰|局部|水下|环境|行动|动物|身体|电影静帧|造型|街头/.test(type)) return "摄影 / 人物";
  if (/交通|浪漫|场景/.test(type)) return "场景 / 叙事";
  return "其他";
}

async function eagleSource(eagleItemId) {
  const infoDir = path.join(eagleRoot, `${eagleItemId}.info`);
  const metadata = JSON.parse(await fs.readFile(path.join(infoDir, "metadata.json"), "utf8"));
  let sourcePath = path.join(infoDir, `${metadata.name}.${metadata.ext}`);
  if (!existsSync(sourcePath)) {
    const files = (await fs.readdir(infoDir)).filter((name) => name !== "metadata.json" && !name.includes("_thumbnail"));
    if (!files.length) throw new Error(`Missing Eagle file: ${eagleItemId}`);
    sourcePath = path.join(infoDir, files[0]);
  }
  return { metadata, sourcePath };
}

async function convert(item) {
  const { metadata, sourcePath } = await eagleSource(item.eagleItemId);
  const outputName = `${hashText(`album:${item.eagleItemId}`)}.webp`;
  const outputPath = path.join(imageRoot, outputName);
  const args = ["-quiet", "-mt", "-q", "78"];
  const width = Number(metadata.width) || 0;
  const height = Number(metadata.height) || 0;
  if (Math.max(width, height) > 1200) {
    if (width >= height) args.push("-resize", "1200", "0");
    else args.push("-resize", "0", "1200");
  }
  args.push(sourcePath, "-o", outputPath);
  await execFileAsync("/opt/homebrew/bin/cwebp", args, { maxBuffer: 2 * 1024 * 1024 });
  return `album-images/${outputName}`;
}

const publicDomain = [];
for (const item of publicDomainSource.publicDomain || []) {
  publicDomain.push({
    ...item,
    bucket: "public-domain",
    licenseStatus: "公版源流",
    visualFamily: visualFamily(item.visualType),
    image: await convert(item),
    rightsGate: `具体图像：${item.rightsStatus}；证据 ${item.evidenceLevel}。仍需避开现代录音包装、商标与后期修复。`,
    pathStatus: item.evidenceLevel === "A" ? "来源已核" : "使用前复核",
  });
}

const licenseOnly = (licenseOnlySource.albums || []).map((item) => ({
  ...item,
  bucket: "license-only",
  licenseStatus: "需授权",
  visualFamily: item.visualFamily || visualFamily(item.visualType),
  image: item.thumbnail,
  evidenceLevel: "研究线索",
}));

const eagleRockLineage = (eagleRockSource.records || []).map((item) => ({
  ...item,
  bucket: "eagle-rock-lineage",
  visualFamily: item.visualFamily || visualFamily(item.visualType),
  image: item.thumbnail,
  evidenceLevel: item.pathStatus || "研究线索",
}));

const westernCountryLineage = (westernCountrySource.records || []).map((item) => ({
  ...item,
  bucket: "western-country-lineage",
  visualFamily: item.visualFamily || visualFamily(item.visualType),
  image: item.thumbnail,
  evidenceLevel: item.pathStatus || "研究线索",
}));

const dataset = {
  schemaVersion: "2.0",
  sourceVersions: [publicDomainSource.sourceVersion, licenseOnlySource.sourceVersion, eagleRockSource.sourceVersion, westernCountrySource.sourceVersion],
  generatedAt: new Date().toISOString(),
  researchDate: licenseOnlySource.researchDate || eagleRockSource.researchDate,
  scope: "经典专辑封面、公版封面源流、鹰翼摇滚与西部乡村视觉研究。现代封面均需授权；缩略图不是生产文件。",
  records: [...publicDomain, ...licenseOnly, ...eagleRockLineage, ...westernCountryLineage],
};

const json = `${JSON.stringify(dataset, null, 2)}\n`;
await fs.writeFile(path.join(dataRoot, "albums.json"), json, "utf8");
await fs.writeFile(path.join(dataRoot, "albums.js"), `window.ALBUM_RESEARCH_DATA = ${JSON.stringify(dataset)};\n`, "utf8");
await fs.writeFile(path.join(projectRoot, "album-manifest.json"), `${JSON.stringify({
  generatedAt: dataset.generatedAt,
  counts: {
    total: dataset.records.length,
    publicDomain: publicDomain.length,
    licenseOnly: licenseOnly.length,
    licenseOnlyArtists: new Set(licenseOnly.map((item) => item.artist).filter(Boolean)).size,
    countryAmericana: licenseOnly.filter((item) => item.genreGroup === "Country / Americana").length,
    eagleRockLineage: eagleRockLineage.length,
    westernCountryLineage: westernCountryLineage.length,
  },
  sha256: createHash("sha256").update(json).digest("hex"),
}, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  publicDomain: publicDomain.length,
  licenseOnly: licenseOnly.length,
  eagleRockLineage: eagleRockLineage.length,
  westernCountryLineage: westernCountryLineage.length,
}, null, 2));
