(() => {
  "use strict";

  const dataset = window.SUPER_IP_US_DATA;
  if (!dataset?.records?.length) {
    document.body.textContent = "美国超级 IP 数据载入失败。";
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const dom = {
    main: $("#main-content"),
    topMeta: $("#top-meta"),
    search: $("#search"),
    categorySelect: $("#category-select"),
    subcategorySelect: $("#subcategory-select"),
    rightsSelect: $("#rights-select"),
    tierSelect: $("#tier-select"),
    sortSelect: $("#sort-select"),
    reset: $("#reset"),
    emptyReset: $("#empty-reset"),
    copyFilter: $("#copy-filter"),
    categoryFacets: $("#category-facets"),
    subcategorySection: $("#subcategory-section"),
    subcategoryFacets: $("#subcategory-facets"),
    rightsFacets: $("#rights-facets"),
    quickTabs: $("#quick-tabs"),
    subcategoryTabs: $("#subcategory-tabs"),
    list: $("#ip-list"),
    empty: $("#empty-state"),
    resultTitle: $("#result-title"),
    resultCount: $("#result-count"),
    pageStatus: $("#page-status"),
    loadMoreBar: $("#load-more-bar"),
    loadMore: $("#load-more"),
    loadMoreStatus: $("#load-more-status"),
    loadSentinel: $("#load-sentinel"),
    dialog: $("#detail-dialog"),
    detailKind: $("#detail-kind"),
    detailTitle: $("#detail-title"),
    detailSubtitle: $("#detail-subtitle"),
    detailBadges: $("#detail-badges"),
    detailVisualPanel: $("#detail-visual-panel"),
    detailAwareness: $("#detail-awareness"),
    detailSurvey: $("#detail-survey"),
    detailRights: $("#detail-rights"),
    detailUse: $("#detail-use"),
    detailAvoid: $("#detail-avoid"),
    detailMotifs: $("#detail-motifs"),
    detailComposition: $("#detail-composition"),
    detailVisualSourceCopy: $("#detail-visual-source-copy"),
    detailEvidence: $("#detail-evidence"),
    detailSource: $("#detail-source"),
    detailProof: $("#detail-proof"),
    detailSurveySource: $("#detail-survey-source"),
    detailVisualSource: $("#detail-visual-source"),
    detailVisual: $("#detail-visual"),
    copyItem: $("#copy-item"),
  };

  const BATCH_SIZE = 48;
  const records = dataset.records.map((record) => ({
    ...record,
    _search: normalize([
      record.name,
      record.nameZh,
      record.aliases,
      record.category,
      record.subcategory,
      record.entityType,
      record.motifs,
      record.visualElements,
      record.visualComposition,
      record.visualStatus,
      record.rightsLane,
    ].flat().join(" ")),
  }));
  const categoryOrder = [
    "动画 / 角色",
    "电影 / 电视",
    "人物 / 文娱名人",
    "音乐",
    "游戏 / 玩具",
    "文学 / 书籍",
    "文学 / 公域角色",
    "舞台 / 活动",
    "网络 / 媒体",
    "体育运动",
    "宗教 / 神话",
    "艺术 / 公共文化",
    "品牌 / 广告角色",
    "公共符号",
  ];
  const categoryKeys = Object.keys(dataset.counts.byCategory);
  const categories = [
    ...categoryOrder.filter((category) => categoryKeys.includes(category)),
    ...categoryKeys.filter((category) => !categoryOrder.includes(category)),
  ];
  const subcategoryCounts = records.reduce((tree, record) => {
    tree[record.category] ||= {};
    tree[record.category][record.subcategory] = (tree[record.category][record.subcategory] || 0) + 1;
    return tree;
  }, {});
  const subcategoriesFor = (category) => Object.entries(subcategoryCounts[category] || {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
  const rightsLanes = Object.keys(dataset.counts.byRightsLane);
  const tiers = Object.keys(dataset.counts.byUsTier);
  const entertainmentCategories = new Set([
    "动画 / 角色",
    "电影 / 电视",
    "游戏 / 玩具",
    "音乐",
    "人物 / 文娱名人",
    "文学 / 书籍",
    "文学 / 公域角色",
    "舞台 / 活动",
    "网络 / 媒体",
    "宗教 / 神话",
    "艺术 / 公共文化",
  ]);
  const quickOptions = [
    { key: "全部", label: "全部", test: () => true },
    { key: "文娱全景", label: "文娱全景", test: (item) => entertainmentCategories.has(item.category) },
    { key: "全民级", label: "美国全民级", test: (item) => item.usTier.startsWith("S") },
    { key: "100M+认知等效", label: "100M+ 认知等效", test: (item) => item.surveyQualifies100m === true },
    { key: "100M+直接人数", label: "100M+ 直接人数", test: (item) => item.reachStatus.startsWith("100M+") },
    { key: "有参考图", label: "有参考图", test: (item) => Boolean(item.visualImage) },
    { key: "体育运动", label: "体育运动", category: "体育运动", test: (item) => item.category === "体育运动" },
    { key: "动画 / 角色", label: "角色卡通", category: "动画 / 角色", test: (item) => item.category === "动画 / 角色" },
    { key: "电影 / 电视", label: "影视", category: "电影 / 电视", test: (item) => item.category === "电影 / 电视" },
    { key: "游戏 / 玩具", label: "游戏玩具", category: "游戏 / 玩具", test: (item) => item.category === "游戏 / 玩具" },
    { key: "音乐", label: "音乐", category: "音乐", test: (item) => item.category === "音乐" },
    { key: "人物 / 文娱名人", label: "人物名人", category: "人物 / 文娱名人", test: (item) => item.category === "人物 / 文娱名人" },
    { key: "文学 / 书籍", label: "书籍", category: "文学 / 书籍", test: (item) => item.category === "文学 / 书籍" },
    { key: "舞台 / 活动", label: "舞台活动", category: "舞台 / 活动", test: (item) => item.category === "舞台 / 活动" },
    { key: "网络 / 媒体", label: "媒体", category: "网络 / 媒体", test: (item) => item.category === "网络 / 媒体" },
    { key: "文化公域", label: "文化公域", test: (item) => item.rightsLane === "文化公域 · 逐素材核验" },
  ];

  let state = readState();
  let currentItem = null;
  let currentFiltered = [];

  function normalize(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
  }

  function readState() {
    const params = new URLSearchParams(location.search);
    const legacyQuick = {
      "100M+": "全民级",
      "100M+实测": "100M+直接人数",
    };
    const requestedQuick = legacyQuick[params.get("quick")] || params.get("quick");
    const categoryQuick = quickOptions.find((item) => item.category && item.key === requestedQuick);
    const quick = categoryQuick ? "全部" : quickOptions.some((item) => item.key === requestedQuick) ? requestedQuick : "全部";
    const quickOwnsScope = quick !== "全部";
    const requestedCategory = categoryQuick?.category || params.get("category");
    const category = quickOwnsScope ? "全部" : categories.includes(requestedCategory) ? requestedCategory : "全部";
    const availableSubcategories = new Set(subcategoriesFor(category).map(([name]) => name));
    return {
      q: quickOwnsScope ? "" : params.get("q") || "",
      category,
      subcategory: category !== "全部" && availableSubcategories.has(params.get("subcategory")) ? params.get("subcategory") : "全部",
      rights: quickOwnsScope ? "全部" : rightsLanes.includes(params.get("rights")) ? params.get("rights") : "全部",
      tier: quickOwnsScope ? "全部" : tiers.includes(params.get("tier")) ? params.get("tier") : "全部",
      quick,
      sort: ["curated", "name", "category"].includes(params.get("sort")) ? params.get("sort") : "curated",
      visible: Math.max(1, Number(params.get("page")) || 1) * BATCH_SIZE,
    };
  }

  function writeState(replace = false) {
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.category !== "全部") params.set("category", state.category);
    if (state.subcategory !== "全部") params.set("subcategory", state.subcategory);
    if (state.rights !== "全部") params.set("rights", state.rights);
    if (state.tier !== "全部") params.set("tier", state.tier);
    if (state.quick !== "全部") params.set("quick", state.quick);
    if (state.sort !== "curated") params.set("sort", state.sort);
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

  function tierRank(item) {
    return item.usTier.startsWith("S") ? 0 : 1;
  }

  function filteredRecords() {
    const q = normalize(state.q);
    const quick = quickOptions.find((item) => item.key === state.quick) || quickOptions[0];
    const filtered = records.filter((item) => {
      if (q && !item._search.includes(q)) return false;
      if (state.category !== "全部" && item.category !== state.category) return false;
      if (state.subcategory !== "全部" && item.subcategory !== state.subcategory) return false;
      if (state.rights !== "全部" && item.rightsLane !== state.rights) return false;
      if (state.tier !== "全部" && item.usTier !== state.tier) return false;
      return quick.test(item);
    });
    return filtered.sort((a, b) => {
      if (state.sort === "name") return a.name.localeCompare(b.name, "en");
      if (state.sort === "category") return a.category.localeCompare(b.category, "zh-CN") || a.subcategory.localeCompare(b.subcategory, "zh-CN") || a.name.localeCompare(b.name, "en");
      const exactA = a.reachStatus.startsWith("100M+") ? 0 : 1;
      const exactB = b.reachStatus.startsWith("100M+") ? 0 : 1;
      const fameA = Number(a.surveyFamePercent) || 0;
      const fameB = Number(b.surveyFamePercent) || 0;
      return exactA - exactB || fameB - fameA || tierRank(a) - tierRank(b) || a.category.localeCompare(b.category, "zh-CN") || a.name.localeCompare(b.name, "en");
    });
  }

  function facetButton(label, count, active, onClick) {
    const button = el("button", `facet-button${active ? " is-active" : ""}`);
    button.type = "button";
    button.append(el("span", "", label), el("span", "facet-count", count));
    button.addEventListener("click", onClick);
    return button;
  }

  function renderFacets() {
    dom.categoryFacets.replaceChildren(
      facetButton("全部", records.length, state.category === "全部", () => setState({ category: "全部", subcategory: "全部", quick: "全部" })),
      ...categories.map((category) => facetButton(category, dataset.counts.byCategory[category], state.category === category, () => setState({ category, subcategory: "全部", quick: "全部" }))),
    );

    const subcategories = state.category === "全部" ? [] : subcategoriesFor(state.category);
    const showSubcategories = subcategories.length > 0;
    dom.subcategorySection.hidden = !showSubcategories;
    dom.subcategorySelect.hidden = !showSubcategories;
    dom.subcategoryTabs.hidden = !showSubcategories;
    dom.subcategorySelect.replaceChildren(
      makeOption("全部", "全部子分类"),
      ...subcategories.map(([subcategory, count]) => makeOption(subcategory, `${subcategory} · ${count}`)),
    );
    dom.subcategorySelect.value = state.subcategory;
    dom.subcategoryFacets.replaceChildren(
      ...(showSubcategories ? [
        facetButton("全部", dataset.counts.byCategory[state.category], state.subcategory === "全部", () => setState({ subcategory: "全部" })),
        ...subcategories.map(([subcategory, count]) => facetButton(subcategory, count, state.subcategory === subcategory, () => setState({ subcategory }))),
      ] : []),
    );
    dom.subcategoryTabs.replaceChildren(
      ...(showSubcategories ? [
        subcategoryButton("全部", dataset.counts.byCategory[state.category], state.subcategory === "全部", () => setState({ subcategory: "全部" })),
        ...subcategories.map(([subcategory, count]) => subcategoryButton(subcategory, count, state.subcategory === subcategory, () => setState({ subcategory }))),
      ] : []),
    );

    dom.rightsFacets.replaceChildren(
      facetButton("全部", records.length, state.rights === "全部", () => setState({ rights: "全部" })),
      ...rightsLanes.map((rights) => facetButton(rights, dataset.counts.byRightsLane[rights], state.rights === rights, () => setState({ rights }))),
    );
    dom.quickTabs.replaceChildren(...quickOptions.map((option) => {
      const count = records.filter(option.test).length;
      const button = el("button", `quick-tab${state.quick === option.key ? " is-active" : ""}`, `${option.label} ${count}`);
      button.type = "button";
      button.addEventListener("click", () => option.category
        ? setState({ q: "", quick: "全部", category: option.category, subcategory: "全部", rights: "全部", tier: "全部" })
        : setState({ q: "", quick: option.key, category: "全部", subcategory: "全部", rights: "全部", tier: "全部" }));
      return button;
    }));
  }

  function subcategoryButton(label, count, active, onClick) {
    const button = el("button", `subcategory-tab${active ? " is-active" : ""}`);
    button.type = "button";
    button.append(el("span", "", label), el("span", "subcategory-count", count));
    button.addEventListener("click", onClick);
    return button;
  }

  function categoryMark(item) {
    const marks = {
      "动画 / 角色": "角色",
      "电影 / 电视": "影视",
      "游戏 / 玩具": "游戏",
      "音乐": "音乐",
      "人物 / 文娱名人": "人物",
      "文学 / 书籍": "书籍",
      "舞台 / 活动": "舞台",
      "网络 / 媒体": "媒体",
      "体育运动": "体育",
      "文学 / 公域角色": "文学",
      "宗教 / 神话": "神话",
      "艺术 / 公共文化": "艺术",
      "品牌 / 广告角色": "品牌",
      "公共符号": "公共",
    };
    return marks[item.category] || "IP";
  }

  function compactTier(item) {
    return item.usTier.startsWith("S") ? "S · 全民级候选" : "A · 高知名候选";
  }

  function visualModeLabel(item) {
    if (item.visualImageMode === "public-domain-library") return "公版图库";
    if (item.visualImageMode === "recognition-reference") return "识别参考";
    return "视觉 DNA";
  }

  function visualDna(item, detail = false) {
    const wrap = el("div", `visual-dna${detail ? " visual-dna--detail" : ""}`);
    const mark = el("div", "visual-dna__mark", categoryMark(item));
    const title = el("div", "visual-dna__title", item.nameZh || item.name);
    const cues = el("div", "visual-dna__cues");
    (item.visualElements || item.motifs || []).slice(0, detail ? 4 : 2).forEach((cue) => cues.append(el("span", "visual-dna__cue", cue)));
    const bars = el("div", "visual-dna__bars");
    (item.visualPalette || ["#111111", "#F4F4F4", "#777777", "#D6D6D6"]).slice(0, 4).forEach((color) => {
      const bar = el("span", "visual-dna__bar");
      bar.style.backgroundColor = color;
      bar.title = color;
      bars.append(bar);
    });
    wrap.append(mark, title, cues, bars);
    return wrap;
  }

  function renderVisual(item, options = {}) {
    const detail = options.detail === true;
    const frame = el("div", `ip-visual${detail ? " ip-visual--detail" : ""}`);
    const mode = el("span", "ip-visual__mode", visualModeLabel(item));
    if (!item.visualImage) {
      frame.append(visualDna(item, detail), mode);
      return frame;
    }
    const image = document.createElement("img");
    image.className = "ip-visual__image";
    image.src = item.visualImage;
    image.alt = `${item.nameZh || item.name}｜${visualModeLabel(item)}`;
    image.loading = detail ? "eager" : "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => {
      frame.replaceChildren(visualDna(item, detail), mode);
    }, { once: true });
    frame.append(image, mode);
    return frame;
  }

  function card(item) {
    const button = el("button", "ip-card");
    button.type = "button";
    const body = el("div", "ip-card__body");
    const top = el("div", "ip-card__top");
    top.append(el("span", "ip-card__mark", categoryMark(item)), el("span", "ip-card__tier", compactTier(item)));
    body.append(top, el("h2", "ip-card__title", item.name), el("div", "ip-card__zh", item.nameZh || item.subcategory));
    const cues = el("div", "ip-card__cues");
    (item.visualElements || item.motifs || []).slice(0, 3).forEach((cue) => cues.append(el("span", "ip-card__cue", cue)));
    body.append(cues);
    const status = item.reachStatus.startsWith("100M+")
      ? el("span", "status-badge status-badge--verified", "100M+ 直接人数")
      : item.surveyQualifies100m
        ? el("span", "status-badge status-badge--survey", `认知 ${item.surveyFamePercent}%`)
      : el("span", item.rightsLane.includes("授权") ? "status-badge status-badge--licensed" : "status-badge", item.rightsLane);
    const foot = el("div", "ip-card__foot");
    foot.append(el("span", "ip-card__path", `${item.category} · ${item.subcategory}`), status);
    body.append(foot);
    button.append(renderVisual(item), body);
    button.addEventListener("click", () => openDetail(item));
    return button;
  }

  function badge(text, className = "") {
    return el("span", `badge${className ? ` ${className}` : ""}`, text);
  }

  function openDetail(item) {
    currentItem = item;
    dom.detailKind.textContent = `${item.category} · ${item.subcategory} · ${item.entityType}`;
    dom.detailTitle.textContent = item.name;
    dom.detailSubtitle.textContent = item.nameZh || item.rightsOwnerContext;
    dom.detailBadges.replaceChildren(
      badge(compactTier(item)),
      badge(item.rightsLane, item.rightsLane.includes("授权") ? "badge--warn" : ""),
      badge(item.reachStatus.startsWith("100M+") ? "100M+ 直接人数" : item.surveyFamePercent ? `YouGov Fame ${item.surveyFamePercent}%` : item.evidenceStatus, item.reachStatus.startsWith("100M+") || item.surveyQualifies100m ? "badge--ok" : ""),
    );
    dom.detailVisualPanel.replaceChildren(renderVisual(item, { detail: true }));
    const evidenceValue = item.evidenceValue ? `${Number(item.evidenceValue).toLocaleString("en-US")} ${item.evidenceUnit}` : "无直接人数证据";
    dom.detailAwareness.textContent = `${item.usTier}。${item.reachStatus}。${evidenceValue}。`;
    dom.detailSurvey.textContent = item.surveyFamePercent
      ? `YouGov Fame ${item.surveyFamePercent}%；按 2020 美国成年人口折算约 ${(Number(item.surveyPopulationEquivalent) / 1000000).toFixed(1)}M。调查认知等效，不是独立观众、销量或授权证明。口径：${item.surveyPeriod || "待复核"}。`
      : "待补美国全国同口径认知调查。";
    dom.detailRights.textContent = `${item.rightsLane}。权利主体 / 路由：${item.rightsOwnerContext}。`;
    dom.detailUse.textContent = item.useRoute;
    dom.detailAvoid.textContent = item.avoid;
    dom.detailMotifs.textContent = item.visualElements?.length ? item.visualElements.join(" · ") : item.motifs?.length ? item.motifs.join(" · ") : "待补";
    dom.detailComposition.textContent = item.visualComposition || "待补";
    dom.detailVisualSourceCopy.textContent = `${item.visualStatus || "视觉 DNA"}。${item.visualSourceLabel || "无外部图源"}。${item.visualRightsNote || "仅作研究线索，生产前逐素材核验。"}`;
    const evidenceDate = item.evidenceDate ? `；口径日期 ${item.evidenceDate}` : "";
    dom.detailEvidence.textContent = `${item.evidenceType}；${item.evidenceStatus}${evidenceDate}。${item.sourceLabel}：${item.sourceRole}`;
    dom.detailSource.href = item.sourceUrl;
    dom.detailProof.hidden = !item.evidenceUrl;
    if (item.evidenceUrl) dom.detailProof.href = item.evidenceUrl;
    const surveySourceIsDuplicate = item.surveySourceUrl && item.surveySourceUrl === item.sourceUrl;
    dom.detailSurveySource.hidden = !item.surveySourceUrl || surveySourceIsDuplicate;
    if (item.surveySourceUrl) dom.detailSurveySource.href = item.surveySourceUrl;
    const visualSourceIsDuplicate = item.visualSourceUrl && [item.sourceUrl, item.surveySourceUrl].includes(item.visualSourceUrl);
    dom.detailVisualSource.hidden = !item.visualSourceUrl || visualSourceIsDuplicate;
    if (item.visualSourceUrl) dom.detailVisualSource.href = item.visualSourceUrl;
    dom.detailVisual.href = `visual.html?view=roles&q=${encodeURIComponent(item.nameZh || item.name)}`;
    dom.dialog.showModal();
  }

  function copyText(text, button, doneLabel) {
    navigator.clipboard.writeText(text).then(() => {
      const original = button.textContent;
      button.textContent = doneLabel;
      window.setTimeout(() => { button.textContent = original; }, 1200);
    }).catch(() => {});
  }

  function itemCopy(item) {
    return [
      `${item.name}${item.nameZh ? `｜${item.nameZh}` : ""}`,
      `${item.category} / ${item.subcategory}`,
      `美国知名度：${item.usTier}；${item.reachStatus}`,
      item.surveyFamePercent ? `美国认知：YouGov Fame ${item.surveyFamePercent}%；约 ${(Number(item.surveyPopulationEquivalent) / 1000000).toFixed(1)}M 成年人口等效；非独立观众` : "美国认知：待补全国同口径调查",
      `权利入口：${item.rightsLane}`,
      `视觉元素：${(item.visualElements || item.motifs || []).join("、")}`,
      `构图：${item.visualComposition || "待补"}`,
      `可取：${item.useRoute}`,
      `避开：${item.avoid}`,
      `来源：${item.sourceUrl}`,
      item.evidenceUrl ? `人数证据：${item.evidenceUrl}` : "人数证据：待补美国同口径证据",
    ].join("\n");
  }

  function updateLoadProgress() {
    const shown = dom.list.childElementCount;
    const total = currentFiltered.length;
    const remaining = Math.max(0, total - shown);
    const hasMore = remaining > 0;
    dom.pageStatus.textContent = total ? `已显示 ${shown.toLocaleString("en-US")} / ${total.toLocaleString("en-US")}` : "";
    dom.loadMoreBar.hidden = total === 0;
    dom.loadMore.hidden = !hasMore;
    dom.loadMore.textContent = hasMore ? `加载更多 ${Math.min(BATCH_SIZE, remaining)} 条` : "已全部显示";
    dom.loadMoreStatus.textContent = hasMore
      ? `剩余 ${remaining.toLocaleString("en-US")} 条 · 下滑自动加载`
      : `已全部显示 ${total.toLocaleString("en-US")} 条`;
  }

  function loadMore() {
    const start = dom.list.childElementCount;
    if (start >= currentFiltered.length) {
      updateLoadProgress();
      return;
    }
    const nextItems = currentFiltered.slice(start, start + BATCH_SIZE);
    dom.list.append(...nextItems.map(card));
    state.visible = start + nextItems.length;
    updateLoadProgress();
  }

  function render() {
    dom.search.value = state.q;
    dom.categorySelect.value = state.category;
    dom.rightsSelect.value = state.rights;
    dom.tierSelect.value = state.tier;
    dom.sortSelect.value = state.sort;
    renderFacets();

    currentFiltered = filteredRecords();
    const visibleCount = Math.min(Math.max(BATCH_SIZE, state.visible || BATCH_SIZE), currentFiltered.length);
    const visibleItems = currentFiltered.slice(0, visibleCount);
    state.visible = visibleCount;
    dom.list.replaceChildren(...visibleItems.map(card));
    dom.list.hidden = visibleItems.length === 0;
    dom.empty.hidden = visibleItems.length !== 0;
    const quick = quickOptions.find((item) => item.key === state.quick);
    dom.resultTitle.textContent = state.q ? `“${state.q}”` : state.subcategory !== "全部" ? state.subcategory : state.category !== "全部" ? state.category : state.rights !== "全部" ? state.rights : quick?.key !== "全部" ? quick.label : "全部候选";
    dom.resultCount.textContent = currentFiltered.length.toLocaleString("en-US");
    updateLoadProgress();
    document.title = `${dom.resultTitle.textContent}｜美国超级 IP 机会库`;
  }

  for (const category of categories) dom.categorySelect.append(makeOption(category));
  for (const rights of rightsLanes) dom.rightsSelect.append(makeOption(rights));
  for (const tier of tiers) dom.tierSelect.append(makeOption(tier));

  dom.topMeta.textContent = `${dataset.counts.records.toLocaleString("en-US")} 候选 · ${dataset.counts.entertainmentRecords.toLocaleString("en-US")} 文娱 · ${dataset.counts.sports.toLocaleString("en-US")} 体育`;
  $("#metric-all").textContent = dataset.counts.records.toLocaleString("en-US");
  $("#metric-entertainment").textContent = (dataset.counts.entertainmentRecords || 0).toLocaleString("en-US");
  $("#metric-s").textContent = (dataset.counts.byUsTier["S｜美国全民级候选"] || 0).toLocaleString("en-US");
  $("#metric-survey").textContent = (dataset.counts.survey100mEquivalent || 0).toLocaleString("en-US");
  $("#metric-direct").textContent = (dataset.counts.direct100mEvidence || 0).toLocaleString("en-US");
  $("#metric-visual").textContent = (dataset.counts.visualReferences || 0).toLocaleString("en-US");

  let searchTimer = 0;
  dom.search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => setState({ q: dom.search.value }, { replace: true }), 140);
  });
  dom.categorySelect.addEventListener("change", () => setState({ category: dom.categorySelect.value, subcategory: "全部", quick: "全部" }));
  dom.subcategorySelect.addEventListener("change", () => setState({ subcategory: dom.subcategorySelect.value }));
  dom.rightsSelect.addEventListener("change", () => setState({ rights: dom.rightsSelect.value }));
  dom.tierSelect.addEventListener("change", () => setState({ tier: dom.tierSelect.value }));
  dom.sortSelect.addEventListener("change", () => setState({ sort: dom.sortSelect.value }));
  dom.reset.addEventListener("click", reset);
  dom.emptyReset.addEventListener("click", reset);
  dom.loadMore.addEventListener("click", loadMore);
  dom.copyFilter.addEventListener("click", () => copyText(location.href, dom.copyFilter, "已复制"));
  dom.copyItem.addEventListener("click", () => currentItem && copyText(itemCopy(currentItem), dom.copyItem, "已复制"));
  window.addEventListener("popstate", () => { state = readState(); render(); });

  function reset() {
    setState({ q: "", category: "全部", subcategory: "全部", rights: "全部", tier: "全部", quick: "全部", sort: "curated" });
  }

  writeState(true);
  render();
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    }, { root: dom.main, rootMargin: "640px 0px" });
    observer.observe(dom.loadSentinel);
  }
})();
