(() => {
  "use strict";

  const dataset = window.SUPER_IP_US_DATA;
  if (!dataset?.records?.length) {
    document.body.textContent = "美国超级 IP 数据载入失败。";
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const dom = {
    topMeta: $("#top-meta"),
    search: $("#search"),
    categorySelect: $("#category-select"),
    rightsSelect: $("#rights-select"),
    tierSelect: $("#tier-select"),
    sortSelect: $("#sort-select"),
    reset: $("#reset"),
    emptyReset: $("#empty-reset"),
    copyFilter: $("#copy-filter"),
    categoryFacets: $("#category-facets"),
    rightsFacets: $("#rights-facets"),
    quickTabs: $("#quick-tabs"),
    list: $("#ip-list"),
    empty: $("#empty-state"),
    resultTitle: $("#result-title"),
    resultCount: $("#result-count"),
    pageStatus: $("#page-status"),
    prevPage: $("#prev-page"),
    nextPage: $("#next-page"),
    pagerStatus: $("#pager-status"),
    dialog: $("#detail-dialog"),
    detailKind: $("#detail-kind"),
    detailTitle: $("#detail-title"),
    detailSubtitle: $("#detail-subtitle"),
    detailBadges: $("#detail-badges"),
    detailAwareness: $("#detail-awareness"),
    detailRights: $("#detail-rights"),
    detailUse: $("#detail-use"),
    detailAvoid: $("#detail-avoid"),
    detailMotifs: $("#detail-motifs"),
    detailEvidence: $("#detail-evidence"),
    detailSource: $("#detail-source"),
    detailProof: $("#detail-proof"),
    detailVisual: $("#detail-visual"),
    copyItem: $("#copy-item"),
  };

  const PAGE_SIZE = 48;
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
      record.rightsLane,
    ].flat().join(" ")),
  }));
  const categories = Object.keys(dataset.counts.byCategory);
  const rightsLanes = Object.keys(dataset.counts.byRightsLane);
  const tiers = Object.keys(dataset.counts.byUsTier);
  const quickOptions = [
    { key: "全部", label: "全部", test: () => true },
    { key: "全民级", label: "美国全民级", test: (item) => item.usTier.startsWith("S") },
    { key: "100M+实测", label: "100M+ 实测", test: (item) => item.reachStatus.startsWith("100M+") },
    { key: "体育运动", label: "体育运动", test: (item) => item.category === "体育运动" },
    { key: "动画 / 角色", label: "角色卡通", test: (item) => item.category === "动画 / 角色" },
    { key: "电影 / 电视", label: "影视", test: (item) => item.category === "电影 / 电视" },
    { key: "游戏 / 玩具", label: "游戏玩具", test: (item) => item.category === "游戏 / 玩具" },
    { key: "音乐", label: "音乐", test: (item) => item.category === "音乐" },
    { key: "文化公域", label: "文化公域", test: (item) => item.rightsLane === "文化公域 · 逐素材核验" },
  ];

  let state = readState();
  let currentItem = null;

  function normalize(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
  }

  function readState() {
    const params = new URLSearchParams(location.search);
    const requestedQuick = params.get("quick") === "100M+" ? "全民级" : params.get("quick");
    const quick = quickOptions.some((item) => item.key === requestedQuick) ? requestedQuick : "全部";
    const quickOwnsScope = quick !== "全部";
    return {
      q: quickOwnsScope ? "" : params.get("q") || "",
      category: quickOwnsScope ? "全部" : categories.includes(params.get("category")) ? params.get("category") : "全部",
      rights: quickOwnsScope ? "全部" : rightsLanes.includes(params.get("rights")) ? params.get("rights") : "全部",
      tier: quickOwnsScope ? "全部" : tiers.includes(params.get("tier")) ? params.get("tier") : "全部",
      quick,
      sort: ["curated", "name", "category"].includes(params.get("sort")) ? params.get("sort") : "curated",
      page: Math.max(1, Number(params.get("page")) || 1),
    };
  }

  function writeState(replace = false) {
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.category !== "全部") params.set("category", state.category);
    if (state.rights !== "全部") params.set("rights", state.rights);
    if (state.tier !== "全部") params.set("tier", state.tier);
    if (state.quick !== "全部") params.set("quick", state.quick);
    if (state.sort !== "curated") params.set("sort", state.sort);
    if (state.page > 1) params.set("page", String(state.page));
    const query = params.toString();
    history[replace ? "replaceState" : "pushState"](null, "", `${location.pathname}${query ? `?${query}` : ""}`);
  }

  function setState(patch, options = {}) {
    state = { ...state, ...patch };
    if (!Object.prototype.hasOwnProperty.call(patch, "page")) state.page = 1;
    writeState(options.replace === true);
    render();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function makeOption(value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
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
      if (state.rights !== "全部" && item.rightsLane !== state.rights) return false;
      if (state.tier !== "全部" && item.usTier !== state.tier) return false;
      return quick.test(item);
    });
    return filtered.sort((a, b) => {
      if (state.sort === "name") return a.name.localeCompare(b.name, "en");
      if (state.sort === "category") return a.category.localeCompare(b.category, "zh-CN") || a.subcategory.localeCompare(b.subcategory, "zh-CN") || a.name.localeCompare(b.name, "en");
      const exactA = a.reachStatus.startsWith("100M+") ? 0 : 1;
      const exactB = b.reachStatus.startsWith("100M+") ? 0 : 1;
      return exactA - exactB || tierRank(a) - tierRank(b) || a.category.localeCompare(b.category, "zh-CN") || a.name.localeCompare(b.name, "en");
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
      facetButton("全部", records.length, state.category === "全部", () => setState({ category: "全部", quick: "全部" })),
      ...categories.map((category) => facetButton(category, dataset.counts.byCategory[category], state.category === category, () => setState({ category, quick: "全部" }))),
    );
    dom.rightsFacets.replaceChildren(
      facetButton("全部", records.length, state.rights === "全部", () => setState({ rights: "全部" })),
      ...rightsLanes.map((rights) => facetButton(rights, dataset.counts.byRightsLane[rights], state.rights === rights, () => setState({ rights }))),
    );
    dom.quickTabs.replaceChildren(...quickOptions.map((option) => {
      const count = records.filter(option.test).length;
      const button = el("button", `quick-tab${state.quick === option.key ? " is-active" : ""}`, `${option.label} ${count}`);
      button.type = "button";
      button.addEventListener("click", () => setState({ q: "", quick: option.key, category: "全部", rights: "全部", tier: "全部" }));
      return button;
    }));
  }

  function categoryMark(item) {
    const marks = {
      "动画 / 角色": "角色",
      "电影 / 电视": "影视",
      "游戏 / 玩具": "游戏",
      "音乐": "音乐",
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

  function card(item) {
    const button = el("button", "ip-card");
    button.type = "button";
    const top = el("div", "ip-card__top");
    top.append(el("span", "ip-card__mark", categoryMark(item)), el("span", "ip-card__tier", compactTier(item)));
    button.append(top, el("h2", "ip-card__title", item.name), el("div", "ip-card__zh", item.nameZh || item.subcategory));
    const status = item.reachStatus.startsWith("100M+")
      ? el("span", "status-badge status-badge--verified", "100M+ 已核验")
      : el("span", item.rightsLane.includes("授权") ? "status-badge status-badge--licensed" : "status-badge", item.rightsLane);
    const foot = el("div", "ip-card__foot");
    foot.append(el("span", "ip-card__path", `${item.category} · ${item.subcategory}`), status);
    button.append(foot);
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
      badge(item.evidenceStatus, item.reachStatus.startsWith("100M+") ? "badge--ok" : ""),
    );
    const evidenceValue = item.evidenceValue ? `${Number(item.evidenceValue).toLocaleString("en-US")} ${item.evidenceUnit}` : "未填同口径人数";
    dom.detailAwareness.textContent = `${item.usTier}。${item.reachStatus}。${evidenceValue}。`;
    dom.detailRights.textContent = `${item.rightsLane}。权利主体 / 路由：${item.rightsOwnerContext}。`;
    dom.detailUse.textContent = item.useRoute;
    dom.detailAvoid.textContent = item.avoid;
    dom.detailMotifs.textContent = item.motifs?.length ? item.motifs.join(" · ") : "待补";
    const evidenceDate = item.evidenceDate ? `；口径日期 ${item.evidenceDate}` : "";
    dom.detailEvidence.textContent = `${item.evidenceType}；${item.evidenceStatus}${evidenceDate}。${item.sourceLabel}：${item.sourceRole}`;
    dom.detailSource.href = item.sourceUrl;
    dom.detailProof.hidden = !item.evidenceUrl;
    if (item.evidenceUrl) dom.detailProof.href = item.evidenceUrl;
    dom.detailVisual.href = `index.html?view=roles&q=${encodeURIComponent(item.nameZh || item.name)}`;
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
      `权利入口：${item.rightsLane}`,
      `可取：${item.useRoute}`,
      `避开：${item.avoid}`,
      `来源：${item.sourceUrl}`,
      item.evidenceUrl ? `人数证据：${item.evidenceUrl}` : "人数证据：待补美国同口径证据",
    ].join("\n");
  }

  function render() {
    dom.search.value = state.q;
    dom.categorySelect.value = state.category;
    dom.rightsSelect.value = state.rights;
    dom.tierSelect.value = state.tier;
    dom.sortSelect.value = state.sort;
    renderFacets();

    const filtered = filteredRecords();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (state.page > totalPages) {
      state.page = totalPages;
      writeState(true);
    }
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    dom.list.replaceChildren(...pageItems.map(card));
    dom.list.hidden = pageItems.length === 0;
    dom.empty.hidden = pageItems.length !== 0;
    const quick = quickOptions.find((item) => item.key === state.quick);
    dom.resultTitle.textContent = state.q ? `“${state.q}”` : state.category !== "全部" ? state.category : state.rights !== "全部" ? state.rights : quick?.key !== "全部" ? quick.label : "全部候选";
    dom.resultCount.textContent = filtered.length.toLocaleString("en-US");
    dom.pageStatus.textContent = filtered.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} / ${filtered.length}` : "";
    dom.pagerStatus.textContent = `${state.page} / ${totalPages}`;
    dom.prevPage.disabled = state.page <= 1;
    dom.nextPage.disabled = state.page >= totalPages;
    document.title = `${dom.resultTitle.textContent}｜美国超级 IP 机会库`;
  }

  for (const category of categories) dom.categorySelect.append(makeOption(category));
  for (const rights of rightsLanes) dom.rightsSelect.append(makeOption(rights));
  for (const tier of tiers) dom.tierSelect.append(makeOption(tier));

  dom.topMeta.textContent = `${dataset.counts.records.toLocaleString("en-US")} 候选 · ${dataset.counts.sports.toLocaleString("en-US")} 体育`;
  $("#metric-all").textContent = dataset.counts.records.toLocaleString("en-US");
  $("#metric-s").textContent = (dataset.counts.byUsTier["S｜美国全民级候选"] || 0).toLocaleString("en-US");
  $("#metric-sports").textContent = dataset.counts.sports.toLocaleString("en-US");
  $("#metric-public").textContent = (dataset.counts.byRightsLane["文化公域 · 逐素材核验"] || 0).toLocaleString("en-US");

  let searchTimer = 0;
  dom.search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => setState({ q: dom.search.value }, { replace: true }), 140);
  });
  dom.categorySelect.addEventListener("change", () => setState({ category: dom.categorySelect.value, quick: "全部" }));
  dom.rightsSelect.addEventListener("change", () => setState({ rights: dom.rightsSelect.value }));
  dom.tierSelect.addEventListener("change", () => setState({ tier: dom.tierSelect.value }));
  dom.sortSelect.addEventListener("change", () => setState({ sort: dom.sortSelect.value }));
  dom.reset.addEventListener("click", reset);
  dom.emptyReset.addEventListener("click", reset);
  dom.prevPage.addEventListener("click", () => setState({ page: Math.max(1, state.page - 1) }));
  dom.nextPage.addEventListener("click", () => setState({ page: state.page + 1 }));
  dom.copyFilter.addEventListener("click", () => copyText(location.href, dom.copyFilter, "已复制"));
  dom.copyItem.addEventListener("click", () => currentItem && copyText(itemCopy(currentItem), dom.copyItem, "已复制"));
  window.addEventListener("popstate", () => { state = readState(); render(); });

  function reset() {
    setState({ q: "", category: "全部", rights: "全部", tier: "全部", quick: "全部", sort: "curated", page: 1 });
  }

  writeState(true);
  render();
})();
