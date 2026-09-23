import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sourcePath = path.join(root, "source", "meme-template-sources.json");
const kymSourcePath = path.join(root, "source", "meme-kym-snapshot.json");
const requiredSourcePath = path.join(root, "source", "meme-required-entries.json");
const externalBenchmarkPath = path.join(root, "source", "meme-external-benchmark.json");
const catalogPath = path.join(root, "data", "catalog.json");
const superIpPath = path.join(root, "data", "super-ip-us.json");
const outputJsonPath = path.join(root, "data", "memes.json");
const outputJsPath = path.join(root, "data", "memes.js");
const manifestPath = path.join(root, "meme-manifest.json");
const imageRoot = path.join(root, "meme-images");
const refresh = process.argv.includes("--refresh") || !fs.existsSync(sourcePath);
const researchDate = new Date().toISOString().slice(0, 10);
const MEMEGEN_URL = "https://api.memegen.link/templates/";
const IMGFLIP_URL = "https://api.imgflip.com/get_memes";

fs.mkdirSync(imageRoot, { recursive: true });

const normalize = (value) => String(value || "")
  .normalize("NFKD")
  .toLowerCase()
  .replace(/[’']/g, "")
  .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();
const slugify = (value) => normalize(value).replace(/\s+/g, "-").slice(0, 72) || "meme";
const compact = (values) => [...new Set(values.filter(Boolean))];
const hash = (value) => createHash("sha256").update(value).digest("hex");
const shortHash = (value) => hash(value).slice(0, 12);

async function fetchJson(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "public-domain-cartoon-inspiration/1.0 research-cache" },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }
  }
  throw lastError;
}

if (refresh) {
  const [memegen, imgflip] = await Promise.all([fetchJson(MEMEGEN_URL), fetchJson(IMGFLIP_URL)]);
  if (!Array.isArray(memegen) || !imgflip?.success || !Array.isArray(imgflip.data?.memes)) {
    throw new Error("Meme template APIs returned an unexpected schema");
  }
  const source = {
    schemaVersion: "1.0.0",
    sourceVersion: `meme-template-snapshot-${researchDate}`,
    researchDate,
    caveat: "Template-directory and platform-activity evidence only. It does not prove public-domain or commercial-use status.",
    sources: {
      memegen: { url: MEMEGEN_URL, guide: "https://memegen.link/guide/", records: memegen },
      imgflip: { url: IMGFLIP_URL, docs: "https://imgflip.com/api", records: imgflip.data.memes },
    },
  };
  fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`);
}

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const kymSource = fs.existsSync(kymSourcePath)
  ? JSON.parse(fs.readFileSync(kymSourcePath, "utf8"))
  : { researchDate: source.researchDate, records: [], counts: { records: 0 } };
const requiredSource = fs.existsSync(requiredSourcePath)
  ? JSON.parse(fs.readFileSync(requiredSourcePath, "utf8"))
  : { researchDate: source.researchDate, records: [] };
const externalBenchmarkSource = fs.existsSync(externalBenchmarkPath)
  ? JSON.parse(fs.readFileSync(externalBenchmarkPath, "utf8"))
  : { researchDate: source.researchDate, sources: [], records: [] };
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const superIp = JSON.parse(fs.readFileSync(superIpPath, "utf8"));
const memegen = source.sources.memegen.records;
const imgflip = source.sources.imgflip.records;
const requiredRecords = requiredSource.records || [];
const externalBenchmarkRecords = (externalBenchmarkSource.records || []).map((record) => ({
  ...record,
  externalBenchmark: true,
  curationStatus: record.curationStatus || (record.status === "Submission" ? "外部基准·研究中" : "外部基准已核验"),
  curationReason: record.curationReason || `由外部基准的${record.benchmarkLane || "盲区排查"}收录；本地库仅用于覆盖对照。`,
}));
const externalSourcesById = new Map((externalBenchmarkSource.sources || []).map((item) => [item.id, item]));
const curatedByPath = new Map();
for (const record of [...externalBenchmarkRecords, ...requiredRecords]) {
  const existing = curatedByPath.get(record.path) || {};
  curatedByPath.set(record.path, {
    ...existing,
    ...record,
    aliases: compact([...(existing.aliases || []), ...(record.aliases || [])]),
    externalBenchmark: Boolean(existing.externalBenchmark || record.externalBenchmark),
    externalSourceIds: compact([...(existing.externalSourceIds || []), ...(record.externalSourceIds || [])]),
    requiredEntry: Boolean(existing.requiredEntry || record.requiredEntry),
  });
}
const kymByPath = new Map((kymSource.records || []).map((record) => [record.path, record]));
for (const curated of curatedByPath.values()) {
  const existing = kymByPath.get(curated.path) || {};
  kymByPath.set(curated.path, {
    ...curated,
    ...existing,
    aliases: compact([...(existing.aliases || []), ...(curated.aliases || [])]),
    requiredEntry: Boolean(curated.requiredEntry),
    externalBenchmark: Boolean(curated.externalBenchmark),
    externalSourceIds: compact(curated.externalSourceIds || []),
    benchmarkLane: curated.benchmarkLane || "",
    curationStatus: curated.curationStatus,
    relationType: curated.relationType,
    variantNote: curated.variantNote,
    curationReason: curated.curationReason,
    mechanicOverride: curated.mechanicOverride,
    useCasesOverride: curated.useCasesOverride,
    agentPatternOverride: curated.agentPatternOverride,
    rightsLaneOverride: curated.rightsLaneOverride,
    copyrightNoteOverride: curated.copyrightNoteOverride,
    publicityNoteOverride: curated.publicityNoteOverride,
    trademarkNoteOverride: curated.trademarkNoteOverride,
    productionRouteOverride: curated.productionRouteOverride,
    imageUrl: existing.imageUrl || curated.imageUrl,
    url: existing.url || curated.url,
  });
}
const kymRecords = [...kymByPath.values()];

const aliasFamilies = [
  ["drakeposting", "drake hotline bling", "drake blank"],
  ["ancient aliens", "ancient aliens guy"],
  ["one does not simply", "one does not simply walk into mordor"],
  ["bernie asking", "bernie i am once again asking for your support", "bernie sanders once again asking"],
  ["anakin padme", "anakin padme 4 panel", "anakin and padme change the world for the better"],
  ["woman yelling at a cat", "woman yelling at cat"],
  ["spiderman pointing", "spider man triple", "spider man pointing at spider man", "spiderman pointing at spiderman"],
  ["scooby doo reveal", "scooby doo mask reveal"],
  ["expanding brain", "galaxy brain"],
  ["futurama fry", "futurama fry"],
  ["roll safe", "roll safe think about it"],
  ["grant gustin grave", "grant gustin over grave", "grant gustin next to oliver queens grave"],
  ["three headed dragon", "three headed dragon"],
  ["types of headaches", "types of headaches meme"],
  ["you guys are getting paid", "you guys are getting paid"],
  ["mother ignoring kid drowning", "mother ignoring kid drowning in a pool"],
  ["tuxedo winnie the pooh", "tuxedo winnie the pooh"],
  ["this is fine", "this is fine"],
  ["two guys on a bus", "two guys on a bus"],
  ["hide the pain harold", "hide the pain harold"],
  ["inhaling seagull", "inhaling seagull"],
  ["panik kalm panik", "panik kalm panik"],
  ["who killed hannibal", "who killed hannibal"],
  ["bad luck brian", "bad luck brian"],
  ["american chopper argument", "american chopper argument"],
  ["yall got any more", "yall got any more of that", "yall got any more of them"],
  ["im the captain now", "i am the captain now", "im the captain now"],
  ["skeptical third world kid", "third world skeptical kid", "skeptical third world kid"],
  ["oprah you get a car", "oprah you get a car", "oprah you get a"],
  ["say the line bart", "say the line bart", "say the line bart simpsons"],
];
const aliasToFamily = new Map();
for (const [family, ...aliases] of aliasFamilies) {
  for (const alias of [family, ...aliases]) aliasToFamily.set(normalize(alias), family);
}
for (const record of curatedByPath.values()) {
  const family = normalize(record.title);
  for (const alias of [record.title, ...(record.aliases || [])]) aliasToFamily.set(normalize(alias), family);
}
function familyKey(name) {
  return aliasToFamily.get(normalize(name)) || normalize(name);
}

function eraForYear(year, isPublicDomain = false) {
  if (isPublicDomain) return "历史公版视觉";
  const value = Number(year);
  if (!Number.isFinite(value)) return "年代待复核";
  if (value <= 2004) return "早期互联网 · ≤2004";
  if (value <= 2011) return "图片宏 / Web 2.0 · 2005–2011";
  if (value <= 2017) return "反应图 / GIF · 2012–2017";
  if (value <= 2022) return "平台 Meme · 2018–2022";
  if (value <= 2024) return "短视频扩散 · 2023–2024";
  return "近两年热门 · 2025–2026";
}

function formatCompactNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(number >= 100_000 ? 0 : 1)}K`;
  return String(number);
}

