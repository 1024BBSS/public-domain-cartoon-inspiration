import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = path.join(root, "data", "memes.json");
const jsPath = path.join(root, "data", "memes.js");
const htmlPath = path.join(root, "memes.html");
const requiredPath = path.join(root, "source", "meme-required-entries.json");
const externalBenchmarkPath = path.join(root, "source", "meme-external-benchmark.json");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const errors = [];
const normalize = (value) => String(value || "").normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();

const fail = (condition, message) => {
  if (!condition) errors.push(message);
};

fail(Array.isArray(data.records), "records must be an array");
fail(data.records.length >= 900, `expected at least 900 records, got ${data.records.length}`);

const required = [
  "id",
  "name",
  "category",
  "subcategory",
  "originEntity",
  "originWork",
  "image",
  "sourceUrl",
  "mechanic",
  "agentPattern",
  "rightsLane",
  "copyrightNote",
  "publicityNote",
  "trademarkNote",
  "productionRoute",
  "activityEvidence",
  "era",
  "reuseTier",
  "recognitionEvidence",
  "reuseEvidence",
  "trendStatus",
  "recentHeat",
  "evidenceLevel",
];
const ids = new Set();
const superIp = JSON.parse(fs.readFileSync(path.join(root, "data", "super-ip-us.json"), "utf8"));
const superIds = new Set(superIp.records.map((record) => record.id));
let publicDomain = 0;
let contemporary = 0;
let currentSignals = 0;
let linkedSuperIp = 0;
let kymEvidence = 0;
let recentTwoYears = 0;
let recentHeat = 0;
let recentEditorial = 0;
let highReuse = 0;
let curatedRequired = 0;
let externalBenchmark = 0;

