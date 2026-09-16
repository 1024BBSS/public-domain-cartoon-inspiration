import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const normalize = (value) => String(value || "")
  .normalize("NFKC")
  .toLocaleLowerCase("zh-CN")
  .replace(/[’'“”\"《》]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const compact = (values) => [...new Set(values.filter(Boolean))];

function hashText(value, length = 10) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, length);
}

function slugify(value) {
  const slug = normalize(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\p{Script=Han}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54);
  return slug || hashText(value, 12);
}

function stableId(prefix, label, seed = label) {
  return `${prefix}-${slugify(label)}-${hashText(seed, 8)}`;
}

function canonicalSource(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return normalize(value);
  }
}

const CHARACTER_ALIASES = new Map([
  ["betty boop 1.0", "Betty Boop"],
  ["betty boop as cinderella", "Betty Boop"],
  ["mickey", "Mickey Mouse"],
  ["mickey mouse 1.0", "Mickey Mouse"],
  ["minnie mouse 1.0", "Minnie Mouse"],
  ["princess minnie", "Minnie Mouse"],
  ["koko the clown", "Koko"],
  ["rover", "Rover / Pluto"],
  ["rover / pluto 1.0", "Rover / Pluto"],
  ["未命名寻血猎犬（rover/pluto 前身）", "Rover / Pluto"],
  ["未命名寻血猎犬(rover/pluto 前身)", "Rover / Pluto"],
  ["winnie-the-pooh 原版", "Winnie-the-Pooh"],
  ["tigger 原版", "Tigger"],
  ["olive oyl（早期）", "Olive Oyl"],
  ["olive oyl(早期)", "Olive Oyl"],
  ["bambi（原著）", "Bambi"],
  ["bambi(原著)", "Bambi"],
  ["felix / master tom 早期猫", "Felix / Master Tom"],
  ["flip the frog 1.0", "Flip the Frog"],
  ["popeye 1.0", "Popeye"],
  ["buck rogers 1.0", "Buck Rogers"],
  ["bosko 1.0", "Bosko"],
  ["小鱼 small fry", "Small Fry"],
  ["somewhere in dreamland siblings", "Dreamland Siblings"],
  ["梦境兄妹", "Dreamland Siblings"],
  ["the cobweb hotel spider", "Cobweb Hotel Spider"],
  ["蛛网旅馆蜘蛛老板", "Cobweb Hotel Spider"],
  ["the cobweb hotel fly couple", "Cobweb Hotel Fly Couple"],
  ["苍蝇情侣", "Cobweb Hotel Fly Couple"],
  ["christmas comes orphan children", "Christmas Comes Orphans"],
  ["圣诞孤儿院孩子群像", "Christmas Comes Orphans"],
  ["格兰皮爷爷", "Grampy"],
  ["van beuren 人类版 tom & jerry", "Van Beuren Human Duo"],
  ["范伯伦人类搭档", "Van Beuren Human Duo"],
]);

