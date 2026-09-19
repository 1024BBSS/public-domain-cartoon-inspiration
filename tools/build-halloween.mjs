import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_VERSION = "halloween-classics-2026-09-19-v1";

function laneFor(record) {
  if (/Caligari|Phantom of the Opera/i.test(record.title || "")) return "经典电影";
  if ((record.tags || []).includes("早期动画")) return "经典动画";
  if ((record.styles || []).some((value) => /木刻|版画|静物|水彩|Memento|器物|Vanitas/i.test(value))) return "古典骷髅";
  return "历史画面";
}

function workId(record) {
  const match = String(record.id || "").match(/^frame-supplement-(.+)-\d{3}$/);
  return match?.[1] || `${record.title}-${record.year}`;
}

export async function writeHalloweenData(projectRoot, catalog) {
  const watchlist = JSON.parse(await fs.readFile(
    path.join(projectRoot, "source", "halloween-trend-watchlist.json"),
    "utf8",
  ));

  const records = catalog.records.filter((record) => (
    record.supplementalSourceVersion === SOURCE_VERSION && record.kind === "动画画面"
  ));
  const groups = new Map();

  for (const record of records) {
    const id = workId(record);
    if (!groups.has(id)) groups.set(id, { id, records: [] });
    groups.get(id).records.push(record);
  }

  const featuredOrder = new Map([
    ["skeleton-dance-1929", 1],
    ["swing-you-sinners-1930", 2],
    ["haunted-house-1929", 3],
    ["hells-bells-1929", 4],
    ["holbein-clergyman-dance-of-death", 5],
    ["memento-mori-skeleton-niche", 6],
    ["cezanne-three-skulls", 7],
    ["claesz-skull-quill-1628", 8],
    ["skull-watch-1810", 9],
    ["cabinet-caligari-1920", 10],
    ["phantom-opera-1925", 11],
  ]);

  const works = [...groups.values()].map((group) => {
    const sorted = group.records.sort((a, b) => a.id.localeCompare(b.id));
    const lead = sorted[0];
    return {
      id: group.id,
      title: lead.title,
      subtitle: lead.subtitle,
      year: lead.year,
      yearSort: lead.yearSort,
      lane: laneFor(lead),
      rightsStatus: lead.rightsStatus,
      copyrightRoute: lead.copyrightRoute,
      evidenceLevel: lead.evidenceLevel,
      imageRights: lead.imageRights,
      sourceUrl: lead.sourceUrl,
      sourceLabel: lead.sourceLabel,
      licenseUrl: lead.licenseUrl,
      usage: lead.usage,
      avoid: lead.avoid,
      styles: lead.styles,
      scenes: lead.scenes,
      characters: lead.characters,
      awarenessScore: lead.awarenessScore,
      awarenessLevel: lead.awarenessLevel,
      imageCount: sorted.length,
      images: sorted.map((record) => ({
        id: record.id,
        image: record.image,
        subtitle: record.subtitle,
        sourceUrl: record.sourceUrl,
      })),
    };
  }).sort((a, b) => (
    (featuredOrder.get(a.id) || 99) - (featuredOrder.get(b.id) || 99)
    || a.title.localeCompare(b.title, "zh-CN")
  ));

  const data = {
    schemaVersion: "1.0",
    sourceVersion: `${SOURCE_VERSION}+${watchlist.sourceVersion}`,
    generatedAt: catalog.generatedAt,
    scope: "万圣节经典公版画面与 TikTok 趋势观察分层展示；受保护影视和 Disney 只作 IP-BLOCK 研究参照。",
    counts: {
      works: works.length,
      images: works.reduce((sum, work) => sum + work.imageCount, 0),
      signals: watchlist.signals.length,
      blocked: watchlist.blocked.length,
    },
    works,
    trend: {
      observedAt: watchlist.observedAt,
      window: watchlist.window,
      method: watchlist.method,
      queries: watchlist.queries,
      signals: watchlist.signals,
      blocked: watchlist.blocked,
      rightsSources: watchlist.rightsSources,
    },
  };

  const json = `${JSON.stringify(data, null, 2)}\n`;
  const compact = JSON.stringify(data);
  await fs.writeFile(path.join(projectRoot, "data", "halloween.json"), json, "utf8");
  await fs.writeFile(
    path.join(projectRoot, "data", "halloween.js"),
    `window.PUBLIC_DOMAIN_HALLOWEEN_DATA = ${compact};\n`,
    "utf8",
  );
  return {
    counts: data.counts,
    sha256: createHash("sha256").update(json).digest("hex"),
  };
}
