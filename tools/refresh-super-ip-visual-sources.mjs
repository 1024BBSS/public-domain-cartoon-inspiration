import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const dataPath = path.join(projectRoot, "data", "super-ip-us.json");
const catalogPath = path.join(projectRoot, "data", "catalog.json");
const outputPath = path.join(projectRoot, "source", "super-ip-visual-sources.json");
const commonsEndpoint = "https://commons.wikimedia.org/w/api.php";
const userAgent = "PublicDomainInspirationResearch/1.0 (https://github.com/1024BBSS/public-domain-cartoon-inspiration)";
const force = process.argv.includes("--force");
const refreshCurated = process.argv.includes("--refresh-curated");
const refreshReligion = process.argv.includes("--refresh-religion");
const CONCURRENCY = 2;

const dataset = JSON.parse(await fs.readFile(dataPath, "utf8"));
const catalogPayload = JSON.parse(await fs.readFile(catalogPath, "utf8"));
const catalog = catalogPayload.records || catalogPayload.items || catalogPayload;

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\p{Script=Han}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, attempt = 1) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": userAgent, Accept: "application/json" },
    });
    if (response.ok) return response.json();
    const detail = (await response.text()).slice(0, 220);
    if (attempt < 5 && [429, 500, 502, 503, 504].includes(response.status)) {
      await sleep(response.status === 429 ? attempt * 5000 : attempt * 800);
      return fetchJson(url, attempt + 1);
    }
    throw new Error(`HTTP ${response.status}: ${detail}`);
  } catch (error) {
    if (attempt < 5) {
      await sleep(attempt * 800);
      return fetchJson(url, attempt + 1);
    }
    throw error;
  }
}

const QUERY_OVERRIDES = {
  "Jesus Christ": "Jesus Christ religious art",
  "Virgin Mary": "Virgin Mary Madonna art",
  "Nativity of Jesus": "Nativity of Jesus art",
  "The Last Supper": "Last Supper painting art",
  "The Crucifixion": "Crucifixion of Jesus art",
  "The Resurrection": "Resurrection of Jesus art",
  "Sacred Heart": "Sacred Heart of Jesus art",
  "Good Shepherd": "Good Shepherd Christian art",
  Angels: "angels Christian art",
  "Archangel Michael": "Archangel Michael art",
  "Noah's Ark": "Noah's Ark art",
  "David and Goliath": "David and Goliath art",
  "Moses and the Ten Commandments": "Moses Ten Commandments art",
  "Adam and Eve": "Adam and Eve art",
  "Garden of Eden": "Garden of Eden art",
  "Daniel in the Lions' Den": "Daniel lions den art",
  "Jonah and the Whale": "Jonah and whale art",
  "Samson and Delilah": "Samson and Delilah art",
  "Saint George and the Dragon": "Saint George dragon art",
  "Saint Nicholas": "Saint Nicholas icon art",
  "Santa Claus tradition": "historical Santa Claus illustration",
  "Three Wise Men": "Adoration of the Magi art",
  "Christmas Star": "Star of Bethlehem Nativity painting",
  "Easter Resurrection symbols": "Resurrection of Jesus painting",
  Menorah: "menorah Jewish historical art Arch of Titus",
  "Star of David": "Star of David historical art",
  "Hanukkah tradition": "Hanukkah menorah historical art",
  "Passover tradition": "Passover Seder Haggadah historical art",
  "Crescent and star tradition": "crescent and star historical Islamic art",
  "Buddha iconography": "Buddha historical art",
  Zeus: "Zeus Greek mythology art",
  Hera: "Hera Greek mythology art",
  Athena: "Athena Greek mythology art",
  Aphrodite: "Aphrodite Greek mythology art",
  Apollo: "Apollo Greek mythology art",
  Artemis: "Artemis Greek mythology art",
  Poseidon: "Poseidon Greek mythology art",
  Hades: "Hades Greek mythology art",
  Hermes: "Hermes Greek mythology art",
  Dionysus: "Dionysus Greek mythology art",
  Heracles: "Heracles Greek mythology art",
  Medusa: "Medusa Greek mythology art",
  Pegasus: "Pegasus Greek mythology art",
  Minotaur: "Minotaur Greek mythology art",
  Cerberus: "Cerberus Greek mythology art",
  Sirens: "Sirens Greek mythology art",
  Phoenix: "Phoenix mythological bird illustration art",
  Cupid: "Cupid Roman mythology art",
  "Nike goddess": "Nike Greek goddess art",
  Atlas: "Atlas Titan Greek mythology art",
  "Thor mythology": "Thor Norse mythology illustration",
  Odin: "Odin Norse mythology art",
  "Loki mythology": "Loki Norse mythology art",
  Valkyries: "Valkyrie Norse mythology illustration",
  Yggdrasil: "Yggdrasil Norse mythology art",
  Anubis: "Anubis Egyptian mythology art",
  "Isis goddess": "Isis Egyptian goddess art",
  Ra: "Ra Egyptian sun god art",
  Sphinx: "Sphinx mythology art",
  "Mummy folklore": "Egyptian mummy historical",
  "Grim Reaper": "Grim Reaper historical art",
  "Witch folklore": "witch historical art",
  "Werewolf folklore": "werewolf historical illustration",
  "Vampire folklore": "vampire historical illustration",
  "Ghost folklore": "ghost historical illustration",
  "Mermaid folklore": "mermaid historical art",
  "Fairy folklore": "fairy historical illustration",
  "Unicorn folklore": "unicorn historical art",
  "Dragon folklore": "dragon historical art",
  "Bigfoot folklore": "Bigfoot folklore",
  "Dorothy Gale": "Dorothy Gale W W Denslow illustration",
  "Scarecrow of Oz": "Scarecrow Wizard of Oz W W Denslow illustration",
  "Planters Baby Nut": "Planters Mr Peanut historical advertising mascot",
};

