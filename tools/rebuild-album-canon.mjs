import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const seedPath = path.join(projectRoot, "source/album-canon-seed.psv");
const outputPath = path.join(projectRoot, "source/album-license-only.json");
const cachePath = path.join(projectRoot, "source/musicbrainz-cache.json");
const appleCachePath = path.join(projectRoot, "source/apple-music-cache.json");
const userAgent = "PublicDomainVisualResearch/1.0 (https://github.com/1024BBSS/public-domain-cartoon-inspiration)";
const copyrightGuide = "https://www.copyright.gov/engage/musicians/";
const invalidVisualSources = new Set([
  "https://musicbrainz.org/release-group/0521aa7e-dabd-44dd-8846-0aae691bb48d",
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();
const normalizeTitle = (value) => normalize(value)
  .replace(/\b(volumen|volume)\b/g, "vol")
  .replace(/\b(19|20)\d{2}\s+remaster(ed)?\b.*$/, "")
  .replace(/\b(remaster(ed)?|deluxe|expanded|anniversary|special|bonus)(\s+edition)?\b.*$/, "")
  .trim();
const titleMatches = (found, wanted) => normalizeTitle(found) === normalizeTitle(wanted);
const artistMatches = (found, wanted) => {
  const foundValue = normalize(found);
  const wantedValue = normalize(wanted);
  if (!foundValue || !wantedValue) return false;
  if (foundValue === wantedValue) return true;
  const foundTokens = new Set(foundValue.split(" ").filter((token) => token !== "the"));
  const wantedTokens = new Set(wantedValue.split(" ").filter((token) => token !== "the"));
  const overlap = [...foundTokens].filter((token) => wantedTokens.has(token)).length;
  return overlap >= 2 && overlap / Math.max(foundTokens.size, wantedTokens.size) >= 0.6;
};
const sourceMatchesItem = (source, item) => titleMatches(source?.title, item.title) && artistMatches(source?.artist, item.artist);
const slug = (value) => normalize(value).replace(/\s+/g, "-").slice(0, 64) || "album";

function parseSeed(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split("|");
  return lines.map((line, index) => {
    const values = line.split("|");
    if (values.length !== headers.length) {
      throw new Error(`Seed line ${index + 2} has ${values.length} fields; expected ${headers.length}`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column].trim()]));
  });
}

function artistCredit(candidate) {
  return (candidate["artist-credit"] || []).map((part) => part.name || part.artist?.name || "").join("");
}

function candidateScore(candidate, item) {
  const candidateTitle = normalize(candidate.title);
  const wantedTitle = normalize(item.title);
  const candidateArtist = normalize(artistCredit(candidate));
  const wantedArtist = normalize(item.artist);
  const candidateYear = Number(String(candidate["first-release-date"] || "").slice(0, 4));
  const wantedYear = Number(item.year);
  let score = Number(candidate.score || 0);
  if (candidateTitle === wantedTitle) score += 140;
  else if (candidateTitle.includes(wantedTitle) || wantedTitle.includes(candidateTitle)) score += 55;
  if (candidateArtist === wantedArtist) score += 100;
  else if (candidateArtist.includes(wantedArtist) || wantedArtist.includes(candidateArtist)) score += 45;
  if (candidateYear === wantedYear) score += 50;
  else if (candidateYear && Math.abs(candidateYear - wantedYear) <= 1) score += 20;
  if (candidate["primary-type"] === "Album") score += 10;
  return score;
}

function appleCandidateScore(candidate, item) {
  const candidateTitle = normalize(candidate.collectionName);
  const wantedTitle = normalize(item.title);
  const candidateArtist = normalize(candidate.artistName);
  const wantedArtist = normalize(item.artist);
  const candidateYear = Number(String(candidate.releaseDate || "").slice(0, 4));
  const wantedYear = Number(item.year);
  let score = 0;
  if (candidateTitle === wantedTitle) score += 160;
  else if (candidateTitle.includes(wantedTitle) || wantedTitle.includes(candidateTitle)) score += 60;
  if (candidateArtist === wantedArtist) score += 100;
  else if (candidateArtist.includes(wantedArtist) || wantedArtist.includes(candidateArtist)) score += 40;
  if (candidateYear === wantedYear) score += 55;
  else if (candidateYear && Math.abs(candidateYear - wantedYear) <= 1) score += 20;
  if (candidate.collectionType === "Album") score += 10;
  return score;
}

