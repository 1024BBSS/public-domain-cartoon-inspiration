import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const seedPath = path.join(projectRoot, "source", "super-ip-us-seed.json");
const outputPath = path.join(projectRoot, "source", "yougov-us-fame.json");

const ADULT_POPULATION = 258343281;
const MIN_100M_EQUIVALENT_PERCENT = Math.ceil((100000000 / ADULT_POPULATION) * 100);
const PAGE_SIZE = 20;
const PAGE_BATCH_SIZE = 5;

const COMMON_SOURCE = {
  sourceLabel: "YouGov Ratings · US Fame",
  sourceRole: "美国全国认知与识别来源；不是商业授权或可生产素材证明",
  usTier: "S｜美国全民级候选",
};

const ENTERTAINMENT_CATEGORIES = [
  {
    slug: "all-time-tv-shows",
    category: "电影 / 电视",
    subcategory: "电视节目全景",
    entityType: "电视节目 / 系列",
    rightsLane: "需授权",
    rightsOwnerContext: "节目、角色、制作公司、频道与流媒体权利分别核验",
    visualElements: ["节目标题结构", "主角群像", "标志布景", "年代画面比例"],
    visualPalette: ["#0B0B0B", "#F5F5F5", "#D62828", "#F4B400"],
    visualComposition: "主角或群像 + 单一标志布景 + 节目名留白",
  },
  {
    slug: "all-time-movies",
    category: "电影 / 电视",
    subcategory: "电影全景",
    entityType: "电影 / 系列",
    rightsLane: "需授权",
    rightsOwnerContext: "影片、角色、片名、海报、剧照与制片方权利分别核验",
    visualElements: ["海报主角", "标志道具", "场景轮廓", "片名字块"],
    visualPalette: ["#090909", "#F2F2F2", "#B3261E", "#C99700"],
    visualComposition: "单一主角或道具 + 场景剪影 + 大片名字块",
  },
  {
    slug: "all-time-music-artists",
    category: "音乐",
    subcategory: "音乐人全景",
    entityType: "音乐人 / 团体",
    rightsLane: "需授权",
    rightsOwnerContext: "姓名、肖像、团体名、Logo、唱片与巡演权利分别核验",
    visualElements: ["人物或乐队轮廓", "舞台灯", "唱片框", "年代字形"],
    visualPalette: ["#050505", "#F7F7F7", "#E01E37", "#2D6CDF"],
    visualComposition: "中心肖像或团体轮廓 + 唱片框 + 年代字形",
  },
  {
    slug: "all-time-actors-actresses",
    category: "人物 / 文娱名人",
    subcategory: "演员与银幕人物",
    entityType: "演员 / 名人",
    rightsLane: "姓名肖像授权",
    rightsOwnerContext: "本人或遗产管理方、经纪方、代表角色与剧照权利分别核验",
    visualElements: ["肖像轮廓", "标志造型", "代表角色道具", "银幕年代"],
    visualPalette: ["#080808", "#EFEFEF", "#9B1C31", "#C7A55B"],
    visualComposition: "人物半身轮廓 + 单一代表道具 + 银幕年代标签",
  },
  {
    slug: "all-time-tv-personalities",
    category: "人物 / 文娱名人",
    subcategory: "主持人与电视人物",
    entityType: "主持人 / 电视人物",
    rightsLane: "姓名肖像授权",
    rightsOwnerContext: "姓名肖像、节目片段、频道标识与节目视觉分别核验",
    visualElements: ["主持姿态", "话筒或桌台", "节目布景", "频道年代"],
    visualPalette: ["#080808", "#F4F4F4", "#D12C2C", "#1D5FA7"],
    visualComposition: "人物姿态 + 话筒或桌台 + 单一节目布景",
  },
  {
    slug: "directors",
    category: "人物 / 文娱名人",
    subcategory: "导演与创作者",
    entityType: "导演 / 创作者",
    rightsLane: "姓名肖像授权",
    rightsOwnerContext: "姓名肖像、作品片段、剧照与工作室标识分别核验",
    visualElements: ["导演椅", "取景框", "场记板", "代表类型片线索"],
    visualPalette: ["#060606", "#F0F0F0", "#CC2E2E", "#8B8B8B"],
    visualComposition: "人物轮廓 + 取景框 + 单一电影制作道具",
  },
  {
    slug: "influencers",
    category: "人物 / 文娱名人",
    subcategory: "网络创作者",
    entityType: "网红 / 网络创作者",
    rightsLane: "姓名肖像授权",
    rightsOwnerContext: "姓名肖像、账号名、频道标识、口号与合作品牌分别核验",
    visualElements: ["头像轮廓", "镜头界面", "频道符号", "代表内容道具"],
    visualPalette: ["#050505", "#FFFFFF", "#FF335F", "#00B8D9"],
    visualComposition: "头像或动作 + 手机画框 + 单一内容道具",
  },
  {
    slug: "artists",
    category: "人物 / 文娱名人",
    subcategory: "视觉艺术家",
    entityType: "艺术家",
    rightsLane: "姓名肖像授权",
    rightsOwnerContext: "艺术家姓名肖像与每件作品的版权、复制权和馆藏图源分别核验",
    visualElements: ["人物轮廓", "媒介工具", "代表形式", "展览标签"],
    visualPalette: ["#111111", "#F7F7F7", "#E34234", "#1F6FEB"],
    visualComposition: "创作者轮廓 + 一种媒介工具 + 作品形式提示",
  },
  {
    slug: "classical-composers",
    category: "音乐",
    subcategory: "作曲家与经典音乐",
    entityType: "作曲家",
    rightsLane: "文化公域 · 逐素材核验",
    rightsOwnerContext: "作曲家、具体乐谱版本、录音、演奏与肖像图源分别核验",
    visualElements: ["乐谱片段", "指挥动作", "乐器轮廓", "古典肖像"],
    visualPalette: ["#131313", "#F0E7D3", "#7D1D1D", "#B58A42"],
    visualComposition: "肖像或乐器 + 乐谱节奏线 + 古典题签",
  },
  {
    slug: "contemporary-fiction-writer",
    category: "人物 / 文娱名人",
    subcategory: "当代小说作者",
    entityType: "小说作家 / 作者",
    rightsLane: "姓名肖像授权",
    rightsOwnerContext: "作者姓名肖像与每部文字作品、译本、插图、改编权分别核验",
    visualElements: ["作者肖像", "手稿", "打字机或钢笔", "书脊结构"],
    visualPalette: ["#101010", "#F4EBDD", "#7B2D26", "#64748B"],
    visualComposition: "作者轮廓 + 手稿或工具 + 代表书脊节奏",
  },
  {
    slug: "contemporary-non-fiction-writer",
    category: "人物 / 文娱名人",
    subcategory: "当代非虚构作者",
    entityType: "非虚构作家 / 作者",
    rightsLane: "姓名肖像授权",
    rightsOwnerContext: "作者姓名肖像与每部文字作品、译本、图表、照片、改编权分别核验",
    visualElements: ["作者肖像", "资料卡", "钢笔或讲台", "书脊结构"],
    visualPalette: ["#101010", "#F4EBDD", "#7B2D26", "#64748B"],
    visualComposition: "作者轮廓 + 资料卡或工具 + 代表书脊节奏",
  },
  {
    slug: "video-games",
    category: "游戏 / 玩具",
    subcategory: "电子游戏全景",
    entityType: "电子游戏 / 系列",
    rightsLane: "需授权",
    rightsOwnerContext: "游戏、角色、Logo、界面、截图、音乐与发行商权利分别核验",
    visualElements: ["角色或载具", "关卡轮廓", "界面图标", "平台年代"],
    visualPalette: ["#070707", "#F8F8F8", "#7657FF", "#00C2A8"],
    visualComposition: "角色或物件 + 单一关卡轮廓 + 界面式边框",
  },
  {
    slug: "fiction-books",
    category: "文学 / 书籍",
    subcategory: "大众小说",
    entityType: "书籍 / 系列",
    rightsLane: "需授权",
    rightsOwnerContext: "文本、角色、书名商标、封面、插图、译本与影视改编分别核验",
    visualElements: ["封面图式", "书脊", "核心象征", "章节装饰"],
    visualPalette: ["#111111", "#F4EFE5", "#A52A2A", "#315C7D"],
    visualComposition: "核心象征 + 书名字块 + 书脊或章节装饰",
  },
  {
    slug: "children-fiction-books",
    category: "文学 / 书籍",
    subcategory: "儿童与青少年读物",
    entityType: "书籍 / 系列",
    rightsLane: "需授权",
    rightsOwnerContext: "文本、角色、插图、封面、出版社与后期改编分别核验",
    visualElements: ["角色剪影", "故事道具", "章节插图", "童书字形"],
    visualPalette: ["#151515", "#FFF4D6", "#E34A3F", "#2B72B8"],
    visualComposition: "角色或道具 + 故事入口 + 童书式标题留白",
  },
  {
    slug: "non-fiction-books",
    category: "文学 / 书籍",
    subcategory: "非虚构与知识出版",
    entityType: "书籍 / 出版物",
    rightsLane: "需授权",
    rightsOwnerContext: "文本、标题、封面、图表、照片与出版社权利分别核验",
    visualElements: ["主题物件", "标题结构", "图表或档案", "出版年代"],
    visualPalette: ["#0E0E0E", "#F2F2EA", "#C0392B", "#486581"],
    visualComposition: "单一主题物件 + 资料框 + 清晰标题层级",
  },
  {
    slug: "musicals",
    category: "舞台 / 活动",
    subcategory: "音乐剧",
    entityType: "舞台作品",
    rightsLane: "需授权",
    rightsOwnerContext: "剧本、歌词、曲谱、角色、舞美、Logo、演出与录制分别核验",
    visualElements: ["舞台拱门", "聚光灯", "节目单", "表演姿态"],
    visualPalette: ["#050505", "#F5F1E8", "#C2182B", "#C99A2E"],
    visualComposition: "表演姿态 + 舞台拱门 + 节目单式标题",
  },
  {
    slug: "plays",
    category: "舞台 / 活动",
    subcategory: "戏剧与舞台",
    entityType: "戏剧 / 舞台作品",
    rightsLane: "需授权",
    rightsOwnerContext: "剧本、译本、角色、舞美、演出版本与剧院标识分别核验",
    visualElements: ["舞台幕布", "角色姿态", "核心道具", "剧目题签"],
    visualPalette: ["#090909", "#F1E8D7", "#8C1C13", "#6C5B7B"],
    visualComposition: "角色关系 + 核心道具 + 剧场海报式留白",
  },
  {
    slug: "documentaries",
    category: "电影 / 电视",
    subcategory: "纪录片",
    entityType: "纪录片 / 系列",
    rightsLane: "需授权",
    rightsOwnerContext: "影片、档案影像、照片、人物肖像、片名和发行权分别核验",
    visualElements: ["纪实主体", "档案画面", "地点标签", "采访构图"],
    visualPalette: ["#0A0A0A", "#EDEDED", "#B23A2A", "#607D8B"],
    visualComposition: "纪实主体 + 档案边框 + 地点或年代标签",
  },
  {
    slug: "music-festivals",
    category: "舞台 / 活动",
    subcategory: "音乐节与现场活动",
    entityType: "音乐节 / 活动",
    rightsLane: "需授权",
    rightsOwnerContext: "活动名称、Logo、主视觉、艺人肖像、舞台和赞助商分别核验",
    visualElements: ["舞台轮廓", "观众剪影", "票根", "活动字标"],
    visualPalette: ["#050505", "#FFFFFF", "#F44336", "#7C4DFF"],
    visualComposition: "舞台或人群 + 票根结构 + 活动字标留白",
  },
  {
    slug: "art-events",
    category: "舞台 / 活动",
    subcategory: "颁奖礼与艺术活动",
    entityType: "艺术活动 / 颁奖礼",
    rightsLane: "需授权",
    rightsOwnerContext: "活动名、奖杯、Logo、转播画面、红毯照片与赞助商分别核验",
    visualElements: ["奖杯或徽章", "红毯路径", "舞台门框", "年份字块"],
    visualPalette: ["#080808", "#F6F6F6", "#B71C1C", "#D4AF37"],
    visualComposition: "奖杯或活动标志 + 舞台门框 + 年份信息",
  },
  {
    slug: "tv-networks-and-video-streaming-services",
    category: "网络 / 媒体",
    subcategory: "电视网络与流媒体",
    entityType: "媒体 / 平台",
    rightsLane: "需授权",
    rightsOwnerContext: "平台名、频道名、Logo、界面、节目画面与品牌识别分别核验",
    visualElements: ["屏幕框", "频道字块", "播放图标", "年代界面"],
    visualPalette: ["#050505", "#FFFFFF", "#E50914", "#246BCE"],
    visualComposition: "屏幕框 + 频道或平台字块 + 单一播放符号",
  },
  {
    slug: "magazines-print-and-digital",
    category: "网络 / 媒体",
    subcategory: "杂志与出版媒体",
    entityType: "杂志 / 媒体",
    rightsLane: "需授权",
    rightsOwnerContext: "刊名、Logo、版式、封面照片、文章、插图与出版商权利分别核验",
    visualElements: ["刊名字头", "封面网格", "期号", "编辑栏目"],
    visualPalette: ["#050505", "#FFFFFF", "#E32636", "#2952A3"],
    visualComposition: "刊名字头 + 主图留位 + 封面信息网格",
  },
  {
    slug: "sports-magazines-print-and-digital",
    category: "网络 / 媒体",
    subcategory: "体育杂志与媒体",
    entityType: "杂志 / 媒体",
    rightsLane: "需授权",
    rightsOwnerContext: "刊名、Logo、运动员肖像、赛事照片、版式与出版商权利分别核验",
    visualElements: ["刊名字头", "运动姿态", "比分信息", "封面日期"],
    visualPalette: ["#050505", "#FFFFFF", "#D9272E", "#1B4F9C"],
    visualComposition: "运动姿态 + 刊名字头 + 比分或日期信息",
  },
  {
    slug: "radio-programs-podcasts",
    category: "网络 / 媒体",
    subcategory: "广播与播客",
    entityType: "广播 / 播客",
    rightsLane: "需授权",
    rightsOwnerContext: "节目名、Logo、主持人姓名肖像、录音、片段和平台权利分别核验",
    visualElements: ["麦克风", "声波", "节目字块", "播放界面"],
    visualPalette: ["#070707", "#F7F7F7", "#E84444", "#3B82F6"],
    visualComposition: "麦克风或声波 + 节目字块 + 播放界面边框",
  },
  {
    slug: "columnists",
    category: "人物 / 文娱名人",
    subcategory: "专栏作者与媒体人物",
    entityType: "作者 / 媒体人物",
    rightsLane: "姓名肖像授权",
    rightsOwnerContext: "姓名肖像、专栏文字、刊物版式、节目片段和出版方权利分别核验",
    visualElements: ["人物肖像", "报刊栏线", "署名字块", "话题符号"],
    visualPalette: ["#101010", "#F4F1E8", "#9E2A2B", "#4B5563"],
    visualComposition: "人物轮廓 + 报刊栏线 + 署名字块",
  },
].map((item, index) => ({ ...COMMON_SOURCE, ...item, universe: true, priority: index }));