const NEGATIVE_TERMS = {
  Anubis: ["baboon", "papio"],
  Atlas: ["atlas historique", "map", "maps", "geography", "expedition", "senate atlas"],
  "Christmas Star": ["ornithogalum", "poinsettia", "flower"],
  "Fairy folklore": ["nebula", "galaxy"],
  "Hades": ["butterfly", "butterflies", "new haven colony", "nypl hades"],
  "Mermaid folklore": ["town of molde", "bronzen fornuis", "stove", "shipwreck"],
  "Nike goddess": ["shoe", "sneaker", "sportswear", "nike inc"],
  Pegasus: ["pool toy", "constellation", "airline"],
  Phoenix: ["arizona", "skyline", "soil", "congress", "constellation", "sports", "basketball"],
  Ra: ["manpower", "rheumatoid", "right ascension"],
  Sirens: ["sleeping with sirens", "band", "concert", "tour"],
  "Thor mythology": ["marvel", "avengers", "chris hemsworth"],
  "Unicorn folklore": ["narwhal", "passengers", "the harriet", "wpa"],
  "Vampire folklore": ["vampyroteuthis", "vampire squid", "octopus"],
  Valkyries: ["golden state", "indiana fever", "basketball", "wnba", "game"],
  Sphinx: ["entomology", "insect", "butterfly"],
};

