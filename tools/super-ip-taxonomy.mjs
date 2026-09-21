function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\p{Script=Han}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(normalize(term)));
}

function firstRule(text, rules, fallback) {
  return rules.find(([, terms]) => includesAny(text, terms))?.[0] || fallback;
}

function allRules(text, rules, fallback) {
  const matches = rules.filter(([, terms]) => includesAny(text, terms)).map(([label]) => label);
  return matches.length ? unique(matches) : [fallback];
}

function taxonomy(level2, level3, options = {}) {
  const suppliedPaths = (options.paths || [])
    .map((path) => Array.isArray(path) ? { level2: path[0], level3: path[1] } : path)
    .filter((path) => path?.level2 && path?.level3);
  const pathKeys = new Set();
  const taxonomyPaths = [{ level2, level3 }, ...suppliedPaths].filter((path) => {
    const key = `${path.level2}\u0000${path.level3}`;
    if (pathKeys.has(key)) return false;
    pathKeys.add(key);
    return true;
  });
  const level2Options = unique([level2, ...(options.level2Options || []), ...taxonomyPaths.map((path) => path.level2)]);
  const level3Options = unique([level3, ...(options.level3Options || []), ...taxonomyPaths.map((path) => path.level3)]);
  if (!suppliedPaths.length) {
    for (const optionLevel2 of level2Options) {
      for (const optionLevel3 of level3Options) {
        const key = `${optionLevel2}\u0000${optionLevel3}`;
        if (pathKeys.has(key)) continue;
        pathKeys.add(key);
        taxonomyPaths.push({ level2: optionLevel2, level3: optionLevel3 });
      }
    }
  }
  return {
    taxonomyLevel2: level2,
    taxonomyLevel3: level3,
    taxonomyLevel2Options: level2Options,
    taxonomyLevel3Options: level3Options,
    taxonomyPaths,
    taxonomySource: options.source || "本库人工分类规则",
    taxonomyConfidence: options.confidence || "B",
    taxonomyEvidence: unique(options.evidence || []),
  };
}

const FILM_GENRES = [
  ["动画", ["animation", "animated", "anime", "cartoon"]],
  ["纪录 / 纪实", ["documentary", "docuseries"]],
  ["音乐 / 歌舞", ["musical", "music film", "concert film", "dance film"]],
  ["恐怖 / 怪诞", ["horror", "slasher", "gothic horror", "monster movie", "zombie", "vampire"]],
  ["科幻 / 赛博", ["science fiction", "sci fi", "cyberpunk", "space opera", "dystopian", "time travel"]],
  ["奇幻 / 魔法", ["fantasy", "fairy tale", "sword and sorcery", "magic realism"]],
  ["犯罪 / 推理", ["crime", "detective", "mystery", "gangster", "film noir", "legal drama", "police procedural"]],
  ["动作 / 冒险", ["action", "adventure", "martial arts", "swashbuckler", "spy film", "superhero", "heist film"]],
  ["惊悚 / 悬疑", ["thriller", "suspense", "psychological thriller"]],
  ["喜剧", ["comedy", "sitcom", "satire", "parody", "mockumentary", "humour"]],
  ["爱情 / 浪漫", ["romance", "romantic", "rom com"]],
  ["家庭 / 儿童", ["family", "children", "coming of age", "teen", "holiday", "christmas"]],
  ["战争 / 历史", ["war", "historical", "period drama", "biographical", "biopic", "epic"]],
  ["西部", ["western"]],
  ["体育 / 励志", ["sports", "sport film"]],
  ["剧情 / 社会", ["drama", "social", "melodrama", "tragedy"]],
  ["真人秀 / 竞赛", ["reality television", "reality show", "game show", "talent show", "competition"]],
  ["新闻 / 脱口秀", ["talk show", "news", "current affairs", "late night", "interview"]],
];

const MUSIC_GENRES = [
  ["流行", ["pop", "adult contemporary", "teen pop", "dance pop", "singer songwriter"]],
  ["摇滚 / 金属", ["rock", "metal", "punk", "grunge", "hardcore", "emo", "alternative rock", "new wave"]],
  ["R&B / 灵魂 / 放克", ["rhythm and blues", "r and b", "soul", "funk", "motown", "neo soul"]],
  ["嘻哈 / 说唱", ["hip hop", "rap", "trap", "gangsta rap"]],
  ["乡村 / 民谣", ["country", "bluegrass", "americana", "folk music", "folk rock"]],
  ["爵士 / 蓝调", ["jazz", "blues", "swing", "bebop"]],
  ["电子 / 舞曲", ["electronic", "dance", "edm", "house", "techno", "disco", "synth pop"]],
  ["拉丁 / 世界音乐", ["latin", "salsa", "reggaeton", "bachata", "world music", "afrobeat", "k pop", "j pop"]],
  ["雷鬼", ["reggae", "ska", "dancehall"]],
  ["福音 / 宗教", ["gospel", "christian music", "worship"]],
  ["古典 / 歌剧", ["classical music", "opera", "baroque music", "romantic music", "symphony"]],
];

