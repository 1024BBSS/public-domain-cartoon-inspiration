(() => {
  "use strict";

  const dataset = window.PUBLIC_DOMAIN_CARTOON_DATA || {};
  const relations = window.PUBLIC_DOMAIN_RELATIONS || {};
  const records = Array.isArray(dataset.records) ? dataset.records : [];
  const entities = Array.isArray(relations.entities) ? relations.entities : [];
  const works = Array.isArray(relations.works) ? relations.works : [];
  const scenes = Array.isArray(relations.scenes) ? relations.scenes : [];
  const holidays = Array.isArray(relations.holidays) ? relations.holidays : [];

  const VIEW_ORDER = ["roles", "works", "images", "scenes", "holidays"];
  const VIEW_CONFIG = {
    roles: { label: "角色 / 主体", short: "角色", placeholder: "搜角色或主体", pageSize: 36 },
    works: { label: "作品", short: "作品", placeholder: "搜作品、角色或场景", pageSize: 36 },
    images: { label: "画面", short: "画面", placeholder: "搜画面、作品或角色", pageSize: 48 },
    scenes: { label: "场景 / 题材", short: "场景", placeholder: "搜场景或题材", pageSize: 36 },
    holidays: { label: "节日", short: "节日", placeholder: "搜节日", pageSize: 24 },
  };
  const TAG_ORDER = [
    "全部",
    "早期动画",
    "漫画 / 角色",
    "童话 / 寓言",
    "动物 / 自然",
    "万圣节",
    "圣诞 / 冬季",
    "怪诞 / 魔法",
    "宗教 / 神话",
    "经典艺术",
    "版画 / 纹样",
    "生活 / 节庆",
  ];
  const RIGHTS_ORDER = [
    "全部",
    "期限届满",
    "未续期",
    "公版 / 开放馆藏",
    "公版文件",
    "CC0 / 公版开放馆藏",
    "Public Domain / LOC",
  ];

  const $ = (selector) => document.querySelector(selector);
  const dom = {
    topMeta: $("#top-meta"),
    search: $("#search"),
    rights: $("#rights-select"),
    sort: $("#sort-select"),
    reset: $("#reset"),
    emptyReset: $("#empty-reset"),
    grid: $("#art-grid"),
    empty: $("#empty-state"),
    resultTitle: $("#result-title"),
    resultCount: $("#result-count"),
    pageStatus: $("#page-status"),
    pager: $(".pager"),
    pagerStatus: $("#pager-status"),
    prev: $("#prev-page"),
    next: $("#next-page"),
    copyFilter: $("#copy-filter"),
    desktopViews: $("#desktop-views"),
    desktopTags: $("#desktop-tags"),
    desktopRights: $("#desktop-rights"),
    mobileViews: $("#mobile-views"),
    mobileTags: $("#mobile-tags"),
    searchGroups: $("#search-groups"),
    browserView: $("#browser-view"),
    entityPage: $("#entity-page"),
    workPage: $("#work-page"),
    dialog: $("#detail-dialog"),
    detailImage: $("#detail-image"),
    detailKind: $("#detail-kind"),
    detailTitle: $("#detail-title"),
    detailSubtitle: $("#detail-subtitle"),
    detailBadges: $("#detail-badges"),
    detailUsage: $("#detail-usage"),
    detailAvoid: $("#detail-avoid"),
    detailContext: $("#detail-context"),
    detailEvidence: $("#detail-evidence"),
    detailRelated: $("#detail-related"),
    detailSource: $("#detail-source"),
    copyItem: $("#copy-item"),
  };

  const recordById = new Map(records.map((item) => [item.id, item]));
  const entityById = new Map(entities.map((item) => [item.id, item]));
  const workById = new Map(works.map((item) => [item.id, item]));
  const collectionById = new Map([...scenes, ...holidays].map((item) => [item.id, item]));
  const worksByRecord = new Map(records.map((item) => [item.id, []]));
  for (const work of works) {
    for (const recordId of work.recordIds || []) worksByRecord.get(recordId)?.push(work);
  }

  const normalize = (value) => String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/\s+/g, " ")
    .trim();
  const compact = (values) => [...new Set(values.filter(Boolean))];
  const joinSearch = (values) => normalize(values.flat(Infinity).filter(Boolean).join(" "));
  const QUERY_SYNONYMS = new Map([
    ["幽灵", ["幽灵", "鬼", "鬼怪", "灵体", "通灵", "鬼屋", "ghost", "spirit", "phantom", "apparition", "haunt", "séance", "seance", "marley", "mysterious mose"]],
    ["鬼", ["鬼", "幽灵", "鬼怪", "灵体", "ghost", "spirit", "phantom", "yūrei", "yokai"]],
    ["ghost", ["ghost", "spirit", "phantom", "apparition", "haunt", "幽灵", "鬼怪", "灵体"]],
    ["通灵", ["通灵", "灵体", "招魂", "séance", "seance", "spirit", "spiritualist"]],
  ]);
  const byLocale = (a, b) => String(a).localeCompare(String(b), "zh-CN", { numeric: true });
  const num = (value) => Number(value) || 0;

  function uniqueRecords(recordIds) {
    const seen = new Set();
    return recordIds.map((id) => recordById.get(id)).filter((record) => {
      if (!record) return false;
      const key = record.image || record.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  for (const record of records) {
    record._search = joinSearch([
      record.title, record.subtitle, record.year, record.rightsStatus, record.copyrightRoute,
      record.characters, record.scenes, record.styles, record.holidays, record.tags,
      record.assetType, record.motifs, record.actions, record.compositions, record.colors, record.productionUses,
    ]);
  }
  for (const work of works) {
    work._search = joinSearch([
      work.title, work.subtitle, work.year, work.characterNames, work.characterAliases,
      work.scenes, work.styles, work.holidays, work.tags, work.rightsStatuses,
      work.assetTypes, work.motifs, work.actions, work.compositions, work.colors, work.productionUses,
    ]);
  }
  for (const entity of entities) {
    entity._search = joinSearch([
      entity.name, entity.aliases, entity.type, entity.tags,
      (entity.topScenes || []).map((item) => item.name),
      (entity.topStyles || []).map((item) => item.name),
      (entity.topHolidays || []).map((item) => item.name),
    ]);
  }
  for (const collection of [...scenes, ...holidays]) {
    collection._search = joinSearch([collection.name, collection.type, collection.tags]);
  }

  function currentParams() {
    const params = new URLSearchParams(location.search);
    const view = VIEW_ORDER.includes(params.get("view")) ? params.get("view") : "roles";
    return {
      view,
      q: params.get("q") || "",
      type: params.get("type") || "全部",
      rights: params.get("rights") || "全部",
      sort: ["count", "awareness", "year", "title"].includes(params.get("sort")) ? params.get("sort") : "count",
      entity: params.get("entity") || "",
      collection: params.get("collection") || "",
      page: Math.max(1, Number(params.get("page")) || 1),
    };
  }

  let state = currentParams();
  let currentDetail = null;
  let backgroundHash = "";
  let suppressDialogClose = false;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function makeButton(label, className, onClick) {
    const node = el("button", className, label);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }

  function makeLink(label, href, className = "btn btn--secondary btn--sm") {
    const node = el("a", className, label);
    node.href = href;
    node.target = "_blank";
    node.rel = "noreferrer";
    return node;
  }

  function imageNode(src, alt, loading = "lazy") {
    const img = el("img");
    img.src = src || "";
    img.alt = alt || "";
    img.loading = loading;
    img.decoding = "async";
    img.addEventListener("error", () => {
      img.hidden = true;
      img.parentElement?.classList.add("is-image-missing");
    }, { once: true });
    return img;
  }

  function itemTags(item) {
    return Array.isArray(item.tags) ? item.tags : [];
  }

  function itemRights(item) {
    if (item.rightsStatus) return [item.rightsStatus];
    if (Array.isArray(item.rightsStatuses)) return item.rightsStatuses;
    if (item.rightsBreakdown) return Object.keys(item.rightsBreakdown);
    return [];
  }

  function itemTitle(item) {
    return item.name || item.title || "未命名";
  }

  function itemYear(item) {
    const value = item.yearStart ?? item.yearSort ?? item.year;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 9999;
  }

  function itemCount(item) {
    return num(item.imageCount) || num(item.recordIds?.length) || 1;
  }

  function itemAwareness(item) {
    return num(item.awarenessScore);
  }

  function rightsText(item, limit = 2) {
    const values = itemRights(item);
    if (!values.length) return "权利待复核";
    return values.slice(0, limit).join(" + ");
  }

  function displayCopy(value) {
    return String(value || "待复核")
      .replace(/[，,]\s*不建议作为首批[。.]?/g, "。")
      .replace(/不建议首批/g, "")
      .replace(/。。+/g, "。")
      .trim();
  }

  function yearsText(item) {
    const start = item.yearStart ?? item.year;
    const end = item.yearEnd;
    if (!start || start === "待复核") return "年代待复核";
    if (end && end !== start && end !== "待复核") return `${start}–${end}`;
    return String(start);
  }

  function badge(text, ok = false) {
    return el("span", `badge${ok ? " badge--ok" : ""}`, text);
  }

  function rightsBadges(item) {
    const fragment = document.createDocumentFragment();
    for (const value of itemRights(item)) fragment.append(badge(value, value !== "待复核"));
    const evidence = item.evidenceLevels || (item.evidenceLevel ? [item.evidenceLevel] : []);
    for (const value of evidence) fragment.append(badge(`证据 ${value}`, value === "A"));
    return fragment;
  }

  function dataForView(view) {
    if (view === "roles") return entities;
    if (view === "works") return works;
    if (view === "images") return records;
    if (view === "scenes") return scenes;
    return holidays;
  }

  function scopedItems(view) {
    const source = dataForView(view);
    const owner = state.entity ? entityById.get(state.entity) : null;
    if (owner) {
      if (view === "works") return owner.workIds.map((id) => workById.get(id)).filter(Boolean);
      if (view === "images") return uniqueRecords(owner.recordIds);
      return source;
    }
    const collection = state.collection ? collectionById.get(state.collection) : null;
    if (collection) {
      if (view === "roles") return collection.entityIds.map((id) => entityById.get(id)).filter(Boolean);
      if (view === "works") return collection.workIds.map((id) => workById.get(id)).filter(Boolean);
      if (view === "images") return uniqueRecords(collection.recordIds);
    }
    return source;
  }

  function matches(item, query, type, rights) {
    const alternatives = QUERY_SYNONYMS.get(query) || [query];
    if (query && !alternatives.some((term) => item._search?.includes(term))) return false;
    if (type !== "全部" && !itemTags(item).includes(type)) return false;
    if (rights !== "全部" && !itemRights(item).includes(rights)) return false;
    return true;
  }

  function sortItems(items, sort) {
    return [...items].sort((a, b) => {
      if (sort === "title") return byLocale(itemTitle(a), itemTitle(b));
      if (sort === "year") return itemYear(a) - itemYear(b) || byLocale(itemTitle(a), itemTitle(b));
      if (sort === "awareness") return itemAwareness(b) - itemAwareness(a) || itemCount(b) - itemCount(a) || byLocale(itemTitle(a), itemTitle(b));
      return itemCount(b) - itemCount(a) || itemAwareness(b) - itemAwareness(a) || byLocale(itemTitle(a), itemTitle(b));
    });
  }

  function filteredItems(view = state.view, options = {}) {
    const query = normalize(options.q ?? state.q);
    const type = options.type ?? state.type;
    const rights = options.rights ?? state.rights;
    const source = options.unscoped ? dataForView(view) : scopedItems(view);
    return sortItems(source.filter((item) => matches(item, query, type, rights)), state.sort);
  }

  function writeQuery(replace = false) {
    const params = new URLSearchParams();
    if (state.view !== "roles") params.set("view", state.view);
    if (state.q) params.set("q", state.q);
    if (state.type !== "全部") params.set("type", state.type);
    if (state.rights !== "全部") params.set("rights", state.rights);
    if (state.sort !== "count") params.set("sort", state.sort);
    if (state.entity) params.set("entity", state.entity);
    if (state.collection) params.set("collection", state.collection);
    if (state.page > 1) params.set("page", String(state.page));
    const query = params.toString();
    const url = `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
    history[replace ? "replaceState" : "pushState"](null, "", url);
  }

  function setState(patch, options = {}) {
    if (location.hash) {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
      backgroundHash = "";
    }
    state = { ...state, ...patch };
    if (!Object.prototype.hasOwnProperty.call(patch, "page")) state.page = 1;
    writeQuery(options.replace === true);
    renderBrowser();
  }

  function facetButton(label, count, active, onClick, inline = false) {
    const buttonNode = makeButton("", `facet-button${inline ? " facet-button--inline" : ""}${active ? " is-active" : ""}`, onClick);
    buttonNode.append(el("span", "", label), el("span", "facet-count", count));
    return buttonNode;
  }

  function renderViewFacets() {
    dom.desktopViews.replaceChildren();
    dom.mobileViews.replaceChildren();
    for (const view of VIEW_ORDER) {
      const count = dataForView(view).length;
      const activate = () => setState({ view, entity: "", collection: "" });
      dom.desktopViews.append(facetButton(VIEW_CONFIG[view].label, count, state.view === view, activate));
      dom.mobileViews.append(facetButton(VIEW_CONFIG[view].short, count, state.view === view, activate, true));
    }
  }

  function countWith(next) {
    const query = normalize(state.q);
    return scopedItems(state.view).filter((item) => matches(
      item,
      query,
      next.type ?? state.type,
      next.rights ?? state.rights,
    )).length;
  }

  function renderTagFacets() {
    dom.desktopTags.replaceChildren();
    dom.mobileTags.replaceChildren();
    const sourceTags = compact(dataForView(state.view).flatMap(itemTags));
    const ordered = [
      "全部",
      ...TAG_ORDER.filter((tag) => tag !== "全部" && sourceTags.includes(tag)),
      ...sourceTags.filter((tag) => !TAG_ORDER.includes(tag)).sort(byLocale),
    ];
    for (const tag of ordered) {
      const count = countWith({ type: tag });
      if (tag !== "全部" && count === 0) continue;
      const activate = () => setState({ type: tag });
      dom.desktopTags.append(facetButton(tag, count, state.type === tag, activate));
      dom.mobileTags.append(facetButton(tag, count, state.type === tag, activate, true));
    }
  }

  function renderRightsFacets() {
    dom.desktopRights.replaceChildren();
    const sourceRights = compact(dataForView(state.view).flatMap(itemRights));
    const ordered = [
      "全部",
      ...RIGHTS_ORDER.filter((right) => right !== "全部" && sourceRights.includes(right)),
      ...sourceRights.filter((right) => !RIGHTS_ORDER.includes(right)).sort(byLocale),
    ];
    dom.rights.replaceChildren();
    for (const right of ordered) {
      const count = countWith({ rights: right });
      if (right !== "全部" && count === 0) continue;
      dom.desktopRights.append(facetButton(right, count, state.rights === right, () => setState({ rights: right })));
      const option = el("option", "", right === "全部" ? "全部版权路径" : `${right} · ${count}`);
      option.value = right;
      option.selected = state.rights === right;
      dom.rights.append(option);
    }
  }

  function renderSearchGroups() {
    const query = normalize(state.q);
    dom.searchGroups.replaceChildren();
    dom.searchGroups.hidden = !query;
    if (!query) return;
    for (const view of VIEW_ORDER) {
      const count = filteredItems(view, { q: state.q, unscoped: true }).length;
      dom.searchGroups.append(facetButton(VIEW_CONFIG[view].short, count, state.view === view, () => setState({ view, entity: "", collection: "" }), true));
    }
  }

  function cardMedia(images, label, kind) {
    const media = el("span", `art-card__media${images.length > 1 ? " art-card__media--mosaic" : ""}`);
    for (const src of images.slice(0, 4)) media.append(imageNode(src, label));
    media.append(el("span", "art-card__kind", kind));
    return media;
  }

  function cardShell({ title, kind, images, facts, meta, onClick }) {
    const card = makeButton("", "art-card", onClick);
    card.setAttribute("aria-label", `打开 ${title}`);
    card.append(cardMedia(images.filter(Boolean), title, kind));
    const body = el("span", "art-card__body");
    body.append(el("span", "art-card__title", title));
    if (facts) body.append(el("span", "art-card__facts", facts));
    const metaRow = el("span", "art-card__meta");
    metaRow.append(el("span", "", meta[0] || ""), el("span", "rights-dot"), el("span", "", meta[1] || ""));
    body.append(metaRow);
    card.append(body);
    return card;
  }

  function entityCard(entity) {
    return cardShell({
      title: entity.name,
      kind: entity.type,
      images: [entity.coverImage],
      facts: `${entity.workCount} 作品 · ${entity.imageCount} 画面`,
      meta: [yearsText(entity), rightsText(entity)],
      onClick: () => goToRole(entity.id),
    });
  }

  function workCard(work) {
    const roles = work.entityIds.map((id) => entityById.get(id)?.name).filter(Boolean).slice(0, 3);
    return cardShell({
      title: work.title,
      kind: "作品",
      images: [work.coverImage],
      facts: roles.length ? roles.join(" · ") : (work.scenes || []).slice(0, 2).join(" · "),
      meta: [`${work.imageCount} 画面 · ${work.year || "年代待复核"}`, rightsText(work)],
      onClick: () => goToWork(work.id, state.entity),
    });
  }

  function recordCard(record) {
    const owners = worksByRecord.get(record.id) || [];
    const ownerTitle = record.subtitle || owners[0]?.title || "具体画面";
    return cardShell({
      title: record.title,
      kind: record.kind === "主档" ? "主图" : (record.kind || "画面"),
      images: [record.image],
      facts: ownerTitle,
      meta: [record.year || "年代待复核", record.rightsStatus || "权利待复核"],
      onClick: () => openImageRoute(record.id),
    });
  }

  function collectionCard(collection) {
    return cardShell({
      title: collection.name,
      kind: collection.type,
      images: collection.coverImages || [],
      facts: `${collection.workCount} 作品 · ${collection.imageCount} 画面`,
      meta: [collection.yearStart && collection.yearStart !== 9999 ? `始于 ${collection.yearStart}` : "年代待复核", rightsText(collection)],
      onClick: () => setState({ view: "images", q: "", type: "全部", rights: "全部", entity: "", collection: collection.id }),
    });
  }

  function renderCard(item) {
    if (state.view === "roles") return entityCard(item);
    if (state.view === "works") return workCard(item);
    if (state.view === "images") return recordCard(item);
    return collectionCard(item);
  }

  function resultTitle() {
    const owner = state.entity ? entityById.get(state.entity) : null;
    if (owner) return `${owner.name} · ${VIEW_CONFIG[state.view].label}`;
    const collection = state.collection ? collectionById.get(state.collection) : null;
    return collection ? `${collection.name} · ${VIEW_CONFIG[state.view].label}` : VIEW_CONFIG[state.view].label;
  }

  function renderBrowser() {
    showOnly(dom.browserView);
    const config = VIEW_CONFIG[state.view];
    dom.search.value = state.q;
    dom.search.placeholder = config.placeholder;
    dom.sort.value = state.sort;
    renderViewFacets();
    renderTagFacets();
    renderRightsFacets();
    renderSearchGroups();

    const items = filteredItems();
    const pages = Math.max(1, Math.ceil(items.length / config.pageSize));
    if (state.page > pages) {
      state.page = pages;
      writeQuery(true);
    }
    const start = (state.page - 1) * config.pageSize;
    const shown = items.slice(start, start + config.pageSize);

    dom.resultTitle.textContent = resultTitle();
    dom.resultCount.textContent = String(items.length);
    dom.pageStatus.textContent = items.length ? `${start + 1}–${Math.min(start + shown.length, items.length)}` : "";
    dom.grid.replaceChildren(...shown.map(renderCard));
    dom.empty.hidden = items.length > 0;
    dom.pager.hidden = items.length === 0;
    dom.pagerStatus.textContent = `${state.page} / ${pages}`;
    dom.prev.disabled = state.page <= 1;
    dom.next.disabled = state.page >= pages;
    document.title = `${resultTitle()}｜公版视觉灵感库`;
  }

  function showOnly(target) {
    dom.browserView.hidden = target !== dom.browserView;
    dom.entityPage.hidden = target !== dom.entityPage;
    dom.workPage.hidden = target !== dom.workPage;
  }

  function sectionHead(title, count) {
    const row = el("div", "profile-section__head");
    row.append(el("h2", "", title));
    if (count !== undefined) row.append(el("span", "section-count", count));
    return row;
  }

  function toolbar(backLabel, onBack, jsonHref) {
    const bar = el("nav", "profile-toolbar", "");
    bar.append(makeButton(`← ${backLabel}`, "btn btn--ghost btn--sm", onBack));
    const spacer = el("span", "profile-toolbar__spacer");
    bar.append(spacer, makeLink("Agent JSON", jsonHref, "btn btn--ghost btn--sm"));
    return bar;
  }

  function kpi(label, value) {
    const item = el("div", "kpi");
    item.append(el("div", "kpi__label", label), el("div", "kpi__value", value));
    return item;
  }

  function boundary(title, copy) {
    const item = el("article", "boundary-card");
    item.append(el("div", "boundary-card__label", title), el("p", "", displayCopy(copy)));
    return item;
  }

  function chip(label, onClick) {
    return makeButton(label, "chip", onClick);
  }

  function contextGroup(title, values, onClick) {
    if (!values.length) return null;
    const group = el("section", "context-group");
    group.append(el("h3", "", title));
    const row = el("div", "chip-row");
    for (const value of values) {
      const name = typeof value === "string" ? value : value.name;
      const count = typeof value === "string" ? "" : ` ${value.count}`;
      row.append(chip(`${name}${count}`, () => onClick(name)));
    }
    group.append(row);
    return group;
  }

  function goToRole(id) {
    backgroundHash = `#role/${encodeURIComponent(id)}`;
    location.hash = backgroundHash;
  }

  function goToWork(id, from = "") {
    const suffix = from ? `?from=${encodeURIComponent(from)}` : "";
    backgroundHash = `#work/${encodeURIComponent(id)}${suffix}`;
    location.hash = backgroundHash;
  }

  function openImageRoute(id) {
    backgroundHash = location.hash && !location.hash.startsWith("#image/") ? location.hash : "";
    location.hash = `#image/${encodeURIComponent(id)}`;
  }

  function renderWorkRow(work, entityId) {
    const row = el("article", "work-row");
    const openWork = () => goToWork(work.id, entityId);
    row.tabIndex = 0;
    row.setAttribute("role", "link");
    row.setAttribute("aria-label", `打开 ${work.title}`);
    row.addEventListener("click", openWork);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openWork();
      }
    });
    row.append(imageNode(work.coverImage, work.title));
    const copy = el("div", "work-row__copy");
    copy.append(el("h3", "", work.title));
    copy.append(el("p", "", `${work.year || "年代待复核"} · ${work.imageCount} 画面 · ${rightsText(work)}`));
    const characters = work.entityIds.map((id) => entityById.get(id)?.name).filter(Boolean).slice(0, 5);
    if (characters.length) copy.append(el("p", "work-row__characters", characters.join(" · ")));
    const action = makeButton("打开", "btn btn--secondary btn--sm", (event) => {
      event.stopPropagation();
      openWork();
    });
    row.append(copy, action);
    return row;
  }

  function renderEntityPage(entity) {
    showOnly(dom.entityPage);
    dom.entityPage.replaceChildren();
    dom.entityPage.append(toolbar("角色列表", () => {
      location.hash = "";
      setState({ view: "roles", entity: "", collection: "" });
    }, `data/entities/${entity.id}.json`));

    const hero = el("section", "profile-hero panel");
    const media = el("div", "profile-hero__media");
    media.append(imageNode(entity.coverImage, entity.name, "eager"));
    const copy = el("div", "profile-hero__copy");
    copy.append(el("div", "eyebrow", `${entity.type} · ${yearsText(entity)}`));
    copy.append(el("h1", "", entity.name));
    if (entity.aliases?.length) copy.append(el("p", "profile-aliases", `别名 / 版本名：${entity.aliases.join(" · ")}`));
    const badges = el("div", "badge-row");
    badges.append(rightsBadges(entity));
    copy.append(badges);
    const summary = el("p", "profile-summary", `${entity.workCount} 部作品，${entity.imageCount} 张画面。先选作品，再取具体版本。`);
    copy.append(summary);
    hero.append(media, copy);
    dom.entityPage.append(hero);

    const kpis = el("section", "profile-kpis kpis");
    kpis.append(
      kpi("作品", entity.workCount),
      kpi("画面", entity.imageCount),
      kpi("最早年代", entity.yearStart),
      kpi("来源", entity.sourceCount),
    );
    dom.entityPage.append(kpis);

    const bounds = el("section", "boundary-grid");
    bounds.append(boundary("可取", entity.usage), boundary("避开", entity.avoid));
    dom.entityPage.append(bounds);

    const entityWorks = entity.workIds.map((id) => workById.get(id)).filter(Boolean)
      .sort((a, b) => a.yearSort - b.yearSort || byLocale(a.title, b.title));
    const worksSection = el("section", "profile-section panel");
    worksSection.append(sectionHead("相关作品", entityWorks.length));
    const workList = el("div", "work-list");
    workList.append(...entityWorks.map((work) => renderWorkRow(work, entity.id)));
    worksSection.append(workList);
    dom.entityPage.append(worksSection);

    const contexts = el("section", "profile-section panel");
    contexts.append(sectionHead("艺术线索"));
    const groups = el("div", "context-groups");
    const sceneGroup = contextGroup("场景", (entity.topScenes || []).slice(0, 10), (name) => {
      location.hash = "";
      setState({ view: "images", q: name, type: "全部", rights: "全部", entity: "", collection: "" });
    });
    const styleGroup = contextGroup("风格", (entity.topStyles || []).slice(0, 10), (name) => {
      location.hash = "";
      setState({ view: "images", q: name, type: "全部", rights: "全部", entity: "", collection: "" });
    });
    const holidayGroup = contextGroup("节日", (entity.topHolidays || []).slice(0, 8), (name) => {
      location.hash = "";
      setState({ view: "holidays", q: name, type: "全部", rights: "全部", entity: "", collection: "" });
    });
    for (const group of [sceneGroup, styleGroup, holidayGroup]) if (group) groups.append(group);
    contexts.append(groups);
    dom.entityPage.append(contexts);

    const entityRecords = uniqueRecords(entity.recordIds);
    const imagesSection = el("section", "profile-section panel");
    imagesSection.append(sectionHead("相关画面", entityRecords.length));
    const thumbs = el("div", "profile-thumbs");
    for (const record of entityRecords.slice(0, 18)) {
      const buttonNode = makeButton("", "profile-thumb", () => openImageRoute(record.id));
      buttonNode.setAttribute("aria-label", `查看 ${record.title}`);
      buttonNode.append(imageNode(record.image, record.title));
      thumbs.append(buttonNode);
    }
    imagesSection.append(thumbs);
    if (entityRecords.length > 18) {
      const actions = el("div", "section-actions");
      actions.append(makeButton(`查看全部 ${entityRecords.length} 张`, "btn btn--secondary", () => {
        location.hash = "";
        setState({ view: "images", q: "", type: "全部", rights: "全部", entity: entity.id, collection: "" });
      }));
      imagesSection.append(actions);
    }
    dom.entityPage.append(imagesSection);

    const related = entity.relatedEntityIds.map((id) => entityById.get(id)).filter(Boolean);
    if (related.length) {
      const relatedSection = el("section", "profile-section panel");
      relatedSection.append(sectionHead("共同出现", related.length));
      const relatedGrid = el("div", "related-grid");
      for (const item of related) {
        const card = makeButton("", "related-card", () => goToRole(item.id));
        card.append(imageNode(item.coverImage, item.name));
        const cardCopy = el("span", "related-card__copy");
        cardCopy.append(el("strong", "", item.name), el("small", "", `${item.workCount} 作品 · ${item.imageCount} 画面`));
        card.append(cardCopy);
        relatedGrid.append(card);
      }
      relatedSection.append(relatedGrid);
      dom.entityPage.append(relatedSection);
    }
    document.title = `${entity.name}｜公版视觉灵感库`;
    dom.entityPage.scrollIntoView({ block: "start" });
  }

  function renderWorkPage(work, fromEntityId = "") {
    showOnly(dom.workPage);
    dom.workPage.replaceChildren();
    const fromEntity = entityById.get(fromEntityId);
    dom.workPage.append(toolbar(fromEntity ? fromEntity.name : "作品列表", () => {
      if (fromEntity) goToRole(fromEntity.id);
      else {
        location.hash = "";
        setState({ view: "works", entity: "", collection: "" });
      }
    }, `data/works/${work.id}.json`));

    const hero = el("section", "profile-hero panel");
    const media = el("div", "profile-hero__media");
    media.append(imageNode(work.coverImage, work.title, "eager"));
    const copy = el("div", "profile-hero__copy");
    copy.append(el("div", "eyebrow", `作品 · ${work.year || "年代待复核"}`));
    copy.append(el("h1", "", work.title));
    if (work.subtitle) copy.append(el("p", "profile-aliases", work.subtitle));
    const badges = el("div", "badge-row");
    badges.append(rightsBadges(work));
    copy.append(badges);
    const roles = work.entityIds.map((id) => entityById.get(id)).filter(Boolean);
    if (roles.length) {
      const chips = el("div", "chip-row");
      for (const role of roles.slice(0, 12)) chips.append(chip(role.name, () => goToRole(role.id)));
      copy.append(chips);
    }
    hero.append(media, copy);
    dom.workPage.append(hero);

    const kpis = el("section", "profile-kpis kpis");
    kpis.append(
      kpi("画面", work.imageCount),
      kpi("具体画面", work.frameCount),
      kpi("年代", work.year || "待复核"),
      kpi("角色 / 主体", work.entityIds.length),
    );
    dom.workPage.append(kpis);

    const bounds = el("section", "boundary-grid");
    bounds.append(boundary("可取", work.usage), boundary("避开", work.avoid));
    dom.workPage.append(bounds);

    const groupsSection = el("section", "profile-section panel");
    groupsSection.append(sectionHead("题材线索"));
    const groups = el("div", "context-groups");
    const sceneGroup = contextGroup("场景", (work.scenes || []).slice(0, 12), (name) => {
      location.hash = "";
      setState({ view: "images", q: name, type: "全部", rights: "全部", entity: "", collection: "" });
    });
    const styleGroup = contextGroup("风格", (work.styles || []).slice(0, 12), (name) => {
      location.hash = "";
      setState({ view: "images", q: name, type: "全部", rights: "全部", entity: "", collection: "" });
    });
    const motifGroup = contextGroup("图素", (work.motifs || []).slice(0, 12), (name) => {
      location.hash = "";
      setState({ view: "images", q: name, type: "全部", rights: "全部", entity: "", collection: "" });
    });
    const compositionGroup = contextGroup("构图", (work.compositions || []).slice(0, 12), (name) => {
      location.hash = "";
      setState({ view: "images", q: name, type: "全部", rights: "全部", entity: "", collection: "" });
    });
    const holidayGroup = contextGroup("节日", (work.holidays || []).slice(0, 8), (name) => {
      location.hash = "";
      setState({ view: "holidays", q: name, type: "全部", rights: "全部", entity: "", collection: "" });
    });
    for (const group of [motifGroup, compositionGroup, sceneGroup, styleGroup, holidayGroup]) if (group) groups.append(group);
    groupsSection.append(groups);
    dom.workPage.append(groupsSection);

    const workRecords = uniqueRecords(work.recordIds);
    const imagesSection = el("section", "profile-section panel");
    imagesSection.append(sectionHead("作品画面", workRecords.length));
    const grid = el("div", "art-grid art-grid--nested");
    grid.append(...workRecords.map(recordCard));
    imagesSection.append(grid);
    dom.workPage.append(imagesSection);

    if (work.sourceUrl) {
      const source = el("section", "source-line panel");
      source.append(el("span", "", `来源 · ${work.sourceLabel || "原始页面"}`));
      source.append(makeLink("打开来源", work.sourceUrl));
      dom.workPage.append(source);
    }
    document.title = `${work.title}｜公版视觉灵感库`;
    dom.workPage.scrollIntoView({ block: "start" });
  }

  function renderRelatedRoles(record) {
    dom.detailRelated.replaceChildren();
    const ownerWorks = worksByRecord.get(record.id) || [];
    const ownerRoleIds = compact(ownerWorks.flatMap((work) => work.entityIds || []));
    const exactNames = new Set((record.characters || []).map(normalize));
    const exactRoleIds = ownerRoleIds.filter((id) => {
      const entity = entityById.get(id);
      return entity && [entity.name, ...(entity.aliases || [])].some((name) => exactNames.has(normalize(name)));
    });
    const roleIds = exactRoleIds.length ? exactRoleIds : ownerRoleIds;
    if (!roleIds.length) return;
    dom.detailRelated.append(el("div", "detail-related__label", "角色 / 主体"));
    const row = el("div", "chip-row");
    for (const id of roleIds.slice(0, 10)) {
      const entity = entityById.get(id);
      if (entity) row.append(chip(entity.name, () => {
        suppressDialogClose = true;
        dom.dialog.close();
        suppressDialogClose = false;
        goToRole(entity.id);
      }));
    }
    dom.detailRelated.append(row);
  }

  function openDialog(record) {
    currentDetail = record;
    dom.detailImage.hidden = false;
    dom.detailImage.src = record.image;
    dom.detailImage.alt = record.title;
    dom.detailKind.textContent = record.kind === "主档" ? "主图" : (record.kind || "画面");
    dom.detailTitle.textContent = record.title;
    dom.detailSubtitle.textContent = record.subtitle || `${record.year || "年代待复核"}`;
    dom.detailBadges.replaceChildren();
    dom.detailBadges.append(rightsBadges(record));
    dom.detailUsage.textContent = record.usage || "待复核";
    dom.detailAvoid.textContent = record.avoid || "待复核";
    dom.detailContext.textContent = compact([
      ...(record.characters || []), ...(record.scenes || []), ...(record.styles || []), ...(record.holidays || []),
      ...(record.motifs || []), ...(record.actions || []), ...(record.compositions || []), ...(record.productionUses || []),
    ]).join(" · ") || "待复核";
    dom.detailEvidence.textContent = compact([
      record.evidenceLevel ? `等级 ${record.evidenceLevel}` : "",
      record.copyrightRoute,
      record.imageRights,
    ]).join(" · ") || "待复核";
    renderRelatedRoles(record);
    dom.detailSource.hidden = !record.sourceUrl;
    if (record.sourceUrl) dom.detailSource.href = record.sourceUrl;
    if (!dom.dialog.open) dom.dialog.showModal();
  }

  function routeInfo() {
    const raw = location.hash.replace(/^#/, "");
    if (!raw) return { kind: "browser", id: "", params: new URLSearchParams() };
    const [path, query = ""] = raw.split("?");
    const [kind, encodedId = ""] = path.split("/");
    return { kind, id: decodeURIComponent(encodedId), params: new URLSearchParams(query) };
  }

  function route() {
    const info = routeInfo();
    if (info.kind !== "image" && dom.dialog.open) {
      suppressDialogClose = true;
      dom.dialog.close();
      suppressDialogClose = false;
    }
    if (info.kind === "role") {
      const entity = entityById.get(info.id);
      if (entity) {
        backgroundHash = location.hash;
        renderEntityPage(entity);
        return;
      }
    }
    if (info.kind === "work") {
      const work = workById.get(info.id);
      if (work) {
        backgroundHash = location.hash;
        renderWorkPage(work, info.params.get("from") || "");
        return;
      }
    }
    if (info.kind === "image") {
      const record = recordById.get(info.id);
      if (record) {
        openDialog(record);
        return;
      }
    }
    renderBrowser();
  }

  async function copyText(text, control) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = el("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.className = "sr-only";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    if (control) {
      const previous = control.textContent;
      control.textContent = "已复制";
      window.setTimeout(() => { control.textContent = previous; }, 1200);
    }
  }

  function copyUrl(control) {
    return copyText(location.href, control);
  }

  function resetFilters() {
    setState({ q: "", type: "全部", rights: "全部", sort: "count", entity: "", collection: "", page: 1 });
  }

  dom.topMeta.textContent = `${entities.length} 主体 · ${works.length} 作品 · ${records.length} 画面`;
  dom.search.addEventListener("input", () => setState({ q: dom.search.value }, { replace: true }));
  dom.rights.addEventListener("change", () => setState({ rights: dom.rights.value }));
  dom.sort.addEventListener("change", () => setState({ sort: dom.sort.value }));
  dom.reset.addEventListener("click", resetFilters);
  dom.emptyReset.addEventListener("click", resetFilters);
  dom.prev.addEventListener("click", () => setState({ page: Math.max(1, state.page - 1) }));
  dom.next.addEventListener("click", () => setState({ page: state.page + 1 }));
  dom.copyFilter.addEventListener("click", (event) => copyUrl(event.currentTarget));
  dom.copyItem.addEventListener("click", (event) => {
    if (!currentDetail) return;
    copyText([
      currentDetail.title,
      currentDetail.subtitle,
      currentDetail.year,
      currentDetail.rightsStatus,
      currentDetail.copyrightRoute,
      currentDetail.sourceUrl,
    ].filter(Boolean).join("\n"), event.currentTarget);
  });
  dom.dialog.addEventListener("close", () => {
    if (suppressDialogClose) return;
    const info = routeInfo();
    if (info.kind !== "image") return;
    const target = backgroundHash && !backgroundHash.startsWith("#image/") ? backgroundHash : "";
    history.replaceState(null, "", `${location.pathname}${location.search}${target}`);
    route();
  });
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", () => {
    state = currentParams();
    route();
  });

  if (!records.length || !entities.length || !works.length) {
    dom.grid.replaceChildren();
    dom.empty.hidden = false;
    dom.empty.querySelector(".empty__title").textContent = "关系数据未载入";
    dom.empty.querySelector(".dim").textContent = "请确认 data/catalog.js 与 data/relations.js 可访问。";
    dom.pager.hidden = true;
    return;
  }

  renderBrowser();
  route();
})();
