import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const eagleBase = process.env.EAGLE_API || "http://127.0.0.1:41595/api";
const eagleFolderId = "MU3HNTW6V47E2";
const eagleImagesRoot = "/Users/wenshanchen/Pictures/idea.library/images";
const researchDate = "2026-09-22";
const sourceVersion = "classic-ip-visual-lineages-2026-09-22-v1";
const outputPath = path.join(projectRoot, "source/classic-ip-visual-lineages-supplement.json");
const receiptPath = path.join(projectRoot, "source/classic-ip-visual-lineages-receipt.json");
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "classic-ip-lineages-"));

const direct = (id, imageUrl, subtitle, characters = []) => ({
  id, provider: "direct", imageUrl, subtitle, characters,
});
const commons = (id, sourceTitle, subtitle, characters = []) => ({
  id, provider: "commons", sourceTitle, subtitle, characters,
});

const folkardBase = "https://www.gutenberg.org/cache/epub/36308/images";
const rackhamBase = "https://www.gutenberg.org/cache/epub/28885/images";

const aliceAvoid = "只使用列明的历史出版版本。避开迪士尼及其他现代影视的蓝裙造型、具体脸、配色、Logo、后期新增角色表达与可能造成官方授权误认的商品化呈现。";
const ozAvoid = "只使用 Denslow 1900 年书籍版本；避开 1939 年 MGM 电影的红宝石鞋、演员肖像、片名字标、电影服装与后续授权造型。";
const pinocchioAvoid = "只使用 1883 或 1901 年列明的书籍插图；避开迪士尼长鼻木偶的现代配色、服装比例、蟋蟀造型、Logo 与后续影视表达。";