function bestFinite(values, mode = "max") {
  const numbers = values.map(Number).filter(Number.isFinite);
  if (!numbers.length) return null;
  return mode === "min" ? Math.min(...numbers) : Math.max(...numbers);
}

const originRules = [
  [/drake/i, "Drake", "Hotline Bling"],
  [/bernie/i, "Bernie Sanders", "2020 campaign appearances"],
  [/donald trump|trump bill/i, "Donald Trump", "Public appearances"],
  [/barack obama|sad obama/i, "Barack Obama", "Public appearances"],
  [/joe biden/i, "Joe Biden", "Public appearances"],
  [/george bush|sad george bush/i, "George W. Bush", "Public appearances"],
  [/bill clinton/i, "Bill Clinton", "Public appearances"],
  [/john boehner/i, "John Boehner", "Public appearances"],
  [/oprah/i, "Oprah Winfrey", "The Oprah Winfrey Show"],
  [/will smith/i, "Will Smith", "2022 Academy Awards"],
  [/change my mind|steven crowder/i, "Steven Crowder", "Change My Mind public-event photo"],
  [/absolute cinema/i, "Martin Scorsese", "Public-event reaction image"],
  [/yall got any more|tyrone biggums/i, "Dave Chappelle", "Chappelle's Show"],
  [/woman yelling at (a )?cat/i, "Taylor Armstrong / Smudge the Cat", "The Real Housewives of Beverly Hills + internet cat photo"],
  [/khaby lame/i, "Khaby Lame", "Social video reactions"],
  [/salt bae/i, "Salt Bae", "Viral food performance"],
  [/vince mcmahon/i, "Vince McMahon", "WWE"],
  [/sha(q|quille)/i, "Shaquille O'Neal", "Public / broadcast reactions"],
  [/leonardo|leo strutting|laughing leo/i, "Leonardo DiCaprio", "Film and public-event reaction images"],
  [/keanu/i, "Keanu Reeves", "Film and public appearances"],
  [/jony ive/i, "Jony Ive", "Apple design presentations"],
  [/spongebob|patrick|squidward/i, "SpongeBob SquarePants", "SpongeBob SquarePants"],
  [/simpson|bart|principal skinner|lenny/i, "The Simpsons", "The Simpsons"],
  [/futurama|\bfry\b|take my money/i, "Futurama", "Futurama"],
  [/star wars|ackbar|chosen one|anakin|padme|older code|yoda/i, "Star Wars", "Star Wars franchise"],
  [/one does not simply|gandalf|mordor/i, "The Lord of the Rings", "The Lord of the Rings films"],
  [/matrix|morpheus/i, "The Matrix", "The Matrix"],
  [/batman|robin/i, "Batman", "Batman screen and comic adaptations"],
  [/spider.?man/i, "Spider-Man", "Spider-Man screen adaptations"],
  [/winnie the pooh/i, "Winnie-the-Pooh", "Modern screen adaptation image"],
  [/scooby/i, "Scooby-Doo", "Scooby-Doo"],
  [/bugs bunny/i, "Bugs Bunny", "Looney Tunes"],
  [/elmo/i, "Elmo", "Sesame Street"],
  [/agnes harkness/i, "WandaVision", "WandaVision"],
  [/\bgru(?:s|'s)?\b|megamind/i, "Despicable Me / Megamind", "Animated-film reaction images"],
  [/is this (a )?(pigeon|butterfly)/i, "The Brave Fighter of Sun Fighbird", "The Brave Fighter of Sun Fighbird"],
  [/epic handshake/i, "Predator", "Predator (1987)"],
  [/you guys are getting paid/i, "We're the Millers", "We're the Millers (2013)"],
  [/put my trophy|fairly oddparents/i, "The Fairly OddParents", "The Fairly OddParents"],
  [/x[, ]+x everywhere/i, "Toy Story", "Toy Story films"],
  [/office|schrute|jim halpert|michael scott|same picture/i, "The Office", "The Office (U.S.)"],
  [/kramer|no soup for you/i, "Seinfeld", "Seinfeld"],
  [/phoebe|joey/i, "Friends", "Friends"],
  [/mean girls|fetch/i, "Mean Girls", "Mean Girls"],
  [/anchorman|milk was a bad choice|immediately regret|crazy pills/i, "Anchorman", "Anchorman films"],
  [/arrested development|stew going/i, "Arrested Development", "Arrested Development"],
  [/men in black/i, "Men in Black", "Men in Black"],
  [/princess bride|inigo montoya/i, "The Princess Bride", "The Princess Bride"],
  [/jurassic|life finds a way/i, "Jurassic Park", "Jurassic Park"],
  [/this is sparta/i, "300", "300"],
  [/winter is coming/i, "Game of Thrones", "Game of Thrones"],
  [/pablo escobar/i, "Narcos", "Narcos"],
  [/charlie conspiracy|always sunny/i, "It's Always Sunny in Philadelphia", "It's Always Sunny in Philadelphia"],
  [/wolverine/i, "Wolverine", "X-Men: The Animated Series"],
  [/pikachu/i, "Pokémon", "Pokémon anime"],
  [/ugandan knuckles/i, "Sonic the Hedgehog fan culture", "VRChat meme"],
  [/all your base/i, "Zero Wing", "Zero Wing localization"],
  [/doge|cheems/i, "Doge / Cheems", "Internet dog characters"],
  [/grumpy cat/i, "Grumpy Cat", "Internet celebrity cat"],
  [/bongo cat/i, "Bongo Cat", "Internet animation"],
  [/success kid/i, "Success Kid", "Viral photograph"],
  [/hide the pain harold/i, "Hide the Pain Harold", "Stock-photo meme"],
  [/distracted (boyfriend|girlfriend)/i, "Distracted Boyfriend", "Stock-photo series"],
  [/disaster girl/i, "Disaster Girl", "Viral photograph"],
  [/bad luck brian/i, "Bad Luck Brian", "Viral school portrait"],
  [/overly attached girlfriend/i, "Overly Attached Girlfriend", "Viral video / portrait"],
  [/ancient aliens/i, "Giorgio A. Tsoukalos", "Ancient Aliens"],
  [/most interesting man/i, "The Most Interesting Man in the World", "Advertising campaign"],
  [/stonks/i, "Meme Man", "Surreal meme culture"],
  [/troll|y u no|forever alone|feels bad man|feels good/i, "Rage comics / web characters", "Internet-native drawings"],
];

const mechanicRules = [
  [/two buttons/i, "在两个都不理想的选项间被迫选择", ["两难选择", "决策焦虑"]],
  [/distracted/i, "三方标签关系：旧承诺被新诱惑夺走注意力", ["喜新厌旧", "注意力转移"]],
  [/drake/i, "上下两格拒绝／接受，对比两个方案", ["方案对比", "偏好表达"]],
  [/anakin|padme/i, "四格对话：乐观承诺逐步变成不安确认", ["承诺落空", "对话反转"]],
  [/epic handshake/i, "两个阵营因同一共同点结盟", ["共同利益", "意外共识"]],
  [/grus plan/i, "计划逐步推进，最后一格暴露自我矛盾", ["计划翻车", "复盘"]],
  [/running away balloon/i, "主体放弃正确选项，追逐更诱人的错误目标", ["优先级错位", "诱惑"]],
  [/disaster girl/i, "平静人物与背后灾难形成冷静反差", ["旁观混乱", "暗中得意"]],
  [/change my mind/i, "一句强观点放在公开辩论场景中", ["观点挑战", "引战句式"]],
  [/always has been/i, "真相揭示之后立刻出现背叛或灭口", ["突然醒悟", "早已如此"]],
  [/woman yelling/i, "强烈指控与无辜／困惑反应并置", ["争论", "误解"]],
  [/this is fine/i, "身处明显危机却继续假装正常", ["否认危机", "强装镇定"]],
  [/expanding brain|galaxy brain/i, "逐级升级认知层次，最后走向夸张或荒诞", ["层级升级", "伪高级"]],
  [/bell curve|midwit/i, "两端得出相同结论，中间层过度复杂化", ["观点分布", "复杂化"]],
  [/hide the pain harold/i, "礼貌微笑与内心痛苦形成表里反差", ["职业假笑", "压抑"]],
  [/bad luck brian/i, "第一句建立普通期待，第二句给出最坏结果", ["倒霉反转", "期待落空"]],
  [/american chopper/i, "多格人物争吵逐步升级，用于展开双方论点", ["争论升级", "立场对撞"]],
  [/bernie/i, "反复出现的人物再次提出同一种请求", ["重复请求", "资源征集"]],
  [/uno draw/i, "宁愿接受巨大惩罚，也拒绝执行某项动作", ["拒绝选择", "原则性抗拒"]],
  [/trade offer/i, "左右列出我得到什么、你得到什么", ["交换条件", "不平等交易"]],
  [/bike fall/i, "自己制造问题后，把责任归咎给外部对象", ["自作自受", "甩锅"]],
  [/same picture/i, "权威人物判定两个看似不同对象实质相同", ["等价比较", "拆穿差异"]],
  [/is this (a )?(pigeon|butterfly)/i, "把眼前对象错误识别成另一个概念", ["误判", "概念混淆"]],
  [/you guys are getting paid/i, "最后加入的人才发现他人一直拥有自己没有的收益", ["信息差", "待遇差异"]],
  [/mother ignoring/i, "资源被投入较弱对象，而真正紧急的问题被忽视", ["资源错配", "优先级"]],
  [/tuxedo winnie/i, "同一概念用普通和精致两种表达对比", ["表达升级", "阶层化命名"]],
  [/left exit/i, "临近节点突然转向更强烈的新目标", ["突然改道", "临时变卦"]],
  [/waiting skeleton/i, "用已经化为骷髅的等待者夸大等待时长", ["久等", "迟迟不来"]],
  [/sad pablo/i, "多格孤独等待，放大无事可做与被冷落", ["孤独等待", "无人回应"]],
  [/marked safe/i, "借安全状态通知讽刺躲过某个日常事件", ["幸免", "状态播报"]],
  [/batman slapping/i, "上级用突然打断纠正错误或幼稚发言", ["强行纠正", "打断"]],
  [/absolute cinema/i, "用夸张庄重姿态赞美普通事件", ["过度赞美", "神作"]],
  [/panik kalm/i, "恐慌、平静、再次恐慌的三段节奏", ["情绪反复", "二次反转"]],
  [/spider.?man pointing/i, "多个相似主体互相指认，表现重复、冒充或共犯", ["同质化", "互相指认"]],
  [/surprised pikachu/i, "做出会产生明显后果的行为后仍表现震惊", ["可预测后果", "装惊讶"]],
  [/one does not simply/i, "用严肃人物强调某事远比听起来困难", ["难度警告", "不要低估"]],
  [/success kid/i, "小动作与握拳姿态表达意外成功", ["小胜利", "逆转成功"]],
  [/facepalm/i, "单一反应用于表达无语、失望或常识崩塌", ["无语", "失望"]],
  [/reaction|sad |cry|laugh|confused|skeptical|awkward|regret|feel/i, "以强表情作为一句话情境的反应锚点", ["情绪反应", "情境代入"]],
];

function originFor(name) {
  for (const [pattern, entity, work] of originRules) {
    if (pattern.test(name)) return { entity, work };
  }
  return { entity: "互联网 Meme 文化", work: "互联网原生模板" };
}

function categoryFor(name, origin) {
  if (/trump|obama|biden|bernie|bush|clinton|boehner|politic|rent is too damn high/i.test(name)) {
    return ["政治 / 公共事件", "政治人物与公共场景"];
  }
  if (/soccer|ski instructor|vince mcmahon|undertaker|styles|shaq|wwe/i.test(name)) {
    return ["体育 / 赛事", "赛场与体育娱乐反应"];
  }
  if (/pikachu|pokemon|ugandan knuckles|all your base|video game|anime|fighbird/i.test(`${name} ${origin.work}`)) {
    return ["游戏 / 动漫", "游戏与动漫衍生"];
  }
  if (/drake|oprah|will smith|khaby|salt bae|jony ive|leonardo|keanu|harold|tsoukalos|most interesting man|scorsese|crowder|chappelle/i.test(`${name} ${origin.entity}`)) {
    return ["名人 / 音乐", "名人与公众人物反应"];
  }
  if (/star wars|spongebob|simpsons|futurama|batman|spider|matrix|lord of the rings|seinfeld|\bfriends\b|anchorman|narcos|mean girls|jurassic|game of thrones|office|winnie|scooby|bugs bunny|elmo|despicable|megamind|princess bride|\b300\b|arrested development|men in black|wolverine|wandavision|predator|we.?re the millers|fairly oddparents|toy story|real housewives/i.test(`${name} ${origin.entity} ${origin.work}`)) {
    return ["电影 / 电视", /spongebob|simpsons|futurama|winnie|scooby|bugs bunny|elmo|\bgru\b|megamind|fairly oddparents|toy story/i.test(`${name} ${origin.entity} ${origin.work}`) ? "动画画面" : "影视反应画面"];
  }
  if (/cat|dog|doge|cheems|penguin|bear|frog|wolf|seal|seagull|snake|lizard|pigeon|shark|monkey|raptor|puffin|bongo/i.test(name)) {
    return ["动物 / 表情", "动物反应与拟人角色"];
  }
  if (/two buttons|bell curve|trade offer|marked safe|domino|scroll of truth|nut button|headaches|expectation vs|no yes|two paths|boardroom/i.test(name)) {
    return ["文字 / 对话结构", "选择、比较与信息图式"];
  }
  return ["互联网原生", /rage|y u no|forever alone|troll|feels bad|feels good/i.test(name) ? "Rage Comic 与网络角色" : "图片宏与反应模板"];
}

function categoryForKym(name, origin, evidence) {
  const base = categoryFor(name, origin);
  if (!evidence) return base;
  if (base[0] !== "互联网原生") return base;
  const text = normalize([
    name,
    evidence.category,
    ...(evidence.types || []),
    ...(evidence.tags || []),
    evidence.parentSeries,
    evidence.origin,
  ].join(" "));
  if (/politic|president|congress|election|senator|government|white house|republican|democrat|protest/.test(text)) {
    return ["政治 / 公共事件", "政治人物、公共事件与网络反应"];
  }
  if (/nfl|nba|mlb|nhl|football|basketball|baseball|soccer|athlete|sports|olympic|wrestling|ufc/.test(text)) {
    return ["体育 / 赛事", "体育人物、比赛与球迷文化"];
  }
  if (/movie|film|television|tv series|sitcom|actor|actress|cartoon|animation|disney|marvel|dc comics|netflix|anime/.test(text)) {
    return ["电影 / 电视", /cartoon|animation|anime/.test(text) ? "动画与动漫传播画面" : "影视与流媒体传播画面"];
  }
  if (/video game|gaming|fortnite|minecraft|roblox|nintendo|playstation|xbox|steam|vtuber/.test(text)) {
    return ["游戏 / 动漫", "游戏、直播与虚拟角色"];
  }
  if (/song|music|rapper|singer|album|concert|musician|band|tiktok sound|dance trend/.test(text)) {
    return ["名人 / 音乐", "音乐、舞蹈与艺人传播画面"];
  }
  if (evidence.category === "Person" || /celebrity|influencer|streamer|youtuber|tiktoker/.test(text)) {
    return ["名人 / 音乐", "公众人物与互联网名人"];
  }
  if (/cat|dog|bird|monkey|ape|gorilla|horse|hippo|frog|fish|shark|bear|squirrel|animal/.test(text)) {
    return ["动物 / 表情", "动物角色、宠物与自然反应"];
  }
  if (/catchphrase|slang|copypasta|snowclone|phrasal template|wordplay/.test(text)) {
    return ["文字 / 对话结构", "流行语、口播与文字模板"];
  }
  if (evidence.category === "Event") return ["互联网原生", "网络事件与平台现象"];
  if (evidence.category === "Subculture") return ["互联网原生", "社群、亚文化与网络角色"];
  return ["互联网原生", Number(evidence.year) >= 2024 ? "近年短视频与跨平台梗" : "图片宏、反应图与互联网现象"];
}

function mechanicFor(name, lines) {
  for (const [pattern, mechanic, useCases] of mechanicRules) {
    if (pattern.test(name)) return { mechanic, useCases };
  }
  if (lines >= 4) return { mechanic: "多格顺序推进：建立情境、升级关系，再落到反转或结论", useCases: ["过程演变", "多步反转"] };
  if (lines === 3) return { mechanic: "三个标签形成角色、目标与阻力的关系", useCases: ["三方关系", "优先级"] };
  if (lines === 2) return { mechanic: "两段式建立情境与结果，或形成上下对比", useCases: ["前后反转", "双项对比"] };
  return { mechanic: "单一强反应画面承载一句情境判断", useCases: ["情绪反应", "一句话吐槽"] };
}

function rightsFor(category, origin, name) {
  const publicity = ["名人 / 音乐", "政治 / 公共事件", "体育 / 赛事"].includes(category)
    || origin.entity !== "互联网 Meme 文化" && /Drake|Oprah|Obama|Trump|Biden|Bernie|Will Smith|Khaby|Salt Bae|Leonardo|Keanu|Harold|Shaquille|Vince|Scorsese|Crowder|Chappelle|Taylor Armstrong/i.test(origin.entity);
  const trademark = ["电影 / 电视", "游戏 / 动漫"].includes(category);
  const creatorOwned = /doge|cheems|grumpy cat|bongo cat|pepe|rage|troll|wojak|this is fine|stonks|success kid|bad luck brian|disaster girl|two buttons|running away balloon|bike fall|panik kalm|scroll of truth|expanding brain|galaxy brain|friendship ended/i.test(name);
  return {
    lane: publicity ? "版权 + 肖像需核验" : trademark ? "影视 / 角色需授权" : creatorOwned ? "创作者版权需核验" : "原图权利待核验",
    copyright: trademark ? "影视、动画或漫画画面通常受版权保护。" : creatorOwned ? "互联网传播不等于作者放弃版权。" : "原始摄影、插画或截帧通常仍有版权。",
    publicity: publicity ? "涉及可识别真人；商业商品需另核肖像、人格权及代言误认。" : "未识别到主要真人肖像路径；仍需核对具体图像。",
    trademark: trademark ? "角色名称、造型、Logo 与商品来源误认需单独核验。" : "如使用名称、Logo 或来源标识，仍需单独检索商标。",
    production: publicity
      ? "只提取表情节奏与人物关系；换成原创人物，不复制真人脸、服装和原场景。"
      : trademark
        ? "只提取叙事结构；重画原创角色、动作与场景，不复制剧照或角色造型。"
        : "只提取构图和语义机制；使用原图前必须取得对应摄影或插画权利。",
  };
}

const superIpIndex = new Map();
for (const item of superIp.records || []) {
  for (const candidate of [item.name, item.nameZh, ...(item.aliases || [])]) {
    const key = normalize(candidate);
    if (key && !superIpIndex.has(key)) superIpIndex.set(key, item);
  }
}
function relatedSuperIp(origin) {
  for (const candidate of [origin.entity, origin.work]) {
    const match = superIpIndex.get(normalize(candidate));
    if (match) return match;
  }
  return null;
}

const families = new Map();
function ensureFamily(name) {
  const key = familyKey(name);
  if (!families.has(key)) families.set(key, { key, names: [], variants: [] });
  const family = families.get(key);
  family.names.push(name);
  return family;
}

for (const item of memegen) {
  ensureFamily(item.name).variants.push({
    provider: "Memegen",
    templateId: item.id,
    name: item.name,
    imageUrl: item.blank,
    sourceUrl: item.source || item._self,
    providerUrl: item._self,
    lines: item.lines || 0,
    keywords: item.keywords || [],
    rank: null,
    captions: null,
  });
}
for (const [index, item] of imgflip.entries()) {
  ensureFamily(item.name).variants.push({
    provider: "Imgflip",
    templateId: item.id,
    name: item.name,
    imageUrl: item.url,
    sourceUrl: "https://imgflip.com/memetemplate/" + item.id,
    providerUrl: "https://imgflip.com/api",
    lines: item.box_count || 0,
    keywords: [],
    rank: index + 1,
    captions: item.captions || null,
  });
}
for (const item of kymRecords) {
  const family = ensureFamily(item.title);
  family.names.push(...(item.aliases || []));
  if (item.requiredEntry || item.externalBenchmark) family.curated = item;
  family.variants.push({
    provider: "Know Your Meme",
    templateId: item.path,
    name: item.title,
    imageUrl: item.imageUrl,
    sourceUrl: item.url,
    providerUrl: "https://knowyourmeme.com/",
    lines: 1,
    keywords: compact([...(item.tags || []), ...(item.types || []), item.parentSeries, item.origin]),
    rank: null,
    captions: null,
    kym: item,
  });
}

function choosePrimary(family) {
  return [...family.variants].sort((a, b) => {
    if (a.rank && !b.rank) return -1;
    if (!a.rank && b.rank) return 1;
    if (a.rank && b.rank) return a.rank - b.rank;
    const aEditorial = a.kym?.editorialEvidence?.length || 0;
    const bEditorial = b.kym?.editorialEvidence?.length || 0;
    if (aEditorial !== bEditorial) return bEditorial - aEditorial;
    const aHistorical = Number(a.kym?.historicalRank || 999999);
    const bHistorical = Number(b.kym?.historicalRank || 999999);
    if (aHistorical !== bHistorical) return aHistorical - bHistorical;
    const aViews = Number(a.kym?.views || 0);
    const bViews = Number(b.kym?.views || 0);
    if (aViews !== bViews) return bViews - aViews;
    return a.provider.localeCompare(b.provider);
  })[0];
}

function chooseKymEvidence(family) {
  return family.variants
    .filter((item) => item.kym)
    .sort((a, b) => {
      const aEditorial = a.kym.editorialEvidence?.length || 0;
      const bEditorial = b.kym.editorialEvidence?.length || 0;
      if (aEditorial !== bEditorial) return bEditorial - aEditorial;
      const aRank = Number(a.kym.historicalRank || 999999);
      const bRank = Number(b.kym.historicalRank || 999999);
      if (aRank !== bRank) return aRank - bRank;
      return Number(b.kym.views || 0) - Number(a.kym.views || 0);
    })[0]?.kym || null;
}

function reuseTierFor({ currentRank, captions, kymViews, kymImages, kymVideos, editorialEvidence, firstSeenYear }) {
  const recentEvidence = editorialEvidence.some((item) => ["annual-2025", "staff-2025", "recent-editorial"].includes(item.signal));
  if ((Number(firstSeenYear) >= 2025 || recentEvidence) && editorialEvidence.length) return "近年上升";
  if ((currentRank && currentRank <= 30) || captions >= 100_000 || kymImages >= 1_000 || kymVideos >= 250 || (kymImages >= 50 && Number(kymViews) >= 1_000_000)) return "高复用线索";
  if ((currentRank && currentRank <= 100) || captions >= 10_000 || kymImages >= 200 || kymVideos >= 50) return "中复用线索";
  if (editorialEvidence.length || kymImages >= 40 || kymVideos >= 10) return "已形成变体";
  return "基础档案";
}

function activityScoreFor({ currentRank, historicalRank, kymViews, editorialEvidence, firstSeenYear, recentHeat }) {
  const current = currentRank ? Math.max(62, 101 - Math.ceil(currentRank * .39)) : 0;
  const historical = historicalRank ? Math.max(58, 101 - Math.ceil(historicalRank * .055)) : 0;
  const views = kymViews ? Math.min(96, 48 + Math.log10(Math.max(10, kymViews)) * 7) : 0;
  const editorial = editorialEvidence.some((item) => item.signal === "recent-editorial")
    ? 97
    : editorialEvidence.length
      ? 93
      : 0;
  const recent = recentHeat ? 90 : Number(firstSeenYear) >= 2024 ? 82 : 0;
  return Math.round(Math.max(current, historical, views, editorial, recent, 55));
}

function resolveOrigin(displayName, family, kymEvidence) {
  const matched = originFor(`${displayName} ${family.names.join(" ")} ${(kymEvidence?.tags || []).join(" ")}`);
  if (matched.entity !== "互联网 Meme 文化" || !kymEvidence) return matched;
  const genericSeries = /^(internet slang|memes|reaction images|viral videos|catchphrases|image macros|copypasta)$/i;
  const entity = kymEvidence.parentSeries && !genericSeries.test(kymEvidence.parentSeries)
    ? kymEvidence.parentSeries
    : displayName;
  return {
    entity,
    work: kymEvidence.origin ? `${displayName} · ${kymEvidence.origin}` : displayName,
  };
}

const modernRecords = [...families.values()].map((family) => {
  const primary = choosePrimary(family);
  const displayName = primary.name || family.names[0];
  const kymEvidence = chooseKymEvidence(family);
  const curated = family.curated || (kymEvidence?.path ? curatedByPath.get(kymEvidence.path) : null) || null;
  const inferredOrigin = resolveOrigin(displayName, family, kymEvidence);
  const origin = curated?.originEntityOverride
    ? { entity: curated.originEntityOverride, work: curated.originWorkOverride || inferredOrigin.work }
    : inferredOrigin;
  const [inferredCategory, inferredSubcategory] = categoryForKym(`${displayName} ${family.names.join(" ")}`, origin, kymEvidence);
  const category = curated?.categoryOverride || inferredCategory;
  const subcategory = curated?.subcategoryOverride || inferredSubcategory;
  const lines = Math.max(...family.variants.map((item) => item.lines || 0), 1);
  const inferredMechanic = mechanicFor(`${displayName} ${family.names.join(" ")}`, lines);
  const mechanic = curated?.mechanicOverride
    ? { mechanic: curated.mechanicOverride, useCases: curated.useCasesOverride || inferredMechanic.useCases }
    : inferredMechanic;
  const inferredRights = rightsFor(category, origin, `${displayName} ${family.names.join(" ")}`);
  const rights = {
    ...inferredRights,
    lane: curated?.rightsLaneOverride || inferredRights.lane,
    copyright: curated?.copyrightNoteOverride || inferredRights.copyright,
    publicity: curated?.publicityNoteOverride || inferredRights.publicity,
    trademark: curated?.trademarkNoteOverride || inferredRights.trademark,
    production: curated?.productionRouteOverride || inferredRights.production,
  };
  const currentRank = family.variants.filter((item) => item.rank).sort((a, b) => a.rank - b.rank)[0]?.rank || null;
  const captions = Math.max(...family.variants.map((item) => Number(item.captions) || 0));
  const kymVariants = family.variants.filter((item) => item.kym).map((item) => item.kym);
  const firstSeenYear = bestFinite(kymVariants.map((item) => item.year), "min");
  const kymViews = bestFinite(kymVariants.map((item) => item.views));
  const kymImages = bestFinite(kymVariants.map((item) => item.images));
  const kymVideos = bestFinite(kymVariants.map((item) => item.videos));
  const kymHistoricalRank = bestFinite(kymVariants.map((item) => item.historicalRank), "min");
  const kymNewestRank = bestFinite(kymVariants.map((item) => item.newestRank), "min");
  const editorialEvidence = [...new Map(kymVariants
    .flatMap((item) => item.editorialEvidence || [])
    .map((item) => [`${item.url}|${item.selection || ""}`, item])).values()];
  const recentEditorialEvidence = editorialEvidence.some((item) => ["annual-2025", "staff-2025", "recent-editorial"].includes(item.signal));
  const measurableRecentReuse = Number(firstSeenYear) >= 2025
    && (Number(kymViews || 0) >= 100_000 || Number(kymImages || 0) >= 20 || Number(kymVideos || 0) >= 10);
  const recentHeat = recentEditorialEvidence || measurableRecentReuse;
  const related = relatedSuperIp(origin);
  const activityScore = activityScoreFor({ currentRank, historicalRank: kymHistoricalRank, kymViews, editorialEvidence, firstSeenYear, recentHeat });
  const reuseTier = reuseTierFor({ currentRank, captions, kymViews, kymImages, kymVideos, editorialEvidence, firstSeenYear });
  const evidenceParts = compact([
    kymViews ? `KYM 条目累计 ${formatCompactNumber(kymViews)} 次浏览` : "",
    kymImages || kymVideos ? `KYM 画廊 ${Number(kymImages || 0).toLocaleString("en-US")} 张图 / ${Number(kymVideos || 0).toLocaleString("en-US")} 段视频` : "",
    currentRank ? `Imgflip 当前模板榜 #${currentRank}${captions ? ` / ${Number(captions).toLocaleString("en-US")} captions` : ""}` : "",
    editorialEvidence[0] ? `${editorialEvidence[0].label}${editorialEvidence[0].selection ? `：${editorialEvidence[0].selection}` : ""}` : "",
  ]);
  const recentEditorial = editorialEvidence.some((item) => item.signal === "recent-editorial");
  const activityLabel = curated?.status === "Submission"
    ? "研究中条目"
    : recentEditorial
    ? "2026 编辑榜"
    : Number(firstSeenYear) >= 2025 && editorialEvidence.length
      ? "近年年度热门"
      : recentHeat
        ? "近年传播上升"
      : currentRank
        ? (currentRank <= 20 ? "当前高频" : currentRank <= 60 ? "当前活跃" : "当前可见")
        : kymHistoricalRank && kymHistoricalRank <= 100
          ? "历史高传播"
          : kymViews
            ? "历史传播档案"
            : "经典目录收录";
  return {
    id: `meme-${slugify(family.key)}-${shortHash(family.key)}`,
    name: displayName,
    aliases: compact(family.names.filter((name) => name !== displayName)),
    category,
    subcategory,
    sourceType: origin.entity === "互联网 Meme 文化" ? "互联网原生" : category,
    originEntity: origin.entity,
    originWork: origin.work,
    imageOriginalUrl: curated?.imageUrl || primary.imageUrl || kymEvidence?.imageUrl || family.variants.find((item) => item.imageUrl)?.imageUrl || "",
    sourceUrl: curated?.url || primary.sourceUrl,
    providers: compact(family.variants.map((item) => item.provider)),
    variants: family.variants.map((item) => ({
      provider: item.provider,
      templateId: item.templateId,
      name: item.name,
      sourceUrl: item.sourceUrl,
      lines: item.lines,
      rank: item.rank,
      captions: item.captions,
      views: item.kym?.views ?? null,
      images: item.kym?.images ?? null,
      videos: item.kym?.videos ?? null,
      year: item.kym?.year ?? null,
      historicalRank: item.kym?.historicalRank ?? null,
      newestRank: item.kym?.newestRank ?? null,
      status: item.kym?.status || "",
    })),
    slots: lines,
    mechanic: mechanic.mechanic,
    useCases: mechanic.useCases,
    agentPattern: curated?.agentPatternOverride || `保留“${mechanic.mechanic}”的关系节奏；为新主题重新设计人物、场景、道具与文字，不复制原图。`,
    rightsLane: rights.lane,
    copyrightNote: rights.copyright,
    publicityNote: rights.publicity,
    trademarkNote: rights.trademark,
    productionRoute: rights.production,
    currentTemplateRank: currentRank,
    currentCaptionCount: captions || null,
    firstSeenYear,
    era: eraForYear(firstSeenYear),
    kymViews,
    kymImages,
    kymVideos,
    kymHistoricalRank,
    kymNewestRank,
    curationStatus: curated?.curationStatus || "",
    relationType: curated?.relationType || "",
    variantNote: curated?.variantNote || "",
    curationReason: curated?.curationReason || "",
    requiredEntry: Boolean(curated?.requiredEntry),
    ...(curated?.externalBenchmark ? {
      externalBenchmark: true,
      externalSourceIds: compact(curated.externalSourceIds || []),
      externalEvidence: compact(curated.externalSourceIds || []).map((id) => externalSourcesById.get(id)).filter(Boolean),
      benchmarkLane: curated.benchmarkLane || "",
    } : {}),
    editorialEvidence,
    reuseTier,
    recognitionEvidence: related?.surveyFamePercent
      ? `来源人物 / 作品的美国调查认知为 ${related.surveyFamePercent}%；不等于该 Meme 的人口认知。`
      : kymViews
        ? `暂无美国人口同口径调查；KYM ${formatCompactNumber(kymViews)} 浏览仅作历史传播代理。`
        : "暂无美国人口同口径认知证据。",
    reuseEvidence: evidenceParts.length
      ? `${evidenceParts.join("；")}。这些是平台传播 / 复用代理，不是授权。`
      : "仅见模板目录收录，尚无跨来源复用证据。",
    trendStatus: curated?.status === "Submission" ? "研究中条目" : recentEditorial ? "2026 近期编辑榜" : recentHeat ? "2025–2026 热榜" : Number(firstSeenYear) >= 2024 ? "2024 扩散" : "历史档案",
    recentHeat,
    activityScore,
    activityLabel,
    activityEvidence: evidenceParts.length
      ? `${evidenceParts.join("；")}。仅作传播 / 复用线索，不是美国人口知名度。`
      : "Memegen 模板目录收录；不是美国人口知名度。",
    relatedSuperIp: related ? {
      id: related.id,
      name: related.name,
      nameZh: related.nameZh || "",
      usTier: related.usTier || "",
      surveyFamePercent: related.surveyFamePercent ?? null,
      rightsLane: related.rightsLane || "",
    } : null,
    evidenceLevel: curated?.status === "Submission" ? "C" : kymEvidence && (currentRank || editorialEvidence.length) ? "B+" : currentRank || kymEvidence ? "B" : "C",
    researchDate: kymEvidence ? kymSource.researchDate : source.researchDate,
    searchText: compact([
      displayName, ...family.names, category, subcategory, origin.entity, origin.work,
      ...mechanic.useCases, ...(primary.keywords || []), rights.lane, firstSeenYear, eraForYear(firstSeenYear), reuseTier,
      ...kymVariants.flatMap((item) => [...(item.tags || []), ...(item.types || []), item.parentSeries, item.region]),
      ...editorialEvidence.map((item) => `${item.label} ${item.selection || ""}`),
      curated?.variantNote,
      curated?.curationStatus,
      curated?.benchmarkLane,
      ...compact(curated?.externalSourceIds || []).map((id) => externalSourcesById.get(id)?.name || id),
    ]).join(" · "),
  };
}).filter((record) => Boolean(record.imageOriginalUrl));

const publicDomainCandidates = (catalog.records || []).filter((item) =>
  item.image
  && ["期限届满", "公版文件", "公版 / 开放馆藏", "CC0 / 公版开放馆藏"].includes(item.rightsStatus)
);
const lineage = publicDomainCandidates
  .filter((item) => item.kind === "画作 / 插图")
  .sort((a, b) => (b.awarenessScore || 0) - (a.awarenessScore || 0));
const diverse = publicDomainCandidates
  .filter((item) => item.kind === "主档")
  .sort((a, b) => (b.awarenessScore || 0) - (a.awarenessScore || 0));
const pickedPublicDomain = [];
const seenPublicDomain = new Set();
for (const item of [...lineage.slice(0, 20), ...diverse]) {
  const dedupe = item.id;
  if (seenPublicDomain.has(dedupe)) continue;
  seenPublicDomain.add(dedupe);
  pickedPublicDomain.push(item);
  if (pickedPublicDomain.length >= 50) break;
}

function publicDomainUseCases(item) {
  const text = `${item.title || ""} ${item.subtitle || ""} ${(item.characters || []).join(" ")} ${(item.tags || []).join(" ")} ${(item.styles || []).join(" ")}`;
  if (/skull|skeleton|death|hell|grave|ghost|haunted|phantom|caligari|dracula|骷髅|死亡|地狱|墓|幽灵|鬼屋/i.test(text)) {
    return ["暗黑反应图", /ghost|haunted|phantom|dracula|幽灵|鬼屋/i.test(text) ? "幽灵与哥特叙事" : "骷髅与死亡之舞"];
  }
  if (/steamboat willie|mickey|popeye|betty boop|dizzy dishes|silly symphony|thimble theatre|fleischer|早期动画|橡皮管动画/i.test(text)) {
    return ["早期动画表情", "动作循环与视觉笑点"];
  }
  if (/alice|wonderland|looking-glass|jabberwock|mad tea|white rabbit|queen of hearts|hatter|dodo|caterpillar|tweedle|walrus|carpenter|父亲威廉|爱丽丝/i.test(text)) {
    return ["荒诞角色反应", "爱丽丝历史形象"];
  }
  if (/wizard of oz|dorothy|wicked witch|glinda|tin woodman|cowardly lion|emerald city|oz|奥兹|多萝西|女巫|铁皮人|胆小狮/i.test(text)) {
    return ["童话角色反应", "奥兹历史形象"];
  }
  if (/1930 书籍|1930 书封|book cover|初版封面|文学 \/ 出版物/i.test(text)) {
    return ["经典书封改编", "标题与排版梗"];
  }
  if (/robin hood|beowulf|tarzan|sinbad|aladdin|hero|adventure|冒险|英雄/i.test(text)) {
    return ["英雄冒险反应", "文学插画再语境化"];
  }
  if (/fairy|童话|寓言|red riding hood|rapunzel|hansel|rumpelstiltskin|mermaid|pied piper|格林|安徒生/i.test(text)) {
    return ["童话角色反应", "文学插画再语境化"];
  }
  if (item.kind === "画作 / 插图" || /画作|插图|engraving|版画|painting/i.test(text)) {
    return ["经典画作反应", "构图与姿态再语境化"];
  }
  return ["公版视觉反应", "历史版本再语境化"];
}

const publicDomainRecords = pickedPublicDomain.map((item) => {
  const originEntity = item.characters?.[0] || item.title;
  const related = relatedSuperIp({ entity: originEntity, work: item.title });
  const visualName = item.subtitle || item.title;
  return {
    id: `meme-pd-${item.id}`,
    name: `${visualName}｜公版 Meme 底图`,
    aliases: [item.title],
    category: "经典艺术 / 公版",
    subcategory: item.kind === "画作 / 插图" ? "历史角色画作" : "公版视觉母题",
    sourceType: "具体公版版本",
    originEntity,
    originWork: item.title,
    image: item.image,
    imageOriginalUrl: item.sourceUrl,
    sourceUrl: item.sourceUrl,
    providers: [item.sourceLabel || "公版图源"],
    variants: [],
    slots: 1,
    mechanic: item.usage || "以历史画面的主体关系、姿态和构图作为新语境的反应底图。",
    useCases: publicDomainUseCases(item),
    agentPattern: `从“${visualName}”提取主体关系和构图；沿用列明的历史版本边界，重新编写当代语境与文字。`,
    rightsLane: "公版具体版本",
    copyrightNote: item.copyrightRoute || "列明的历史版本按美国公版路径使用。",
    publicityNote: "若另行加入真人姓名、肖像或代言语境，需重新核验。",
    trademarkNote: "公版版权不自动排除持续有效的名称、Logo 或商品来源商标。",
    productionRoute: item.avoid ? `${item.usage || "可从历史版本重构。"} 避开：${item.avoid}` : (item.usage || "使用列明的具体公版图源或原创重绘。"),
    currentTemplateRank: null,
    currentCaptionCount: null,
    firstSeenYear: Number(item.yearSort || String(item.year || "").match(/\d{4}/)?.[0]) || null,
    era: "历史公版视觉",
    kymViews: null,
    kymImages: null,
    kymVideos: null,
    kymHistoricalRank: null,
    kymNewestRank: null,
    editorialEvidence: [],
    reuseTier: "公版改编池",
    recognitionEvidence: related?.surveyFamePercent
      ? `来源人物 / 作品的美国调查认知为 ${related.surveyFamePercent}%；不等于这张历史图的认知。`
      : "暂无美国人口同口径认知证据；馆藏与公版状态不等于大众知名度。",
    reuseEvidence: "本库提供具体公版版本作为可改编底图；不以网络转发量冒充复用度。",
    trendStatus: "历史公版",
    recentHeat: false,
    activityScore: Math.min(88, Math.max(58, item.awarenessScore || 60)),
    activityLabel: "公版改编底图",
    activityEvidence: "来自本库已核验的具体公版视觉；不是 Meme 流行度数据。",
    relatedSuperIp: related ? {
      id: related.id,
      name: related.name,
      nameZh: related.nameZh || "",
      usTier: related.usTier || "",
      surveyFamePercent: related.surveyFamePercent ?? null,
      rightsLane: related.rightsLane || "",
    } : null,
    visualRecordId: item.id,
    evidenceLevel: item.evidenceLevel || "待复核",
    researchDate: item.researchDate || source.researchDate,
    searchText: compact([
      visualName, item.title, originEntity, "经典艺术 公版", ...(item.tags || []), ...(item.scenes || []), ...(item.styles || []),
    ]).join(" · "),
  };
});

async function downloadBuffer(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0 meme-research-library/1.0" },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const type = response.headers.get("content-type") || "";
      if (!type.startsWith("image/")) throw new Error(`not an image: ${type}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 800));
    }
  }
  throw lastError;
}

async function ensureImage(record) {
  if (record.image) return;
  const candidates = compact([
    record.imageOriginalUrl,
    ...record.variants.map((variant) => {
      if (variant.provider === "Memegen") return `https://api.memegen.link/images/${variant.templateId}.jpg`;
      if (variant.provider === "Know Your Meme") {
        return kymRecords.find((item) => item.path === variant.templateId)?.imageUrl || "";
      }
      const sourceItem = imgflip.find((item) => String(item.id) === String(variant.templateId));
      return sourceItem?.url || "";
    }),
  ]);
  let lastError;
  for (const url of candidates) {
    const fileName = `${shortHash(url)}.webp`;
    const outputPath = path.join(imageRoot, fileName);
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      record.image = `meme-images/${fileName}`;
      record.imageOriginalUrl = url;
      return;
    }
    try {
      const buffer = await downloadBuffer(url);
      const tempPath = path.join(os.tmpdir(), `meme-source-${process.pid}-${shortHash(url)}.img`);
      const fallbackPngPath = `${tempPath}.png`;
      fs.writeFileSync(tempPath, buffer);
      try {
        execFileSync("cwebp", ["-quiet", "-q", "76", "-m", "4", tempPath, "-o", outputPath], { stdio: "pipe" });
      } catch {
        execFileSync("sips", ["-s", "format", "png", tempPath, "--out", fallbackPngPath], { stdio: "pipe" });
        execFileSync("cwebp", ["-quiet", "-q", "76", "-m", "4", fallbackPngPath, "-o", outputPath], { stdio: "pipe" });
      }
      fs.rmSync(tempPath, { force: true });
      fs.rmSync(fallbackPngPath, { force: true });
      record.image = `meme-images/${fileName}`;
      record.imageOriginalUrl = url;
      return;
    } catch (error) {
      lastError = error;
      fs.rmSync(outputPath, { force: true });
    }
  }
  throw new Error(`Could not cache image for ${record.name}: ${lastError?.message || "unknown error"}`);
}

