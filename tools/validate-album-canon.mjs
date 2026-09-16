import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const sourcePath = path.join(projectRoot, "source/album-license-only.json");
const reportPath = path.join(projectRoot, "source/album-canon-validation.json");
const source = JSON.parse(await fs.readFile(sourcePath, "utf8"));
const albums = source.albums || [];
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

const failures = [];
const required = ["id", "title", "artist", "year", "decade", "genre", "genreGroup", "visualFamily", "visualType", "grammar", "classicReason", "canonTier", "thumbnail", "visualSourceUrl", "rightsGate"];
for (const album of albums) {
  for (const field of required) if (!album[field]) failures.push({ type: "missing-field", album: album.id, field });
  const sourceTitle = album.sourceMatch?.title;
  const sourceArtist = album.sourceMatch?.artist;
  if (sourceTitle && !titleMatches(sourceTitle, album.title)) {
    failures.push({ type: "source-title-mismatch", album: album.id, wanted: album.title, found: album.sourceMatch?.title });
  }
  if (sourceArtist && !artistMatches(sourceArtist, album.artist)) {
    failures.push({ type: "source-artist-mismatch", album: album.id, wanted: album.artist, found: album.sourceMatch?.artist });
  }
}

for (const field of ["id", "visualSourceUrl"]) {
  const seen = new Map();
  for (const album of albums) {
    const value = album[field];
    if (!value) continue;
    if (seen.has(value)) failures.push({ type: `duplicate-${field}`, album: album.id, duplicateOf: seen.get(value), value });
    else seen.set(value, album.id);
  }
}

const decadeCounts = Object.fromEntries([...new Set(albums.map((album) => album.decade))].sort().map((decade) => [decade, albums.filter((album) => album.decade === decade).length]));
const genreCounts = Object.fromEntries([...new Set(albums.map((album) => album.genreGroup))].sort().map((genre) => [genre, albums.filter((album) => album.genreGroup === genre).length]));
const expectedDecades = { "1950s": 10, "1960s": 25, "1970s": 35, "1980s": 35, "1990s": 30, "2000s": 25, "2010s": 25, "2020s": 15 };
for (const [decade, count] of Object.entries(expectedDecades)) {
  if (decadeCounts[decade] !== count) failures.push({ type: "decade-count", decade, expected: count, found: decadeCounts[decade] || 0 });
}
if (genreCounts["Country / Americana"] !== 25) failures.push({ type: "country-count", expected: 25, found: genreCounts["Country / Americana"] || 0 });
if (albums.length !== 200) failures.push({ type: "album-count", expected: 200, found: albums.length });

async function checkImage(album) {
  let lastFailure;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(album.thumbnail, {
        redirect: "follow",
        headers: { Range: "bytes=0-255", "User-Agent": "PublicDomainVisualResearch/1.0" },
        signal: AbortSignal.timeout(20000),
      });
      const contentType = response.headers.get("content-type") || "";
      if (response.ok && contentType.startsWith("image/")) return null;
      lastFailure = { album: album.id, status: response.status, contentType, url: album.thumbnail };
    } catch (error) {
      lastFailure = { album: album.id, status: "error", error: String(error.message || error), url: album.thumbnail };
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 900));
  }
  return lastFailure;
}

const imageFailures = [];
for (let index = 0; index < albums.length; index += 12) {
  const batch = await Promise.all(albums.slice(index, index + 12).map(checkImage));
  imageFailures.push(...batch.filter(Boolean));
  if ((index + 12) % 48 === 0) console.log(`checked ${Math.min(index + 12, albums.length)}/${albums.length} images`);
}
for (const failure of imageFailures) failures.push({ type: "image", ...failure });

const report = {
  generatedAt: new Date().toISOString(),
  pass: failures.length === 0,
  counts: {
    albums: albums.length,
    artists: new Set(albums.map((album) => album.artist)).size,
    imagesChecked: albums.length,
    imageFailures: imageFailures.length,
  },
  decadeCounts,
  genreCounts,
  failures,
};
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