const works = [
  {
    id: "alice-folkard-1921",
    title: "Songs from Alice in Wonderland and Through the Looking-Glass · Charles Folkard",
    subtitle: "Charles Folkard · 1921 彩色插图谱系",
    year: "1921",
    artist: "Charles Folkard",
    motherIp: "Alice",
    sourceUrl: "https://www.gutenberg.org/ebooks/36308",
    sourceLabel: "Project Gutenberg / New York Public Library",
    rightsStatus: "公版文件",
    copyrightRoute: "美国：1921 年出版作品期限届满；Project Gutenberg 标记 Public domain in the USA；高分辨率补图来自 NYPL / Internet Archive Book Images 的 No known copyright restrictions 文件。",
    imageRights: "Project Gutenberg：Public domain in the USA；指定 Commons 文件：No known copyright restrictions。",
    evidenceSources: [
      "https://www.gutenberg.org/ebooks/36308",
      "https://www.themorgan.org/printed-books/384597",
      "https://archive.org/details/songsfromalicein00broa",
    ],
    usage: "比较 Folkard 的高饱和彩色角色、细线边框、人格化器物与群像舞台；可抽取角色关系、动作和低色数轮廓重新组织。",
    avoid: aliceAvoid,
    styles: ["文学插画", "历史形象演变", "彩色书籍插图", "装饰边框"],
    scenes: ["经典角色历史形象", "同一 IP 多画家比较", "爱丽丝梦游仙境"],
    holidays: [],
    characters: ["Alice", "Mad Hatter", "White Rabbit", "Queen of Hearts", "Cheshire Cat", "Jabberwock"],
    tags: ["漫画 / 角色", "童话 / 寓言", "经典艺术"],
    awarenessScore: 92,
    awarenessLevel: "美国高知名母 IP",
    frames: [
      direct("folkard-alice-friends", `${folkardBase}/coverlg.jpg`, "Alice and Her Friends｜群像封面", ["Alice", "White Rabbit", "Mad Hatter", "Cheshire Cat"]),
      direct("folkard-mad-tea-party", `${folkardBase}/frontlg.jpg`, "A Mad Tea-party｜茶会群像", ["Alice", "Mad Hatter", "March Hare", "White Rabbit"]),
      direct("folkard-eel-on-nose", `${folkardBase}/eel_lg.jpg`, "Yet You Balance an Eel on the End of Your Nose", ["Father William", "Young Man"]),
      direct("folkard-speak-roughly", `${folkardBase}/roughly_lg.jpg`, "Speak Roughly to Your Little Boy", ["Duchess", "Baby", "Cook", "Cheshire Cat"]),
      direct("folkard-lobster-quadrille", `${folkardBase}/lobster_lg.jpg`, "The Lobster Quadrille", ["Alice", "Mock Turtle", "Gryphon", "Lobster"]),
      commons("folkard-beautiful-soup", "File:Songs from Alice in wonderland and Through the looking-glass (1921) (14778585941).jpg", "Beautiful Soup｜人格化餐具与纸牌宫廷", ["Soup Personifications", "Playing-card Courtiers"]),
      direct("folkard-vorpal-sword", `${folkardBase}/vorpal_lg.jpg`, "He Took His Vorpal Sword in Hand", ["Jabberwock", "Vorpal Hero"]),
      direct("folkard-walrus-carpenter", `${folkardBase}/walrus_lg.jpg`, "The Walrus and the Carpenter", ["Walrus", "Carpenter", "Oysters"]),
      direct("folkard-shouted-ear", `${folkardBase}/shouted_lg.jpg`, "I Went and Shouted in His Ear", ["White Knight", "Aged Aged Man"]),
      direct("folkard-butterflies-wheat", `${folkardBase}/aged_lg.jpg`, "I Look for Butterflies That Sleep among the Wheat", ["White Knight", "Aged Aged Man"]),
      direct("folkard-queen-alice", `${folkardBase}/queenalice_lg.jpg`, "Then Fill Up the Glasses with Treacle and Ink", ["White King", "White Knight", "Humpty Dumpty"]),
      direct("folkard-fish-riddle", `${folkardBase}/fishriddle_lg.jpg`, "The Fish Riddle", ["Fish Footman", "Alice"]),
    ],
  },
  {
    id: "alice-rackham-1907",
    title: "Alice’s Adventures in Wonderland · Arthur Rackham",
    subtitle: "Arthur Rackham · 1907 彩色插图谱系",
    year: "1907",
    artist: "Arthur Rackham",
    motherIp: "Alice",
    sourceUrl: "https://www.gutenberg.org/ebooks/28885",
    sourceLabel: "Project Gutenberg",
    rightsStatus: "公版文件",
    copyrightRoute: "美国：1907 年出版作品期限届满；Project Gutenberg 标记 Public domain in the USA。",
    imageRights: "Project Gutenberg：Public domain in the USA。",
    evidenceSources: ["https://www.gutenberg.org/ebooks/28885"],
    usage: "比较 Rackham 的枯线、扭曲树根、灰褐水彩与诡谲戏剧感；适合暗黑童话、线描角色和留白型构图研究。",
    avoid: aliceAvoid,
    styles: ["文学插画", "历史形象演变", "水彩线描", "暗黑童话"],
    scenes: ["经典角色历史形象", "同一 IP 多画家比较", "爱丽丝梦游仙境"],
    holidays: ["万圣节"],
    characters: ["Alice", "White Rabbit", "Mad Hatter", "Queen of Hearts", "Mock Turtle"],
    tags: ["漫画 / 角色", "童话 / 寓言", "经典艺术", "怪诞 / 魔法"],
    awarenessScore: 92,
    awarenessLevel: "美国高知名母 IP",
    frames: [
      direct("rackham-pool-tears", `${rackhamBase}/p0022-insert2.jpg`, "The Pool of Tears", ["Alice"]),
      direct("rackham-caucus-race", `${rackhamBase}/p0028-insert2.jpg`, "But Who Has Won?｜动物群像", ["Alice", "Dodo", "Wonderland Animals"]),
      direct("rackham-mary-ann", `${rackhamBase}/p0036-insert2.jpg`, "Why, Mary Ann, What Are You Doing Out Here?", ["Alice", "White Rabbit"]),
      direct("rackham-caterpillar", `${rackhamBase}/p0050-insert2.jpg`, "Advice from a Caterpillar", ["Alice", "Caterpillar"]),
      direct("rackham-saucepan", `${rackhamBase}/p0070-insert2.jpg`, "The Flying Saucepan", ["Duchess", "Cook", "Baby"]),
      direct("rackham-pig-baby", `${rackhamBase}/p0074-insert2.jpg`, "She Looked Down into Its Face", ["Alice", "Pig Baby"]),
      direct("rackham-tea-party", `${rackhamBase}/p0084-insert2.jpg`, "A Mad Tea Party", ["Alice", "Mad Hatter", "March Hare", "Dormouse"]),
      direct("rackham-turn-them-over", `${rackhamBase}/p0100-insert2.jpg`, "The Queen Said to the Knave: Turn Them Over", ["Queen of Hearts", "Knave of Hearts", "Playing-card Gardeners"]),
      direct("rackham-off-head", `${rackhamBase}/p0116-insert2.jpg`, "Off with His Head!", ["Queen of Hearts", "Alice", "Playing-card Courtiers"]),
      direct("rackham-mock-turtle", `${rackhamBase}/p0132-insert2.jpg`, "The Mock Turtle Drew a Long Breath", ["Mock Turtle", "Gryphon", "Alice"]),
      direct("rackham-who-stole-tarts", `${rackhamBase}/p0140-insert2.jpg`, "Who Stole the Tarts?", ["Alice", "King of Hearts", "Queen of Hearts", "Knave of Hearts"]),
      direct("rackham-pack-air", `${rackhamBase}/p0158-insert2.jpg`, "The Whole Pack Rose Up into the Air", ["Alice", "Playing-card Courtiers"]),
    ],
  },
  {
    id: "alice-robinson-1907",
    title: "Alice’s Adventures in Wonderland · Charles Robinson",
    subtitle: "Charles Robinson · 1907 八幅彩色版画",
    year: "1907",
    artist: "Charles Robinson",
    motherIp: "Alice",
    sourceUrl: "https://archive.org/details/turesalicesadven00carrrich",
    sourceLabel: "Internet Archive / Wikimedia Commons",
    rightsStatus: "公版文件",
    copyrightRoute: "美国：1907 年出版作品期限届满；Commons 文件页标记 Public domain。",
    imageRights: "Wikimedia Commons：Public domain；底层扫描来自 Internet Archive。",
    evidenceSources: ["https://archive.org/details/turesalicesadven00carrrich"],
    usage: "比较 Robinson 的装饰性线条、轻快色块与童书舞台；适合细线框、角色队列和纸牌宫廷构图研究。",
    avoid: aliceAvoid,
    styles: ["文学插画", "历史形象演变", "彩色版画", "装饰线条"],
    scenes: ["经典角色历史形象", "同一 IP 多画家比较", "爱丽丝梦游仙境"],
    holidays: [],
    characters: ["Alice", "White Rabbit", "Mad Hatter", "Queen of Hearts", "Cheshire Cat"],
    tags: ["漫画 / 角色", "童话 / 寓言", "经典艺术"],
    awarenessScore: 92,
    awarenessLevel: "美国高知名母 IP",
    frames: [
      commons("robinson-off-head", "File:Alice's Adventures in Wonderland - Carroll, Robinson - S008 - 'Off with her head!'.jpg", "Off with Her Head!", ["Alice", "Queen of Hearts"]),
      commons("robinson-important-mouse", "File:Alice's Adventures in Wonderland - Carroll, Robinson - S053 - 'Ahem!' said the mouse, with an important air.jpg", "Ahem! Said the Mouse", ["Alice", "Mouse", "Wonderland Animals"]),
      commons("robinson-pigeon", "File:Alice's Adventures in Wonderland - Carroll, Robinson - S089 - A large pigeon had flown into her face.jpg", "A Large Pigeon Had Flown into Her Face", ["Alice", "Pigeon"]),
      commons("robinson-duchess-lullaby", "File:Alice's Adventures in Wonderland - Carroll, Robinson - S103 - She began nursing her child again, singing a sort of lullaby to it.jpg", "The Duchess Sings a Lullaby", ["Duchess", "Baby", "Alice"]),
      commons("robinson-hatter-date", "File:Alice's Adventures in Wonderland - Carroll, Robinson - S119 - 'What day of the month is it' he said, turning to Alice.jpg", "What Day of the Month Is It?", ["Alice", "Mad Hatter", "March Hare", "Dormouse"]),
      commons("robinson-executioner-dispute", "File:Alice's Adventures in Wonderland - Carroll, Robinson - S149 - There was a dispute going on between the executioner, the King, and the Queen.jpg", "Executioner, King and Queen Dispute", ["Alice", "King of Hearts", "Queen of Hearts", "Executioner", "Cheshire Cat"]),
      commons("robinson-up-lazy", "File:Alice's Adventures in Wonderland - Carroll, Robinson - S163 - 'Up, lazy thing!' said the Queen.jpg", "Up, Lazy Thing!", ["Queen of Hearts", "Alice", "Mock Turtle", "Gryphon"]),
      commons("robinson-pack-air", "File:Alice's Adventures in Wonderland - Carroll, Robinson - S205 - The whole pack rose up in the air.jpg", "The Whole Pack Rose Up in the Air", ["Alice", "Playing-card Courtiers"]),
    ],
  },
  {
    id: "wonderful-wizard-oz-denslow-1900",
    title: "The Wonderful Wizard of Oz · W. W. Denslow",
    subtitle: "W. W. Denslow · 1900 原著角色与场景",
    year: "1900",
    artist: "W. W. Denslow",
    motherIp: "The Wonderful Wizard of Oz",
    sourceUrl: "https://commons.wikimedia.org/wiki/Category:Illustrations_of_The_Wonderful_Wizard_of_Oz_by_William_Wallace_Denslow",
    sourceLabel: "Wikimedia Commons",
    rightsStatus: "公版文件",
    copyrightRoute: "美国：1900 年出版作品期限届满；所列 Commons 文件标记 Public domain。",
    imageRights: "Wikimedia Commons：Public domain。",
    evidenceSources: ["https://commons.wikimedia.org/wiki/Category:Illustrations_of_The_Wonderful_Wizard_of_Oz_by_William_Wallace_Denslow"],
    usage: "从 1900 原著中比较 Dorothy、稻草人、铁皮人、狮子、女巫和翡翠城的首次大众视觉；适合角色组、旅行队列和单角色徽章研究。",
    avoid: ozAvoid,
    styles: ["文学插画", "历史形象演变", "双色与彩色书籍插图", "美式童话"],
    scenes: ["经典角色历史形象", "原著角色组", "奥兹国旅行"],
    holidays: [],
    characters: ["The Wonderful Wizard of Oz", "Dorothy Gale", "Scarecrow", "Tin Woodman", "Cowardly Lion", "Wicked Witch of the West", "Glinda"],
    tags: ["漫画 / 角色", "童话 / 寓言", "经典艺术", "怪诞 / 魔法"],
    awarenessScore: 94,
    awarenessLevel: "美国全民级母 IP",
    frames: [
      commons("oz-dorothy-silver-shoes", "File:Dorothy Gale with silver shoes.jpg", "Dorothy 与银鞋", ["Dorothy Gale", "Toto"]),
      commons("oz-dorothy-scarecrow", "File:Dorothy and the Scarecrow 1900.jpg", "Dorothy 与稻草人", ["Dorothy Gale", "Scarecrow"]),
      commons("oz-tin-woodman", "File:Tin Woodman.png", "Tin Woodman｜铁皮人", ["Tin Woodman"]),
      commons("oz-cowardly-lion", "File:Cowardly lion.jpg", "Cowardly Lion｜胆小狮", ["Cowardly Lion"]),
      commons("oz-wicked-witch", "File:Wicked Witch of the West W.W. Denslow.jpg", "Wicked Witch of the West｜西方恶女巫", ["Wicked Witch of the West"]),
      commons("oz-glinda", "File:Glinda.jpg", "Glinda｜南方好女巫", ["Glinda"]),
      commons("oz-emerald-city", "File:Emerald City.jpg", "Emerald City｜翡翠城", ["Emerald City"]),
      commons("oz-wizard", "File:Wizard of Oz.png", "Wizard of Oz｜奥兹大法师", ["Wizard of Oz"]),
      commons("oz-munchkins", "File:Boq-Munchkins.jpg", "Boq 与芒奇金人", ["Boq", "Munchkins", "Dorothy Gale"]),
    ],
  },
  {
    id: "pinocchio-mazzanti-1883",
    title: "Le avventure di Pinocchio · Enrico Mazzanti",
    subtitle: "Enrico Mazzanti · 1883 最早期书籍形象",
    year: "1883",
    artist: "Enrico Mazzanti",
    motherIp: "Pinocchio",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Pinocchio.jpg",
    sourceLabel: "Wikimedia Commons",
    rightsStatus: "公版文件",
    copyrightRoute: "美国：1883 年出版作品期限届满；Commons 文件标记 Public domain。",
    imageRights: "Wikimedia Commons：Public domain；该文件为后期上色版本，颜色不是 1883 原版事实。",
    evidenceSources: ["https://commons.wikimedia.org/wiki/File:Pinocchio.jpg"],
    usage: "用于识别 Pinocchio 最早期的细长木偶比例、尖帽与关节结构；颜色仅作扫描衍生参考。",
    avoid: pinocchioAvoid,
    styles: ["文学插画", "历史形象演变", "早期木偶角色"],
    scenes: ["经典角色历史形象", "同一 IP 多画家比较", "木偶奇遇记"],
    holidays: [],
    characters: ["Pinocchio"],
    tags: ["漫画 / 角色", "童话 / 寓言", "经典艺术"],
    awarenessScore: 88,
    awarenessLevel: "美国高知名母 IP",
    frames: [
      commons("pinocchio-mazzanti-first", "File:Pinocchio.jpg", "Pinocchio 最早期形象｜后期上色文件", ["Pinocchio"]),
    ],
  },
  {
    id: "pinocchio-chiostri-1901",
    title: "Le avventure di Pinocchio · Carlo Chiostri",
    subtitle: "Carlo Chiostri · 1901 黑白叙事插图",
    year: "1901",
    artist: "Carlo Chiostri",
    motherIp: "Pinocchio",
    sourceUrl: "https://commons.wikimedia.org/wiki/Category:Illustrations_from_Le_avventure_di_Pinocchio",
    sourceLabel: "Wikimedia Commons",
    rightsStatus: "公版文件",
    copyrightRoute: "美国：1901 年出版作品期限届满；所列 Commons 文件标记 Public domain。",
    imageRights: "Wikimedia Commons：Public domain。",
    evidenceSources: ["https://commons.wikimedia.org/wiki/Category:Illustrations_from_Le_avventure_di_Pinocchio"],
    usage: "比较 Chiostri 的木偶肢体、长鼻动作和社会场景；适合黑白线描、剧情组图和动作剪影研究。",
    avoid: pinocchioAvoid,
    styles: ["文学插画", "历史形象演变", "黑白线描", "叙事组图"],
    scenes: ["经典角色历史形象", "同一 IP 多画家比较", "木偶奇遇记"],
    holidays: [],
    characters: ["Pinocchio", "Geppetto", "Blue Fairy", "Mangiafoco"],
    tags: ["漫画 / 角色", "童话 / 寓言", "经典艺术"],
    awarenessScore: 88,
    awarenessLevel: "美国高知名母 IP",
    frames: [
      commons("pinocchio-chiostri-standing", "File:Pinocchio par Carlo Chiostri.png", "Pinocchio 站立全身像", ["Pinocchio"]),
      commons("pinocchio-chiostri-mangiafoco", "File:PinocchioChiostri03.jpg", "Mangiafoco 木偶剧场老板", ["Pinocchio", "Mangiafoco"]),
      commons("pinocchio-chiostri-arrest", "File:PinocchioChiostri08.jpg", "Pinocchio 被宪兵带走", ["Pinocchio"]),
      commons("pinocchio-chiostri-theatre", "File:PinocchioChiostri12.jpg", "Gran Teatro dei Burattini｜木偶大剧场", ["Pinocchio", "Marionettes"]),
      commons("pinocchio-chiostri-fairy", "File:PinocchioChiostri19.jpg", "Pinocchio 与蓝仙女", ["Pinocchio", "Blue Fairy"]),
      commons("pinocchio-chiostri-watchdog", "File:PinocchioChiostri21.jpg", "Pinocchio 被迫充当看门狗", ["Pinocchio", "Martens"]),
      commons("pinocchio-chiostri-long-nose", "File:PinocchioChiostri22.jpg", "说谎后长鼻子", ["Pinocchio"]),
      commons("pinocchio-chiostri-dogfish", "File:PinocchioChiostri25.jpg", "鲨鱼腹中与 Geppetto 重逢", ["Pinocchio", "Geppetto"]),
    ],
  },
];