const MATCH_ONLY_SLUGS = [
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
  "pop-artists",
  "country-music-artists",
  "rap-hiphop-artists",
  "contemporary-music-artists",
  "rnb-urban-artists",
  "soul-funk-artists",
  "reggae-artists",
  "historical-figures",
  "sport-events",
  "national-religious-events",
  "events",
].map((slug, index) => ({ slug, universe: false, priority: 1000 + index }));

const CONFIGS = [...ENTERTAINMENT_CATEGORIES, ...MATCH_ONLY_SLUGS];

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

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 public-domain-research-tool" } });
      if (response.ok) return response;
      lastError = new Error(`${response.status} ${url}`);
      if (response.status < 429 || (response.status < 500 && response.status !== 429) || attempt === 5) break;
    } catch (error) {
      lastError = error;
      if (attempt === 5) break;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 600));
  }
  throw lastError;
}

async function fetchText(url) {
  return (await fetchWithRetry(url)).text();
}

async function fetchJson(url) {
  return (await fetchWithRetry(url)).json();
}

function sourceCandidate(source, config, period, pageUrl) {
  const famePercent = Number(source.rating_data?.fame);
  if (!Number.isFinite(famePercent)) return null;
  return {
    youGovName: source.name,
    famePercent,
    popularityPercent: Number(source.rating_data?.popularity) || null,
    adultPopulationEquivalent: Math.round((famePercent / 100) * ADULT_POPULATION),
    qualifies100mEquivalent: famePercent >= MIN_100M_EQUIVALENT_PERCENT,
    period,
    sourcePage: pageUrl,
    sourceCategory: config.slug,
    imageUrl: source.image || "",
    sourceEntitySlug: source.url || "",
    primaryType: source.primary_type?.name || "Entity",
    category: config.category || "",
    subcategory: config.subcategory || "",
    entityType: config.entityType || source.primary_type?.name || "文娱主体",
    rightsLane: config.rightsLane || "需授权",
    rightsOwnerContext: config.rightsOwnerContext || "具体权利主体待复核",
    sourceLabel: config.sourceLabel || COMMON_SOURCE.sourceLabel,
    sourceRole: config.sourceRole || COMMON_SOURCE.sourceRole,
    usTier: config.usTier || COMMON_SOURCE.usTier,
    visualElements: config.visualElements || ["主体轮廓", "标志道具", "年代线索", "标题结构"],
    visualPalette: config.visualPalette || ["#080808", "#F4F4F4", "#B3261E", "#315C7D"],
    visualComposition: config.visualComposition || "中心主体 + 单一识别道具 + 标题留白",
    priority: config.priority,
  };
}

