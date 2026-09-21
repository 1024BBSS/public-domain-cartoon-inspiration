import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const surveyPath = path.join(projectRoot, "source", "yougov-us-fame.json");
const outputPath = path.join(projectRoot, "source", "wikidata-taxonomy.json");
const progressPath = path.join(projectRoot, "source", ".wikidata-taxonomy-progress.json");
const endpoint = "https://www.wikidata.org/w/api.php";
const userAgent = "PublicDomainInspirationResearch/1.0 (https://github.com/1024BBSS/public-domain-cartoon-inspiration)";
const BATCH_SIZE = 40;

const survey = JSON.parse(await fs.readFile(surveyPath, "utf8"));

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function titleCandidates(record) {
  const name = record.youGovName?.trim();
  if (!name) return [];
  const candidates = [name];
  const suffixes = {
    Movies: ["film"],
    "TV Show": ["TV series", "American TV series", "TV program"],
    "Fiction Book": ["novel", "book"],
    "Non-Fiction Book": ["book"],
    "Children Fiction Book": ["children's book", "book"],
    "Video Game": ["video game"],
    Musical: ["musical"],
    Play: ["play"],
    Magazine: ["magazine"],
    "Radio Program": ["radio program"],
    "TV Network & Streaming Service": ["TV network"],
  };
  for (const suffix of suffixes[record.primaryType] || []) candidates.push(`${name} (${suffix})`);
  return unique(candidates);
}

async function apiRequest(params, attempt = 1) {
  const body = new URLSearchParams({
    action: "wbgetentities",
    format: "json",
    origin: "*",
    ...params,
  });
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
    });
    if (response.ok) return response.json();
    const detail = (await response.text()).slice(0, 240);
    if (attempt < 5 && [429, 500, 502, 503, 504].includes(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
      return apiRequest(params, attempt + 1);
    }
    throw new Error(`Wikidata API ${response.status}: ${detail}`);
  } catch (error) {
    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
      return apiRequest(params, attempt + 1);
    }
    throw error;
  }
}

function claimIds(entity, property) {
  return unique((entity.claims?.[property] || [])
    .map((claim) => claim.mainsnak?.datavalue?.value?.id)
    .filter(Boolean));
}

function compactEntity(entity) {
  return {
    id: entity.id,
    title: entity.sitelinks?.enwiki?.title || "",
    label: entity.labels?.en?.value || entity.sitelinks?.enwiki?.title || "",
    description: entity.descriptions?.en?.value || "",
    sitelinks: Object.keys(entity.sitelinks || {}).length,
    instanceIds: claimIds(entity, "P31"),
    genreIds: claimIds(entity, "P136"),
    occupationIds: claimIds(entity, "P106"),
    sportIds: claimIds(entity, "P641"),
  };
}

function expectedTerms(type) {
  const map = {
    Movies: ["film", "movie"],
    "TV Show": ["television", "tv series", "sitcom", "show"],
    "Music Artist": ["singer", "musician", "band", "rapper", "composer", "music"],
    Actor: ["actor", "actress", "comedian"],
    "TV Personality": ["television", "host", "presenter", "personality", "journalist", "comedian"],
    Director: ["director", "filmmaker"],
    Artist: ["artist", "painter", "sculptor", "photographer", "illustrator"],
    Writer: ["writer", "author", "novelist", "poet"],
    "Fiction Book": ["novel", "book", "literary"],
    "Children Fiction Book": ["children", "novel", "book"],
    "Non-Fiction Book": ["book", "memoir", "biography", "non-fiction"],
    "Video Game": ["video game"],
    Musical: ["musical"],
    Play: ["play", "drama"],
    Magazine: ["magazine", "periodical"],
    "Radio Program": ["radio", "podcast"],
    "TV Network & Streaming Service": ["network", "channel", "streaming", "television"],
    Influencer: ["internet", "creator", "influencer", "youtuber", "tiktoker"],
    Columnist: ["columnist", "journalist", "writer"],
    "Classical Composer": ["composer", "classical"],
    "Music Festival": ["festival", "music"],
    Event: ["event", "award", "festival"],
  };
  return map[type] || [];
}

function entityScore(record, entity) {
  const name = normalize(record.youGovName);
  const candidates = titleCandidates(record).map(normalize);
  const typedCandidates = candidates.slice(1);
  const title = normalize(entity.title);
  const label = normalize(entity.label);
  const description = normalize(entity.description);
  const expected = expectedTerms(record.primaryType).map(normalize);
  const matchesExpectedType = expected.some((term) => description.includes(term));
  let score = 0;
  if (typedCandidates.includes(title)) score += 220;
  else if (candidates.includes(title)) score += 90;
  if (label === name) score += 55;
  if (title === name) score += 70;
  if (title.startsWith(`${name} `)) score += 28;
  if (matchesExpectedType) score += 120;
  else if (expected.length) score -= 100;
  score += Math.min(20, Math.floor((entity.sitelinks || 0) / 10));
  return score;
}

const uniqueRecords = [];
const seenRecords = new Set();
for (const record of survey.universeRecords || []) {
  const key = `${normalize(record.youGovName)}|${record.primaryType || ""}`;
  if (!normalize(record.youGovName) || seenRecords.has(key)) continue;
  seenRecords.add(key);
  uniqueRecords.push(record);
}