const BOOK_GENRES = [
  ["奇幻 / 魔法", ["fantasy", "fairy tale", "magic", "mythopoeia"]],
  ["科幻 / 未来", ["science fiction", "dystopian", "cyberpunk", "space opera"]],
  ["推理 / 犯罪", ["mystery", "detective", "crime", "thriller", "spy fiction"]],
  ["爱情 / 情感", ["romance", "romantic", "love story"]],
  ["恐怖 / 哥特", ["horror", "gothic", "ghost story", "vampire"]],
  ["历史 / 时代", ["historical", "period", "war novel"]],
  ["冒险 / 成长", ["adventure", "coming of age", "bildungsroman", "young adult"]],
  ["经典文学 / 社会", ["literary fiction", "social novel", "satire", "drama", "tragedy"]],
  ["回忆录 / 传记", ["memoir", "autobiography", "biography"]],
  ["商业 / 自助", ["self help", "business", "management", "personal development"]],
  ["历史 / 社会", ["history", "politics", "sociology", "true crime", "current affairs"]],
  ["科学 / 知识", ["science", "psychology", "philosophy", "reference work", "popular science"]],
];

const GAME_GENRES = [
  ["恐怖 / 生存", ["survival horror", "horror game", "psychological horror"]],
  ["格斗", ["fighting game", "fighting"]],
  ["射击", ["shooter", "first person shooter", "third person shooter", "battle royale"]],
  ["角色扮演", ["role playing", "rpg", "action role playing", "mmorpg"]],
  ["动作 / 冒险", ["action adventure", "platform game", "stealth game", "hack and slash", "adventure game"]],
  ["策略 / 战术", ["strategy", "tactical", "tower defense", "real time strategy"]],
  ["体育 / 竞速", ["sports game", "racing game", "football game", "basketball game"]],
  ["模拟 / 经营", ["simulation", "life simulation", "business simulation", "city building"]],
  ["益智 / 休闲", ["puzzle", "casual game", "match three", "party game"]],
  ["沙盒 / 开放世界", ["sandbox", "open world"]],
  ["多人 / 社交", ["multiplayer", "online game", "social simulation", "party"]],
];

function buildText(record, wikidata) {
  return normalize([
    record.name,
    record.nameZh,
    record.category,
    record.subcategory,
    record.entityType,
    record.surveyEntityType,
    record.motifs,
    record.visualElements,
    wikidata?.wikidataDescription,
    wikidata?.instances,
    wikidata?.genres,
    wikidata?.occupations,
    wikidata?.sports,
  ].flat().join(" | "));
}

function sourceFor(wikidata, property = "P136 / P106 / P641") {
  return wikidata
    ? { source: `Wikidata ${property} + 本库规则`, confidence: "A", evidence: [wikidata.wikidataId, ...(wikidata.genres || []), ...(wikidata.occupations || []), ...(wikidata.sports || [])] }
    : { source: "本库人工分类规则", confidence: "B", evidence: [] };
}

function classifyFilm(record, wikidata, text) {
  const primary = record.surveyEntityType || record.entityType;
  let level2 = "电影";
  if (primary === "TV Show" || includesAny(text, ["电视文化", "television series", "tv series", "sitcom"])) level2 = "电视剧情";
  if (includesAny(text, ["reality television", "reality show", "game show", "talent show", "drag race"])) level2 = "综艺 / 真人秀";
  if (includesAny(text, ["talk show", "news program", "current affairs", "late night television"])) level2 = "新闻 / 访谈";
  if (includesAny(text, ["documentary", "docuseries"]) || record.subcategory === "纪录片") level2 = "纪录片";
  if (includesAny(text, ["animated film", "animated series", "animation", "anime"])) level2 = "动画影视";
  if (includesAny(text, ["children television", "children s television", "educational television"])) level2 = "儿童 / 家庭节目";
  const fallback = level2 === "电视剧情" ? "剧情 / 社会" : "综合类型";
  const ruleGenres = allRules(text, FILM_GENRES, fallback);
  const orderedGenres = unique((wikidata?.genres || [])
    .flatMap((genre) => allRules(normalize(genre), FILM_GENRES, null))
    .filter(Boolean));
  let primaryGenre = orderedGenres[0] || ruleGenres[0];
  const description = normalize(wikidata?.wikidataDescription);
  if (includesAny(description, ["science fiction"]) && ruleGenres.includes("科幻 / 赛博")) primaryGenre = "科幻 / 赛博";
  else if (includesAny(description, ["gangster", "crime film"]) && ruleGenres.includes("犯罪 / 推理")) primaryGenre = "犯罪 / 推理";
  else if (includesAny(description, ["action film franchise"]) && ruleGenres.includes("动作 / 冒险")) primaryGenre = "动作 / 冒险";
  if (record.subcategory === "恐怖片与万圣节银幕符号") primaryGenre = "恐怖 / 怪诞";
  const genres = unique([primaryGenre, ...orderedGenres, ...ruleGenres]);
  return taxonomy(level2, primaryGenre, { ...sourceFor(wikidata, "P136"), level3Options: genres });
}