const SUBJECT_ALIASES = {
  "The Last Supper": ["last supper", "nadværen"],
  "Sacred Heart": ["sacred heart", "herz jesu"],
  "Good Shepherd": ["good shepherd", "lost sheep"],
  Angels: ["angel"],
  "Archangel Michael": ["michael"],
  "Noah's Ark": ["noah", "ark", "deluge"],
  "David and Goliath": ["david", "goliath"],
  "Moses and the Ten Commandments": ["moses", "commandments", "tables of stone"],
  "Garden of Eden": ["eden"],
  "Daniel in the Lions' Den": ["daniel", "lions den"],
  "Jonah and the Whale": ["jonah"],
  "Samson and Delilah": ["samson", "delilah"],
  "Saint George and the Dragon": ["saint george", "st george"],
  "Saint Nicholas": ["saint nicholas", "st nicholas"],
  "Santa Claus tradition": ["santa claus"],
  "Three Wise Men": ["wise men", "magi", "adoration"],
  "Christmas Star": ["star of bethlehem", "bethlehem star", "nativity"],
  "Easter Resurrection symbols": ["resurrection", "easter"],
  Menorah: ["menorah"],
  "Star of David": ["star of david", "magen david", "jewish star"],
  "Hanukkah tradition": ["hanukkah", "chanukah", "menorah"],
  "Passover tradition": ["passover", "seder", "haggadah"],
  "Crescent and star tradition": ["crescent", "hilal"],
  "Buddha iconography": ["buddha"],
  "Nike goddess": ["nike", "winged victory"],
  "Thor mythology": ["thor", "donar"],
  "Loki mythology": ["loki", "loke"],
  Valkyries: ["valkyrie", "valkyries", "walkyrien", "valkyrier"],
  "Isis goddess": ["isis"],
  "Mummy folklore": ["mummy", "coffin", "cartonnage"],
  "Grim Reaper": ["grim reaper", "reaper", "death"],
  "Witch folklore": ["witch"],
  "Werewolf folklore": ["werewolf"],
  "Vampire folklore": ["vampire"],
  "Ghost folklore": ["ghost", "spirit", "apparition"],
  "Mermaid folklore": ["mermaid"],
  "Fairy folklore": ["fairy", "fairies"],
  "Unicorn folklore": ["unicorn"],
  "Dragon folklore": ["dragon", "saint george", "st george"],
  "Bigfoot folklore": ["bigfoot", "sasquatch"],
};