for (const [index, record] of data.records.entries()) {
  const label = record.id || `record ${index}`;
  for (const field of required) fail(record[field] !== undefined && record[field] !== null && record[field] !== "", `${label}: missing ${field}`);
  fail(!ids.has(record.id), `${label}: duplicate id`);
  ids.add(record.id);
  fail(Array.isArray(record.useCases) && record.useCases.length > 0, `${label}: missing useCases`);
  fail(Array.isArray(record.editorialEvidence), `${label}: editorialEvidence must be an array`);
  fail(Number.isInteger(record.slots) && record.slots >= 1, `${label}: invalid slots`);
  fail(/^https?:\/\//.test(record.sourceUrl), `${label}: invalid sourceUrl`);

  const imagePath = path.join(root, record.image);
  fail(fs.existsSync(imagePath), `${label}: missing image ${record.image}`);
  if (fs.existsSync(imagePath)) {
    const stat = fs.statSync(imagePath);
    fail(stat.size > 1024, `${label}: image too small ${record.image}`);
    const header = fs.readFileSync(imagePath).subarray(0, 12);
    fail(header.subarray(0, 4).toString("ascii") === "RIFF" && header.subarray(8, 12).toString("ascii") === "WEBP", `${label}: image is not decodable WebP container ${record.image}`);
  }

  if (record.rightsLane === "公版具体版本") {
    publicDomain += 1;
    fail(Boolean(record.visualRecordId), `${label}: public-domain record missing visualRecordId`);
    fail(record.image.startsWith("images/"), `${label}: public-domain record should use catalog image`);
  } else {
    contemporary += 1;
    fail(!record.visualRecordId, `${label}: modern record unexpectedly has visualRecordId`);
    fail(record.image.startsWith("meme-images/"), `${label}: modern record should use research-image cache`);
  }
  if (Number.isFinite(record.currentTemplateRank)) currentSignals += 1;
  if (record.kymViews || record.editorialEvidence?.length) kymEvidence += 1;
  if (Number(record.firstSeenYear) >= 2025) recentTwoYears += 1;
  if (record.recentHeat) recentHeat += 1;
  if (record.editorialEvidence?.some((evidence) => evidence.signal === "recent-editorial")) recentEditorial += 1;
  if (["高复用线索", "近年上升"].includes(record.reuseTier)) highReuse += 1;
  if (record.requiredEntry) curatedRequired += 1;
  if (record.externalBenchmark) {
    externalBenchmark += 1;
    fail(Array.isArray(record.externalSourceIds) && record.externalSourceIds.length > 0, `${label}: external benchmark missing source ids`);
    fail(Array.isArray(record.externalEvidence) && record.externalEvidence.length > 0, `${label}: external benchmark missing source evidence`);
    fail(Boolean(record.benchmarkLane), `${label}: external benchmark missing lane`);
    fail(Boolean(record.variantNote), `${label}: external benchmark missing relation note`);
    fail(Boolean(record.curationStatus), `${label}: external benchmark missing curation status`);
  }
  if (record.relatedSuperIp) {
    linkedSuperIp += 1;
    fail(superIds.has(record.relatedSuperIp.id), `${label}: missing related Super IP ${record.relatedSuperIp.id}`);
  }
}

fail(data.counts.records === data.records.length, "counts.records mismatch");
fail(data.counts.publicDomain === publicDomain, "counts.publicDomain mismatch");
fail(data.counts.contemporary === contemporary, "counts.contemporary mismatch");
fail(data.counts.currentSignals === currentSignals, "counts.currentSignals mismatch");
fail(data.counts.kymEvidence === kymEvidence, "counts.kymEvidence mismatch");
fail(data.counts.recentTwoYears === recentTwoYears, "counts.recentTwoYears mismatch");
fail(data.counts.recentHeat === recentHeat, "counts.recentHeat mismatch");
fail(data.counts.recentEditorial === recentEditorial, "counts.recentEditorial mismatch");
fail(data.counts.highReuse === highReuse, "counts.highReuse mismatch");
fail(data.counts.linkedSuperIp === linkedSuperIp, "counts.linkedSuperIp mismatch");
fail(data.counts.curatedRequired === curatedRequired, "counts.curatedRequired mismatch");
fail(data.counts.externalBenchmark === externalBenchmark, "counts.externalBenchmark mismatch");
fail(kymEvidence >= 700, `expected at least 700 KYM-backed records, got ${kymEvidence}`);
fail(recentTwoYears >= 40, `expected at least 40 records from 2025–2026, got ${recentTwoYears}`);
fail(recentEditorial >= 20, `expected at least 20 recent editorial signals, got ${recentEditorial}`);

const titleIndex = data.records.map((record) => `${record.name} ${(record.aliases || []).join(" ")}`.toLowerCase());
for (const expected of ["chill guy", "hawk tuah", "67 meme", "italian brainrot", "moo-deng"]) {
  fail(titleIndex.some((title) => title.includes(expected)), `missing recent benchmark: ${expected}`);
}

fail(fs.existsSync(externalBenchmarkPath), "missing source/meme-external-benchmark.json");
if (fs.existsSync(externalBenchmarkPath)) {
  const benchmarkSource = JSON.parse(fs.readFileSync(externalBenchmarkPath, "utf8"));
  const sourceIds = new Set();
  for (const source of benchmarkSource.sources || []) {
    fail(Boolean(source.id), "external benchmark source missing id");
    fail(!sourceIds.has(source.id), `duplicate external benchmark source: ${source.id}`);
    sourceIds.add(source.id);
    fail(/^https?:\/\//.test(source.url || ""), `external benchmark source ${source.id}: invalid URL`);
  }
  const benchmarkPaths = new Set();
  fail(Array.isArray(benchmarkSource.records) && benchmarkSource.records.length >= 50, "external benchmark should contain at least 50 families");
  for (const benchmark of benchmarkSource.records || []) {
    fail(Boolean(benchmark.path), `external benchmark missing path: ${benchmark.title || "untitled"}`);
    fail(!benchmarkPaths.has(benchmark.path), `duplicate external benchmark path: ${benchmark.path}`);
    benchmarkPaths.add(benchmark.path);
    fail(Array.isArray(benchmark.aliases) && benchmark.aliases.length > 0, `${benchmark.title}: benchmark aliases missing`);
    fail(Array.isArray(benchmark.externalSourceIds) && benchmark.externalSourceIds.length > 0, `${benchmark.title}: benchmark source ids missing`);
    for (const sourceId of benchmark.externalSourceIds || []) {
      fail(sourceIds.has(sourceId), `${benchmark.title}: unknown external source ${sourceId}`);
    }
    const record = data.records.find((item) => item.variants?.some((variant) => variant.templateId === benchmark.path));
    fail(Boolean(record), `missing external benchmark family: ${benchmark.title}`);
    if (!record) continue;
    const searchable = normalize([record.name, ...(record.aliases || []), record.searchText].join(" "));
    for (const alias of [benchmark.title, ...(benchmark.aliases || [])]) {
      fail(searchable.includes(normalize(alias)), `${benchmark.title}: missing external searchable alias ${alias}`);
    }
    fail(record.externalBenchmark === true, `${benchmark.title}: missing external benchmark marker`);
    fail(Boolean(record.benchmarkLane), `${benchmark.title}: missing benchmark lane`);
    fail(Boolean(record.variantNote), `${benchmark.title}: missing relation note`);
    fail(Boolean(record.curationStatus), `${benchmark.title}: missing curation status`);
    if (benchmark.status === "Submission") {
      fail(record.curationStatus.includes("研究中"), `${benchmark.title}: Submission is not labelled as research in progress`);
      fail(record.evidenceLevel === "C", `${benchmark.title}: Submission evidence level must remain C`);
    }
  }
  fail(externalBenchmark === benchmarkSource.records.length, `expected ${benchmarkSource.records.length} external benchmark records, got ${externalBenchmark}`);
}

fail(fs.existsSync(requiredPath), "missing source/meme-required-entries.json");
if (fs.existsSync(requiredPath)) {
  const requiredSource = JSON.parse(fs.readFileSync(requiredPath, "utf8"));
  fail(Array.isArray(requiredSource.records) && requiredSource.records.length > 0, "required Meme coverage guard is empty");
  for (const required of requiredSource.records || []) {
    const record = data.records.find((item) => item.variants?.some((variant) => variant.templateId === required.path));
    fail(Boolean(record), `missing required Meme family: ${required.title}`);
    if (!record) continue;
    const searchable = normalize([record.name, ...(record.aliases || []), record.searchText].join(" "));
    for (const alias of [required.title, ...(required.aliases || [])]) {
      fail(searchable.includes(normalize(alias)), `${required.title}: missing searchable alias ${alias}`);
    }
    fail(record.requiredEntry === true, `${required.title}: missing requiredEntry marker`);
    fail(Boolean(record.variantNote), `${required.title}: missing parent/variant note`);
    fail(Boolean(record.curationStatus), `${required.title}: missing curation status`);
    if (required.status === "Submission") {
      fail(record.curationStatus.includes("研究中"), `${required.title}: Submission is not labelled as research in progress`);
      fail(record.evidenceLevel === "C", `${required.title}: Submission evidence level must remain C`);
    }
  }
  fail(curatedRequired === requiredSource.records.length, `expected ${requiredSource.records.length} required Meme records, got ${curatedRequired}`);
}

const kymSnapshotPath = path.join(root, "source", "meme-kym-snapshot.json");
fail(fs.existsSync(kymSnapshotPath), "missing source/meme-kym-snapshot.json");
if (fs.existsSync(kymSnapshotPath)) {
  const kymSnapshot = JSON.parse(fs.readFileSync(kymSnapshotPath, "utf8"));
  fail(kymSnapshot.records?.length >= 900, `expected at least 900 KYM source records, got ${kymSnapshot.records?.length || 0}`);
}

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(jsPath, "utf8"), context, { filename: jsPath });
fail(context.window.MEME_LIBRARY_DATA?.records?.length === data.records.length, "data/memes.js does not match JSON");

const html = fs.readFileSync(htmlPath, "utf8");
fail(html.includes('src="data/memes.js'), "memes.html missing data script");
fail(html.includes('src="assets/memes.js'), "memes.html missing application script");
fail(html.includes('href="assets/memes.css'), "memes.html missing stylesheet");

for (const page of ["index.html", "calendar.html", "visual.html", "albums.html"]) {
  const content = fs.readFileSync(path.join(root, page), "utf8");
  fail(content.includes('href="memes.html"'), `${page}: missing Meme 图谱 navigation link`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  records: data.records.length,
  contemporary,
  publicDomain,
  currentSignals,
  kymEvidence,
  recentTwoYears,
  recentHeat,
  recentEditorial,
  highReuse,
  curatedRequired,
  externalBenchmark,
  linkedSuperIp,
  imageFiles: new Set(data.records.map((record) => record.image)).size,
  status: "valid",
}, null, 2));