function classifyPerson(record, wikidata, text) {
  const primary = record.surveyEntityType || record.entityType;
  const roleText = normalize([
    record.name,
    record.subcategory,
    wikidata?.wikidataDescription,
    wikidata?.instances,
    wikidata?.occupations,
  ].flat().join(" | "));
  const paths = [];
  const add = (level2, level3, terms = null) => {
    if (!terms || includesAny(roleText, terms)) paths.push({ level2, level3 });
  };

  add("演员", "喜剧演员", ["comedian", "stand up comedian"]);
  add("演员", "电影演员", ["film actor", "film actress"]);
  add("演员", "电视演员", ["television actor", "television actress"]);
  add("演员", "配音演员", ["voice actor", "voice actress"]);
  add("演员", "舞台演员", ["stage actor", "theatre actor", "broadway actor"]);
  if (includesAny(roleText, [" actor", "actress"]) && !paths.some((path) => path.level2 === "演员")) add("演员", "影视演员");

  add("主持 / 电视人物", "主持 / 访谈", ["television host", "talk show host", "presenter", "radio personality"]);
  add("主持 / 电视人物", "真人秀人物", ["reality television", "reality tv"]);
  add("主持 / 电视人物", "电视人物", ["television personality"]);
  add("媒体 / 评论", "新闻 / 记者", ["journalist", "news anchor", "correspondent", "reporter"]);
  add("媒体 / 评论", "评论 / 专栏", ["columnist", "critic", "commentator"]);

  add("导演 / 制作", "电影导演", ["film director", "filmmaker"]);
  add("导演 / 制作", "电视导演", ["television director"]);
  add("导演 / 制作", "制片 / 创作管理", ["film producer", "television producer", "executive producer", "producer"]);
  add("作家 / 编剧", "编剧 / 剧作家", ["screenwriter", "playwright"]);
  add("作家 / 编剧", "小说家", ["novelist", "fiction writer"]);
  add("作家 / 编剧", "诗人", ["poet"]);
  add("作家 / 编剧", "非虚构作者", ["non fiction writer", "historian", "biographer", "autobiographer"]);
  if (includesAny(roleText, ["writer", "author"]) && !paths.some((path) => path.level2 === "作家 / 编剧")) add("作家 / 编剧", "作家 / 作者");

  add("视觉艺术", "摄影 / 影像", ["photographer", "video artist"]);
  add("视觉艺术", "插画 / 漫画", ["illustrator", "cartoonist", "comics artist"]);
  add("视觉艺术", "雕塑 / 装置", ["sculptor", "installation artist"]);
  add("视觉艺术", "平面 / 产品设计", ["graphic designer", "industrial designer"]);
  add("视觉艺术", "绘画", ["painter", "visual artist"]);

  add("音乐 / 舞台表演", "说唱歌手", ["rapper", "hip hop musician"]);
  add("音乐 / 舞台表演", "歌手 / 音乐人", ["singer", "musician", "recording artist"]);
  add("音乐 / 舞台表演", "词曲 / 作曲", ["songwriter", "composer", "lyricist"]);
  add("音乐 / 舞台表演", "乐手 / 指挥", ["guitarist", "pianist", "instrumentalist", "conductor"]);
  add("音乐 / 舞台表演", "舞者 / 编舞", ["dancer", "choreographer"]);

  add("时尚 / 模特", "模特", ["fashion model", "model"]);
  add("时尚 / 模特", "时尚设计", ["fashion designer", "costume designer"]);
  add("网络创作", "视频创作者", ["youtuber", "video blogger", "tiktoker"]);
  add("网络创作", "播客 / 主播", ["podcaster", "streamer"]);
  add("网络创作", "社交媒体人物", ["influencer", "internet celebrity"]);
  add("商业 / 创业", "企业家 / 商业人物", ["entrepreneur", "businessperson", "business executive"]);
  add("公共影响 / 公益", "活动家 / 公益人物", ["activist", "philanthropist", "humanitarian"]);

  let primaryPath;
  if (primary === "Actor" || includesAny(text, ["演员与银幕人物"])) {
    primaryPath = paths.find((path) => path.level2 === "演员") || { level2: "演员", level3: "影视演员" };
  } else if (primary === "TV Personality" || includesAny(text, ["主持人与电视人物"])) {
    primaryPath = paths.find((path) => path.level2 === "主持 / 电视人物")
      || paths.find((path) => path.level2 === "媒体 / 评论")
      || { level2: "主持 / 电视人物", level3: "电视人物" };
  } else if (primary === "Director" || includesAny(text, ["导演与创作者"])) {
    primaryPath = paths.find((path) => path.level2 === "导演 / 制作") || { level2: "导演 / 制作", level3: "影视创作者" };
  } else if (primary === "Artist" || includesAny(text, ["视觉艺术家"])) {
    primaryPath = paths.find((path) => path.level2 === "视觉艺术") || { level2: "视觉艺术", level3: "视觉艺术家" };
  } else if (primary === "Influencer" || record.subcategory === "网络创作者") {
    primaryPath = paths.find((path) => path.level2 === "网络创作") || { level2: "网络创作", level3: "网络创作者" };
  } else if (primary === "Columnist" || record.subcategory === "专栏作者与媒体人物") {
    primaryPath = paths.find((path) => path.level2 === "媒体 / 评论") || { level2: "媒体 / 评论", level3: "媒体人物" };
  } else if (primary === "Writer" || ["当代小说作者", "当代非虚构作者"].includes(record.subcategory)) {
    primaryPath = paths.find((path) => path.level2 === "作家 / 编剧") || { level2: "作家 / 编剧", level3: "作家 / 作者" };
  } else {
    primaryPath = paths[0] || { level2: "跨界 / 公共人物", level3: "跨界名人" };
  }
  return taxonomy(primaryPath.level2, primaryPath.level3, {
    ...sourceFor(wikidata, "P106"),
    paths,
    confidence: paths.length ? (wikidata ? "A" : "B") : (wikidata ? "B" : "待复核"),
  });
}