const SUBJECT_HUBS = [
  {
    id: "subject-jesus-christian-iconography",
    name: "耶稣与基督教圣像",
    aliases: ["Jesus", "Christ", "耶稣", "基督", "Nativity"],
    match: (record) => (record.scenes || []).includes("基督教 · 耶稣与圣像"),
  },
  {
    id: "subject-guanyin-bodhisattvas",
    name: "观音与诸菩萨",
    aliases: ["Guanyin", "Avalokiteshvara", "观音", "菩萨"],
    match: (record) => (record.scenes || []).includes("观音与诸菩萨"),
  },
  {
    id: "subject-olympian-gods",
    name: "奥林匹斯诸神",
    aliases: ["Olympian gods", "Zeus", "Hera", "Athena", "Apollo", "宙斯", "赫拉", "雅典娜", "阿波罗"],
    match: (record) => (record.scenes || []).includes("奥林匹斯诸神"),
  },
  {
    id: "subject-hindu-epics",
    name: "印度史诗人物",
    aliases: ["Ramayana", "Mahabharata", "Rama", "Sita", "Arjuna", "罗摩衍那", "摩诃婆罗多"],
    match: (record) => (record.scenes || []).includes("印度教传统"),
  },
  {
    id: "subject-mesopotamian-myth",
    name: "两河神话人物",
    aliases: ["Inanna", "Ishtar", "Gilgamesh", "伊南娜", "伊什塔尔", "吉尔伽美什"],
    match: (record) => (record.scenes || []).includes("两河与古波斯"),
  },
  {
    id: "subject-daoist-immortals",
    name: "道教神仙与八仙",
    aliases: ["Eight Immortals", "Daoist immortals", "八仙", "道教神仙"],
    match: (record) => (record.scenes || []).includes("道教神仙与八仙"),
  },
  {
    id: "subject-ghosts-spiritualism",
    name: "幽灵、鬼屋与通灵",
    aliases: ["Ghost", "Spirit", "Phantom", "Apparition", "Haunting", "Séance", "幽灵", "鬼怪", "灵体", "通灵", "鬼屋"],
    coverRecordId: "catalog-supplement-ghost-christmas-frolic-1814",
    usage: "按母题进入：白布幽灵、锁链亡灵、半透明显影、鬼屋喜剧、通灵摄影、舞台幻术与东亚幽魂。打开具体作品后，再取构图、动作和轮廓。",
    avoid: "公版结论只覆盖列出的具体历史版本。避开 Casper、Ghostbusters、Disney Haunted Mansion、现代影视造型、品牌标志与现代修复配色。",
    match: (record) => {
      if (!record) return false;
      const text = normalize([
        record.title, record.subtitle, record.characters, record.scenes,
        record.styles, record.tags,
      ].flat().filter(Boolean).join(" "));
      return (record.scenes || []).includes("幽灵、鬼屋与通灵")
        || /幽灵|鬼怪|灵体|通灵|鬼屋|ghost|spirit|phantom|apparition|haunt|séance|seance|marley|mysterious mose/.test(text);
    },
  },
  {
    id: "subject-east-asian-ghosts",
    name: "钟馗与东亚鬼神",
    aliases: ["Zhong Kui", "Yokai", "钟馗", "妖怪", "鬼神"],
    match: (record) => (record.scenes || []).includes("妖怪、幽灵与民间护佑神"),
  },
  {
    id: "subject-arthurian-cycle",
    name: "亚瑟王传奇人物",
    aliases: ["King Arthur", "Arthurian", "亚瑟王", "湖中仙女", "Lancelot", "Guinevere"],
    match: (record) => (record.scenes || []).includes("亚瑟王、湖中仙女与近代凯尔特复兴"),
  },
  {
    id: "subject-witches",
    name: "女巫与女术士",
    aliases: ["Witch", "Sorceress", "女巫", "女术士"],
    match: (record) => (record.scenes || []).includes("女巫、女术士与怪诞"),
  },
  {
    id: "subject-winter-folk-figures",
    name: "冬季民俗角色",
    aliases: ["Krampus", "Saint Nicholas", "Mari Lwyd", "Perchten", "圣尼古拉", "冬季面具"],
    match: (record) => (record.scenes || []).includes("冬季面具、游行与民俗角色"),
  },
];

const ENSEMBLE_RE = /群像|动物群|生物|昆虫|鱼群|猴群|玩具|消防队|乐队|继姐妹|gnomes|animals|creatures|ensemble/i;

function canonicalCharacter(value) {
  const raw = String(value || "").normalize("NFKC").trim();
  const direct = CHARACTER_ALIASES.get(normalize(raw));
  if (direct) return direct;
  const stripped = raw
    .replace(/\s+1\.0$/i, "")
    .replace(/\s+(?:原版|早期|原著)$/i, "")
    .replace(/[（(](?:早期|原版|原著)[^）)]*[）)]$/i, "")
    .trim();
  return CHARACTER_ALIASES.get(normalize(stripped)) || stripped;
}

function masterSubjectNames(record) {
  let head = String(record.title || "").split("·")[0].trim();
  if (!head) return [];
  const direct = CHARACTER_ALIASES.get(normalize(head));
  if (direct) return [direct];
  if (head.includes(" & ")) {
    return compact(head.split(" & ").map((part) => canonicalCharacter(part)));
  }
  return [canonicalCharacter(head)];
}

