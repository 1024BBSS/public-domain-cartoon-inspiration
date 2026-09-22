(() => {
  "use strict";

  const dataset = window.MEME_LIBRARY_DATA;
  if (!dataset?.records?.length) {
    document.body.textContent = "美国 Meme 图谱数据载入失败。";
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const dom = {
    topMeta: $("#top-meta"),
    search: $("#search"),
    categorySelect: $("#category-select"),
    subcategorySelect: $("#subcategory-select"),
    rightsSelect: $("#rights-select"),
    scenarioSelect: $("#scenario-select"),
    sortSelect: $("#sort-select"),
    reset: $("#reset"),
    emptyReset: $("#empty-reset"),
    copyPage: $("#copy-page"),
    categoryFacets: $("#category-facets"),
    rightsFacets: $("#rights-facets"),
    viewTabs: $("#view-tabs"),
    viewNote: $("#view-note"),
    categoryTabs: $("#category-tabs"),
    subcategoryStep: $("#subcategory-step"),
    subcategoryTabs: $("#subcategory-tabs"),
    quickTabs: $("#quick-tabs"),
    metricAll: $("#metric-all"),
    metricSignals: $("#metric-signals"),
    metricPd: $("#metric-pd"),
    metricLinked: $("#metric-linked"),
    resultTitle: $("#result-title"),
    resultCount: $("#result-count"),
    pageStatus: $("#page-status"),
    memeList: $("#meme-list"),
    sourceList: $("#source-list"),
    empty: $("#empty-state"),
    loadMoreBar: $("#load-more-bar"),
    loadMore: $("#load-more"),
    loadMoreStatus: $("#load-more-status"),
    detailDialog: $("#detail-dialog"),
    detailKind: $("#detail-kind"),
    detailTitle: $("#detail-title"),
    detailSubtitle: $("#detail-subtitle"),
    detailImage: $("#detail-image"),
    detailBadges: $("#detail-badges"),
    detailMechanic: $("#detail-mechanic"),
    detailUseCases: $("#detail-use-cases"),
    detailSlots: $("#detail-slots"),
    detailActivity: $("#detail-activity"),
    detailAgentPattern: $("#detail-agent-pattern"),
    detailProduction: $("#detail-production"),
    detailOrigin: $("#detail-origin"),
    detailRelated: $("#detail-related"),
    detailCopyright: $("#detail-copyright"),
    detailPublicity: $("#detail-publicity"),
    detailTrademark: $("#detail-trademark"),
    detailVariants: $("#detail-variants"),
    detailSource: $("#detail-source"),
    detailSuperIp: $("#detail-super-ip"),
    detailVisual: $("#detail-visual"),
    copyBrief: $("#copy-brief"),
    sourceDialog: $("#source-dialog"),
    sourceKind: $("#source-kind"),
    sourceTitle: $("#source-title"),
    sourceSubtitle: $("#source-subtitle"),
    sourceSummary: $("#source-summary"),
    sourceFamilyList: $("#source-family-list"),
    sourceSuperIp: $("#source-super-ip"),
    copySource: $("#copy-source"),
  };

  const BATCH_SIZE = 36;
  const GENERIC_SOURCES = new Set(["互联网 Meme 文化", "Rage comics / web characters"]);
  const categoryOrder = [
    "电影 / 电视",
    "名人 / 音乐",
    "政治 / 公共事件",
    "体育 / 赛事",
    "游戏 / 动漫",
    "动物 / 表情",
    "文字 / 对话结构",
    "互联网原生",
    "经典艺术 / 公版",
  ];
  const rightsOrder = [
    "公版具体版本",
    "影视 / 角色需授权",
    "版权 + 肖像需核验",
    "创作者版权需核验",
    "原图权利待核验",
  ];

  function normalize(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function makeOption(value, label = value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function makeImage(src, alt, className = "") {
    const image = new Image();
    image.loading = "lazy";
    image.decoding = "async";
    image.src = src;
    image.alt = alt;
    if (className) image.className = className;
    image.addEventListener("error", () => {
      image.hidden = true;
      image.parentElement?.classList.add("is-missing");
    }, { once: true });
    return image;
  }

  const records = dataset.records.map((record) => ({
    ...record,
    _search: normalize([
      record.searchText,
      record.name,
      ...(record.aliases || []),
      record.category,
      record.subcategory,
      record.originEntity,
      record.originWork,
      record.mechanic,
      ...(record.useCases || []),
      record.rightsLane,
    ].join(" ")),
  }));
  const recordById = new Map(records.map((record) => [record.id, record]));
  const categories = [
    ...categoryOrder.filter((category) => records.some((record) => record.category === category)),
    ...unique(records.map((record) => record.category)).filter((category) => !categoryOrder.includes(category)),
  ];
  const rightsLanes = [
    ...rightsOrder.filter((right) => records.some((record) => record.rightsLane === right)),
    ...unique(records.map((record) => record.rightsLane)).filter((right) => !rightsOrder.includes(right)),
  ];
  const scenarios = unique(records.flatMap((record) => record.useCases || [])).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const quickOptions = [
    { key: "全部", label: "全部", test: () => true },
    { key: "当前榜", label: "当前模板榜", test: (record) => Number.isFinite(record.currentTemplateRank) },
    { key: "公版", label: "具体公版底图", test: (record) => record.rightsLane === "公版具体版本" },
    { key: "关联IP", label: "关联超级 IP", test: (record) => Boolean(record.relatedSuperIp) },
    { key: "多槽位", label: "3+ 文字槽位", test: (record) => Number(record.slots) >= 3 },
  ];

  let state = readState();
  let currentItem = null;
  let currentSource = null;
  let suppressDetailClose = false;
  let suppressSourceClose = false;

  function readState() {
    const params = new URLSearchParams(location.search);
    const requestedCategory = params.get("category");
    const category = categories.includes(requestedCategory) ? requestedCategory : "全部";
    const subcategories = subcategoriesFor(category).map(([name]) => name);
    const requestedSubcategory = params.get("subcategory");
    return {
      view: params.get("view") === "sources" ? "sources" : "families",
      q: params.get("q") || "",
      category,
      subcategory: subcategories.includes(requestedSubcategory) ? requestedSubcategory : "全部",
      rights: rightsLanes.includes(params.get("rights")) ? params.get("rights") : "全部",
      scenario: scenarios.includes(params.get("scenario")) ? params.get("scenario") : "全部",
      quick: quickOptions.some((option) => option.key === params.get("quick")) ? params.get("quick") : "全部",
      sort: ["activity", "awareness", "category", "name"].includes(params.get("sort")) ? params.get("sort") : "activity",
      visible: Math.max(1, Number(params.get("page")) || 1) * BATCH_SIZE,
      item: params.get("item") || "",
      entity: params.get("entity") || "",
    };
  }

  function subcategoriesFor(category) {
    if (category === "全部") return [];
    const counts = new Map();
    for (const record of records) {
      if (record.category !== category) continue;
      counts.set(record.subcategory, (counts.get(record.subcategory) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
  }

  function writeState(replace = false) {
    const params = new URLSearchParams();
    if (state.view !== "families") params.set("view", state.view);
    if (state.q) params.set("q", state.q);
    if (state.category !== "全部") params.set("category", state.category);
    if (state.subcategory !== "全部") params.set("subcategory", state.subcategory);
    if (state.rights !== "全部") params.set("rights", state.rights);
    if (state.scenario !== "全部") params.set("scenario", state.scenario);
    if (state.quick !== "全部") params.set("quick", state.quick);
    if (state.sort !== "activity") params.set("sort", state.sort);
    if (state.visible > BATCH_SIZE) params.set("page", String(Math.ceil(state.visible / BATCH_SIZE)));
    if (state.item) params.set("item", state.item);
    if (state.entity) params.set("entity", state.entity);
    const query = params.toString();
    history[replace ? "replaceState" : "pushState"](null, "", `${location.pathname}${query ? `?${query}` : ""}`);
  }

  function setState(patch, options = {}) {
    const categoryChanged = Object.prototype.hasOwnProperty.call(patch, "category") && patch.category !== state.category;
    state = { ...state, ...patch };
    if (categoryChanged && !Object.prototype.hasOwnProperty.call(patch, "subcategory")) state.subcategory = "全部";
    if (!Object.prototype.hasOwnProperty.call(patch, "visible")) state.visible = BATCH_SIZE;
    writeState(options.replace === true);
    render();
  }

  function quickOption() {
    return quickOptions.find((option) => option.key === state.quick) || quickOptions[0];
  }

  function filteredRecords() {
    const query = normalize(state.q);
    const quick = quickOption();
    const filtered = records.filter((record) => {
      if (query && !record._search.includes(query)) return false;
      if (state.category !== "全部" && record.category !== state.category) return false;
      if (state.subcategory !== "全部" && record.subcategory !== state.subcategory) return false;
      if (state.rights !== "全部" && record.rightsLane !== state.rights) return false;
      if (state.scenario !== "全部" && !(record.useCases || []).includes(state.scenario)) return false;
      return quick.test(record);
    });
    return sortRecords(filtered);
  }

  function sortRecords(items) {
    return [...items].sort((a, b) => {
      if (state.sort === "name") return a.name.localeCompare(b.name, "en");
      if (state.sort === "category") return a.category.localeCompare(b.category, "zh-CN") || a.subcategory.localeCompare(b.subcategory, "zh-CN") || a.name.localeCompare(b.name, "en");
      if (state.sort === "awareness") return Number(b.relatedSuperIp?.surveyFamePercent || 0) - Number(a.relatedSuperIp?.surveyFamePercent || 0) || b.activityScore - a.activityScore || a.name.localeCompare(b.name, "en");
      return b.activityScore - a.activityScore || Number(a.currentTemplateRank || 9999) - Number(b.currentTemplateRank || 9999) || a.name.localeCompare(b.name, "en");
    });
  }

  function sourceGroupKey(record) {
    if (!record.originEntity || GENERIC_SOURCES.has(record.originEntity)) return `未归并来源｜${record.name}`;
    return record.originEntity;
  }

  function groupSources(items) {
    const groups = new Map();
    for (const record of items) {
      const key = sourceGroupKey(record);
      if (!groups.has(key)) groups.set(key, { key, name: key.startsWith("未归并来源｜") ? record.name : key, records: [] });
      groups.get(key).records.push(record);
    }
    const result = [...groups.values()].map((group) => {
      group.records = sortRecords(group.records);
      group.categories = unique(group.records.map((record) => record.category));
      group.works = unique(group.records.map((record) => record.originWork).filter((work) => work && work !== "互联网原生模板"));
      group.currentCount = group.records.filter((record) => Number.isFinite(record.currentTemplateRank)).length;
      group.publicDomainCount = group.records.filter((record) => record.rightsLane === "公版具体版本").length;
      group.relatedSuperIp = group.records.map((record) => record.relatedSuperIp).filter(Boolean).sort((a, b) => Number(b.surveyFamePercent || 0) - Number(a.surveyFamePercent || 0))[0] || null;
      group.score = Math.max(...group.records.map((record) => record.activityScore || 0));
      return group;
    });
    return result.sort((a, b) => {
      if (state.sort === "name") return a.name.localeCompare(b.name, "en");
      if (state.sort === "awareness") return Number(b.relatedSuperIp?.surveyFamePercent || 0) - Number(a.relatedSuperIp?.surveyFamePercent || 0) || b.records.length - a.records.length;
      if (state.sort === "category") return a.categories.join(" ").localeCompare(b.categories.join(" "), "zh-CN") || a.name.localeCompare(b.name, "en");
      return b.score - a.score || b.records.length - a.records.length || a.name.localeCompare(b.name, "en");
    });
  }

  function countBy(items, key) {
    const counts = new Map();
    for (const item of items) counts.set(item[key], (counts.get(item[key]) || 0) + 1);
    return counts;
  }

  function facetButton(label, count, active, onClick) {
    const button = el("button", `facet-button${active ? " is-active" : ""}`);
    button.type = "button";
    button.append(el("span", "", label), el("span", "facet-count", count));
    button.addEventListener("click", onClick);
    return button;
  }

  function taxonomyButton(label, count, active, onClick) {
    const button = el("button", `taxonomy-option${active ? " is-active" : ""}`);
    button.type = "button";
    button.append(el("span", "", label), el("span", "taxonomy-option__count", count));
    button.addEventListener("click", onClick);
    return button;
  }

  function renderControls() {
    dom.search.value = state.q;
    dom.categorySelect.replaceChildren(makeOption("全部", "全部来源类型"), ...categories.map((category) => makeOption(category)));
    dom.categorySelect.value = state.category;

    const subcategories = subcategoriesFor(state.category);
    dom.subcategorySelect.replaceChildren(makeOption("全部", "全部子分类"), ...subcategories.map(([name, count]) => makeOption(name, `${name} · ${count}`)));
    dom.subcategorySelect.value = state.subcategory;
    dom.subcategorySelect.disabled = state.category === "全部";

    dom.rightsSelect.replaceChildren(makeOption("全部", "全部权利入口"), ...rightsLanes.map((right) => makeOption(right)));
    dom.rightsSelect.value = state.rights;
    dom.scenarioSelect.replaceChildren(makeOption("全部", "全部使用场景"), ...scenarios.map((scenario) => makeOption(scenario)));
    dom.scenarioSelect.value = state.scenario;
    dom.sortSelect.value = state.sort;

    const categoryCounts = countBy(records, "category");
    dom.categoryFacets.replaceChildren(
      facetButton("全部", records.length, state.category === "全部", () => setState({ category: "全部", subcategory: "全部" })),
      ...categories.map((category) => facetButton(category, categoryCounts.get(category) || 0, state.category === category, () => setState({ category }))),
    );
    const rightsCounts = countBy(records, "rightsLane");
    dom.rightsFacets.replaceChildren(
      facetButton("全部", records.length, state.rights === "全部", () => setState({ rights: "全部" })),
      ...rightsLanes.map((right) => facetButton(right, rightsCounts.get(right) || 0, state.rights === right, () => setState({ rights: right }))),
    );

    dom.categoryTabs.replaceChildren(
      taxonomyButton("全部", records.length, state.category === "全部", () => setState({ category: "全部", subcategory: "全部" })),
      ...categories.map((category) => taxonomyButton(category, categoryCounts.get(category) || 0, state.category === category, () => setState({ category }))),
    );
    dom.subcategoryStep.hidden = state.category === "全部";
    if (state.category !== "全部") {
      const total = categoryCounts.get(state.category) || 0;
      dom.subcategoryTabs.replaceChildren(
        taxonomyButton("全部", total, state.subcategory === "全部", () => setState({ subcategory: "全部" })),
        ...subcategories.map(([name, count]) => taxonomyButton(name, count, state.subcategory === name, () => setState({ subcategory: name }))),
      );
    }

    const quickCounts = new Map(quickOptions.map((option) => [option.key, records.filter(option.test).length]));
    dom.quickTabs.replaceChildren(...quickOptions.map((option) => {
      const button = el("button", `quick-tab${state.quick === option.key ? " is-active" : ""}`);
      button.type = "button";
      button.textContent = `${option.label} ${quickCounts.get(option.key)}`;
      button.addEventListener("click", () => setState({ quick: option.key }));
      return button;
    }));

    [...dom.viewTabs.querySelectorAll("[data-view]")].forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === state.view);
    });
    dom.viewNote.textContent = state.view === "families" ? "先找表达结构，再看来源和权利。" : "点一个人物或作品，集中查看全部关联画面。";
  }

  function rightsBadgeClass(rights) {
    if (rights === "公版具体版本") return "card-badge card-badge--ok";
    if (rights.includes("授权") || rights.includes("肖像") || rights.includes("创作者")) return "card-badge card-badge--warn";
    return "card-badge";
  }

  function compactRights(rights) {
    const labels = {
      "公版具体版本": "具体公版",
      "影视 / 角色需授权": "影视 / 角色授权",
      "版权 + 肖像需核验": "版权 + 肖像",
      "创作者版权需核验": "创作者权利",
      "原图权利待核验": "原图待核验",
    };
    return labels[rights] || rights;
  }

  function memeCard(record) {
    const button = el("button", "meme-card");
    button.type = "button";
    button.dataset.id = record.id;
    button.setAttribute("aria-label", `查看 ${record.name}`);

    const media = el("div", "meme-card__media");
    media.append(makeImage(record.image, record.name));
    const mediaBadges = el("div", "media-badges");
    const signal = Number.isFinite(record.currentTemplateRank)
      ? el("span", "card-badge", `模板榜 #${record.currentTemplateRank}`)
      : el("span", record.rightsLane === "公版具体版本" ? "card-badge card-badge--ok" : "card-badge", record.activityLabel);
    mediaBadges.append(signal, el("span", rightsBadgeClass(record.rightsLane), compactRights(record.rightsLane)));
    media.append(mediaBadges);

    const body = el("div", "meme-card__body");
    body.append(
      el("div", "meme-card__path", `${record.category} · ${record.subcategory}`),
      el("h2", "meme-card__title", record.name),
      el("div", "meme-card__origin", `${record.originEntity}${record.originWork && record.originWork !== record.originEntity ? ` · ${record.originWork}` : ""}`),
      el("p", "meme-card__mechanic", record.mechanic),
    );
    const foot = el("div", "meme-card__foot");
    const cues = el("div", "cue-list");
    (record.useCases || []).slice(0, 2).forEach((cue) => cues.append(el("span", "cue", cue)));
    foot.append(cues, el("span", "slot-count", `${record.slots} 槽`));
    body.append(foot);
    button.append(media, body);
    button.addEventListener("click", () => openDetail(record));
    return button;
  }

  function sourceCard(group) {
    const button = el("button", "source-card");
    button.type = "button";
    button.setAttribute("aria-label", `查看 ${group.name} 的 Meme 家族`);
    const images = unique(group.records.map((record) => record.image)).slice(0, 4);
    const mosaic = el("div", `source-card__mosaic source-card__mosaic--${images.length}`);
    images.forEach((src, index) => mosaic.append(makeImage(src, `${group.name} ${index + 1}`)));
    const body = el("div", "source-card__body");
    body.append(
      el("div", "source-card__path", group.categories.join(" · ")),
      el("h2", "source-card__title", group.name),
      el("div", "source-card__works", group.works.length ? group.works.slice(0, 3).join(" · ") : group.records.slice(0, 3).map((record) => record.name).join(" · ")),
    );
    const foot = el("div", "source-card__foot");
    const status = group.relatedSuperIp?.surveyFamePercent
      ? `来源认知 ${group.relatedSuperIp.surveyFamePercent}%`
      : group.currentCount
        ? `${group.currentCount} 条当前信号`
        : group.publicDomainCount
          ? `${group.publicDomainCount} 条具体公版`
          : "研究来源";
    foot.append(el("span", "source-count", `${group.records.length} 个家族`), el("span", "cue", status));
    body.append(foot);
    button.append(mosaic, body);
    button.addEventListener("click", () => openSource(group));
    return button;
  }

  function renderResults() {
    const filtered = filteredRecords();
    const groups = state.view === "sources" ? groupSources(filtered) : [];
    const source = state.view === "families" ? filtered : groups;
    const shown = source.slice(0, state.visible);
    dom.memeList.hidden = state.view !== "families";
    dom.sourceList.hidden = state.view !== "sources";
    if (state.view === "families") {
      dom.memeList.replaceChildren(...shown.map(memeCard));
      dom.sourceList.replaceChildren();
    } else {
      dom.sourceList.replaceChildren(...shown.map(sourceCard));
      dom.memeList.replaceChildren();
    }
    dom.resultTitle.textContent = state.view === "families" ? "Meme 家族" : "来源人物 / 作品";
    dom.resultCount.textContent = String(source.length);
    dom.pageStatus.textContent = source.length ? `已显示 ${Math.min(shown.length, source.length)} / ${source.length}` : "";
    dom.empty.hidden = source.length > 0;
    dom.loadMoreBar.hidden = source.length === 0;
    dom.loadMore.hidden = shown.length >= source.length;
    dom.loadMoreStatus.textContent = shown.length >= source.length ? "已到底" : `还有 ${source.length - shown.length}`;
  }

  function renderMetrics() {
    dom.topMeta.textContent = `${dataset.counts.records} 家族 · ${dataset.counts.publicDomain} 公版底图`;
    dom.metricAll.textContent = dataset.counts.records.toLocaleString("en-US");
    dom.metricSignals.textContent = dataset.counts.currentSignals.toLocaleString("en-US");
    dom.metricPd.textContent = dataset.counts.publicDomain.toLocaleString("en-US");
    dom.metricLinked.textContent = dataset.counts.linkedSuperIp.toLocaleString("en-US");
  }

  function badge(text, modifier = "") {
    return el("span", `badge${modifier ? ` ${modifier}` : ""}`, text);
  }

  function populateDetail(record) {
    currentItem = record;
    dom.detailKind.textContent = `${record.category} · ${record.subcategory}`;
    dom.detailTitle.textContent = record.name;
    dom.detailSubtitle.textContent = `${record.originEntity} · ${record.originWork || "来源作品待复核"}`;
    dom.detailImage.hidden = false;
    dom.detailImage.parentElement.classList.remove("is-missing");
    dom.detailImage.src = record.image;
    dom.detailImage.alt = `${record.name} 研究参考图`;
    dom.detailImage.onerror = () => {
      dom.detailImage.hidden = true;
      dom.detailImage.parentElement.classList.add("is-missing");
    };
    const activityBadge = Number.isFinite(record.currentTemplateRank)
      ? badge(`模板榜 #${record.currentTemplateRank}`)
      : badge(record.activityLabel);
    const rightsModifier = record.rightsLane === "公版具体版本" ? "badge--ok" : record.rightsLane.includes("授权") || record.rightsLane.includes("肖像") || record.rightsLane.includes("创作者") ? "badge--warn" : "";
    const awarenessBadge = record.relatedSuperIp?.surveyFamePercent ? badge(`来源认知 ${record.relatedSuperIp.surveyFamePercent}%`) : null;
    dom.detailBadges.replaceChildren(badge(record.rightsLane, rightsModifier), activityBadge, badge(`证据 ${record.evidenceLevel}`), ...(awarenessBadge ? [awarenessBadge] : []));
    dom.detailMechanic.textContent = record.mechanic;
    dom.detailUseCases.textContent = (record.useCases || []).join(" · ") || "待补";
    dom.detailSlots.textContent = `${record.slots} 个；用于描述信息结构，不代表可直接复制画面。`;
    dom.detailActivity.textContent = record.activityEvidence;
    dom.detailAgentPattern.textContent = record.agentPattern;
    dom.detailProduction.textContent = record.productionRoute;
    dom.detailOrigin.textContent = `${record.originEntity}；${record.originWork || "来源作品待复核"}。收录目录：${(record.providers || []).join("、") || "本地公版视觉库"}。`;
    dom.detailRelated.textContent = record.relatedSuperIp
      ? `关联超级 IP：${record.relatedSuperIp.nameZh || record.relatedSuperIp.name}；${record.relatedSuperIp.usTier}${record.relatedSuperIp.surveyFamePercent ? `；美国来源认知 ${record.relatedSuperIp.surveyFamePercent}%` : ""}。此数只属于来源人物 / 作品。`
      : "关联超级 IP：待补美国同口径知名度证据。";
    dom.detailCopyright.textContent = record.copyrightNote;
    dom.detailPublicity.textContent = record.publicityNote;
    dom.detailTrademark.textContent = record.trademarkNote;
    const variants = record.variants?.length
      ? record.variants
      : [{ provider: (record.providers || ["来源"])[0], name: record.name, sourceUrl: record.sourceUrl, rank: null, captions: null }];
    dom.detailVariants.replaceChildren(...variants.map((variant) => {
      const link = el("a", "variant-item");
      link.href = variant.sourceUrl || record.sourceUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      const signal = Number.isFinite(variant.rank) ? `榜 #${variant.rank}${variant.captions ? ` · ${Number(variant.captions).toLocaleString("en-US")} captions` : ""}` : "目录记录";
      link.append(el("strong", "", variant.name), el("small", "", `${variant.provider} · ${signal}`));
      return link;
    }));
    dom.detailSource.href = record.sourceUrl;
    dom.detailSuperIp.hidden = !record.relatedSuperIp;
    if (record.relatedSuperIp) dom.detailSuperIp.href = `index.html?q=${encodeURIComponent(record.relatedSuperIp.name)}`;
    dom.detailVisual.hidden = !record.visualRecordId;
    if (record.visualRecordId) dom.detailVisual.href = `visual.html?view=images&q=${encodeURIComponent(record.originEntity || record.name)}`;
  }

  function openDetail(record, options = {}) {
    if (dom.sourceDialog.open) {
      suppressSourceClose = true;
      dom.sourceDialog.close();
    }
    populateDetail(record);
    if (options.sync !== false) {
      state.item = record.id;
      state.entity = "";
      writeState(false);
    }
    if (!dom.detailDialog.open) dom.detailDialog.showModal();
  }

  function sourceMetric(value, label) {
    const item = el("div", "source-summary__metric");
    item.append(el("strong", "", value), el("span", "", label));
    return item;
  }

  function populateSource(group) {
    currentSource = group;
    dom.sourceKind.textContent = group.categories.join(" · ");
    dom.sourceTitle.textContent = group.name;
    dom.sourceSubtitle.textContent = group.works.length ? group.works.join(" · ") : "来源作品尚未归并；按单个 Meme 家族浏览。";
    dom.sourceSummary.replaceChildren(
      sourceMetric(group.records.length, "Meme 家族"),
      sourceMetric(group.works.length || "—", "关联作品"),
      sourceMetric(group.currentCount, "当前活跃信号"),
      sourceMetric(group.publicDomainCount, "具体公版底图"),
    );
    dom.sourceFamilyList.replaceChildren(...group.records.map((record) => {
      const button = el("button", "source-family");
      button.type = "button";
      button.append(
        makeImage(record.image, record.name),
        (() => {
          const copy = el("span", "source-family__copy");
          copy.append(el("strong", "", record.name), el("span", "", record.mechanic));
          return copy;
        })(),
      );
      button.addEventListener("click", () => openDetail(record));
      return button;
    }));
    dom.sourceSuperIp.href = `index.html?q=${encodeURIComponent(group.relatedSuperIp?.name || group.name)}`;
  }

  function openSource(group, options = {}) {
    if (dom.detailDialog.open) {
      suppressDetailClose = true;
      dom.detailDialog.close();
    }
    populateSource(group);
    if (options.sync !== false) {
      state.entity = group.key;
      state.item = "";
      writeState(false);
    }
    if (!dom.sourceDialog.open) dom.sourceDialog.showModal();
  }

  function agentBrief(record) {
    return [
      `Meme 家族：${record.name}`,
      `来源：${record.originEntity} / ${record.originWork || "待复核"}`,
      `表达机制：${record.mechanic}`,
      `文字槽位：${record.slots}`,
      `可用场景：${(record.useCases || []).join("、") || "待补"}`,
      `Agent 结构：${record.agentPattern}`,
      `生产路线：${record.productionRoute}`,
      `权利入口：${record.rightsLane}`,
      `版权：${record.copyrightNote}`,
      `肖像 / 人格：${record.publicityNote}`,
      `商标 / 来源误认：${record.trademarkNote}`,
      `活跃证据：${record.activityEvidence}`,
      record.relatedSuperIp ? `来源知名度：${record.relatedSuperIp.nameZh || record.relatedSuperIp.name}；${record.relatedSuperIp.usTier}${record.relatedSuperIp.surveyFamePercent ? `；美国认知 ${record.relatedSuperIp.surveyFamePercent}%` : ""}；不等于 Meme 知名度` : "来源知名度：待补美国同口径证据",
      `核验来源：${record.sourceUrl}`,
    ].join("\n");
  }

  function sourceBrief(group) {
    return [
      `Meme 来源：${group.name}`,
      `关联作品：${group.works.join("、") || "待归并"}`,
      `Meme 家族：${group.records.length}`,
      `当前活跃信号：${group.currentCount}`,
      `具体公版底图：${group.publicDomainCount}`,
      group.relatedSuperIp ? `来源知名度：${group.relatedSuperIp.nameZh || group.relatedSuperIp.name}；${group.relatedSuperIp.usTier}${group.relatedSuperIp.surveyFamePercent ? `；美国认知 ${group.relatedSuperIp.surveyFamePercent}%` : ""}` : "来源知名度：待补",
      "家族清单：",
      ...group.records.map((record) => `- ${record.name}｜${record.mechanic}｜${record.rightsLane}`),
    ].join("\n");
  }

  async function copyText(value, button, successLabel) {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    button.textContent = successLabel;
    setTimeout(() => { button.textContent = original; }, 1200);
  }

  function syncDialogs() {
    const item = state.item ? recordById.get(state.item) : null;
    const groups = groupSources(filteredRecords());
    const group = state.entity ? groups.find((candidate) => candidate.key === state.entity) : null;
    if (item) openDetail(item, { sync: false });
    else if (dom.detailDialog.open) {
      suppressDetailClose = true;
      dom.detailDialog.close();
    }
    if (group) openSource(group, { sync: false });
    else if (dom.sourceDialog.open && !item) {
      suppressSourceClose = true;
      dom.sourceDialog.close();
    }
  }

  function render() {
    renderControls();
    renderMetrics();
    renderResults();
    syncDialogs();
  }

  dom.search.addEventListener("input", () => setState({ q: dom.search.value }, { replace: true }));
  dom.categorySelect.addEventListener("change", () => setState({ category: dom.categorySelect.value }));
  dom.subcategorySelect.addEventListener("change", () => setState({ subcategory: dom.subcategorySelect.value }));
  dom.rightsSelect.addEventListener("change", () => setState({ rights: dom.rightsSelect.value }));
  dom.scenarioSelect.addEventListener("change", () => setState({ scenario: dom.scenarioSelect.value }));
  dom.sortSelect.addEventListener("change", () => setState({ sort: dom.sortSelect.value }));
  dom.reset.addEventListener("click", () => setState({ q: "", category: "全部", subcategory: "全部", rights: "全部", scenario: "全部", quick: "全部", sort: "activity", item: "", entity: "" }));
  dom.emptyReset.addEventListener("click", () => dom.reset.click());
  dom.viewTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (button) setState({ view: button.dataset.view, item: "", entity: "" });
  });
  dom.loadMore.addEventListener("click", () => setState({ visible: state.visible + BATCH_SIZE }, { replace: true }));
  dom.copyPage.addEventListener("click", () => copyText(location.href, dom.copyPage, "已复制"));
  dom.copyBrief.addEventListener("click", () => currentItem && copyText(agentBrief(currentItem), dom.copyBrief, "已复制简报"));
  dom.copySource.addEventListener("click", () => currentSource && copyText(sourceBrief(currentSource), dom.copySource, "已复制简报"));

  dom.detailDialog.addEventListener("close", () => {
    if (suppressDetailClose) {
      suppressDetailClose = false;
      return;
    }
    if (state.item) {
      state.item = "";
      writeState(true);
    }
  });
  dom.sourceDialog.addEventListener("close", () => {
    if (suppressSourceClose) {
      suppressSourceClose = false;
      return;
    }
    if (state.entity) {
      state.entity = "";
      writeState(true);
    }
  });
  window.addEventListener("popstate", () => {
    state = readState();
    render();
  });

  render();
})();