function classifyMusic(record, wikidata, text) {
  const mappedWikidataGenres = unique((wikidata?.genres || [])
    .flatMap((genre) => allRules(normalize(genre), MUSIC_GENRES, null))
    .filter(Boolean));
  const genres = mappedWikidataGenres.length
    ? mappedWikidataGenres
    : allRules(text, MUSIC_GENRES, record.surveyEntityType === "Classical Composer" ? "古典 / 歌剧" : "跨流派 / 待细分");
  if (record.surveyEntityType === "Classical Composer" && !genres.includes("古典 / 歌剧")) genres.unshift("古典 / 歌剧");
  const formText = ` ${normalize([
    record.name,
    record.subcategory,
    wikidata?.wikidataDescription,
    wikidata?.instances,
    wikidata?.occupations,
  ].flat().join(" | "))} `;
  let form = "独唱歌手";
  const isGroup = record.subcategory === "乐队、组合与摇滚符号"
    || [" musical group ", " rock band ", " pop band ", " boy band ", " girl group ", " duo ", " trio ", " orchestra ", " choir "].some((term) => formText.includes(term));
  if (isGroup) form = "乐队 / 组合";
  else if (includesAny(formText, ["rapper", "hip hop musician"])) form = "说唱歌手";
  else if (record.surveyEntityType === "Classical Composer" || includesAny(formText, ["classical composer", "conductor", "classical musician"])) form = "作曲家 / 古典音乐家";
  else if (includesAny(formText, ["singer songwriter", "instrumentalist", "guitarist", "pianist", "songwriter"])) form = "创作歌手 / 乐手";
  else if (includesAny(formText, ["disc jockey", "music producer"])) form = "DJ / 制作人";
  return taxonomy(genres[0], form, { ...sourceFor(wikidata, "P136 / P106"), level2Options: genres });
}

function classifyBook(record, wikidata, text) {
  const type = record.surveyEntityType || "";
  const level2 = type === "Non-Fiction Book" || includesAny(text, ["非虚构与知识出版"]) ? "非虚构"
    : type === "Children Fiction Book" || includesAny(text, ["儿童与青少年读物", "children s book", "young adult"]) ? "儿童 / 青少年"
      : "成人小说";
  const genres = allRules(text, BOOK_GENRES, level2 === "非虚构" ? "综合知识" : level2 === "儿童 / 青少年" ? "成长 / 家庭" : "经典小说");
  return taxonomy(level2, genres[0], { ...sourceFor(wikidata, "P136"), level3Options: genres });
}

function classifyGameToy(record, wikidata, text) {
  const isGame = record.surveyEntityType === "Video Game" || record.subcategory === "电子游戏" || record.subcategory === "电子游戏全景";
  if (isGame) {
    const genres = allRules(text, GAME_GENRES, firstRule(text, [
      ["体育 / 竞速", ["madden", "nba 2k", "ea sports", "racing"]],
      ["恐怖 / 生存", ["resident evil", "silent hill", "five nights", "last of us"]],
      ["格斗", ["mortal kombat", "street fighter"]],
      ["射击", ["call of duty", "halo", "doom", "overwatch", "apex"]],
      ["角色扮演", ["final fantasy", "diablo", "warcraft", "elder scrolls", "genshin"]],
      ["模拟 / 经营", ["the sims", "animal crossing"]],
      ["益智 / 休闲", ["tetris", "candy crush"]],
      ["沙盒 / 开放世界", ["minecraft", "roblox", "grand theft auto", "red dead"]],
    ], "动作 / 冒险"));
    return taxonomy("电子游戏", genres[0], { ...sourceFor(wikidata, "P136"), level3Options: genres });
  }
  const level2 = firstRule(text, [
    ["桌游 / 卡牌", ["monopoly", "scrabble", "clue", "dungeons and dragons", "magic the gathering", "uno", "ouija", "board game", "card game"]],
    ["时尚娃娃 / 人偶", ["barbie", "american girl", "monster high", "bratz", "polly pocket", "cabbage patch"]],
    ["积木 / 创意玩具", ["lego", "play doh", "etch a sketch", "rubik", "construction toy"]],
    ["车辆 / 动作玩具", ["hot wheels", "nerf", "transformers toys", "g i joe", "he man"]],
    ["收藏 / 毛绒", ["beanie babies", "funko", "build a bear", "squishmallows"]],
  ], "亲子 / 经典玩具");
  const level3 = firstRule(text, [
    ["策略 / 竞技", ["monopoly", "scrabble", "clue", "magic the gathering", "uno"]],
    ["角色扮演 / 世界观", ["dungeons and dragons", "he man", "g i joe"]],
    ["造型 / 换装", ["barbie", "american girl", "monster high", "bratz", "polly pocket"]],
    ["动手 / 创造", ["lego", "play doh", "etch a sketch", "rubik"]],
    ["收藏 / 陪伴", ["beanie babies", "funko", "build a bear", "squishmallows"]],
  ], "家庭娱乐");
  return taxonomy(level2, level3, { source: "本库人工分类规则", confidence: "A", evidence: [record.subcategory] });
}

