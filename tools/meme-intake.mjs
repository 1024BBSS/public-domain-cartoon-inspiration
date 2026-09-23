import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const command = process.argv[2] || "prepare";
const positional = process.argv.slice(3).filter((arg) => !arg.startsWith("--"));
const flag = (name) => process.argv.includes(`--${name}`);
const option = (name, fallback) => {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback;
};

const dataPath = path.join(root, "data", "memes.json");
const benchmarkPath = path.join(root, "source", "meme-external-benchmark.json");
const defaultInputPath = path.join(root, "source", "meme-kym-snapshot.json");
const outputRoot = path.resolve(root, option("output", "output/meme-intake"));
const deltaPath = path.join(outputRoot, "delta.json");
const batchPath = path.join(outputRoot, "review-batches.jsonl");
const instructionPath = path.join(outputRoot, "review-instructions.md");
const manifestPath = path.join(outputRoot, "manifest.json");
const previewPath = path.join(outputRoot, "external-benchmark.preview.json");

const sourceCatalog = {
  "kym-direct": {
    id: "kym-direct",
    name: "Know Your Meme · 具体档案",
    url: "https://knowyourmeme.com/memes",
    kind: "外部百科档案",
  },
  "imgflip-all-time": {
    id: "imgflip-all-time",
    name: "Imgflip · Top All Time 模板",
    url: "https://imgflip.com/memetemplates?sort=top-all-time",
    kind: "外部模板复用榜",
  },
  memegen: {
    id: "memegen",
    name: "Memegen · 模板目录",
    url: "https://api.memegen.link/templates/",
    kind: "外部模板目录",
  },
};