function compact(values) {
  return [...new Set(values.filter(Boolean))];
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

let nextWikimediaRequestAt = 0;

async function fetchRetry(input, options = {}, attempts = 7) {
  let error;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const target = new URL(input);
      if (/wikimedia\.org$/i.test(target.hostname)) {
        const waitMs = Math.max(0, nextWikimediaRequestAt - Date.now());
        if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
        nextWikimediaRequestAt = Date.now() + 1100;
      }
      const response = await fetch(input, {
        ...options,
        headers: {
          "user-agent": "PublicDomainVisualResearch/1.0 (https://github.com/1024BBSS/public-domain-cartoon-inspiration)",
          ...(options.headers || {}),
        },
      });
      if (!response.ok) {
        const retryAfter = Number(response.headers.get("retry-after")) || 0;
        const retryMs = retryAfter > 0
          ? Math.min(retryAfter * 1000, 30000)
          : Math.min(1200 * (2 ** (attempt - 1)), 12000);
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === attempts) throw new Error(`HTTP ${response.status}`);
        await new Promise((resolve) => setTimeout(resolve, retryMs));
        continue;
      }
      return response;
    } catch (caught) {
      error = caught;
      if (attempt < attempts) {
        const retryMs = Math.min(1000 * (2 ** (attempt - 1)), 10000);
        await new Promise((resolve) => setTimeout(resolve, retryMs));
      }
    }
  }
  throw error;
}

