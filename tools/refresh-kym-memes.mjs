import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outputPath = path.join(root, "source", "meme-kym-snapshot.json");
const BASE = "https://knowyourmeme.com";
const USER_AGENT = "Mozilla/5.0 public-domain-cartoon-inspiration/2.0 evidence-cache";
const TOP_PAGES = Number(process.env.KYM_TOP_PAGES || 40);
const NEWEST_PAGES = Number(process.env.KYM_NEWEST_PAGES || 20);
const CONCURRENCY = Number(process.env.KYM_CONCURRENCY || 6);
const researchDate = new Date().toISOString().slice(0, 10);

const fixedEditorials = [
  {
    url: "https://knowyourmeme.com/editorials/poll/kym-review-the-top-20-memes-of-2024",
    label: "KYM 2024 年度 Top 20",
    signal: "annual-2024",
  },
  {
    url: "https://knowyourmeme.com/editorials/the-know-your-meme-staffs-favorite-memes-of-2024",
    label: "KYM 2024 编辑精选",
    signal: "staff-2024",
  },
  {
    url: "https://knowyourmeme.com/editorials/poll/meme-of-the-year-the-top-20-memes-of-2025",
    label: "KYM 2025 年度 Top 20",
    signal: "annual-2025",
  },
  {
    url: "https://knowyourmeme.com/editorials/the-know-your-meme-staffs-favorite-memes-of-2025",
    label: "KYM 2025 编辑精选",
    signal: "staff-2025",
  },
  {
    url: "https://trending.knowyourmeme.com/editorials/meme-review/the-weekly-meme-roundup-doomsdale-squirrel-in-a-tornado-lets-groove-and-more",
    label: "KYM 2026-09-04 周度 Meme Review",
    signal: "recent-editorial",
  },
  {
    url: "https://trending.knowyourmeme.com/editorials/meme-review/the-weekly-meme-roundup-cant-do-nathan-elizabeth-holmes-things-to-say-and-more",
    label: "KYM 2026-09-11 周度 Meme Review",
    signal: "recent-editorial",
  },
  {
    url: "https://trending.knowyourmeme.com/editorials/meme-review/the-weekly-meme-roundup-robert-pattinson-lyrics-speed-gta-gavin-dorman-and-more",
    label: "KYM 2026-09-18 周度 Meme Review",
    signal: "recent-editorial",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "accept-language": "en-US,en;q=0.9",
          "user-agent": USER_AGENT,
        },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 900);
    }
  }
  throw lastError;
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function stripHtml(value = "") {
  return decodeHtml(String(value).replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function attribute(attrs, name) {
  const match = String(attrs).match(new RegExp(`${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return decodeHtml(match?.[1] ?? match?.[2] ?? "");
}

function numberFrom(value) {
  const match = String(value || "").match(/[\d,]+/);
  return match ? Number(match[0].replace(/,/g, "")) : null;
}

function absoluteUrl(value) {
  if (!value) return "";
  return new URL(decodeHtml(value), BASE).href;
}

function parseListing(html, source, page) {
  const items = [];
  const pattern = /<a class="item"([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const title = attribute(match[1], "data-title");
    const href = attribute(match[1], "href");
    const image = attribute(match[2], "data-image") || attribute(match[2], "src");
    if (!title || !href || !href.startsWith("/memes/")) continue;
    items.push({
      title,
      path: href.split(/[?#]/)[0],
      url: absoluteUrl(href),
      imageUrl: absoluteUrl(image),
      listingSource: source,
      listingPage: page,
      listingRank: (page - 1) * 16 + items.length + 1,
    });
  }
  return items;
}

function parseEditorialSelections(html) {
  const body = html.match(/<article class=["']article["']>([\s\S]*?)<\/article>/i)?.[1] || "";
  const headings = [...body.matchAll(/<h([234])[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const selections = [];
  const seen = new Set();
  for (const [index, heading] of headings.entries()) {
    const label = stripHtml(heading[2]);
    if (/^(related entries|categories|today'?s|sign up|comments)/i.test(label)) break;
    if (!label || /^(poll|meme review|honorable mentions)/i.test(label)) continue;
    const start = heading.index + heading[0].length;
    const end = headings[index + 1]?.index ?? body.length;
    const section = body.slice(start, end);
    const links = [...section.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
    const stopwords = new Set(["and", "the", "with", "that", "this", "from", "into", "for", "you", "your", "its", "are", "was", "not", "but", "meme", "memes"]);
    const headingTokens = new Set(label.toLowerCase()
      .replace(/^\d+\.\s*/, "")
      .replace(/\([^)]*(?:votes?|vote)[^)]*\)/gi, "")
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 2 && !stopwords.has(token)));
    const candidates = [];
    for (const match of links) {
      const href = attribute(match[1], "href");
      let parsed;
      try {
        parsed = new URL(href, BASE);
      } catch {
        continue;
      }
      if (parsed.hostname !== "knowyourmeme.com" || !parsed.pathname.startsWith("/memes/")) continue;
      if (parsed.pathname.split("/").filter(Boolean).length < 2) continue;
      const anchorText = stripHtml(match[2]);
      const decodedPath = decodeURIComponent(parsed.pathname).replace(/[^a-z0-9]+/gi, " ").toLowerCase();
      const candidateText = `${anchorText} ${decodedPath}`.toLowerCase();
      const overlap = [...headingTokens].filter((token) => candidateText.includes(token)).length;
      const pathOverlap = [...headingTokens].filter((token) => decodedPath.includes(token)).length;
      candidates.push({ path: parsed.pathname.replace(/\/$/, ""), overlap, pathOverlap, anchorText });
    }
    const selected = candidates.sort((a, b) => b.overlap - a.overlap || b.pathOverlap - a.pathOverlap || b.anchorText.length - a.anchorText.length)[0];
    const selectedPath = selected?.overlap > 0 && selected?.pathOverlap > 0 ? selected.path : "";
    if (!selectedPath || seen.has(selectedPath)) continue;
    seen.add(selectedPath);
    selections.push({ path: selectedPath, selection: label });
  }
  return selections;
}

function parseMemeReviewHub(html) {
  const urls = [];
  const seen = new Set();
  const pattern = /href=(?:"([^"]+)"|'([^']+)')/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const href = decodeHtml(match[1] || match[2] || "");
    let url;
    try {
      url = new URL(href, BASE);
    } catch {
      continue;
    }
    if (!url.pathname.includes("/editorials/meme-review/")) continue;
    if (!/weekly-meme-roundup|meme-of-the-month|top-memes|favorite-memes/i.test(url.pathname)) continue;
    const clean = `${url.origin}${url.pathname}`;
    if (seen.has(clean)) continue;
    seen.add(clean);
    urls.push(clean);
    if (urls.length >= 16) break;
  }
  return urls;
}

function metaValue(block, label) {
  const pattern = new RegExp(`<dt>\\s*${label}:?\\s*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`, "i");
  return stripHtml(block.match(pattern)?.[1] || "");
}

function parseDetail(html, listing) {
  const bodyStart = html.lastIndexOf("id='entry_body'");
  const body = bodyStart >= 0 ? html.slice(bodyStart) : html;
  const title = stripHtml(html.match(/<h1 class=['"]content-title(?: entry-title)?['"]>([\s\S]*?)<\/h1>/i)?.[1]) || listing.title;
  const category = stripHtml(body.match(/class=["']entry-category-badge["'][^>]*>([\s\S]*?)<\/a>/i)?.[1]);
  const status = metaValue(body, "Status");
  const types = metaValue(body, "Type").split(/\s*,\s*/).filter(Boolean);
  const year = numberFrom(metaValue(body, "Year"));
  const origin = metaValue(body, "Origin");
  const region = metaValue(body, "Region");
  const views = numberFrom(html.match(/<dd class=['"]views['"][^>]*title=['"]([^'"]+)/i)?.[1]);
  const videos = numberFrom(html.match(/<dd class=['"]videos['"][^>]*title=['"]([^'"]+)/i)?.[1]);
  const images = numberFrom(html.match(/<dd class=['"]photos['"][^>]*title=['"]([^'"]+)/i)?.[1]);
  const addedAt = html.match(/Added\s*<abbr[^>]*title=['"]([^'"]+)/i)?.[1] || "";
  const updatedAt = html.match(/Updated\s*<abbr[^>]*title=['"]([^'"]+)/i)?.[1] || "";
  const parentSeries = stripHtml(html.match(/<h5 class=['"]parent['"]>[\s\S]*?<span><a[^>]*>([\s\S]*?)<\/a>/i)?.[1]);
  const tagsBlock = body.match(/<dl id=['"]entry_tags['"]>([\s\S]*?)<\/dl>/i)?.[1] || "";
  const tags = [...tagsBlock.matchAll(/data-tag=(?:"([^"]+)"|'([^']+)')/gi)]
    .map((item) => decodeHtml(item[1] || item[2] || ""))
    .filter(Boolean);
  const ogImage = html.match(/<meta[^>]*property=['"]og:image['"][^>]*content=['"]([^'"]+)/i)?.[1]
    || html.match(/<meta[^>]*content=['"]([^'"]+)['"][^>]*property=['"]og:image['"]/i)?.[1];
  const imageUrl = absoluteUrl(ogImage || listing.imageUrl);
  return {
    ...listing,
    title,
    category,
    status,
    types,
    year,
    origin,
    region,
    views,
    images,
    videos,
    addedAt,
    updatedAt,
    parentSeries,
    tags,
    imageUrl,
  };
}

async function fetchListings() {
  const jobs = [];
  for (let page = 1; page <= TOP_PAGES; page += 1) {
    jobs.push({ source: "views", page, url: `${BASE}/memes?kind=confirmed&sort=views&page=${page}` });
  }
  for (let page = 1; page <= NEWEST_PAGES; page += 1) {
    jobs.push({ source: "newest", page, url: `${BASE}/memes?kind=confirmed&sort=newest&page=${page}` });
  }
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
    while (cursor < jobs.length) {
      const index = cursor;
      cursor += 1;
      const job = jobs[index];
      const html = await fetchText(job.url);
      results[index] = parseListing(html, job.source, job.page);
      if ((index + 1) % 12 === 0 || index + 1 === jobs.length) {
        console.log(`listing ${index + 1}/${jobs.length}`);
      }
    }
  });
  await Promise.all(workers);
  return results.flat();
}

async function fetchEditorials() {
  const hubHtml = await fetchText(`${BASE}/newsfeed/meme-review`);
  const recentUrls = parseMemeReviewHub(hubHtml);
  const editorialSources = [
    ...fixedEditorials,
    ...recentUrls.map((url) => ({
      url,
      label: `KYM 近期编辑榜：${url.split("/").pop().replace(/-/g, " ")}`,
      signal: "recent-editorial",
    })),
  ];
  const evidenceByPath = new Map();
  for (const editorial of editorialSources) {
    try {
      const html = await fetchText(editorial.url);
      const articleBody = html.match(/<article class=["']article["']>([\s\S]*?)<\/article>/i)?.[1] || html;
      const title = stripHtml(articleBody.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || editorial.label;
      const publishedAt = html.match(/Published\s+([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i)?.[1] || "";
      for (const selected of parseEditorialSelections(html)) {
        const memePath = selected.path;
        if (!evidenceByPath.has(memePath)) evidenceByPath.set(memePath, []);
        evidenceByPath.get(memePath).push({
          label: editorial.label,
          selection: selected.selection,
          articleTitle: title,
          url: editorial.url,
          signal: editorial.signal,
          publishedAt,
        });
      }
    } catch (error) {
      console.warn(`editorial failed ${editorial.url}: ${error.message}`);
    }
  }
  return { evidenceByPath, editorialSources };
}

if (process.argv.includes("--sanitize-existing")) {
  if (!fs.existsSync(outputPath)) throw new Error(`Missing existing snapshot: ${outputPath}`);
  const snapshot = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  const stopwords = new Set(["and", "the", "with", "that", "this", "from", "into", "for", "you", "your", "its", "are", "was", "not", "but", "meme", "memes"]);
  const tokens = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((token) => token.length >= 2 && !stopwords.has(token));
  let removed = 0;
  let linked = 0;
  for (const record of snapshot.records || []) {
    const recordTokens = new Set(tokens(record.title));
    const before = record.editorialEvidence || [];
    record.editorialEvidence = before.filter((evidence) => tokens(evidence.selection).some((token) => recordTokens.has(token)));
    removed += before.length - record.editorialEvidence.length;
    if (record.editorialEvidence.length) linked += 1;
  }
  snapshot.generatedAt = new Date().toISOString();
  snapshot.counts.editorialLinked = linked;
  fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, records: snapshot.records.length, editorialLinked: linked, removed }, null, 2));
  process.exit(0);
}

if (process.argv.includes("--editorials-only")) {
  if (!fs.existsSync(outputPath)) throw new Error(`Missing existing snapshot: ${outputPath}`);
  const snapshot = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  const editorialResult = await fetchEditorials();
  let linked = 0;
  for (const record of snapshot.records || []) {
    record.editorialEvidence = editorialResult.evidenceByPath.get(record.path) || [];
    if (record.editorialEvidence.length) linked += 1;
  }
  snapshot.generatedAt = new Date().toISOString();
  snapshot.researchDate = researchDate;
  snapshot.sourceVersion = `kym-meme-evidence-${researchDate}`;
  snapshot.sources.editorials = editorialResult.editorialSources;
  snapshot.counts.editorialLinked = linked;
  fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, records: snapshot.records.length, editorialLinked: linked }, null, 2));
  process.exit(0);
}

const [listingItems, editorialResult] = await Promise.all([fetchListings(), fetchEditorials()]);
const byPath = new Map();
for (const item of listingItems) {
  if (!byPath.has(item.path)) byPath.set(item.path, { ...item, listingSignals: [] });
  const target = byPath.get(item.path);
  target.listingSignals.push({
    source: item.listingSource,
    page: item.listingPage,
    rank: item.listingRank,
  });
  if (item.listingSource === "views") target.historicalRank = item.listingRank;
  if (item.listingSource === "newest") target.newestRank = item.listingRank;
}
for (const [memePath, editorialEvidence] of editorialResult.evidenceByPath.entries()) {
  if (!byPath.has(memePath)) {
    byPath.set(memePath, {
      title: decodeURIComponent(memePath.split("/").pop()).replace(/-/g, " "),
      path: memePath,
      url: absoluteUrl(memePath),
      imageUrl: "",
      listingSignals: [],
    });
  }
  byPath.get(memePath).editorialEvidence = editorialEvidence;
}

const candidates = [...byPath.values()];
const detailed = new Array(candidates.length);
let detailCursor = 0;
let detailFailures = 0;
const detailWorkers = Array.from({ length: Math.min(CONCURRENCY, candidates.length) }, async () => {
  while (detailCursor < candidates.length) {
    const index = detailCursor;
    detailCursor += 1;
    const candidate = candidates[index];
    try {
      const html = await fetchText(candidate.url);
      detailed[index] = {
        ...parseDetail(html, candidate),
        historicalRank: candidate.historicalRank || null,
        newestRank: candidate.newestRank || null,
        listingSignals: candidate.listingSignals || [],
        editorialEvidence: candidate.editorialEvidence || [],
      };
    } catch (error) {
      detailFailures += 1;
      detailed[index] = {
        ...candidate,
        category: "",
        status: "",
        types: [],
        year: null,
        origin: "",
        region: "",
        views: null,
        images: null,
        videos: null,
        tags: [],
        editorialEvidence: candidate.editorialEvidence || [],
        fetchError: error.message,
      };
    }
    if ((index + 1) % 50 === 0 || index + 1 === candidates.length) {
      console.log(`detail ${index + 1}/${candidates.length}; failures ${detailFailures}`);
    }
  }
});
await Promise.all(detailWorkers);

const records = detailed
  .filter(Boolean)
  .filter((record) => record.status === "Confirmed" || record.editorialEvidence?.length)
  .filter((record) => ["Meme", "Person", "Event", "Subculture"].includes(record.category) || record.editorialEvidence?.length)
  .sort((a, b) => Number(a.historicalRank || 999999) - Number(b.historicalRank || 999999)
    || Number(b.year || 0) - Number(a.year || 0)
    || a.title.localeCompare(b.title, "en"));

const snapshot = {
  schemaVersion: "1.0.0",
  sourceVersion: `kym-meme-evidence-${researchDate}`,
  generatedAt: new Date().toISOString(),
  researchDate,
  methodology: {
    historical: `Know Your Meme confirmed entries sorted by views, first ${TOP_PAGES} pages. Listing position and entry views are historical-spread proxies, not population awareness.`,
    newest: `Know Your Meme confirmed entries sorted newest, first ${NEWEST_PAGES} pages. Newness is not popularity.`,
    editorial: "KYM annual and recent editorial roundups are editorial trend signals, not a population survey.",
    rights: "KYM documentation and cached thumbnails are research evidence only; inclusion does not grant commercial-use rights.",
  },
  sources: {
    historical: `${BASE}/memes?kind=confirmed&sort=views`,
    newest: `${BASE}/memes?kind=confirmed&sort=newest`,
    memeReviewHub: `${BASE}/newsfeed/meme-review`,
    editorials: editorialResult.editorialSources,
  },
  counts: {
    listingCandidates: listingItems.length,
    uniqueCandidates: candidates.length,
    records: records.length,
    detailFailures,
    editorialLinked: records.filter((record) => record.editorialEvidence?.length).length,
  },
  records,
};

fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, ...snapshot.counts }, null, 2));