const FILE_OVERRIDES = {
  "Noah's Ark": [
    "File:16 2-8-2005-Noahs-ark-Hafis-Abru-2.jpg",
    "File:'Noah and His Ark' by Charles Willson Peale, 1819.JPG",
    "File:Noah's Ark on Mount Ararat by Simon de Myle.jpg",
    "File:Paul de Vos, Ark van Noah.jpg",
    "File:Giovanni Benedetto Castiglione - In Front of Noah's Ark - WGA04548.jpg",
  ],
  "Crescent and star tradition": [
    "File:RadziwillChronicleDrastarFlag.png",
    "File:Ensign, Turkey and Ottoman Empire (after 1844) RMG RP 17 6.jpg",
    "File:Sroda Treasure 2022 P07 ring with crescent moon and star.jpg",
    "File:Wernigeroder Wappenbuch 021.jpg",
    "File:An alternative for the 1844-1936 Turkish flag.png",
  ],
  "Planters Baby Nut": [
    "File:Introducing Mr Peanut ad.png",
  ],
  Zeus: [
    "File:Jean Auguste Dominique Ingres - Zeus and Thetis.jpg",
    "File:Zeus Otricoli Pio-Clementino Inv257.jpg",
    "File:Roman Mosaic of the Loves of Zeus found in Écija, Iberian Peninsula.png",
    "File:Statue of Zeus.jpg",
    "File:Zeus, or Jupiter. (Greek mythology systematized).png",
  ],
  Hera: [
    "File:Hera Campana Louvre Ma2283.jpg",
    "File:Cult statue of the goddess Hera, Paestum museum.jpg",
    "File:Hera Barberini (cast in Pushkin museum).jpg",
    "File:Juno, Seated on a Golden Throne, Asks Alecto to Confuse the Trojans (Aeneid, Book VI) MET DP279577.jpg",
    "File:Ontwerp voor een plafond met het huwelijk van Jupiter en Juno, RP-T-1942-101.jpg",
  ],
  Athena: [
    "File:Athena Giustiniani - Braccio Nuovo, Museo Chiaramonti - Vatican Museums - DSC00910.jpg",
    "File:Bust Athena Velletri Glyptothek Munich 213.jpg",
    "File:The Combat of Ares and Athena.jpg",
    "File:Enrique Simonet - El Juicio de Paris - 1904.jpg",
    "File:Terracotta Panathenaic prize amphora (jar) MET DP227367.jpg",
  ],
  Hades: [
    "File:Hades and Persephone, Vergina.jpg",
    "File:Roman Wall Painting From a Tomb that Depicts Pluto (Hades) Abducting Proserpina (Persephone).jpg",
    "File:Frederic Leighton - The Return of Persephone (1891).jpg",
    "File:Walter Crane - The Fate of Persephone (1877).jpg",
    "File:Drawing, Hades; Persephone in the Underworld (Offering to Proserpine), ca. 1820 (CH 18122835).jpg",
  ],
  Medusa: [
    "File:Caravaggio - Medusa - Google Art ProjectFXD.jpg",
    "File:Roman - Medusa - Walters 54884.jpg",
    "File:Mosaic floor with head of Medusa - Getty Museum (71.AH.110).jpg",
    "File:(Venice) Perseus and Medusa by Francesco Maffei.jpg",
    "File:Perseus Killing Medusa LACMA 65.37.125.jpg",
  ],
  Sphinx: [
    "File:Oedipus and the Sphinx 1864.jpg",
    "File:Jean-Auguste-Dominique Ingres (1780-1867) - Oedipus and the Sphinx - NG3290 - National Gallery.jpg",
    "File:(Gaillac) Oedipe et le Sphinx - Jean-Baptiste Cariven - Musée des Beaux-Arts de Gaillac.jpg",
    "File:Oedipus sphinx Louvre G417 full.jpg",
    "File:The Great Sphinx, Pyramids of Gizeh-1839) by David Roberts, RA.jpg",
  ],
  Atlas: [
    "File:Farnese Atlas.jpg",
    "File:Atlas, from Tableaux du temple des Muses.jpg",
    "File:Heinrich Aldegrever, Hercules and Atlas, 1550, NGA 3469.jpg",
    "File:Agostino carracci, Ercole e Atlante.png",
    "File:Lucas Cranach d.Ä. - Herkules und Atlas (Herzog Anton Ulrich-Museum).jpg",
  ],
  Phoenix: [
    "File:Smoking Phoenix.jpg",
    "File:Fabel van de feniks, RP-P-OB-5266.jpg",
    "File:Tuhui zongyi (Principles of Painting) Phoenix.jpeg",
    "File:Brandende feniks, RP-P-1982-1374.jpg",
    "File:Greiser Phönix (Inv. 9), Paul Klee (1905).jpg",
  ],
  Anubis: [
    "File:Anubis (in Illustrated List of the principal Egyptian Divinities) (1888) - TIMEA.jpg",
    "File:Fresco of Anubis, the Egyptian god of death and the afterlife Baths of Caracalla.jpg",
    "File:Egyptian - A Worshipper Kneeling Before the God Anubis - Walters 54400 - Three Quarter View.jpg",
    "File:This fragment shows the jackal-headed god of the underworld, Anubis holding a scepter, Brighton Museum.jpg",
    "File:Recumbent Jackal-God Anubis Dynasty 26-30 664-332 BCE Saqqara Limestone (697056627).jpg",
  ],
  Ra: [
    "File:Ra Enthroned in the Tomb of Roy.jpg",
    "File:Ra slays Apep (tomb scene in Deir el-Medina)(improved contrast).png",
    "File:Inlay depicting the squatting god Re MET DP239682.jpg",
    "File:Mummy cartonnage fragment with sun god Ra, Egypt, El-Lahun or El-Hibe, 946-660 BC, stuccoed linnen cartonnage, A 1313 - Martin von Wagner Museum - Würzburg, Germany - DSC05304.jpg",
    "File:Statuette of Amun-Ra, from Egypt, 25th to 26th Dynasty, 700-600 BCE. State Museum of Egyptian Art, Munich.jpg",
  ],
  "Christmas Star": [
    "File:Elihu Vedder - Star of Bethlehem - 1879-80.jpg",
    "File:Frederic Leighton - The Star of Bethlehem.jpg",
    "File:Edward Burne-Jones - The Star of Bethlehem - Google Art Project.jpg",
    "File:Waldemar Flaig Stern von Bethlehem 1920.jpg",
    "File:Hans Thoma - Angel with the star of Bethlehem - 186575 MNW - National Museum in Warsaw.jpg",
  ],
  "Grim Reaper": [
    "File:Gay-Neck, the Story of a Pigeon (1927) p145 grim reaper.png",
    "File:Gambling with death - Gillam. LCCN2012645442.jpg",
    "File:\"O death, where is thy sting?\" - Kep. LCCN2011649640.jpg",
    "File:Death and the merchant.jpg",
    "File:Allegory of death as crossbowman Wellcome L0014665.jpg",
  ],
  "Ghost folklore": [
    "File:Marley's Ghost-John Leech, 1843.jpg",
    "File:Ghost of Christmas Present Eytinge 1869.jpg",
    "File:William Blake - The Ghost of a Flea - Google Art Project.jpg",
    "File:Ghost dance.jpg",
    "File:The Ghost in the Green Park (NGV).png",
  ],
};