function unionFromRecords(records, key) {
  return compact(records.flatMap((record) => Array.isArray(record[key]) ? record[key] : [record[key]]));
}

function countsBy(values) {
  return values.reduce((counts, value) => {
    if (value) counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function topValues(records, key, limit = 10) {
  const counts = new Map();
  for (const record of records) {
    for (const value of record[key] || []) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function buildWorks(records) {
  const frames = records.filter((record) => record.kind === "动画画面");
  const masters = records.filter((record) => record.kind === "主档");
  const drafts = new Map();
  const sourceToKey = new Map();

  for (const record of frames) {
    const source = canonicalSource(record.sourceUrl);
    const key = source ? `source:${source}|${record.year}` : `title:${normalize(record.title)}|${record.year}`;
    if (!drafts.has(key)) drafts.set(key, { key, records: [], frames: [], masters: [] });
    const draft = drafts.get(key);
    draft.records.push(record);
    draft.frames.push(record);
    if (source) sourceToKey.set(`${source}|${record.year}`, key);
  }

  for (const record of masters) {
    const source = canonicalSource(record.sourceUrl);
    const matchingKey = source && sourceToKey.get(`${source}|${record.year}`);
    const key = matchingKey || `master:${record.id}`;
    if (!drafts.has(key)) drafts.set(key, { key, records: [], frames: [], masters: [] });
    const draft = drafts.get(key);
    draft.records.push(record);
    draft.masters.push(record);
  }

  return [...drafts.values()].map((draft) => {
    const frameLead = draft.frames[0];
    const masterLead = [...draft.masters].sort((a, b) => (b.awarenessScore || 0) - (a.awarenessScore || 0))[0];
    const lead = frameLead || masterLead || draft.records[0];
    const cover = masterLead || frameLead || lead;
    const sourceUrl = masterLead?.sourceUrl || lead.sourceUrl || "";
    const characterAliases = unionFromRecords(draft.frames, "characters");
    const characterNames = compact(characterAliases.map(canonicalCharacter));
    return {
      id: stableId("work", lead.title, draft.key),
      title: frameLead?.title || masterLead?.title || lead.title,
      subtitle: masterLead?.subtitle || (/^画面\s*\d+$/i.test(frameLead?.subtitle || "") ? "" : frameLead?.subtitle) || "",
      year: lead.year,
      yearSort: Math.min(...draft.records.map((record) => Number(record.yearSort) || 9999)),
      coverImage: cover.image,
      coverRecordId: cover.id,
      sourceUrl,
      sourceLabel: lead.sourceLabel || masterLead?.sourceLabel || "来源页",
      licenseUrl: lead.licenseUrl || masterLead?.licenseUrl || "",
      rightsStatuses: compact(draft.records.map((record) => record.rightsStatus)),
      copyrightRoutes: compact(draft.records.map((record) => record.copyrightRoute)),
      evidenceLevels: compact(draft.records.map((record) => record.evidenceLevel)),
      imageRights: compact(draft.records.map((record) => record.imageRights)),
      usage: masterLead?.usage || lead.usage || "",
      avoid: masterLead?.avoid || lead.avoid || "",
      tags: unionFromRecords(draft.records, "tags"),
      styles: unionFromRecords(draft.records, "styles"),
      scenes: unionFromRecords(draft.records, "scenes"),
      holidays: unionFromRecords(draft.records, "holidays"),
      characterNames,
      characterAliases,
      recordIds: draft.records.map((record) => record.id),
      frameIds: draft.frames.map((record) => record.id),
      masterIds: draft.masters.map((record) => record.id),
      imageCount: new Set(draft.records.map((record) => record.image)).size,
      frameCount: draft.frames.length,
      awarenessScore: Math.max(...draft.records.map((record) => Number(record.awarenessScore) || 0)),
    };
  });
}

function addEntity(entityMap, name, options = {}) {
  const canonical = canonicalCharacter(name);
  if (!canonical) return null;
  const key = normalize(canonical);
  if (!entityMap.has(key)) {
    entityMap.set(key, {
      id: options.id || stableId("role", canonical),
      name: canonical,
      type: options.type || (ENSEMBLE_RE.test(canonical) ? "群像 / 生物" : "角色"),
      aliases: new Set(),
      workIds: new Set(),
      virtual: Boolean(options.virtual),
    });
  }
  const entity = entityMap.get(key);
  if (options.type === "文化题材") entity.type = "文化题材";
  for (const alias of options.aliases || []) {
    if (normalize(alias) !== key) entity.aliases.add(alias);
  }
  if (name && normalize(name) !== key) entity.aliases.add(name);
  return entity;
}

function buildEntities(records, works) {
  const recordById = new Map(records.map((record) => [record.id, record]));
  const workById = new Map(works.map((work) => [work.id, work]));
  const entityMap = new Map();
  const hubWorks = new Map();

  for (const hub of SUBJECT_HUBS) {
    hubWorks.set(hub.id, works.filter((work) => work.recordIds.some((id) => hub.match(recordById.get(id)))));
  }
  const workIdsInHubs = new Set([...hubWorks.values()].flatMap((matchingWorks) => matchingWorks.map((work) => work.id)));

  for (const work of works) {
    for (const alias of work.characterAliases) {
      const entity = addEntity(entityMap, alias, { aliases: [alias] });
      if (entity) entity.workIds.add(work.id);
    }
  }

  for (const work of works) {
    if (work.characterNames.length || workIdsInHubs.has(work.id)) continue;
    const masterRecords = work.masterIds.map((id) => recordById.get(id)).filter(Boolean);
    const names = compact(masterRecords.flatMap(masterSubjectNames));
    for (const name of names) {
      const entity = addEntity(entityMap, name, { type: "主体" });
      if (entity) entity.workIds.add(work.id);
    }
  }

  for (const hub of SUBJECT_HUBS) {
    const matchingWorks = hubWorks.get(hub.id) || [];
    if (!matchingWorks.length) continue;
    const entity = addEntity(entityMap, hub.name, { id: hub.id, type: "文化题材", aliases: hub.aliases, virtual: true });
    for (const work of matchingWorks) entity.workIds.add(work.id);
  }

  const entities = [...entityMap.values()].map((draft) => {
    const entityWorks = [...draft.workIds].map((id) => workById.get(id)).filter(Boolean);
    const entityRecords = entityWorks.flatMap((work) => work.recordIds.map((id) => recordById.get(id))).filter(Boolean);
    const nameKey = normalize(draft.name);
    const matchingMaster = entityRecords
      .filter((record) => record.kind === "主档")
      .sort((a, b) => {
        const aMatch = normalize(canonicalCharacter(masterSubjectNames(a)[0])) === nameKey ? 1 : 0;
        const bMatch = normalize(canonicalCharacter(masterSubjectNames(b)[0])) === nameKey ? 1 : 0;
        return bMatch - aMatch || (b.awarenessScore || 0) - (a.awarenessScore || 0);
      })[0];
    const subjectHub = SUBJECT_HUBS.find((hub) => hub.id === draft.id);
    const preferredCover = subjectHub?.coverRecordId
      ? entityRecords.find((record) => record.id === subjectHub.coverRecordId)
      : null;
    const coverRecord = preferredCover || matchingMaster || entityRecords[0];
    const rightsByWork = countsBy(entityWorks.flatMap((work) => work.rightsStatuses));
    const firstYear = entityWorks.reduce((year, work) => Math.min(year, work.yearSort || 9999), 9999);
    const representative = matchingMaster || entityRecords.find((record) => record.usage || record.avoid) || entityRecords[0];
    const recordIds = compact(entityWorks.flatMap((work) => work.recordIds));
    const frameIds = compact(entityWorks.flatMap((work) => work.frameIds));
    return {
      id: draft.id,
      name: draft.name,
      type: draft.type,
      aliases: [...draft.aliases].sort((a, b) => a.localeCompare(b, "zh-CN")),
      virtual: draft.virtual,
      coverImage: coverRecord?.image || "",
      coverRecordId: coverRecord?.id || "",
      yearStart: firstYear === 9999 ? "待复核" : firstYear,
      yearEnd: entityWorks.reduce((year, work) => Math.max(year, work.yearSort && work.yearSort !== 9999 ? work.yearSort : 0), 0) || "待复核",
      workIds: entityWorks.map((work) => work.id),
      recordIds,
      frameIds,
      workCount: entityWorks.length,
      imageCount: new Set(entityRecords.map((record) => record.image)).size,
      frameCount: frameIds.length,
      rightsBreakdown: rightsByWork,
      copyrightRoutes: compact(entityWorks.flatMap((work) => work.copyrightRoutes)),
      evidenceLevels: compact(entityWorks.flatMap((work) => work.evidenceLevels)),
      tags: unionFromRecords(entityRecords, "tags"),
      topScenes: topValues(entityRecords, "scenes"),
      topStyles: topValues(entityRecords, "styles"),
      topHolidays: topValues(entityRecords, "holidays"),
      usage: subjectHub?.usage || representative?.usage || "从具体作品与版本中提取可复用的视觉关系。",
      avoid: subjectHub?.avoid || representative?.avoid || "避开后期新增造型、现代修复、品牌标志与来源混淆。",
      awarenessScore: Math.max(...entityRecords.map((record) => Number(record.awarenessScore) || 0), 0),
      sourceCount: new Set(entityWorks.map((work) => canonicalSource(work.sourceUrl)).filter(Boolean)).size,
    };
  });

  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const workEntities = new Map(works.map((work) => [work.id, []]));
  for (const entity of entities) {
    for (const workId of entity.workIds) workEntities.get(workId)?.push(entity.id);
  }

  for (const work of works) work.entityIds = compact(workEntities.get(work.id) || []);

  for (const entity of entities) {
    const related = new Map();
    for (const workId of entity.workIds) {
      const work = workById.get(workId);
      for (const otherId of work?.entityIds || []) {
        if (otherId === entity.id) continue;
        related.set(otherId, (related.get(otherId) || 0) + 1);
      }
    }
    entity.relatedEntityIds = [...related.entries()]
      .sort((a, b) => b[1] - a[1] || (entityById.get(b[0])?.imageCount || 0) - (entityById.get(a[0])?.imageCount || 0))
      .slice(0, 10)
      .map(([id]) => id);
  }

  return entities.sort((a, b) => b.imageCount - a.imageCount || b.workCount - a.workCount || b.awarenessScore - a.awarenessScore || a.name.localeCompare(b.name, "zh-CN"));
}

function buildCollections(records, works, entities, key, type) {
  const workByRecord = new Map();
  for (const work of works) for (const recordId of work.recordIds) workByRecord.set(recordId, work.id);
  const entityIdsByWork = new Map(works.map((work) => [work.id, work.entityIds || []]));
  const buckets = new Map();

  for (const record of records) {
    for (let value of record[key] || []) {
      if (key === "holidays" && value === "圣诞节") value = "圣诞 / 冬季";
      if (!buckets.has(value)) buckets.set(value, []);
      buckets.get(value).push(record);
    }
  }

  return [...buckets.entries()].map(([name, collectionRecords]) => {
    const workIds = compact(collectionRecords.map((record) => workByRecord.get(record.id)));
    const collectionWorks = works.filter((work) => workIds.includes(work.id));
    const recordIds = compact(collectionRecords.map((record) => record.id));
    const covers = compact(collectionWorks.map((work) => work.coverImage)).slice(0, 4);
    return {
      id: stableId(type === "节日" ? "holiday" : "scene", name),
      name,
      type,
      coverImages: covers,
      workIds,
      entityIds: compact(workIds.flatMap((workId) => entityIdsByWork.get(workId) || [])),
      recordIds,
      workCount: workIds.length,
      imageCount: new Set(collectionRecords.map((record) => record.image)).size,
      rightsBreakdown: countsBy(collectionWorks.flatMap((work) => work.rightsStatuses)),
      tags: unionFromRecords(collectionRecords, "tags"),
      yearStart: collectionWorks.reduce((year, work) => Math.min(year, work.yearSort || 9999), 9999),
    };
  }).sort((a, b) => b.imageCount - a.imageCount || a.name.localeCompare(b.name, "zh-CN"));
}

export function deriveRelations(dataset) {
  const records = Array.isArray(dataset?.records) ? dataset.records : [];
  const works = buildWorks(records);
  const entities = buildEntities(records, works);
  const scenes = buildCollections(records, works, entities, "scenes", "场景");
  const holidays = buildCollections(records, works, entities, "holidays", "节日");
  return {
    schemaVersion: "2.0",
    sourceVersion: dataset.sourceVersion,
    generatedAt: dataset.generatedAt,
    scope: "由公开目录生成的角色、主体、作品、场景与节日关系层；权利状态继承具体记录，不扩大原结论。",
    counts: {
      entities: entities.length,
      characters: entities.filter((entity) => entity.type === "角色").length,
      subjectHubs: entities.filter((entity) => entity.type === "文化题材").length,
      works: works.length,
      scenes: scenes.length,
      holidays: holidays.length,
      records: records.length,
    },
    entities,
    works: works.sort((a, b) => b.imageCount - a.imageCount || b.awarenessScore - a.awarenessScore || a.yearSort - b.yearSort || a.title.localeCompare(b.title, "zh-CN")),
    scenes,
    holidays,
  };
}

async function writeStablePackage(filePath, packageData) {
  let output = packageData;

  try {
    const previous = JSON.parse(await fs.readFile(filePath, "utf8"));
    const previousComparable = { ...previous };
    const nextComparable = { ...packageData };
    delete previousComparable.generatedAt;
    delete nextComparable.generatedAt;

    if (JSON.stringify(previousComparable) === JSON.stringify(nextComparable)) {
      output = { ...packageData, generatedAt: previous.generatedAt };
    }
  } catch {
    // New or unreadable package: write the current generated timestamp.
  }

  await fs.writeFile(filePath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

export async function writeRelationData(projectRoot, dataset) {
  const dataRoot = path.join(projectRoot, "data");
  const entityRoot = path.join(dataRoot, "entities");
  const workRoot = path.join(dataRoot, "works");
  const relations = deriveRelations(dataset);
  const recordById = new Map(dataset.records.map((record) => [record.id, record]));
  const workById = new Map(relations.works.map((work) => [work.id, work]));
  const entityById = new Map(relations.entities.map((entity) => [entity.id, entity]));

  await fs.mkdir(entityRoot, { recursive: true });
  await fs.mkdir(workRoot, { recursive: true });

  const json = `${JSON.stringify(relations, null, 2)}\n`;
  await fs.writeFile(path.join(dataRoot, "relations.json"), json, "utf8");
  await fs.writeFile(path.join(dataRoot, "relations.js"), `window.PUBLIC_DOMAIN_RELATIONS = ${JSON.stringify(relations)};\n`, "utf8");

  await Promise.all(relations.entities.map(async (entity) => {
    const packageData = {
      schemaVersion: relations.schemaVersion,
      sourceVersion: relations.sourceVersion,
      generatedAt: relations.generatedAt,
      entity,
      works: entity.workIds.map((id) => workById.get(id)).filter(Boolean),
      relatedEntities: entity.relatedEntityIds.map((id) => entityById.get(id)).filter(Boolean),
      recordsEndpoint: "../catalog.json",
    };
    await writeStablePackage(path.join(entityRoot, `${entity.id}.json`), packageData);
  }));

  await Promise.all(relations.works.map(async (work) => {
    const packageData = {
      schemaVersion: relations.schemaVersion,
      sourceVersion: relations.sourceVersion,
      generatedAt: relations.generatedAt,
      work,
      entities: work.entityIds.map((id) => entityById.get(id)).filter(Boolean),
      records: work.recordIds.map((id) => recordById.get(id)).filter(Boolean),
    };
    await writeStablePackage(path.join(workRoot, `${work.id}.json`), packageData);
  }));

  return {
    relations,
    sha256: createHash("sha256").update(json).digest("hex"),
  };
}

async function main() {
  const projectRoot = path.resolve(scriptDir, "..");
  const dataset = JSON.parse(await fs.readFile(path.join(projectRoot, "data/catalog.json"), "utf8"));
  const result = await writeRelationData(projectRoot, dataset);
  process.stdout.write(`${JSON.stringify(result.relations.counts, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
