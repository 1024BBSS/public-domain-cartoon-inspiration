(() => {
  "use strict";

  const dataset = window.ALBUM_RESEARCH_DATA || {};
  const records = Array.isArray(dataset.records) ? dataset.records : [];
  const $ = (selector) => document.querySelector(selector);
  const dom = {
    topMeta: $("#top-meta"), search: $("#search"), sort: $("#sort-select"), reset: $("#reset"),
    emptyReset: $("#empty-reset"), bucketFacets: $("#bucket-facets"), typeFacets: $("#type-facets"),
    bucketTabs: $("#bucket-tabs"), typeChips: $("#type-chips"), grid: $("#cover-grid"), empty: $("#empty-state"),
    resultTitle: $("#result-title"), resultCount: $("#result-count"), resultNote: $("#result-note"), copyFilter: $("#copy-filter"),
    dialog: $("#detail-dialog"), detailImage: $("#detail-image"), detailKind: $("#detail-kind"),
    detailTitle: $("#detail-title"), detailSubtitle: $("#detail-subtitle"), detailBadges: $("#detail-badges"),
    detailGrammar: $("#detail-grammar"), detailUse: $("#detail-use"), detailSignal: $("#detail-signal"), detailGate: $("#detail-gate"),
    detailVisual: $("#detail-visual"), detailLicense: $("#detail-license"), copyItem: $("#copy-item"),
  };
  const normalize = (value) => String(value || "").normalize("NFKC").toLocaleLowerCase("zh-CN").replace(/\s+/g, " ").trim();
  const compact = (values) => [...new Set(values.filter(Boolean))];
  const byLocale = (a, b) => String(a).localeCompare(String(b), "zh-CN", { numeric: true });
  const BUCKETS = [
    ["public-domain", "公版封面源流"],
    ["license-only", "近70年经典 · 需授权"],
    ["eagle-rock-lineage", "鹰翼摇滚脉络"],
    ["western-country-lineage", "西部乡村脉络"],
  ];
  const bucketIds = BUCKETS.map(([id]) => id);
  const curatedBuckets = new Set(["eagle-rock-lineage", "western-country-lineage"]);
  for (const item of records) item._search = normalize([
    item.title, item.artist, item.year, item.genre, item.visualFamily, item.visualType,
    item.grammar, item.opportunity, item.trendSignal, item.licenseStatus, item.pathStatus,
  ].filter(Boolean).join(" "));

  function params() {
    const query = new URLSearchParams(location.search);
    const bucket = bucketIds.includes(query.get("bucket")) ? query.get("bucket") : "public-domain";
    const defaultSort = curatedBuckets.has(bucket) ? "curated" : "year";
    return {
      bucket,
      type: query.get("type") || "全部",
      q: query.get("q") || "",
      sort: ["curated", "year", "title", "type"].includes(query.get("sort")) ? query.get("sort") : defaultSort,
      item: query.get("item") || "",
    };
  }
  let state = params();
  let current = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function button(label, className, onClick) {
    const node = el("button", className, label);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }
  function imageNode(src, alt) {
    const image = el("img");
    image.src = src || "";
    image.alt = alt || "";
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => { image.hidden = true; image.parentElement?.classList.add("is-image-missing"); }, { once: true });
    return image;
  }
  function bucketLabel(value) { return BUCKETS.find(([id]) => id === value)?.[1] || value; }
  function yearSort(value) {
    const text = String(value || "");
    const fullYear = text.match(/(?:^|\D)((?:1[0-9]{3}|20[0-9]{2}))(?:\D|$)/);
    if (fullYear) return Number(fullYear[1]);
    const century = text.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+century\b/i);
    return century ? (Number(century[1]) - 1) * 100 : 9999;
  }
  function writeState(replace = false) {
    const query = new URLSearchParams();
    if (state.bucket !== "public-domain") query.set("bucket", state.bucket);
    if (state.type !== "全部") query.set("type", state.type);
    if (state.q) query.set("q", state.q);
    const defaultSort = curatedBuckets.has(state.bucket) ? "curated" : "year";
    if (state.sort !== defaultSort) query.set("sort", state.sort);
    if (state.item) query.set("item", state.item);
    history[replace ? "replaceState" : "pushState"](null, "", `${location.pathname}${query.size ? `?${query}` : ""}`);
  }
  function setState(patch, replace = false) {
    state = { ...state, ...patch };
    writeState(replace);
    render();
  }
  function facet(label, count, active, onClick, inline = false) {
    const node = button("", `facet-button${active ? " is-active" : ""}${inline ? " facet-button--inline" : ""}`, onClick);
    node.append(el("span", "", label), el("span", "facet-count", count));
    return node;
  }
  function bucketRecords(bucket = state.bucket) { return records.filter((item) => item.bucket === bucket); }
  function types() { return compact(bucketRecords().map((item) => item.visualFamily)).sort(byLocale); }
  function filtered() {
    const q = normalize(state.q);
    const source = bucketRecords().filter((item) => (!q || item._search.includes(q)) && (state.type === "全部" || item.visualFamily === state.type));
    if (state.sort === "curated") return source;
    return [...source].sort((a, b) => {
      if (state.sort === "title") return byLocale(a.title, b.title);
      if (state.sort === "type") return byLocale(a.visualFamily, b.visualFamily) || byLocale(a.visualType, b.visualType) || byLocale(a.title, b.title);
      return yearSort(a.year) - yearSort(b.year) || byLocale(a.title, b.title);
    });
  }
  function renderFacets() {
    dom.bucketFacets.replaceChildren(); dom.bucketTabs.replaceChildren();
    for (const [id, label] of BUCKETS) {
      const count = bucketRecords(id).length;
      const activate = () => setState({ bucket: id, type: "全部", sort: curatedBuckets.has(id) ? "curated" : "year", item: "" });
      dom.bucketFacets.append(facet(label, count, state.bucket === id, activate));
      dom.bucketTabs.append(facet(label, count, state.bucket === id, activate, true));
    }
    dom.typeFacets.replaceChildren(); dom.typeChips.replaceChildren();
    for (const type of ["全部", ...types()]) {
      const count = bucketRecords().filter((item) => type === "全部" || item.visualFamily === type).length;
      const activate = () => setState({ type, item: "" });
      dom.typeFacets.append(facet(type, count, state.type === type, activate));
      dom.typeChips.append(facet(type, count, state.type === type, activate, true));
    }
  }
  function card(item) {
    const node = button("", "cover-card", () => open(item));
    const media = el("span", "cover-card__media");
    media.append(imageNode(item.image, item.title), el("span", "cover-card__status", item.licenseStatus));
    const body = el("span", "cover-card__body");
    body.append(el("span", "cover-card__title", item.title));
    body.append(el("span", "cover-card__artist", item.artist || item.visualType));
    const meta = el("span", "cover-card__meta");
    meta.append(el("span", "", item.year), el("span", "", item.visualType));
    body.append(meta); node.append(media, body); return node;
  }
  function render() {
    dom.search.value = state.q; dom.sort.value = state.sort;
    renderFacets();
    const items = filtered();
    dom.grid.replaceChildren(...items.map(card));
    dom.empty.hidden = items.length > 0;
    dom.resultTitle.textContent = bucketLabel(state.bucket);
    dom.resultCount.textContent = String(items.length);
    dom.resultNote.textContent = state.bucket === "public-domain"
      ? "图源在 Eagle"
      : state.bucket === "eagle-rock-lineage"
        ? "周边 + 专辑 + 公版母题"
        : state.bucket === "western-country-lineage"
          ? "女装 + 专辑 + 公版母题"
        : "研究缩略图 · 禁止生产";
    dom.topMeta.textContent = `${bucketRecords("public-domain").length} 公版 · ${bucketRecords("license-only").length} 授权 · ${bucketRecords("eagle-rock-lineage").length} 鹰翼 · ${bucketRecords("western-country-lineage").length} 西部`;
    document.title = `${bucketLabel(state.bucket)}｜音乐视觉研究`;
    if (state.item) {
      const item = records.find((candidate) => candidate.id === state.item);
      if (item) open(item, true);
      else setState({ item: "" }, true);
    }
  }
  function badge(text, ok = false) { return el("span", `badge${ok ? " badge--ok" : ""}`, text); }
  function open(item, fromRoute = false) {
    current = item;
    if (!fromRoute) { state.item = item.id; writeState(); }
    dom.detailImage.hidden = false; dom.detailImage.src = item.image; dom.detailImage.alt = item.title; dom.detailImage.referrerPolicy = "no-referrer";
    dom.detailKind.textContent = bucketLabel(item.bucket);
    dom.detailTitle.textContent = item.title;
    dom.detailSubtitle.textContent = [item.artist, item.year, item.genre].filter(Boolean).join(" · ");
    dom.detailBadges.replaceChildren(badge(item.licenseStatus, item.bucket === "public-domain" || item.licenseStatus === "公版母题"), badge(item.pathStatus || item.evidenceLevel));
    dom.detailGrammar.textContent = item.grammar || "待复核";
    dom.detailUse.textContent = item.opportunity || item.use || "待复核";
    dom.detailSignal.textContent = item.trendSignal || "无市场信号；仅作艺术研究。";
    dom.detailGate.textContent = item.rightsGate || item.avoid || "待复核";
    dom.detailVisual.href = item.visualSourceUrl || item.sourceUrl; dom.detailVisual.hidden = !(item.visualSourceUrl || item.sourceUrl);
    dom.detailLicense.href = item.licenseUrl || item.sourceUrl; dom.detailLicense.hidden = !(item.licenseUrl || item.sourceUrl);
    if (!dom.dialog.open) dom.dialog.showModal();
  }
  async function copy(text, control) {
    try { await navigator.clipboard.writeText(text); }
    catch { const area = el("textarea"); area.value = text; document.body.append(area); area.select(); document.execCommand("copy"); area.remove(); }
    const previous = control.textContent; control.textContent = "已复制"; setTimeout(() => { control.textContent = previous; }, 1200);
  }
  function reset() { setState({ bucket: "public-domain", type: "全部", q: "", sort: "year", item: "" }); }

  dom.search.addEventListener("input", () => setState({ q: dom.search.value, item: "" }, true));
  dom.sort.addEventListener("change", () => setState({ sort: dom.sort.value, item: "" }));
  dom.reset.addEventListener("click", reset); dom.emptyReset.addEventListener("click", reset);
  dom.copyFilter.addEventListener("click", (event) => copy(location.href, event.currentTarget));
  dom.copyItem.addEventListener("click", (event) => current && copy([current.title, current.artist, current.year, current.licenseStatus, current.grammar, current.opportunity || current.use, current.trendSignal, current.rightsGate, current.visualSourceUrl || current.sourceUrl, current.licenseUrl].filter(Boolean).join("\n"), event.currentTarget));
  dom.dialog.addEventListener("close", () => { if (state.item) { state.item = ""; writeState(true); } });
  window.addEventListener("popstate", () => { state = params(); render(); });
  if (!records.length) { dom.empty.hidden = false; dom.empty.querySelector(".empty__title").textContent = "数据未载入"; }
  else render();
})();