let cursor = 0;
const workers = Array.from({ length: 8 }, async () => {
  while (cursor < modernRecords.length) {
    const index = cursor;
    cursor += 1;
    await ensureImage(modernRecords[index]);
  }
});
await Promise.all(workers);

const records = [...modernRecords, ...publicDomainRecords]
  .sort((a, b) => (b.activityScore || 0) - (a.activityScore || 0) || a.name.localeCompare(b.name, "en"));

const countsBy = (key) => Object.fromEntries([...new Set(records.map((item) => item[key]))]
  .sort((a, b) => String(a).localeCompare(String(b), "zh-CN"))
  .map((value) => [value, records.filter((item) => item[key] === value).length]));
const dataset = {
  schemaVersion: "2.0.0",
  sourceVersion: `meme-library-${researchDate}-v2`,
  generatedAt: new Date().toISOString(),
  researchDate,
  title: "美国 Meme 图谱",
  scope: "Meme 家族、来源人物/作品、年代、历史传播、当前复用、近年趋势与商业权利路由；现代原图只作研究参考。",
  methodology: {
    familyUnit: "同一叙事模板的不同服务版本合并为一个 Meme 家族；来源人物/作品另行聚合。",
    recognition: "只有关联超级 IP 的调查百分比可称来源人物 / 作品认知；它不等于 Meme 认知。未找到同口径人口调查时明确留空。",
    historicalSpread: "Know Your Meme 条目浏览量、历史排序和画廊数量是历史传播 / 变体代理，不是美国人口知名度。",
    currentReuse: "Imgflip 排名与 caption count 是当前模板平台信号；Memegen 收录只证明模板目录存在。",
    recentTrend: "KYM 年度榜与近期 Meme Review 是编辑 / 社群趋势线索，不是全网市场份额。",
    rights: "现代影视、摄影、名人、角色和互联网创作者素材默认不进入生产池；公版条目只适用于列明的具体历史版本。",
    sources: [
      { name: "Memegen template API", url: MEMEGEN_URL, records: memegen.length },
      { name: "Imgflip get_memes API", url: IMGFLIP_URL, records: imgflip.length },
      { name: "Know Your Meme confirmed entries and editorials", url: "https://knowyourmeme.com/memes", records: kymRecords.length },
      { name: "Required Meme coverage guard", url: "source/meme-required-entries.json", records: requiredRecords.length },
      { name: "External blind-spot benchmark", url: "source/meme-external-benchmark.json", records: externalBenchmarkRecords.length },
      { name: "Public-domain visual catalog", url: "data/catalog.json", records: publicDomainRecords.length },
    ],
  },
  counts: {
    records: records.length,
    contemporary: modernRecords.length,
    publicDomain: publicDomainRecords.length,
    currentSignals: records.filter((item) => item.currentTemplateRank).length,
    kymEvidence: records.filter((item) => item.kymViews || item.editorialEvidence?.length).length,
    recentTwoYears: records.filter((item) => Number(item.firstSeenYear) >= 2025).length,
    recentHeat: records.filter((item) => item.recentHeat).length,
    recentEditorial: records.filter((item) => item.editorialEvidence?.some((evidence) => evidence.signal === "recent-editorial")).length,
    highReuse: records.filter((item) => item.reuseTier === "高复用线索" || item.reuseTier === "近年上升").length,
    linkedSuperIp: records.filter((item) => item.relatedSuperIp).length,
    curatedRequired: records.filter((item) => item.requiredEntry).length,
    externalBenchmark: records.filter((item) => item.externalBenchmark).length,
    byEra: countsBy("era"),
    byCategory: countsBy("category"),
    byRights: countsBy("rightsLane"),
  },
  records,
};