function classifyAnimation(record, text) {
  const level2 = firstRule(text, [
    ["日本动漫 / 游戏角色", ["日本及全球大众角色", "pokemon", "pikachu", "hello kitty", "sanrio", "dragon ball", "sailor moon", "naruto", "one piece", "ghibli", "totoro", "gundam", "ultraman", "astro boy"]],
    ["漫画 / 报刊角色", ["peanuts", "garfield", "calvin and hobbes", "archie comics", "popeye", "betty boop", "felix the cat", "richie rich"]],
    ["儿童教育 / 学前角色", ["sesame street", "dora", "blue s clues", "paw patrol", "arthur", "clifford", "curious george", "berenstain", "dr seuss"]],
    ["电视卡通角色", ["warner", "hanna barbera", "美国电视 漫画", "simpsons", "family guy", "south park", "spongebob", "rugrats"]],
    ["电影动画角色", ["disney", "pixar", "shrek", "kung fu panda", "despicable me", "ice age"]],
  ], "动画 / 漫画角色");
  const level3 = firstRule(text, [
    ["怪物 / 超自然", ["nightmare", "hocus pocus", "haunted", "villain", "scooby doo", "courage", "beetlejuice", "gremlins", "casper", "addams", "ghost"]],
    ["公主 / 童话", ["cinderella", "snow white", "sleeping beauty", "little mermaid", "beauty and the beast", "frozen", "moana", "mulan"]],
    ["动物伙伴", ["mouse", "duck", "goofy", "pluto", "pooh", "tigger", "eeyore", "bambi", "dalmatians", "bunny", "cat", "dog", "bear", "pony", "smurf", "paddington"]],
    ["英雄 / 冒险", ["super", "ninja", "turtles", "teen titans", "naruto", "one piece", "dragon ball", "demon slayer", "my hero", "ultraman"]],
    ["科幻 / 机械", ["wall e", "cars", "incredibles", "buzz lightyear", "gundam", "iron giant", "sonic"]],
    ["魔法 / 奇幻", ["peter pan", "tinker bell", "aladdin", "adventure time", "steven universe", "sailor moon", "ghibli", "totoro"]],
    ["喜剧 / 恶作剧", ["bugs bunny", "daffy", "tom and jerry", "road runner", "wile e coyote", "animaniacs", "minions"]],
  ], "家庭 / 友情");
  return taxonomy(level2, level3, { source: "本库人工角色分类", confidence: "A", evidence: [record.subcategory] });
}

function sportFromText(text) {
  return firstRule(text, [
    ["美式橄榄球", ["nfl", "super bowl", "football", "tom brady", "joe montana", "peyton manning", "walter payton", "jerry rice", "lawrence taylor", "patrick mahomes", "travis kelce", "aaron rodgers", "josh allen", "lamar jackson", "joe burrow"]],
    ["篮球", ["nba", "wnba", "march madness", "basketball", "michael jordan", "magic johnson", "larry bird", "kareem", "wilt chamberlain", "bill russell", "shaquille", "kobe bryant", "jerry west", "allen iverson", "lebron", "stephen curry", "kevin durant", "giannis", "joki", "jayson tatum", "luka", "caitlin clark", "a ja wilson", "sabrina ionescu", "harlem globetrotters"]],
    ["棒球", ["mlb", "world series", "baseball", "babe ruth", "jackie robinson", "derek jeter", "hank aaron", "willie mays", "joe dimaggio", "mickey mantle", "nolan ryan", "pete rose", "shohei ohtani", "aaron judge", "mike trout", "mookie betts", "little league"]],
    ["冰球", ["nhl", "stanley cup", "ice hockey", "wayne gretzky", "mario lemieux", "sidney crosby", "ovechkin", "mcdavid"]],
    ["足球", ["mls", "nwsl", "fifa world cup", "copa am rica", "soccer", "mia hamm", "abby wambach", "megan rapinoe", "alex morgan", "lionel messi", "christian pulisic"]],
    ["网球", ["tennis", "billie jean king", "serena williams", "venus williams", "coco gauff", "naomi osaka"]],
    ["高尔夫", ["pga", "lpga", "masters", "golf", "tiger woods", "arnold palmer", "jack nicklaus", "scheffler", "nelly korda"]],
    ["赛车", ["nascar", "indycar", "indianapolis 500", "daytona 500", "dale earnhardt", "richard petty", "jeff gordon", "chase elliott", "kyle larson"]],
    ["格斗 / 摔角", ["ufc", "wwe", "boxing", "wrestling", "muhammad ali", "mike tyson", "hulk hogan", "andre the giant", "ronda rousey", "jon jones", "conor mcgregor", "roman reigns"]],
    ["田径 / 跑步", ["marathon", "track and field", "jesse owens", "florence griffith", "sha carri", "noah lyles"]],
    ["体操 / 游泳", ["gymnastics", "swimming", "mary lou retton", "simone biles", "katie ledecky"]],
    ["极限 / 水上运动", ["x games", "skateboard", "surfing", "tony hawk", "kelly slater"]],
    ["赛马", ["kentucky derby", "preakness", "belmont stakes", "horse racing"]],
    ["奥运 / 综合运动", ["olympic", "paralympic", "ncaa", "college", "university", "大学体育"]],
  ], "综合体育");
}

