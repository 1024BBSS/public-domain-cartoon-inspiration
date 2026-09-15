(() => {
  "use strict";

  const dataset = window.PUBLIC_DOMAIN_CARTOON_DATA;
  const records = Array.isArray(dataset?.records) ? dataset.records : [];
  const PAGE_SIZE = 48;
  const TAG_ORDER = ["全部", "早期动画", "漫画 / 角色", "童话 / 寓言", "动物 / 自然", "万圣节", "圣诞 / 冬季", "怪诞 / 魔法", "宗教 / 神话"];
  const RIGHTS_ORDER = ["全部", "期限届满", "未续期", "公版 / 开放馆藏", "公版文件", "CC0 / 公版开放馆藏", "Public Domain / LOC"];

  const $ = (selector) => document.querySelector(selector);
  const dom = {
    topMeta: $("#top-meta"),
    search: $("#search"),
    kind: $("#kind-select"),
    rights: $("#rights-select"),
    sort: $("#sort-select"),
    reset: $("#reset"),
    emptyReset: $("#empty-reset"),
    grid: $("#art-grid"),
    empty: $("#empty-state"),
    resultCount: $("#result-count"),
    pageStatus: $("#page-status"),
    pagerStatus: $("#pager-status"),
    prev: $("#prev-page"),
    next: $("#next-page"),
    desktopTags: $("#desktop-tags"),
    mobileTags: $("#mobile-tags"),
    desktopKinds: $("#desktop-kinds"),
    desktopRights: $("#desktop-rights"),
    copyFilter: $("#copy-filter"),
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
    detailSource: $("#detail-source"),
    copyItem: $("#copy-item"),
  };

  const normalize = (value) => String(value || "").normalize("NFKC").toLocaleLowerCase("zh-CN").trim();
  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get("q") || "",
    tag: params.get("type") || "全部",
    kind: params.get("kind") || "主档",
    rights: params.get("rights") || "全部",
    sort: params.get("sort") || "type",
    page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
  };

  for (const record of records) {
    record._search = normalize([
      record.title,
      record.subtitle,
      record.year,
      record.rightsStatus,
      record.copyrightRoute,
      record.usage,
      record.avoid,
      ...(record.tags || []),
      ...(record.styles || []),
      ...(record.scenes || []),
      ...(record.holidays || []),
      ...(record.characters || []),
    ].join(" "));
  }

  function countBy(key, values) {
    const counts = new Map(values.map((value) => [value, 0]));
    counts.set("全部", records.length);
    for (const record of records) {
      const recordValues = Array.isArray(record[key]) ? record[key] : [record[key]];
      for (const value of recordValues) counts.set(value, (counts.get(value) || 0) + 1);
    }
    return counts;
  }

  const tagCounts = countBy("tags", TAG_ORDER);
  const kindCounts = countBy("kind", ["全部", "主档", "动画画面"]);
  const rightsCounts = countBy("rightsStatus", RIGHTS_ORDER);

  function facetButton(label, count, selected, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `facet-button${selected ? " is-active" : ""}`;
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    const name = document.createElement("span");
    name.textContent = label;
    const badge = document.createElement("span");
    badge.className = "facet-count";
    badge.textContent = String(count || 0);
    button.append(name, badge);
    button.addEventListener("click", onClick);
    return button;
  }

  function renderFacets() {
    dom.desktopTags.replaceChildren();
    dom.mobileTags.replaceChildren();
    for (const tag of TAG_ORDER) {
      if (tag !== "全部" && !tagCounts.get(tag)) continue;
      const select = () => updateState({ tag, page: 1 });
      dom.desktopTags.append(facetButton(tag, tagCounts.get(tag), state.tag === tag, select));
      dom.mobileTags.append(facetButton(tag, tagCounts.get(tag), state.tag === tag, select));
    }

    dom.desktopKinds.replaceChildren();
    for (const kind of ["主档", "动画画面", "全部"]) {
      dom.desktopKinds.append(facetButton(kind, kindCounts.get(kind), state.kind === kind, () => updateState({ kind, page: 1 })));
    }

    dom.desktopRights.replaceChildren();
    for (const rights of RIGHTS_ORDER) {
      if (rights !== "全部" && !rightsCounts.get(rights)) continue;
      dom.desktopRights.append(facetButton(rights, rightsCounts.get(rights), state.rights === rights, () => updateState({ rights, page: 1 })));
    }
  }

  function syncUrl() {
    const url = new URL(location.href);
    const values = { q: state.q, type: state.tag, kind: state.kind, rights: state.rights, sort: state.sort, page: state.page };
    for (const [key, value] of Object.entries(values)) {
      if (!value || value === "全部" || (key === "kind" && value === "主档") || (key === "sort" && value === "type") || (key === "page" && value === 1)) url.searchParams.delete(key);
      else url.searchParams.set(key, String(value));
    }
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function updateState(patch, options = {}) {
    Object.assign(state, patch);
    if (!options.skipSync) syncUrl();
    render();
  }

  function filteredRecords() {
    const query = normalize(state.q);
    const filtered = records.filter((record) => {
      if (state.tag !== "全部" && !record.tags.includes(state.tag)) return false;
      if (state.kind !== "全部" && record.kind !== state.kind) return false;
      if (state.rights !== "全部" && record.rightsStatus !== state.rights) return false;
      if (query && !record._search.includes(query)) return false;
      return true;
    });

    const tagRank = new Map(TAG_ORDER.map((tag, index) => [tag, index]));
    filtered.sort((a, b) => {
      if (state.sort === "awareness") return (b.awarenessScore - a.awarenessScore) || a.yearSort - b.yearSort || a.title.localeCompare(b.title);
      if (state.sort === "year") return a.yearSort - b.yearSort || a.title.localeCompare(b.title);
      if (state.sort === "title") return a.title.localeCompare(b.title, "zh-CN");
      const aType = Math.min(...a.tags.map((tag) => tagRank.get(tag) ?? 99));
      const bType = Math.min(...b.tags.map((tag) => tagRank.get(tag) ?? 99));
      const kindRank = { "主档": 0, "动画画面": 1 };
      return aType - bType || (kindRank[a.kind] ?? 9) - (kindRank[b.kind] ?? 9) || (b.awarenessScore - a.awarenessScore) || a.yearSort - b.yearSort;
    });
    return filtered;
  }

  function cardFor(record) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "art-card";
    card.dataset.recordId = record.id;
    card.setAttribute("aria-label", `查看 ${record.title}`);

    const media = document.createElement("span");
    media.className = "art-card__media";
    const image = document.createElement("img");
    image.src = record.image;
    image.alt = `${record.title}，${record.year} 版本参考图`;
    image.loading = "lazy";
    image.decoding = "async";
    const kind = document.createElement("span");
    kind.className = "art-card__kind";
    kind.textContent = record.kind;
    media.append(image, kind);

    const body = document.createElement("span");
    body.className = "art-card__body";
    const title = document.createElement("span");
    title.className = "art-card__title";
    title.textContent = record.title;
    const meta = document.createElement("span");
    meta.className = "art-card__meta";
    const subtitle = document.createElement("span");
    subtitle.textContent = [record.year, record.subtitle].filter(Boolean).join(" · ");
    const dot = document.createElement("span");
    dot.className = "rights-dot";
    dot.setAttribute("aria-hidden", "true");
    const rights = document.createElement("span");
    rights.textContent = record.rightsStatus;
    meta.append(subtitle, dot, rights);
    body.append(title, meta);
    card.append(media, body);
    card.addEventListener("click", () => openDetail(record));
    return card;
  }

  function render() {
    dom.search.value = state.q;
    dom.kind.value = state.kind;
    dom.rights.value = state.rights;
    dom.sort.value = state.sort;
    renderFacets();

    const filtered = filteredRecords();
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * PAGE_SIZE;
    const pageRecords = filtered.slice(start, start + PAGE_SIZE);

    dom.grid.replaceChildren(...pageRecords.map(cardFor));
    dom.grid.hidden = pageRecords.length === 0;
    dom.empty.hidden = pageRecords.length !== 0;
    dom.resultCount.textContent = String(filtered.length);
    dom.pageStatus.textContent = pageRecords.length ? `${start + 1}–${start + pageRecords.length}` : "";
    dom.pagerStatus.textContent = `${state.page} / ${pages}`;
    dom.prev.disabled = state.page <= 1;
    dom.next.disabled = state.page >= pages;
    dom.topMeta.textContent = `${records.length} 条 · ${new Set(records.map((record) => record.image)).size} 图源`;
    syncUrl();
  }

  function badge(text, ok = false) {
    const el = document.createElement("span");
    el.className = `badge${ok ? " badge--ok" : ""}`;
    el.textContent = text;
    return el;
  }

  function openDetail(record) {
    dom.detailImage.src = record.image;
    dom.detailImage.alt = `${record.title}，${record.year} 版本参考图`;
    dom.detailKind.textContent = `${record.kind} · ${record.tags.join(" / ")}`;
    dom.detailTitle.textContent = record.title;
    dom.detailSubtitle.textContent = [record.year, record.subtitle].filter(Boolean).join(" · ");
    dom.detailBadges.replaceChildren(
      badge(record.rightsStatus, true),
      badge(record.copyrightRoute),
      badge(`证据 ${record.evidenceLevel}`),
      ...(record.awarenessScore ? [badge(`美国知名度 ${record.awarenessScore}`)] : []),
    );
    dom.detailUsage.textContent = record.usage;
    dom.detailAvoid.textContent = record.avoid;
    dom.detailContext.textContent = [...record.characters, ...record.scenes, ...record.styles].slice(0, 10).join(" · ") || "以画面为准";
    dom.detailEvidence.textContent = `${record.sourceLabel} · ${record.imageRights}`;
    dom.detailSource.href = record.sourceUrl;
    dom.detailSource.hidden = !record.sourceUrl;
    dom.dialog.dataset.recordId = record.id;
    history.replaceState(null, "", `${location.pathname}${location.search}#${encodeURIComponent(record.id)}`);
    dom.dialog.showModal();
  }

  async function copyUrl(button) {
    const text = location.href;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    const previous = button.textContent;
    button.textContent = "已复制";
    window.setTimeout(() => { button.textContent = previous; }, 1200);
  }

  const rightsOptions = RIGHTS_ORDER.filter((rights) => rights === "全部" || rightsCounts.get(rights));
  dom.rights.replaceChildren(...rightsOptions.map((rights) => {
    const option = document.createElement("option");
    option.value = rights;
    option.textContent = rights === "全部" ? "全部版权路径" : rights;
    return option;
  }));

  let searchTimer;
  dom.search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => updateState({ q: dom.search.value, page: 1 }), 120);
  });
  dom.kind.addEventListener("change", () => updateState({ kind: dom.kind.value, page: 1 }));
  dom.rights.addEventListener("change", () => updateState({ rights: dom.rights.value, page: 1 }));
  dom.sort.addEventListener("change", () => updateState({ sort: dom.sort.value, page: 1 }));
  dom.prev.addEventListener("click", () => updateState({ page: Math.max(1, state.page - 1) }));
  dom.next.addEventListener("click", () => updateState({ page: state.page + 1 }));
  dom.reset.addEventListener("click", () => updateState({ q: "", tag: "全部", kind: "主档", rights: "全部", sort: "type", page: 1 }));
  dom.emptyReset.addEventListener("click", () => updateState({ q: "", tag: "全部", kind: "主档", rights: "全部", page: 1 }));
  dom.copyFilter.addEventListener("click", () => copyUrl(dom.copyFilter));
  dom.copyItem.addEventListener("click", () => copyUrl(dom.copyItem));
  dom.dialog.addEventListener("close", () => history.replaceState(null, "", `${location.pathname}${location.search}`));

  render();
  const requestedId = decodeURIComponent(location.hash.slice(1));
  const requested = records.find((record) => record.id === requestedId);
  if (requested) openDetail(requested);
})();