async function collectCategory(config) {
  const pageUrl = `https://yougov.com/en-us/ratings/${config.slug}?sortBy=fame`;
  const html = await fetchText(pageUrl);
  const groupId = html.match(/search\/entity\/\?group=([0-9a-f-]+)/)?.[1];
  if (!groupId) throw new Error(`YouGov group id missing: ${config.slug}`);
  const period = html.match(/Data collection period:\s*([^<]+)/)?.[1]?.trim() || "2026 · quarter pending readback";
  const collected = [];
  let hits = 0;
  let offset = 0;
  let reachedCutoff = false;

  while (!reachedCutoff) {
    const offsets = config.universe
      ? Array.from({ length: PAGE_BATCH_SIZE }, (_, index) => offset + (index * PAGE_SIZE))
      : [0];
    const payloads = await Promise.all(offsets.map((pageOffset) => fetchJson(
      `https://api-test.yougov.com/public-data/v5/us/search/entity/?group=${groupId}&sort_by=fame&limit=${PAGE_SIZE}&offset=${pageOffset}`,
    )));
    for (const payload of payloads) {
      hits = Math.max(hits, Number(payload.hits) || 0);
      const pageRecords = payload.data || [];
      collected.push(...pageRecords);
      if (!config.universe || pageRecords.length < PAGE_SIZE || pageRecords.some((item) => Number(item.rating_data?.fame) < MIN_100M_EQUIVALENT_PERCENT)) {
        reachedCutoff = true;
        break;
      }
    }
    offset += PAGE_BATCH_SIZE * PAGE_SIZE;
    if (!config.universe || offset >= hits) reachedCutoff = true;
  }

  const qualifiedCount = config.universe
    ? collected.filter((item) => Number(item.rating_data?.fame) >= MIN_100M_EQUIVALENT_PERCENT).length
    : 0;
  return {
    config,
    pageUrl,
    groupId,
    period,
    sourceRecords: collected,
    snapshot: {
      slug: config.slug,
      pageUrl,
      groupId,
      period,
      universe: config.universe,
      availableCount: hits,
      scannedCount: collected.length,
      qualifiedCount,
      category: config.category || "seed-match-only",
      subcategory: config.subcategory || "seed-match-only",
    },
  };
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

const categoryResults = await mapLimit(CONFIGS, 3, collectCategory);
const categorySnapshots = categoryResults.map((item) => item.snapshot);
const bestByTarget = new Map();
const universeByKey = new Map();

for (const result of categoryResults) {
  for (const source of result.sourceRecords) {
    const candidate = sourceCandidate(source, result.config, result.period, result.pageUrl);
    if (!candidate) continue;

    const rawKey = normalize(source.name);
    const targetKey = NAME_ALIASES.get(rawKey) || rawKey;
    const targetName = targetByNormalizedName.get(targetKey);
    if (targetName) {
      const matched = { targetName, ...candidate };
      const previous = bestByTarget.get(targetName);
      if (!previous || matched.famePercent > previous.famePercent) bestByTarget.set(targetName, matched);
    }

    if (!result.config.universe || candidate.famePercent < MIN_100M_EQUIVALENT_PERCENT) continue;
    const universeKey = `${normalize(source.name)}|${normalize(candidate.primaryType)}`;
    const previous = universeByKey.get(universeKey);
    if (!previous || candidate.priority < previous.priority || candidate.famePercent > previous.famePercent) {
      universeByKey.set(universeKey, candidate);
    }
  }
}

const records = [...bestByTarget.values()]
  .sort((a, b) => b.famePercent - a.famePercent || a.targetName.localeCompare(b.targetName, "en"));
const universeRecords = [...universeByKey.values()]
  .sort((a, b) => b.famePercent - a.famePercent || a.youGovName.localeCompare(b.youGovName, "en"));
const snapshot = {
  schemaVersion: "1.1",
  sourceVersion: `yougov-us-entertainment-fame-${new Date().toISOString().slice(0, 10)}`,
  generatedAt: new Date().toISOString(),
  market: "United States",
  methodology: {
    source: "YouGov Ratings",
    sourceUrl: "https://yougov.com/en-us/ratings",
    measure: "Fame is the share of surveyed U.S. adults who have heard of the entity.",
    sampleBoundary: "YouGov survey percentage; not unique viewers, buyers, or a commercial-use license.",
    coverageBoundary: "The universe contains YouGov entertainment entities at or above the 100M adult-population-equivalent threshold; it is broad survey coverage, not every entertainment work ever created.",
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
    universeRecords: universeRecords.length,
    equivalent100m: universeRecords.filter((item) => item.qualifies100mEquivalent).length,
    entertainmentCategories: ENTERTAINMENT_CATEGORIES.length,
    scannedRecords: categorySnapshots.reduce((sum, item) => sum + item.scannedCount, 0),
  },
  records,
  universeRecords,
};

await fs.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(snapshot.counts, null, 2)}\n`);