function classifySports(record, wikidata, text) {
  const sport = sportFromText(text);
  let role = "体育文化";
  if (["NFL 球队", "NBA 球队", "MLB 球队", "NHL 球队"].includes(record.subcategory)) role = "职业球队";
  else if (record.subcategory === "大学体育与校园传统") role = "大学球队";
  else if (record.subcategory === "美国体育传奇") role = "传奇运动员";
  else if (record.subcategory === "当代美国体育人物") role = "当代运动员";
  else if (includesAny(text, ["super bowl", "world series", "finals", "cup", "march madness", "playoff", "rose bowl", "army navy", "derby", "indianapolis 500", "daytona 500", "masters", "u s open", "marathon", "olympic games", "paralympic games", "x games"])) role = "赛事 / 锦标";
  else if (record.subcategory === "联盟、赛事与体育文化") role = "联盟 / 协会";
  return taxonomy(sport, role, { source: wikidata ? "Wikidata P641 + 本库体育规则" : "本库体育名单规则", confidence: sport === "综合体育" ? "B" : "A", evidence: [record.subcategory, ...(wikidata?.sports || [])] });
}

function classifyMedia(record, wikidata, text) {
  const primary = record.surveyEntityType || "";
  let level2 = primary === "Magazine" ? "杂志 / 出版媒体" : primary === "Radio Program" ? "广播 / 播客" : "电视网络 / 流媒体";
  const level3 = firstRule(text, [
    ["流媒体平台", ["streaming", "netflix", "hulu", "max", "paramount", "disney", "apple tv", "prime video"]],
    ["儿童 / 青少年", ["nickelodeon", "disney channel", "cartoon network", "children", "teen"]],
    ["新闻 / 时事", ["news", "cnn", "fox news", "msnbc", "current affairs", "time magazine", "economist"]],
    ["体育媒体", ["espn", "sports", "athletic"]],
    ["时尚 / 生活方式", ["fashion", "vogue", "cosmopolitan", "gq", "lifestyle", "food", "travel", "home"]],
    ["科学 / 知识", ["national geographic", "science", "history", "discovery", "smithsonian"]],
    ["喜剧 / 娱乐", ["comedy", "entertainment", "music television", "mtv"]],
    ["公共广播 / 文化", ["public radio", "npr", "pbs", "culture"]],
    ["广播电视网络", ["network", "channel", "television"]],
    ["访谈 / 播客", ["podcast", "radio program", "talk radio", "interview"]],
  ], level2 === "杂志 / 出版媒体" ? "综合杂志" : level2 === "广播 / 播客" ? "综合广播" : "综合平台");
  return taxonomy(level2, level3, sourceFor(wikidata, "P31 / P136"));
}

function classifyStage(record, wikidata, text) {
  const primary = record.surveyEntityType || "";
  const level2 = primary === "Musical" ? "音乐剧" : primary === "Play" ? "戏剧 / 舞台" : primary === "Music Festival" ? "音乐节 / 现场" : "颁奖礼 / 艺术活动";
  const level3 = firstRule(text, [
    ["家庭 / 奇幻", ["family", "children", "fantasy", "fairy tale"]],
    ["摇滚 / 流行现场", ["rock", "pop", "music festival", "concert"]],
    ["嘻哈 / 城市音乐", ["hip hop", "rap", "urban music"]],
    ["古典 / 歌剧", ["opera", "classical"]],
    ["喜剧 / 讽刺", ["comedy", "satire", "farce"]],
    ["悲剧 / 正剧", ["tragedy", "drama"]],
    ["百老汇 / 主流音乐剧", ["broadway", "musical theatre", "musical"]],
    ["艺术奖项 / 展会", ["award", "art event", "exhibition", "biennale"]],
  ], level2 === "音乐节 / 现场" ? "综合音乐现场" : level2 === "音乐剧" ? "经典音乐剧" : level2 === "戏剧 / 舞台" ? "经典戏剧" : "综合文化活动");
  return taxonomy(level2, level3, sourceFor(wikidata, "P136"));
}

function classifyPublicDomainLiterature(record, text) {
  const level2 = firstRule(text, [
    ["哥特 / 超自然文学", ["dracula", "frankenstein", "headless horseman", "christmas carol", "ghost", "great gatsby"]],
    ["莎士比亚 / 舞台经典", ["romeo and juliet", "hamlet", "midsummer"]],
    ["童话 / 民间故事", ["robin hood", "king arthur", "merlin", "puss in boots", "little red riding hood", "cinderella", "snow white", "sleeping beauty", "little mermaid", "beauty and the beast", "hansel", "rapunzel", "pied piper", "three little pigs", "jack and the beanstalk", "goldilocks", "pinocchio"]],
    ["儿童文学", ["alice", "rabbit", "cheshire", "mad hatter", "wizard of oz", "dorothy", "peter rabbit", "winnie", "bambi", "velveteen", "secret garden", "anne of green gables"]],
    ["冒险 / 侠义角色", ["sherlock", "tarzan", "zorro", "excalibur"]],
    ["美国文学 / 民间叙事", ["rip van winkle", "little women"]],
    ["早期动画公版版本", ["steamboat willie"]],
  ], "经典文学角色");
  const level3 = firstRule(text, [
    ["怪物 / 反派", ["dracula", "frankenstein", "queen of hearts", "headless", "wicked", "monster"]],
    ["动物 / 奇幻伙伴", ["rabbit", "cheshire", "puss", "lion", "bambi", "pooh"]],
    ["魔法人物 / 生物", ["wizard", "merlin", "fairy", "witch", "scarecrow", "tin woodman"]],
    ["作品 / 场景母题", ["romeo and juliet", "hamlet", "midsummer", "christmas carol", "little women", "great gatsby"]],
    ["历史版本限定", ["1926 version", "1923 novel", "1928 version"]],
  ], "主角 / 经典人物");
  return taxonomy(level2, level3, { source: "本库公版角色人工分类", confidence: "A", evidence: [record.name] });
}