const normalize = (value) => String(value || "")
  .normalize("NFKD")
  .toLowerCase()
  .replace(/[’']/g, "")
  .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();
const compact = (values) => [...new Set(values.filter(Boolean))];
const hash = (value) => createHash("sha256").update(String(value)).digest("hex");
const shortHash = (value) => hash(value).slice(0, 12);
const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;

function originOf(value) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function parseJsonLines(text, label) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${label}:${index + 1}: ${error.message}`);
    }
  });
}

function loadInput(inputPath) {
  const text = fs.readFileSync(inputPath, "utf8");
  if (/\.jsonl$/i.test(inputPath)) return { records: parseJsonLines(text, inputPath), sources: [] };
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return { records: parsed, sources: [] };
  if (Array.isArray(parsed.records)) return { records: parsed.records, sources: Array.isArray(parsed.sources) ? parsed.sources : [] };
  if (parsed.sources && !Array.isArray(parsed.sources)) {
    const records = [];
    const sources = [];
    for (const [sourceId, source] of Object.entries(parsed.sources)) {
      sources.push({ id: sourceId, name: sourceId, url: source.url || "", kind: "外部目录" });
      for (const record of source.records || []) records.push({ ...record, sourceId });
    }
    return { records, sources };
  }
  throw new Error(`Unsupported input schema: ${inputPath}`);
}

function inferredSourceId(record, inputPath) {
  if (record.sourceId) return record.sourceId;
  const url = String(record.url || record.sourceUrl || "");
  if (/knowyourmeme\.com/i.test(url) || /meme-kym/i.test(inputPath)) return "kym-direct";
  if (/imgflip\.com/i.test(url)) return "imgflip-all-time";
  if (/memegen\.link/i.test(url)) return "memegen";
  return `source-${shortHash(new URL(url || "https://invalid.local").hostname || inputPath)}`;
}

function cleanPath(record) {
  if (record.path) return String(record.path).split(/[?#]/)[0].replace(/\/$/, "");
  const value = record.url || record.sourceUrl;
  if (!value) return "";
  try {
    return new URL(value).pathname.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function normalizeCandidate(record, index, inputPath, inputSources) {
  const title = String(record.title || record.name || "").trim();
  if (!title) return null;
  const sourceId = inferredSourceId(record, inputPath);
  const knownSource = inputSources.find((source) => source.id === sourceId) || sourceCatalog[sourceId];
  const sourceUrl = String(record.url || record.sourceUrl || "").trim();
  const source = knownSource || {
    id: sourceId,
    name: record.sourceName || sourceId,
    url: record.sourceHome || originOf(sourceUrl),
    kind: record.sourceKind || "外部候选源",
  };
  const candidatePath = cleanPath(record);
  return {
    id: `candidate-${shortHash(`${sourceId}|${candidatePath}|${title}|${index}`)}`,
    title,
    aliases: compact((record.aliases || []).map(String)),
    path: candidatePath,
    url: sourceUrl,
    imageUrl: String(record.imageUrl || record.image || ""),
    source,
    year: finite(record.year || record.firstSeenYear),
    status: String(record.status || "").trim(),
    origin: String(record.origin || record.originEntity || "").trim(),
    views: finite(record.views || record.kymViews),
    images: finite(record.images || record.kymImages),
    videos: finite(record.videos || record.kymVideos),
    rank: finite(record.rank || record.currentTemplateRank || record.historicalRank),
    captions: finite(record.captions || record.currentCaptionCount),
    tags: compact((record.tags || record.keywords || []).map(String)).slice(0, 12),
  };
}

function tokens(value) {
  return new Set(normalize(value).split(" ").filter((token) => token.length > 1));
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function grams(value) {
  const text = normalize(value).replace(/\s/g, "");
  const result = new Set();
  const size = text.length < 7 ? 2 : 3;
  for (let index = 0; index <= text.length - size; index += 1) result.add(text.slice(index, index + size));
  return result;
}

function dice(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return (2 * intersection) / (left.size + right.size);
}

function similarity(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  return Math.max(jaccard(tokens(a), tokens(b)), dice(grams(a), grams(b)));
}

function recordPaths(record) {
  const values = (record.variants || []).map((variant) => variant.templateId);
  try {
    values.push(new URL(record.sourceUrl).pathname);
  } catch {
    // Source URL is validated elsewhere; an absent path is simply ignored here.
  }
  return compact(values.map((value) => String(value || "").split(/[?#]/)[0].replace(/\/$/, "")));
}

function buildIndex(records) {
  const byPath = new Map();
  const byName = new Map();
  const names = [];
  for (const record of records) {
    for (const value of recordPaths(record)) byPath.set(value, record);
    for (const value of [record.name, ...(record.aliases || [])]) {
      const key = normalize(value);
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, record);
      names.push({ value, record });
    }
  }
  return { byPath, byName, names };
}

function bestMatch(candidate, index) {
  if (candidate.path && index.byPath.has(candidate.path)) {
    return { record: index.byPath.get(candidate.path), score: 1, reason: "source-path" };
  }
  for (const value of [candidate.title, ...candidate.aliases]) {
    const record = index.byName.get(normalize(value));
    if (record) return { record, score: 1, reason: "name-or-alias" };
  }
  let best = { record: null, score: 0, reason: "" };
  for (const item of index.names) {
    const score = similarity(candidate.title, item.value);
    if (score > best.score) best = { record: item.record, score, reason: `similar:${item.value}` };
  }
  return best;
}

function changedMetrics(candidate, record) {
  const comparisons = [
    ["year", candidate.year, record.firstSeenYear],
    ["views", candidate.views, record.kymViews],
    ["images", candidate.images, record.kymImages],
    ["videos", candidate.videos, record.kymVideos],
    ["rank", candidate.rank, record.currentTemplateRank ?? record.kymHistoricalRank],
    ["captions", candidate.captions, record.currentCaptionCount],
  ];
  return comparisons.filter(([, incoming, current]) => incoming !== null && current !== null && Number(incoming) !== Number(current))
    .map(([field, incoming, current]) => ({ field, incoming, current }));
}

function priority(candidate) {
  const views = Math.log10(Math.max(1, candidate.views || 0)) * 10;
  const gallery = Math.log10(Math.max(1, (candidate.images || 0) + (candidate.videos || 0))) * 6;
  const confirmed = /confirmed/i.test(candidate.status) ? 12 : /submission/i.test(candidate.status) ? -6 : 0;
  const recent = candidate.year && candidate.year >= new Date().getFullYear() - 2 ? 8 : 0;
  return Math.round((views + gallery + confirmed + recent) * 10) / 10;
}

function compactForReview(item) {
  const candidate = item.candidate;
  return {
    i: candidate.id,
    t: candidate.title,
    a: candidate.aliases,
    p: candidate.path,
    u: candidate.url,
    y: candidate.year,
    st: candidate.status,
    v: candidate.views,
    im: candidate.images,
    vi: candidate.videos,
    r: candidate.rank,
    c: candidate.captions,
    tg: candidate.tags.slice(0, 8),
    src: candidate.source.id,
    k: item.kind,
    m: item.kind === "possible-duplicate" && item.match
      ? { id: item.match.id, n: item.match.name, s: item.match.score, why: item.match.reason }
      : null,
  };
}

function writePrepareArtifacts(inputPath, candidates, analyzed, batchSize) {
  fs.mkdirSync(outputRoot, { recursive: true });
  const review = analyzed.filter((item) => item.kind === "new" || item.kind === "possible-duplicate");
  const counts = Object.fromEntries([...new Set(analyzed.map((item) => item.kind))].sort().map((kind) => [kind, analyzed.filter((item) => item.kind === kind).length]));
  const payload = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    input: path.relative(root, inputPath),
    counts: { input: candidates.length, review: review.length, ...counts },
    records: analyzed,
  };
  fs.writeFileSync(deltaPath, `${JSON.stringify(payload, null, 2)}\n`);

  const batches = [];
  for (let start = 0; start < review.length; start += batchSize) {
    batches.push({
      b: batches.length + 1,
      n: Math.min(batchSize, review.length - start),
      x: review.slice(start, start + batchSize).map(compactForReview),
    });
  }
  const batchText = `${batches.map((batch) => JSON.stringify(batch)).join("\n")}${batches.length ? "\n" : ""}`;
  fs.writeFileSync(batchPath, batchText);

  const instructions = [
    "# Meme 增量审稿",
    "",
    "只审 `review-batches.jsonl`，不要重新读取原网页全文。字段：`i` 候选 ID、`t` 标题、`a` 别名、`p/u` 来源、`y/st` 年份与状态、`v/im/vi` 浏览/图片/视频代理、`r/c` 排名/captions、`tg` 标签、`k` new 或 possible-duplicate、`m` 疑似已有家族。",
    "",
    "每个候选仅输出一行 JSON：",
    "",
    "`{\"i\":\"candidate-id\",\"d\":\"add|merge|skip\",\"target\":\"已有家族 id（仅 merge）\",\"zh\":[\"中文检索别名\"],\"lane\":\"外部基准路线\",\"relation\":\"canonical|variant|composite|parent-template\",\"note\":\"母档与变体关系\",\"mechanic\":\"可执行表达机制\",\"use\":[\"使用场景\"],\"rights\":\"权利边界\"}`",
    "",
    "规则：传播数据不是授权；Submission 不得写成 Confirmed；merge 必须指向真实已有 ID；不确定则 skip；不要复述网页正文。",
    "",
  ].join("\n");
  fs.writeFileSync(instructionPath, instructions);
  const manifest = {
    schemaVersion: "1.0.0",
    generatedAt: payload.generatedAt,
    input: payload.input,
    batchSize,
    batches: batches.length,
    counts: payload.counts,
    textVolume: {
      inputBytes: fs.statSync(inputPath).size,
      reviewBatchBytes: Buffer.byteLength(batchText),
      reductionPercent: fs.statSync(inputPath).size
        ? Math.round((1 - Buffer.byteLength(batchText) / fs.statSync(inputPath).size) * 1000) / 10
        : 0,
      note: "Byte volume is a repeatable workload proxy, not an exact model-token count.",
    },
    files: {
      delta: path.relative(root, deltaPath),
      reviewBatches: path.relative(root, batchPath),
      instructions: path.relative(root, instructionPath),
    },
    tokenPolicy: "Only new and possible-duplicate candidates enter review batches. Exact matches and numeric source updates stay out of the model prompt.",
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function prepare() {
  const inputPath = path.resolve(root, positional[0] || defaultInputPath);
  const batchSize = Math.max(1, Number(option("batch-size", "40")) || 40);
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const input = loadInput(inputPath);
  const candidates = input.records.map((record, index) => normalizeCandidate(record, index, inputPath, input.sources)).filter(Boolean);
  const index = buildIndex(data.records || []);
  const analyzed = candidates.map((candidate) => {
    const match = bestMatch(candidate, index);
    const exact = match.record && match.score === 1;
    const threshold = normalize(candidate.title).length <= 5 ? 0.92 : 0.84;
    const changes = exact ? changedMetrics(candidate, match.record) : [];
    const kind = exact
      ? changes.length ? "source-update" : "existing"
      : match.record && match.score >= threshold ? "possible-duplicate" : "new";
    return {
      kind,
      priority: priority(candidate),
      candidate,
      match: match.record ? { id: match.record.id, name: match.record.name, score: Math.round(match.score * 1000) / 1000, reason: match.reason } : null,
      changes,
    };
  }).sort((left, right) => right.priority - left.priority || left.candidate.title.localeCompare(right.candidate.title, "en"));
  const manifest = writePrepareArtifacts(inputPath, candidates, analyzed, batchSize);
  console.log(JSON.stringify(manifest, null, 2));
}

function readReview(reviewPath) {
  const text = fs.readFileSync(reviewPath, "utf8");
  const parsed = /\.jsonl$/i.test(reviewPath) ? parseJsonLines(text, reviewPath) : JSON.parse(text);
  return Array.isArray(parsed) ? parsed : parsed.records || [];
}

function toBenchmarkRecord(candidate, review) {
  return {
    title: candidate.title,
    aliases: compact([...(candidate.aliases || []), ...(review.zh || [])]),
    path: candidate.path,
    url: candidate.url,
    imageUrl: candidate.imageUrl,
    year: candidate.year,
    status: candidate.status,
    origin: candidate.origin,
    views: candidate.views,
    images: candidate.images,
    videos: candidate.videos,
    externalSourceIds: [candidate.source.id],
    benchmarkLane: review.lane || "外部增量候选",
    relationType: review.relation || "canonical",
    variantNote: review.note,
    curationStatus: /confirmed/i.test(candidate.status) ? "外部基准已核验" : "外部基准·研究中",
    curationReason: `由外部来源 ${candidate.source.name} 的增量审稿收录；本地库仅用于覆盖对照。`,
    mechanicOverride: review.mechanic,
    useCasesOverride: review.use,
    rightsLaneOverride: "原图权利待核验",
    copyrightNoteOverride: review.rights,
    productionRouteOverride: "只提取表达机制；重新设计人物、场景、道具与文字，不直接复制来源画面。",
  };
}

function applyReview() {
  const reviewPath = path.resolve(root, positional[0] || path.join(outputRoot, "reviewed.jsonl"));
  if (!fs.existsSync(deltaPath)) throw new Error(`Run prepare first: ${deltaPath}`);
  const delta = JSON.parse(fs.readFileSync(deltaPath, "utf8"));
  const candidates = new Map(delta.records.map((item) => [item.candidate.id, item]));
  const reviews = readReview(reviewPath);
  const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, "utf8"));
  benchmark.sources ||= [];
  benchmark.records ||= [];
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const byPath = new Map((benchmark.records || []).map((record) => [record.path, record]));
  const dataById = new Map((data.records || []).map((record) => [record.id, record]));
  const errors = [];
  let added = 0;
  let merged = 0;
  let skipped = 0;

  for (const review of reviews) {
    const item = candidates.get(review.i);
    if (!item) {
      errors.push(`${review.i}: candidate not found in delta`);
      continue;
    }
    if (review.d === "skip") {
      skipped += 1;
      continue;
    }
    if (!["add", "merge"].includes(review.d)) {
      errors.push(`${review.i}: invalid decision ${review.d}`);
      continue;
    }
    if (!review.note || !review.rights || !review.mechanic || !(review.zh || []).length || !Array.isArray(review.use) || !review.use.length) {
      errors.push(`${review.i}: add/merge requires zh, note, mechanic, use and rights`);
      continue;
    }
    const candidate = item.candidate;
    if (!candidate.path || !candidate.url || !candidate.source?.url) {
      errors.push(`${review.i}: source path/url/home is incomplete`);
      continue;
    }
    let record;
    if (review.d === "merge") {
      const target = dataById.get(review.target);
      if (!target) {
        errors.push(`${review.i}: merge target ${review.target} not found`);
        continue;
      }
      const targetPath = recordPaths(target)[0];
      if (!targetPath) {
        errors.push(`${review.i}: merge target has no stable source path`);
        continue;
      }
      record = byPath.get(targetPath) || {
        title: target.name,
        aliases: target.aliases || [],
        path: targetPath,
        url: target.sourceUrl,
        externalSourceIds: [],
        benchmarkLane: review.lane || "外部增量候选",
        relationType: review.relation || "canonical",
      };
      record.aliases = compact([...(record.aliases || []), candidate.title, ...(candidate.aliases || []), ...(review.zh || [])]);
      record.externalSourceIds = compact([...(record.externalSourceIds || []), candidate.source.id]);
      record.variantNote = compact([record.variantNote, review.note, `外部候选：${candidate.url}`]).join("；");
      byPath.set(targetPath, record);
      merged += 1;
    } else {
      if (byPath.has(candidate.path)) {
        errors.push(`${review.i}: benchmark path already exists; use merge`);
        continue;
      }
      record = toBenchmarkRecord(candidate, review);
      byPath.set(candidate.path, record);
      added += 1;
    }
    if (!(benchmark.sources || []).some((source) => source.id === candidate.source.id)) {
      benchmark.sources.push(candidate.source);
    }
  }

  if (errors.length) throw new Error(errors.join("\n"));
  benchmark.researchDate = new Date().toISOString().slice(0, 10);
  benchmark.records = [...byPath.values()].sort((a, b) => a.title.localeCompare(b.title, "en"));
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(previewPath, `${JSON.stringify(benchmark, null, 2)}\n`);

  if (flag("write")) {
    fs.writeFileSync(benchmarkPath, `${JSON.stringify(benchmark, null, 2)}\n`);
    if (flag("build")) {
      execFileSync(process.execPath, [path.join(root, "tools", "build-memes.mjs")], { cwd: root, stdio: "inherit" });
      execFileSync(process.execPath, [path.join(root, "tools", "validate-memes.mjs")], { cwd: root, stdio: "inherit" });
    }
  }
  console.log(JSON.stringify({ mode: flag("write") ? "written" : "preview", added, merged, skipped, preview: path.relative(root, previewPath) }, null, 2));
}

if (command === "prepare") prepare();
else if (command === "apply") applyReview();
else throw new Error(`Unknown command: ${command}. Use prepare or apply.`);