function baseQuery(record) {
  if (QUERY_OVERRIDES[record.name]) return QUERY_OVERRIDES[record.name];
  const cleanName = record.name
    .replace(/\b(tradition|folklore|mythology|iconography|symbols?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const suffix = {
    "动画 / 角色": "character",
    "电影 / 电视": "film television",
    "游戏 / 玩具": "game toy",
    体育运动: "sports",
    "文学 / 公域角色": "historical illustration",
    "艺术 / 公共文化": "artwork",
    "品牌 / 广告角色": "mascot",
    公共符号: "United States",
  }[record.category] || "";
  return `${cleanName} ${suffix}`.trim();
}

function queriesFor(record) {
  const query = baseQuery(record);
  const bare = record.name.replace(/\b(tradition|folklore|mythology|iconography|symbols?)\b/gi, " ").replace(/\s+/g, " ").trim();
  if (record.category === "宗教 / 神话") {
    return unique([
      query,
      `"${bare}" painting`,
      `"${bare}" fresco`,
      `"${bare}" illustration`,
      `"${bare}" sculpture`,
      `"${bare}" historical art`,
    ]);
  }
  return unique([query, `"${query}"`, `"${bare}"`, bare]);
}

function cleanMetadata(value) {
  return stripHtml(value)
    .replace(/\s+(?:title|label)\s+QS:[\s\S]*$/i, "")
    .replace(/\b(Unknown author|Unknown artist)(?:\s+\1)+\b/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value) {
  return normalize(value).split(" ").filter(Boolean);
}

function hasTerm(value, term) {
  const haystack = ` ${normalize(value)} `;
  const needle = normalize(term);
  if (!needle) return false;
  if (needle.includes(" ")) return haystack.includes(` ${needle} `);
  return words(value).some((word) => word === needle || (needle.length >= 5 && word.startsWith(needle)));
}

function isNegativeMatch(record, value) {
  return (NEGATIVE_TERMS[record.name] || []).some((term) => hasTerm(value, term));
}

function subjectAliases(record) {
  if (SUBJECT_ALIASES[record.name]) return SUBJECT_ALIASES[record.name];
  return words(record.name.replace(/\b(tradition|folklore|mythology|iconography|symbols?|goddess|the|and|of)\b/gi, " "))
    .filter((term) => term.length >= 3);
}

function isSubjectMatch(record, candidate) {
  if (candidate.sourceKind === "commons-curated") return true;
  const haystack = [candidate.title, candidate.description, candidate.categories].join(" ");
  return subjectAliases(record).some((alias) => hasTerm(haystack, alias));
}

function mediumClass(text) {
  const value = normalize(text);
  if (/fresco|mural|wall painting/.test(value)) return "壁画 / 湿壁画";
  if (/oil|tempera|watercolor|painting|icon|panel/.test(value)) return "绘画 / 圣像";
  if (/engraving|etching|lithograph|woodcut|print|illustration|manuscript|book of hours/.test(value)) return "版画 / 手稿";
  if (/sculpture|statue|statuette|relief|bronze|marble|stone carving/.test(value)) return "雕塑 / 浮雕";
  if (/mosaic|stained glass|vitrail/.test(value)) return "镶嵌 / 彩窗";
  if (/textile|tapestry|embroidery|woven/.test(value)) return "织物 / 工艺";
  if (/photograph|photo|taken on/.test(value)) return "摄影";
  if (/poster|postcard/.test(value)) return "海报 / 明信片";
  return "其他视觉";
}

function licenseClass(license) {
  const value = normalize(license);
  if (/public domain|cc0|pdm/.test(value)) return "public-domain";
  if (/cc by|creative commons attribution|cc-by/.test(value)) return "open-license";
  return "unknown";
}

function allowedLicense(license) {
  return licenseClass(license) !== "unknown";
}

function queryTokens(record) {
  const stop = new Set(["the", "and", "of", "art", "historical", "united", "states", "tradition", "folklore", "mythology", "character", "film", "television", "sports", "game", "toy", "mascot", "artwork"]);
  return unique(normalize(`${record.name} ${baseQuery(record)}`).split(" ").filter((token) => token.length >= 3 && !stop.has(token)));
}

function relevance(record, candidate, index = 0) {
  const haystack = [candidate.title, candidate.description, candidate.categories, candidate.creator, candidate.medium, candidate.date].join(" ");
  const titleMatchesSubject = subjectAliases(record).some((alias) => hasTerm(candidate.title, alias));
  const exactName = normalize(record.name.replace(/\b(tradition|folklore|mythology|iconography|symbols?)\b/gi, " "));
  const tokens = queryTokens(record);
  let score = Math.max(0, 40 - index);
  if (titleMatchesSubject) score += 140;
  if (exactName.length >= 4 && hasTerm(haystack, exactName)) score += 100;
  for (const token of tokens) if (hasTerm(haystack, token)) score += 15;
  if (candidate.licenseClass === "public-domain") score += 28;
  if (candidate.sourceKind === "local-catalog") score += 18;
  if (record.category === "宗教 / 神话" && ["绘画 / 圣像", "壁画 / 湿壁画", "版画 / 手稿", "雕塑 / 浮雕", "镶嵌 / 彩窗"].includes(candidate.visualType)) score += 18;
  if (record.category === "宗教 / 神话") {
    if (/\b(?:1[0-8]\d{2}|19[0-4]\d)\b|\b(?:bce|bc|century)\b/i.test(candidate.date)) score += 24;
    if (/\b20\d{2}\b/.test(candidate.date)) score -= 14;
    if (candidate.visualType === "摄影") score -= 12;
  }
  if (isNegativeMatch(record, haystack)) score -= 300;
  return score;
}

function commonsCandidate(page, record, index, sourceKind = "commons-search") {
  const info = page.imageinfo?.[0];
  const meta = info?.extmetadata || {};
  if (!info?.thumburl && !info?.url) return null;
  const license = stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value || "");
  if (!allowedLicense(license)) return null;
  const title = cleanMetadata(meta.ObjectName?.value || meta.ImageDescription?.value || page.title.replace(/^File:/, ""));
  const description = cleanMetadata(meta.ImageDescription?.value || "");
  const categories = cleanMetadata(String(meta.Categories?.value || "").replace(/\|/g, " "));
  const creator = cleanMetadata(meta.Artist?.value || meta.Credit?.value || "作者待复核");
  const date = cleanMetadata(meta.DateTimeOriginal?.value || "年代待复核").replace(/date QS:[\s\S]*$/i, "").trim();
  const medium = mediumClass(`${page.title} ${title} ${description} ${categories}`);
  const licenseType = licenseClass(license);
  const candidate = {
    id: `commons:${page.pageid || normalize(page.title)}`,
    imageUrl: info.thumburl || info.url,
    originalUrl: info.url,
    sourceUrl: info.descriptionurl,
    sourceLabel: "Wikimedia Commons",
    sourceKind,
    title,
    description,
    categories,
    creator,
    date,
    medium,
    visualType: medium,
    license,
    licenseUrl: stripHtml(meta.LicenseUrl?.value || info.descriptionurl),
    licenseClass: licenseType,
    rightsNote: licenseType === "public-domain"
      ? `Commons 文件页标记 ${license}；具体对象的商标、肖像或现代角色权利仍需另核。`
      : `Commons 文件页标记 ${license}；展示须保留署名与许可，题材商品化权利仍需另核。`,
  };
  return { ...candidate, score: relevance(record, candidate, index) };
}

async function fetchCommonsFiles(titles, record) {
  if (!titles?.length) return [];
  const url = new URL(commonsEndpoint);
  const params = {
    action: "query",
    format: "json",
    titles: titles.join("|"),
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "960",
    origin: "*",
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const payload = await fetchJson(url);
  return Object.values(payload.query?.pages || {}).map((page, index) => {
    const candidate = commonsCandidate(page, record, index, "commons-curated");
    return candidate ? { ...candidate, score: candidate.score + 260 } : null;
  }).filter(Boolean);
}

const commonsCache = new Map();
async function searchCommons(query, record, limit = 24) {
  const cacheKey = `${query}|${limit}`;
  if (commonsCache.has(cacheKey)) return commonsCache.get(cacheKey).map((item) => ({ ...item, score: relevance(record, item, item.searchIndex) }));
  const url = new URL(commonsEndpoint);
  const params = {
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "960",
    origin: "*",
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const payload = await fetchJson(url);
  const pages = Object.values(payload.query?.pages || {}).sort((a, b) => (a.index || 999) - (b.index || 999));
  const raw = pages.map((page, index) => {
    const candidate = commonsCandidate(page, record, index);
    return candidate ? { ...candidate, searchIndex: index } : null;
  }).filter(Boolean);
  commonsCache.set(cacheKey, raw);
  return raw;
}

function catalogCandidates(record) {
  const tokens = queryTokens(record);
  const exactName = normalize(record.name.replace(/\b(tradition|folklore|mythology|iconography|symbols?)\b/gi, " "));
  return catalog.map((item, index) => {
    if (!item.image) return null;
    const text = [item.title, item.subtitle, item.characters, item.tags, item.scenes].flat().join(" ");
    const tokenMatches = tokens.filter((token) => hasTerm(text, token)).length;
    const exactMatch = exactName.length >= 4 && hasTerm(text, exactName);
    if (!exactMatch && (!tokens.length || tokenMatches < Math.min(2, tokens.length))) return null;
    if (isNegativeMatch(record, text)) return null;
    const subtitle = String(item.subtitle || "");
    const creator = subtitle.split("·")[0]?.trim() || "作者待复核";
    const medium = mediumClass(`${item.title} ${subtitle} ${(item.styles || []).join(" ")}`);
    const license = item.imageRights || item.copyrightRoute || item.rightsStatus || "Public Domain / Open Access";
    const candidate = {
      id: `catalog:${item.id}`,
      imageUrl: item.image,
      originalUrl: item.image,
      sourceUrl: item.sourceUrl,
      sourceLabel: item.sourceLabel || "本地公共馆藏",
      sourceKind: "local-catalog",
      title: item.title,
      description: [item.subtitle, item.characters, item.tags, item.scenes].flat().filter(Boolean).join(" "),
      creator,
      date: item.year || subtitle.split("·")[1]?.trim() || "年代待复核",
      medium,
      visualType: medium,
      license,
      licenseUrl: item.licenseUrl || item.sourceUrl,
      licenseClass: /cc0|public domain|期限届满|公版/i.test(license) ? "public-domain" : "open-license",
      rightsNote: item.imageRights || "公共馆藏研究图；使用前按对象页逐图复核。",
    };
    const score = relevance(record, candidate, index) + tokenMatches * 12;
    return score >= 55 ? { ...candidate, score } : null;
  }).filter(Boolean);
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const seenWorks = new Set();
  return candidates.filter((item) => {
    const key = item.sourceUrl || item.originalUrl || item.imageUrl;
    const workKey = `${normalize(item.title).replace(/\b(?:detail|cropped|crop|uncropped)\b/g, "").trim()}|${normalize(item.creator)}`;
    if (!key || seen.has(key) || (workKey.length > 4 && seenWorks.has(workKey))) return false;
    seen.add(key);
    if (workKey.length > 4) seenWorks.add(workKey);
    return true;
  });
}

function selectDiverse(candidates, target) {
  const pool = dedupeCandidates(candidates).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "en"));
  const selected = [];
  const creators = new Set();
  const media = new Set();
  while (selected.length < target && pool.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let index = 0; index < pool.length; index += 1) {
      const item = pool[index];
      const creatorKey = normalize(item.creator) || normalize(item.title);
      const diversity = (creators.has(creatorKey) ? -35 : 90) + (media.has(item.visualType) ? 0 : 22);
      const score = item.score + diversity;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    const [picked] = pool.splice(bestIndex, 1);
    selected.push(picked);
    creators.add(normalize(picked.creator) || normalize(picked.title));
    media.add(picked.visualType);
  }
  return selected.map(({ score, searchIndex, categories, ...item }) => item);
}

async function gather(record) {
  const target = record.category === "宗教 / 神话" ? 5 : 1;
  const candidates = catalogCandidates(record);
  if (FILE_OVERRIDES[record.name]) candidates.push(...await fetchCommonsFiles(FILE_OVERRIDES[record.name], record));
  const queryResults = await Promise.all(queriesFor(record).map((query) => (
    searchCommons(query, record, record.category === "宗教 / 神话" ? 30 : 12)
  )));
  for (const result of queryResults) candidates.push(...result);
  return selectDiverse(candidates.filter((item) => item.score > 30 && (record.category !== "宗教 / 神话" || isSubjectMatch(record, item))), target);
}

let output = {
  schemaVersion: "1.0",
  generatedAt: "",
  sources: [
    { label: "Wikimedia Commons", url: "https://commons.wikimedia.org/", role: "开放许可与公共领域图像、逐文件许可元数据" },
    { label: "本地公共馆藏目录", url: "data/catalog.json", role: "已收录的 The Met、Art Institute of Chicago、Cleveland Museum 等开放馆藏" },
  ],
  boundary: "视觉图只用于识别、历史演变与选题研究。公共领域或开放许可属于具体图像；不会自动开放现代角色、商标、肖像、官方标志或后期改编。",
  records: {},
  stats: {},
};
if (!force) {
  try {
    const existing = JSON.parse(await fs.readFile(outputPath, "utf8"));
    output.records = existing.records || {};
  } catch {}
}

const targets = dataset.records.filter((record) => !record.visualImage || record.category === "宗教 / 神话");
const pending = targets.filter((record) => {
  const target = record.category === "宗教 / 神话" ? 5 : 1;
  if (refreshReligion && record.category === "宗教 / 神话") return true;
  if (refreshCurated && FILE_OVERRIDES[record.name]) return true;
  return (output.records[record.id]?.images || []).length < target;
});

async function writeOutput() {
  const entries = Object.values(output.records);
  const religionEntries = entries.filter((item) => item.category === "宗教 / 神话");
  output.generatedAt = new Date().toISOString();
  output.stats = {
    targetRecords: targets.length,
    completedRecords: entries.filter((item) => item.images?.length).length,
    totalImages: entries.reduce((sum, item) => sum + (item.images?.length || 0), 0),
    religionRecords: religionEntries.length,
    religionWithThreeOrMore: religionEntries.filter((item) => item.images?.length >= 3).length,
    publicDomainImages: entries.flatMap((item) => item.images || []).filter((item) => item.licenseClass === "public-domain").length,
    openLicenseImages: entries.flatMap((item) => item.images || []).filter((item) => item.licenseClass === "open-license").length,
  };
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

for (let index = 0; index < pending.length; index += CONCURRENCY) {
  const batch = pending.slice(index, index + CONCURRENCY);
  const results = await Promise.all(batch.map(async (record) => {
    try {
      return { record, images: await gather(record) };
    } catch (error) {
      return { record, images: [], error: error.message };
    }
  }));
  for (const { record, images, error } of results) {
    output.records[record.id] = {
      id: record.id,
      name: record.name,
      nameZh: record.nameZh,
      category: record.category,
      query: baseQuery(record),
      status: images.length ? "已匹配开放图源" : "待复核",
      error: error || "",
      images,
    };
  }
  await writeOutput();
  process.stdout.write(`visuals ${Math.min(index + CONCURRENCY, pending.length)}/${pending.length} · total ${output.stats.totalImages} · religion>=3 ${output.stats.religionWithThreeOrMore}\n`);
  await sleep(800);
}

await writeOutput();
process.stdout.write(`${JSON.stringify(output.stats, null, 2)}\n`);