function classifyReligionMyth(record, text) {
  const level2 = firstRule(text, [
    ["基督教 / 圣经", ["jesus", "mary", "nativity", "last supper", "crucifixion", "resurrection", "sacred heart", "good shepherd", "angel", "noah", "david and goliath", "moses", "adam and eve", "eden", "daniel", "jonah", "samson", "saint george", "saint nicholas", "santa claus", "wise men", "christmas star", "easter"]],
    ["犹太文化 / 节日", ["menorah", "star of david", "hanukkah", "passover"]],
    ["伊斯兰文化符号", ["crescent and star"]],
    ["佛教图像", ["buddha"]],
    ["希腊 / 罗马神话", ["zeus", "hera", "athena", "aphrodite", "apollo", "artemis", "poseidon", "hades", "hermes", "dionysus", "heracles", "medusa", "pegasus", "minotaur", "cerberus", "sirens", "cupid", "nike goddess", "atlas"]],
    ["北欧神话", ["thor", "odin", "loki", "valkyr", "yggdrasil"]],
    ["埃及神话", ["anubis", "isis", " ra ", "sphinx", "mummy"]],
    ["民间超自然", ["grim reaper", "witch", "werewolf", "vampire", "ghost", "mermaid", "fairy", "unicorn", "dragon", "bigfoot", "phoenix"]],
  ], "宗教 / 神话综合");
  const level3 = firstRule(text, [
    ["节日 / 仪式", ["christmas", "easter", "hanukkah", "passover", "nativity", "santa"]],
    ["故事 / 场景", ["last supper", "crucifixion", "resurrection", "noah", "david and goliath", "ten commandments", "adam and eve", "eden", "daniel", "jonah", "samson", "saint george"]],
    ["神祇 / 圣者", ["jesus", "mary", "archangel", "saint", "zeus", "hera", "athena", "aphrodite", "apollo", "artemis", "poseidon", "hades", "hermes", "dionysus", "thor", "odin", "loki", "anubis", "isis", " ra ", "buddha"]],
    ["怪物 / 神兽", ["medusa", "pegasus", "minotaur", "cerberus", "siren", "phoenix", "sphinx", "mummy", "werewolf", "vampire", "dragon", "bigfoot"]],
    ["符号 / 图像传统", ["sacred heart", "good shepherd", "angel", "menorah", "star of david", "crescent", "yggdrasil", "grim reaper", "witch", "ghost", "mermaid", "fairy", "unicorn"]],
  ], "人物 / 母题");
  return taxonomy(level2, level3, { source: "本库宗教神话人工分类", confidence: "A", evidence: [record.name] });
}

function classifyArt(record, text) {
  const level2 = firstRule(text, [
    ["绘画名作", ["mona lisa", "last supper", "creation of adam", "birth of venus", "girl with a pearl", "starry night", "sunflowers", "american gothic", "washington crossing", "whistler", "scream", "kiss", "water lilies", "nighthawks", "son of man", "liberty leading"]],
    ["雕塑 / 古典造型", ["thinker", "venus de milo", "winged victory"]],
    ["版画 / 海报 / 印刷", ["great wave", "woodcut", "engraving", "posters", "ukiyo e"]],
    ["装饰艺术 / 图形语言", ["art deco", "art nouveau", "geometry", "hieroglyph", "greek vase"]],
    ["民间工艺 / 传统图案", ["retablos", "pennsylvania dutch", "quilting", "folk art"]],
  ], "艺术史视觉语言");
  const level3 = firstRule(text, [
    ["文艺复兴 / 古典", ["mona lisa", "last supper", "creation of adam", "birth of venus", "venus de milo", "winged victory", "greek vase"]],
    ["印象派 / 后印象派", ["starry night", "sunflowers", "water lilies"]],
    ["现代主义 / 超现实", ["scream", "kiss", "nighthawks", "son of man", "art deco", "art nouveau"]],
    ["美国历史 / 民间艺术", ["american gothic", "washington crossing", "whistler", "pennsylvania dutch", "quilting"]],
    ["亚洲艺术传统", ["great wave", "ukiyo e"]],
    ["欧洲历史 / 浪漫主义", ["liberty leading", "thinker", "engraving", "woodcut"]],
    ["拉美 / 宗教民间艺术", ["mexican folk", "retablos"]],
  ], "跨时代艺术语言");
  return taxonomy(level2, level3, { source: "本库艺术史人工分类", confidence: "A", evidence: [record.name] });
}