async function appleSearch(item) {
  const candidates = [];
  for (const term of [`${item.artist} ${item.title}`, item.title]) {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", term);
    url.searchParams.set("entity", "album");
    url.searchParams.set("country", "US");
    url.searchParams.set("limit", "50");
    let response;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      response = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
      if (response.ok) break;
      if ([403, 429].includes(response.status)) return null;
      if (attempt === 5) return null;
      const retryAfter = Number(response.headers.get("retry-after") || 0) * 1000;
      await sleep(Math.max(retryAfter, response.status === 429 ? attempt * 6000 : attempt * 1800));
    }
    const payload = await response.json();
    candidates.push(...(payload.results || []));
    const selected = [...candidates]
      .filter((candidate) => titleMatches(candidate.collectionName, item.title) && artistMatches(candidate.artistName, item.artist))
      .sort((a, b) => appleCandidateScore(b, item) - appleCandidateScore(a, item))[0];
    if (selected && appleCandidateScore(selected, item) >= 130) return selected;
  }
  return null;
}

async function musicBrainzSearch(item) {
  const query = `artist:"${item.artist}" AND releasegroup:"${item.title}" AND primarytype:album`;
  const url = new URL("https://musicbrainz.org/ws/2/release-group/");
  url.searchParams.set("query", query);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "10");
  let response;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    response = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
    if (response.ok) break;
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 4) {
      throw new Error(`MusicBrainz ${response.status} for ${item.artist} — ${item.title}`);
    }
    await sleep(attempt * 2500);
  }
  const payload = await response.json();
  const candidates = payload["release-groups"] || [];
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => candidateScore(b, item) - candidateScore(a, item))[0];
}

