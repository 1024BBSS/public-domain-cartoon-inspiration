import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const seedPath = path.join(projectRoot, "source", "super-ip-us-seed.json");
const outputPath = path.join(projectRoot, "source", "yougov-us-fame.json");

const ADULT_POPULATION = 258343281;
const MIN_100M_EQUIVALENT_PERCENT = Math.ceil((100000000 / ADULT_POPULATION) * 100);
const CATEGORY_SLUGS = [
  "all-time-tv-shows",
  "current-tv-shows",
  "action-movies",
  "comedy-movies",
  "horror-movies",
  "animation-movies",
  "scifi-fantasy-movies",
  "pre-1980-movies",
  "pixar-movies",
  "marvel-movies",
  "x-men-movies",
  "star-wars-movies",
  "james-bond-movies",
  "harry-potter-movies",
  "drama-movies",
  "thriller-movies",
  "all-time-music-artists",
  "pop-artists",
  "country-music-artists",
  "rap-hiphop-artists",
  "contemporary-music-artists",
  "rnb-urban-artists",
  "soul-funk-artists",
  "reggae-artists",
  "artists",
  "historical-figures",
  "sport-events",
  "national-religious-events",
  "events",
];

const NAME_ALIASES = new Map([
  ["olympics", "olympic games"],
  ["nfl national football league", "nfl"],
  ["star wars episode iv a new hope", "star wars"],
  ["star wars episode v the empire strikes back", "star wars"],
  ["star wars episode vi return of the jedi", "star wars"],
  ["harry potter and the order of the phoenix", "harry potter"],
  ["harry potter and the prisoner of azkaban", "harry potter"],
  ["harry potter and the deathly hallows part 1", "harry potter"],
  ["halloween 2018", "halloween"],
  ["child s play 1988", "child s play"],
  ["scream 2022", "scream"],
  ["kentucky derby", "kentucky derby"],
]);

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/\([^)]*\)/g, "")
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseSeedItem(raw) {
  if (typeof raw === "string") {
    const [name, nameZh = "", aliases = ""] = raw.split("|").map((part) => part.trim());
    return { name, nameZh, aliases: aliases ? aliases.split(",").map((item) => item.trim()).filter(Boolean) : [] };
  }
  return raw;
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 public-domain-research-tool" } });
      if (response.ok) return response;
      lastError = new Error(`${response.status} ${url}`);
      if (response.status < 500 || attempt === 4) break;
    } catch (error) {
      lastError = error;
      if (attempt === 4) break;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 400));
  }
  throw lastError;
}

async function fetchText(url) {
  return (await fetchWithRetry(url)).text();
}

async function fetchJson(url) {
  return (await fetchWithRetry(url)).json();
}

const seed = JSON.parse(await fs.readFile(seedPath, "utf8"));
const targetByNormalizedName = new Map();
for (const group of seed.groups || []) {
  for (const raw of group.items || []) {
    const item = parseSeedItem(raw);
    for (const candidate of [item.name, ...(item.aliases || [])]) {
      const key = normalize(candidate);
      if (key && !targetByNormalizedName.has(key)) targetByNormalizedName.set(key, item.name);
    }
  }
}

const categorySnapshots = [];
const bestByTarget = new Map();

for (const slug of CATEGORY_SLUGS) {
  const pageUrl = `https://yougov.com/en-us/ratings/${slug}?sortBy=fame`;
  const html = await fetchText(pageUrl);
  const groupId = html.match(/search\/entity\/\?group=([0-9a-f-]+)/)?.[1];
  if (!groupId) throw new Error(`YouGov group id missing: ${slug}`);
  const period = html.match(/Data collection period:\s*([^<]+)/)?.[1]?.trim() || "2026 · quarter pending readback";
  const apiUrl = `https://api-test.yougov.com/public-data/v5/us/search/entity/?group=${groupId}&sort_by=fame&limit=20&offset=0`;
  const payload = await fetchJson(apiUrl);
  const sourceRecords = payload.data || [];
  categorySnapshots.push({ slug, pageUrl, groupId, period, sourceCount: sourceRecords.length });

  for (const source of sourceRecords) {
    const famePercent = Number(source.rating_data?.fame);
    if (!Number.isFinite(famePercent)) continue;
    const rawKey = normalize(source.name);
    const targetKey = NAME_ALIASES.get(rawKey) || rawKey;
    const targetName = targetByNormalizedName.get(targetKey);
    if (!targetName) continue;
    const candidate = {
      targetName,
      youGovName: source.name,
      famePercent,
      popularityPercent: Number(source.rating_data?.popularity) || null,
      adultPopulationEquivalent: Math.round((famePercent / 100) * ADULT_POPULATION),
      qualifies100mEquivalent: famePercent >= MIN_100M_EQUIVALENT_PERCENT,
      period,
      sourcePage: pageUrl,
      sourceCategory: slug,
      imageUrl: source.image || "",
      sourceEntitySlug: source.url || "",
    };
    const previous = bestByTarget.get(targetName);
    if (!previous || candidate.famePercent > previous.famePercent) bestByTarget.set(targetName, candidate);
  }
}

const records = [...bestByTarget.values()].sort((a, b) => b.famePercent - a.famePercent || a.targetName.localeCompare(b.targetName, "en"));
const snapshot = {
  schemaVersion: "1.0",
  sourceVersion: `yougov-us-fame-${new Date().toISOString().slice(0, 10)}`,
  generatedAt: new Date().toISOString(),
  market: "United States",
  methodology: {
    source: "YouGov Ratings",
    sourceUrl: "https://yougov.com/en-us/ratings",
    measure: "Fame is the share of surveyed U.S. adults who have heard of the entity.",
    sampleBoundary: "YouGov survey percentage; not unique viewers, buyers, or a commercial-use license.",
    adultPopulationReference: ADULT_POPULATION,
    adultPopulationDate: "2020-04-01",
    adultPopulationSource: "U.S. Census Bureau",
    adultPopulationUrl: "https://www.census.gov/library/stories/2021/08/united-states-adult-population-grew-faster-than-nations-total-population-from-2010-to-2020.html",
    minPercentFor100mEquivalent: MIN_100M_EQUIVALENT_PERCENT,
    equivalentBoundary: "Survey percentage multiplied by the 2020 adult population. This is an estimate, not a directly measured audience count.",
  },
  categories: categorySnapshots,
  counts: {
    matchedRecords: records.length,
    equivalent100m: records.filter((item) => item.qualifies100mEquivalent).length,
  },
  records,
};

await fs.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(snapshot.counts, null, 2)}\n`);