function classifyBrand(record, text) {
  const level2 = firstRule(text, [
    ["食品 / 饮料吉祥物", ["mcdonald", "kfc", "m and m", "tiger", "toucan", "snap crackle", "lucky", "crunch", "doughboy", "kool aid", "peanut", "green giant", "cheetah", "pringles", "sun maid", "hamburglar", "coca cola", "california raisins"]],
    ["保险 / 服务品牌角色", ["geico", "aflac", "progressive", "allstate", "state farm"]],
    ["公共服务 / 环保宣传", ["smokey bear", "woodsy owl"]],
    ["消费品 / 企业符号", ["michelin", "energizer", "mr clean", "budweiser"]],
  ], "商业吉祥物");
  const level3 = firstRule(text, [
    ["真人 / 拟人代言", ["ronald", "colonel", "flo", "mayhem", "jake", "mr clean", "sun maid girl"]],
    ["动物吉祥物", ["tiger", "toucan", "gecko", "duck", "bunny", "bear", "owl", "polar bears", "clydesdales"]],
    ["食物 / 物件拟人", ["m and m", "doughboy", "kool aid", "peanut", "green giant", "pringles", "california raisins"]],
    ["角色群 / 广告宇宙", ["snap crackle", "hamburglar", "baby nut"]],
  ], "品牌角色");
  return taxonomy(level2, level3, { source: "本库品牌角色人工分类", confidence: "A", evidence: [record.name] });
}

function classifyPublicSymbol(record, text) {
  const level2 = firstRule(text, [
    ["国家 / 政府符号", ["american flag", "bald eagle", "uncle sam", "white house", "u s capitol", "liberty bell", "mount rushmore"]],
    ["城市 / 建筑地标", ["statue of liberty", "golden gate", "hollywood sign", "times square", "brooklyn bridge", "empire state", "space needle", "gateway arch", "las vegas sign", "route 66"]],
    ["自然 / 国家公园", ["grand canyon", "yellowstone", "yosemite", "niagara", "national parks"]],
    ["太空 / 科学", ["nasa", "apollo moon"]],
    ["历史 / 文化记忆", ["rosie", "i want you", "cowboy", "harlem renaissance", "jazz age", "smokey bear campaign"]],
  ], "美国公共文化");
  const level3 = firstRule(text, [
    ["旗帜 / 徽记 / 人格化", ["flag", "eagle", "uncle sam", "rosie"]],
    ["政府建筑 / 纪念物", ["white house", "capitol", "liberty bell", "mount rushmore", "statue of liberty"]],
    ["城市建筑 / 路线", ["bridge", "building", "tower", "sign", "route 66", "times square", "gateway arch"]],
    ["自然景观 / 公园海报", ["canyon", "yellowstone", "yosemite", "niagara", "national parks"]],
    ["海报 / 宣传运动", ["i want you", "smokey bear campaign", "rosie"]],
    ["时代 / 文化场景", ["cowboy", "harlem renaissance", "jazz age", "apollo moon"]],
  ], "公共符号");
  return taxonomy(level2, level3, { source: "本库公共文化人工分类", confidence: "A", evidence: [record.name] });
}

export function classifyTaxonomy(record, wikidata = null) {
  const text = buildText(record, wikidata);
  switch (record.category) {
    case "电影 / 电视": return classifyFilm(record, wikidata, text);
    case "人物 / 文娱名人": return classifyPerson(record, wikidata, text);
    case "音乐": return classifyMusic(record, wikidata, text);
    case "文学 / 书籍": return classifyBook(record, wikidata, text);
    case "游戏 / 玩具": return classifyGameToy(record, wikidata, text);
    case "动画 / 角色": return classifyAnimation(record, text);
    case "体育运动": return classifySports(record, wikidata, text);
    case "网络 / 媒体": return classifyMedia(record, wikidata, text);
    case "舞台 / 活动": return classifyStage(record, wikidata, text);
    case "文学 / 公域角色": return classifyPublicDomainLiterature(record, text);
    case "宗教 / 神话": return classifyReligionMyth(record, text);
    case "艺术 / 公共文化": return classifyArt(record, text);
    case "品牌 / 广告角色": return classifyBrand(record, text);
    case "公共符号": return classifyPublicSymbol(record, text);
    default: return taxonomy(record.subcategory || "其他领域", record.entityType || "其他题材", { source: "原始类别映射", confidence: "待复核", evidence: [record.subcategory] });
  }
}

export const TAXONOMY_DEFINITION = {
  level1: "主分类：用户先确定研究世界，如影视、人物、音乐、体育。",
  level2: "领域 / 类型：作品形态、职业领域、流派或运动项目。",
  level3: "题材 / 身份：具体类型、人物身份、角色母题或实体角色。",
  navigationRule: "主分类 → 领域 / 类型 → 题材 / 身份；三次点击进入关键结果。",
  multiValueRule: "跨类型对象可同时进入多个二级或三级入口；主路径用于卡片和 Agent 摘要。",
  confidence: {
    A: "结构化来源或人工名单可直接支撑分类。",
    B: "由名称、原始类别与描述规则归类。",
    待复核: "只有原始类别映射，需补来源。",
  },
};

export function taxonomyLookupKey(name, primaryType) {
  return `${normalize(name)}|${primaryType || ""}`;
}