async function eagleJson(endpoint, options = {}) {
  const response = await fetchRetry(`${eagleBase}${endpoint}`, options);
  const payload = await response.json();
  if (payload.status !== "success") throw new Error(`${endpoint}: ${JSON.stringify(payload)}`);
  return payload.data;
}

async function discover(frame, work) {
  if (frame.provider === "direct") {
    return {
      sourceOriginalUrl: frame.imageUrl,
      sourceUrl: work.sourceUrl,
      sourceLabel: work.sourceLabel,
      license: work.imageRights,
      imageRights: work.imageRights,
    };
  }
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("titles", frame.sourceTitle);
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  const payload = await (await fetchRetry(url)).json();
  const page = Object.values(payload.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`${frame.id}: Commons file unavailable`);
  const meta = info.extmetadata || {};
  const license = stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value || "");
  if (!/public domain|no restrictions|cc0/i.test(license)) {
    throw new Error(`${frame.id}: rejected Commons license ${license}`);
  }
  return {
    sourceOriginalUrl: info.url,
    sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/^File:/, "File:"))}`,
    sourceLabel: "Wikimedia Commons",
    license,
    imageRights: compact([
      stripHtml(meta.UsageTerms?.value || ""),
      stripHtml(meta.LicenseShortName?.value || ""),
    ]).join(" · "),
  };
}

function extensionFrom(bytes, contentType = "") {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (contentType.includes("webp") || String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  throw new Error("Unsupported image signature");
}

async function materialize(frame, discovered) {
  const response = await fetchRetry(discovered.sourceOriginalUrl);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 5000) throw new Error(`${frame.id}: image too small (${bytes.length} bytes)`);
  const ext = extensionFrom(bytes, response.headers.get("content-type") || "");
  const file = path.join(tempRoot, `${frame.id}.${ext}`);
  await fs.writeFile(file, bytes);
  return file;
}

async function dimensionsOf(file) {
  const { stdout } = await execFileAsync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]);
  const width = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1] || 0);
  const height = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1] || 0);
  if (!width || !height) throw new Error(`${file}: dimensions unavailable`);
  return { width, height };
}

async function fileInfo(file) {
  const bytes = await fs.readFile(file);
  return {
    file,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...(await dimensionsOf(file)),
  };
}

async function localEagleFileInfo(item) {
  const infoDir = path.join(eagleImagesRoot, `${item.id}.info`);
  const entries = await fs.readdir(infoDir);
  const preferred = path.join(infoDir, `${item.name}.${item.ext}`);
  let file = preferred;
  try {
    await fs.access(file);
  } catch {
    const fallback = entries.find((name) => name !== "metadata.json" && !name.includes("_thumbnail"));
    if (!fallback) throw new Error(`${item.id}: Eagle source file unavailable`);
    file = path.join(infoDir, fallback);
  }
  return fileInfo(file);
}

function intakeId(frame) {
  return `${sourceVersion}:${frame.id}`;
}

async function existingByIntake() {
  const items = await eagleJson(`/item/list?folders=${eagleFolderId}&limit=5000`);
  const map = new Map();
  for (const item of items || []) {
    const tag = (item.tags || []).find((value) => value.startsWith("intake-id:"));
    if (tag) map.set(tag.slice("intake-id:".length), item.id);
  }
  return map;
}

function annotationFor(work, frame, discovered, info) {
  return [
    `母 IP：${work.motherIp}`,
    `具体作品：${work.title}`,
    `画面：${frame.subtitle}`,
    `画家：${work.artist}`,
    `年代：${work.year}`,
    `版权路径：${work.copyrightRoute}`,
    `图像权利：${discovered.imageRights}`,
    "证据等级：A",
    `可转译：${work.usage}`,
    `避开：${work.avoid}`,
    `来源页：${discovered.sourceUrl}`,
    `原图地址：${discovered.sourceOriginalUrl}`,
    `核验日期：${researchDate}`,
    `SHA256：${info.sha256}`,
    `像素：${info.width}×${info.height}`,
  ].join("\n");
}

function tagsFor(work, frame, discovered) {
  return compact([
    "公版IP", "经典画作", "历史形象演变", "证据:A",
    `intake-id:${intakeId(frame)}`,
    `import:${sourceVersion}`,
    `母IP:${work.motherIp}`,
    `画家:${work.artist}`,
    `作品:${work.title}`,
    `权利:${discovered.license}`,
    ...work.tags,
    ...frame.characters.map((value) => `角色:${value}`),
  ]);
}

async function addToEagle(work, frame, discovered, info) {
  const data = await eagleJson("/item/addFromPath", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      path: info.file,
      name: `${work.motherIp}｜${work.artist}｜${frame.subtitle}`,
      website: discovered.sourceUrl,
      annotation: annotationFor(work, frame, discovered, info),
      tags: tagsFor(work, frame, discovered),
      folderId: eagleFolderId,
      star: 5,
      notification: false,
    }),
  });
  const id = typeof data === "string" ? data : data?.id || data?.itemId;
  if (!id) throw new Error(`${frame.id}: Eagle did not return an item id`);
  const readback = await eagleJson(`/item/info?id=${id}`);
  if (readback?.id !== id) throw new Error(`${frame.id}: Eagle readback failed`);
  if (!(readback.tags || []).includes(`intake-id:${intakeId(frame)}`)) {
    throw new Error(`${frame.id}: intake tag missing after readback`);
  }
  const stored = await localEagleFileInfo(readback);
  if (stored.sha256 !== info.sha256) throw new Error(`${frame.id}: Eagle stored bytes differ from downloaded file`);
  return { id, info: stored };
}

async function writeAtomic(file, value) {
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temp, file);
}

const receipt = {
  schemaVersion: "1.0",
  sourceVersion,
  researchDate,
  eagleFolderId,
  requested: works.reduce((sum, work) => sum + work.frames.length, 0),
  imported: [],
  reused: [],
  rejected: [],
};

const existing = await existingByIntake();
const outputWorks = [];

try {
  for (const work of works) {
    const outputFrames = [];
    for (const frame of work.frames) {
      try {
        const discovered = await discover(frame, work);
        let eagleItemId;
        let info;
        const existingId = existing.get(intakeId(frame));
        if (existingId) {
          const readback = await eagleJson(`/item/info?id=${existingId}`);
          info = await localEagleFileInfo(readback);
          eagleItemId = existingId;
          receipt.reused.push({ id: frame.id, eagleItemId, sourceUrl: discovered.sourceUrl });
        } else {
          const file = await materialize(frame, discovered);
          const downloaded = await fileInfo(file);
          const added = await addToEagle(work, frame, discovered, downloaded);
          eagleItemId = added.id;
          info = added.info;
          receipt.imported.push({ id: frame.id, eagleItemId, sourceUrl: discovered.sourceUrl });
        }
        outputFrames.push({
          eagleItemId,
          subtitle: frame.subtitle,
          sourceUrl: discovered.sourceUrl,
          sourceHash: info.sha256,
          sourcePixels: `${info.width}x${info.height}`,
          characters: frame.characters,
        });
        process.stdout.write(`${work.id}: ${outputFrames.length}/${work.frames.length} ${frame.id}\n`);
      } catch (error) {
        receipt.rejected.push({ workId: work.id, id: frame.id, error: error.message });
        process.stderr.write(`${work.id}/${frame.id}: ${error.message}\n`);
      }
    }
    if (!outputFrames.length) throw new Error(`${work.id}: no verified frames imported`);
    outputWorks.push({
      id: work.id,
      title: work.title,
      subtitle: work.subtitle,
      year: work.year,
      rightsStatus: work.rightsStatus,
      copyrightRoute: work.copyrightRoute,
      evidenceLevel: "A",
      imageRights: work.imageRights,
      sourceUrl: work.sourceUrl,
      sourceLabel: work.sourceLabel,
      usage: work.usage,
      avoid: work.avoid,
      styles: work.styles,
      scenes: work.scenes,
      holidays: work.holidays,
      characters: work.characters,
      tags: work.tags,
      awarenessScore: work.awarenessScore,
      awarenessLevel: work.awarenessLevel,
      evidenceSources: work.evidenceSources,
      riskFlags: ["WORK_VERSION_ONLY", "MODERN_ADAPTATIONS_EXCLUDED", "TRADEMARK_CHECK_BEFORE_MERCH"],
      researchDate,
      assetType: "历史书籍插图",
      productionUses: ["角色历史谱系", "构图研究", "原创重绘参考"],
      frames: outputFrames,
    });
  }

  const dataset = {
    schemaVersion: "1.0",
    sourceVersion,
    researchDate,
    scope: "高知名公版母 IP 的历史视觉谱系；版权状态附着于具体出版版本与具体图像文件，不覆盖现代改编、商标或后续角色表达。",
    recordMode: "frame-only",
    frameKind: "画作 / 插图",
    frameCharactersOnly: true,
    works: outputWorks,
  };
  await writeAtomic(outputPath, dataset);
  await writeAtomic(receiptPath, receipt);
  process.stdout.write(`${JSON.stringify({ requested: receipt.requested, imported: receipt.imported.length, reused: receipt.reused.length, rejected: receipt.rejected.length, works: outputWorks.length }, null, 2)}\n`);
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