const json = `${JSON.stringify(dataset, null, 2)}\n`;
fs.writeFileSync(outputJsonPath, json);
fs.writeFileSync(outputJsPath, `window.MEME_LIBRARY_DATA=${JSON.stringify(dataset)};\n`);
fs.writeFileSync(manifestPath, `${JSON.stringify({
  schemaVersion: "2.0.0",
  generatedAt: dataset.generatedAt,
  sourceVersion: dataset.sourceVersion,
  counts: dataset.counts,
  dataSha256: hash(json),
  imageFiles: fs.readdirSync(imageRoot).filter((name) => name.endsWith(".webp")).length,
  imageBytes: fs.readdirSync(imageRoot)
    .filter((name) => name.endsWith(".webp"))
    .reduce((sum, name) => sum + fs.statSync(path.join(imageRoot, name)).size, 0),
}, null, 2)}\n`);

console.log(JSON.stringify({
  sourceVersion: dataset.sourceVersion,
  records: dataset.counts.records,
  contemporary: dataset.counts.contemporary,
  publicDomain: dataset.counts.publicDomain,
  currentSignals: dataset.counts.currentSignals,
  kymEvidence: dataset.counts.kymEvidence,
  recentTwoYears: dataset.counts.recentTwoYears,
  recentHeat: dataset.counts.recentHeat,
  recentEditorial: dataset.counts.recentEditorial,
  highReuse: dataset.counts.highReuse,
  linkedSuperIp: dataset.counts.linkedSuperIp,
  imageFiles: JSON.parse(fs.readFileSync(manifestPath, "utf8")).imageFiles,
}, null, 2));