const titles = unique(uniqueRecords.flatMap(titleCandidates));
let progress = { completedTitles: [], entities: [] };
try {
  progress = JSON.parse(await fs.readFile(progressPath, "utf8"));
} catch {}
const completedTitles = new Set(progress.completedTitles || []);
const entities = new Map((progress.entities || []).map((entity) => [entity.id, entity]));
const pendingTitles = titles.filter((title) => !completedTitles.has(title));
for (let index = 0; index < pendingTitles.length; index += BATCH_SIZE) {
  const batch = pendingTitles.slice(index, index + BATCH_SIZE);
  const payload = await apiRequest({
    sites: "enwiki",
    titles: batch.join("|"),
    props: "labels|descriptions|claims|sitelinks",
    languages: "en",
    redirects: "yes",
  });
  for (const entity of Object.values(payload.entities || {})) {
    if (!entity.id || entity.id === "-1" || entity.missing !== undefined) continue;
    entities.set(entity.id, compactEntity(entity));
  }
  batch.forEach((title) => completedTitles.add(title));
  const doneCount = completedTitles.size;
  if ((index / BATCH_SIZE) % 10 === 0 || index + BATCH_SIZE >= pendingTitles.length) {
    await fs.writeFile(progressPath, `${JSON.stringify({ completedTitles: [...completedTitles], entities: [...entities.values()] })}\n`, "utf8");
    process.stdout.write(`titles ${doneCount}/${titles.length} · entities ${entities.size}\n`);
  }
  await new Promise((resolve) => setTimeout(resolve, 120));
}

const entityList = [...entities.values()];
const entityByLookup = new Map();
for (const entity of entityList) {
  for (const candidate of [entity.title, entity.label]) {
    const key = normalize(candidate);
    if (!key) continue;
    const existing = entityByLookup.get(key);
    if (!existing || entity.sitelinks > existing.sitelinks) entityByLookup.set(key, entity);
  }
}

const matched = [];
for (const record of uniqueRecords) {
  const candidates = titleCandidates(record).map((title) => entityByLookup.get(normalize(title))).filter(Boolean);
  const exactLabel = entityByLookup.get(normalize(record.youGovName));
  if (exactLabel) candidates.push(exactLabel);
  const ranked = unique(candidates.map((item) => item.id))
    .map((id) => entities.get(id))
    .map((entity) => ({ entity, score: entityScore(record, entity) }))
    .sort((a, b) => b.score - a.score || b.entity.sitelinks - a.entity.sitelinks);
  if (!ranked.length || ranked[0].score < 95) continue;
  matched.push({ record, entity: ranked[0].entity, matchScore: ranked[0].score });
}

const referencedIds = unique(matched.flatMap(({ entity }) => [
  ...entity.instanceIds,
  ...entity.genreIds,
  ...entity.occupationIds,
  ...entity.sportIds,
]));
const labels = {};
for (let index = 0; index < referencedIds.length; index += BATCH_SIZE) {
  const batch = referencedIds.slice(index, index + BATCH_SIZE);
  const payload = await apiRequest({
    ids: batch.join("|"),
    props: "labels",
    languages: "en",
  });
  for (const entity of Object.values(payload.entities || {})) {
    if (entity.id && entity.labels?.en?.value) labels[entity.id] = entity.labels.en.value;
  }
  if ((index / BATCH_SIZE) % 10 === 0 || index + BATCH_SIZE >= referencedIds.length) {
    process.stdout.write(`labels ${Math.min(index + BATCH_SIZE, referencedIds.length)}/${referencedIds.length}\n`);
  }
  await new Promise((resolve) => setTimeout(resolve, 120));
}

const records = matched.map(({ record, entity, matchScore }) => ({
  key: `${normalize(record.youGovName)}|${record.primaryType || ""}`,
  name: record.youGovName,
  primaryType: record.primaryType || "",
  sourceCategory: record.sourceCategory || "",
  wikidataId: entity.id,
  wikidataTitle: entity.title,
  wikidataLabel: entity.label,
  wikidataDescription: entity.description,
  wikidataSitelinks: entity.sitelinks,
  matchScore,
  instances: entity.instanceIds.map((id) => labels[id]).filter(Boolean),
  genres: entity.genreIds.map((id) => labels[id]).filter(Boolean),
  occupations: entity.occupationIds.map((id) => labels[id]).filter(Boolean),
  sports: entity.sportIds.map((id) => labels[id]).filter(Boolean),
})).sort((a, b) => a.key.localeCompare(b.key, "en"));

const byType = {};
for (const record of records) byType[record.primaryType] = (byType[record.primaryType] || 0) + 1;
const output = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  sourceLabel: "Wikidata",
  sourceUrl: "https://www.wikidata.org/",
  apiUrl: endpoint,
  license: "CC0 1.0",
  boundary: "用于主题分类与检索线索；标签可能不完整，未匹配项继续使用人工规则并标记置信度。",
  stats: {
    surveyRecords: uniqueRecords.length,
    queriedTitles: titles.length,
    matchedRecords: records.length,
    unmatchedRecords: uniqueRecords.length - records.length,
    matchRate: Number((records.length / uniqueRecords.length * 100).toFixed(1)),
    referencedLabels: Object.keys(labels).length,
    byType,
  },
  records,
};

await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
await fs.rm(progressPath, { force: true });
process.stdout.write(`${JSON.stringify(output.stats, null, 2)}\n`);