async function wikidataReleaseGroup(item) {
  for (const term of [`${item.title} ${item.artist}`, item.title]) {
    const searchUrl = new URL("https://www.wikidata.org/w/api.php");
    searchUrl.searchParams.set("action", "wbsearchentities");
    searchUrl.searchParams.set("search", term);
    searchUrl.searchParams.set("language", "en");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("limit", "12");
    searchUrl.searchParams.set("type", "item");
    const searchResponse = await fetch(searchUrl, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
    if (!searchResponse.ok) continue;
    const searchPayload = await searchResponse.json();
    const hits = searchPayload.search || [];
    if (!hits.length) continue;

    const entityUrl = new URL("https://www.wikidata.org/w/api.php");
    entityUrl.searchParams.set("action", "wbgetentities");
    entityUrl.searchParams.set("ids", hits.map((hit) => hit.id).join("|"));
    entityUrl.searchParams.set("props", "claims|labels");
    entityUrl.searchParams.set("languages", "en");
    entityUrl.searchParams.set("format", "json");
    const entityResponse = await fetch(entityUrl, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
    if (!entityResponse.ok) continue;
    const entities = (await entityResponse.json()).entities || {};
    const candidates = [];
    for (const hit of hits) {
      const entity = entities[hit.id];
      const releaseGroupId = entity?.claims?.P436?.[0]?.mainsnak?.datavalue?.value;
      if (!releaseGroupId) continue;
      const yearValue = entity?.claims?.P577?.[0]?.mainsnak?.datavalue?.value?.time || "";
      const year = Number(String(yearValue).match(/\d{4}/)?.[0] || 0);
      const label = entity?.labels?.en?.value || hit.label || "";
      let score = 0;
      const wantedTitle = normalize(item.title);
      const foundTitle = normalize(label);
      if (wantedTitle === foundTitle) score += 140;
      else if (wantedTitle.includes(foundTitle) || foundTitle.includes(wantedTitle)) score += 55;
      if (normalize(hit.description).includes(normalize(item.artist))) score += 80;
      if (year === Number(item.year)) score += 50;
      else if (year && Math.abs(year - Number(item.year)) <= 1) score += 20;
      candidates.push({ id: releaseGroupId, title: label, artist: item.artist, releaseDate: year ? String(year) : item.year, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates[0]?.score >= 140) return candidates[0];
  }
  return null;
}

function existingReleaseGroup(item) {
  const match = String(item.visualSourceUrl || item.thumbnail || "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match?.[0] || "";
}

const seed = parseSeed(await fs.readFile(seedPath, "utf8"));
if (seed.length !== 200) throw new Error(`Expected exactly 200 canon records; found ${seed.length}`);

const existingSource = JSON.parse(await fs.readFile(outputPath, "utf8"));
const existingMap = new Map((existingSource.albums || []).map((item) => [`${normalize(item.artist)}::${normalize(item.title)}`, item]));
let cache = {};
try { cache = JSON.parse(await fs.readFile(cachePath, "utf8")); } catch {}
let appleCache = {};
try { appleCache = JSON.parse(await fs.readFile(appleCachePath, "utf8")); } catch {}

const albums = [];
let queries = 0;
for (let index = 0; index < seed.length; index += 1) {
  const item = seed[index];
  const key = `${normalize(item.artist)}::${normalize(item.title)}`;
  const existing = existingMap.get(key);
  const existingMatch = existing && sourceMatchesItem(existing.sourceMatch, item) && !invalidVisualSources.has(existing.visualSourceUrl) ? existing : null;
  const cachedMusicBrainzUrl = cache[key]?.id ? `https://musicbrainz.org/release-group/${cache[key].id}` : "";
  const cachedMusicBrainz = cache[key] && sourceMatchesItem(cache[key], item) && !invalidVisualSources.has(cachedMusicBrainzUrl) ? cache[key] : null;
  let releaseGroupId = existingReleaseGroup(existingMatch || {}) || cachedMusicBrainz?.id || "";
  let releaseDate = cachedMusicBrainz?.releaseDate || existingMatch?.sourceMatch?.firstReleaseDate || "";
  let matchedTitle = cachedMusicBrainz?.title || existingMatch?.sourceMatch?.title || "";
  let matchedArtist = cachedMusicBrainz?.artist || existingMatch?.sourceMatch?.artist || "";
  let thumbnail = existingMatch?.thumbnail || "";
  let visualSourceUrl = existingMatch?.visualSourceUrl || "";
  let sourceProvider = existingMatch?.sourceProvider || "";
  const cachedApple = appleCache[key];
  if (!releaseGroupId && cachedApple && sourceMatchesItem(cachedApple, item)) {
    thumbnail = cachedApple.thumbnail;
    visualSourceUrl = cachedApple.visualSourceUrl;
    releaseDate = cachedApple.releaseDate;
    matchedTitle = cachedApple.title;
    matchedArtist = cachedApple.artist;
    sourceProvider = "Apple Music";
  }
  if (!releaseGroupId && !thumbnail) {
    const match = await appleSearch(item);
    queries += 1;
    if (match) {
      thumbnail = String(match.artworkUrl100 || "").replace(/100x100bb/, "600x600bb");
      visualSourceUrl = match.collectionViewUrl || "";
      releaseDate = match.releaseDate || "";
      matchedTitle = match.collectionName || "";
      matchedArtist = match.artistName || "";
      sourceProvider = "Apple Music";
      appleCache[key] = { thumbnail, visualSourceUrl, releaseDate, title: matchedTitle, artist: matchedArtist, collectionId: match.collectionId };
      await fs.writeFile(appleCachePath, `${JSON.stringify(appleCache, null, 2)}\n`, "utf8");
    }
    await sleep(420);
  }
  if (releaseGroupId && !thumbnail) thumbnail = `https://coverartarchive.org/release-group/${releaseGroupId}/front-500`;
  if (releaseGroupId && !visualSourceUrl) visualSourceUrl = `https://musicbrainz.org/release-group/${releaseGroupId}`;
  if (releaseGroupId && !sourceProvider) sourceProvider = "MusicBrainz / Cover Art Archive";
  if (!thumbnail || !visualSourceUrl) {
    const wikidataMatch = await wikidataReleaseGroup(item);
    const match = wikidataMatch || await musicBrainzSearch(item);
    queries += 1;
    if (!match) throw new Error(`No album artwork source: ${item.artist} — ${item.title}`);
    releaseGroupId = match.id;
    releaseDate = match["first-release-date"] || match.releaseDate || "";
    matchedTitle = match.title || "";
    matchedArtist = artistCredit(match) || match.artist || item.artist;
    thumbnail = `https://coverartarchive.org/release-group/${releaseGroupId}/front-500`;
    visualSourceUrl = `https://musicbrainz.org/release-group/${releaseGroupId}`;
    sourceProvider = "MusicBrainz / Cover Art Archive";
    cache[key] = { id: releaseGroupId, releaseDate, title: matchedTitle, artist: matchedArtist };
    await fs.writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
    await sleep(1100);
  }

  const tierScore = item.tier === "核心经典" ? 90 : item.tier === "类型经典" ? 78 : 68;
  const id = existing?.id || `album-${slug(item.artist)}-${slug(item.title)}-${item.year}`;
  albums.push({
    id,
    title: item.title,
    artist: item.artist,
    year: item.year,
    decade: `${Math.floor(Number(item.year) / 10) * 10}s`,
    genre: item.genre,
    genreGroup: item.genreGroup,
    visualFamily: item.visualFamily,
    visualType: item.visualType,
    grammar: item.grammar,
    classicReason: item.classicReason,
    canonTier: item.tier,
    classicScore: tierScore,
    rank: index + 1,
    opportunity: `可研究“${item.grammar}”的结构关系；更换主体、字体、色彩和品牌语境，形成原创表达。`,
    rightsGate: existing?.rightsGate || "封面摄影、插画、设计，以及艺人姓名、肖像和厂牌标识通常仍受保护；本条只作研究，商业使用需另行授权。",
    pathStatus: existing?.pathStatus || "需授权 · 权利方待核",
    releaseGroupId: releaseGroupId || undefined,
    thumbnail,
    visualSourceUrl,
    licenseUrl: existing?.licenseUrl || copyrightGuide,
    sourceProvider,
    sourceMatch: {
      title: matchedTitle || item.title,
      artist: matchedArtist || item.artist,
      firstReleaseDate: releaseDate || item.year,
    },
  });
  if ((index + 1) % 20 === 0) console.log(`resolved ${index + 1}/200`);
}

const output = {
  schemaVersion: "2.0",
  sourceVersion: "classic-album-cover-canon-2026-09-16-v3",
  researchDate: "2026-09-16",
  scope: "近 70 年经典专辑封面视觉研究母库。现代封面均为研究参考，不代表可直接商业使用。",
  selectionStandard: {
    dimensions: ["视觉识别力", "艺术创新", "文化传播", "音乐与形象统一", "跨代持续性", "资料可核验"],
    tiers: { "核心经典": 90, "类型经典": 78, "新经典": 68 },
  },
  selectionSources: [
    { label: "Recording Academy · Best Album Cover criteria", url: "https://naras.a.bigcontent.io/v1/static/68_Rulebook_06.10.2025" },
    { label: "GRAMMY · Iconic Album Covers", url: "https://live.grammy.com/news/iconic-album-covers" },
    { label: "Country Music Hall of Fame · cover-linked artifacts", url: "https://www.countrymusichalloffame.org/press/releases/abbeville-press-to-publish-book-featuring-iconic-artifacts-and-images-from-the-country-music-hall-of-fame-and-museums-collection" },
    { label: "U.S. Copyright Office · album cover art", url: copyrightGuide },
  ],
  albums,
};
await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ albums: albums.length, sourceQueries: queries, output: path.relative(projectRoot, outputPath) }, null, 2));
