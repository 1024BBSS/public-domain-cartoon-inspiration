(() => {
  "use strict";

  const dataset = window.ALBUM_RESEARCH_DATA || {};
  const records = Array.isArray(dataset.records) ? dataset.records : [];
  const $ = (selector) => document.querySelector(selector);
  const dom = {
    topMeta: $("#top-meta"), search: $("#search"), genre: $("#genre-select"), visual: $("#visual-select"),
    sort: $("#sort-select"), reset: $("#reset"), emptyReset: $("#empty-reset"),
    bucketFacets: $("#bucket-facets"), bucketTabs: $("#bucket-tabs"), viewFacets: $("#view-facets"),
    viewTabs: $("#view-tabs"), decadeFacets: $("#decade-facets"), genreChips: $("#genre-chips"),
    grid: $("#cover-grid"), artistGrid: $("#artist-grid"), empty: $("#empty-state"),
    resultTitle: $("#result-title"), resultCount: $("#result-count"), resultNote: $("#result-note"),
    copyFilter: $("#copy-filter"), pager: $("#pager"), prev: $("#prev-page"), next: $("#next-page"), pagerStatus: $("#pager-status"),
    dialog: $("#detail-dialog"), detailImage: $("#detail-image"), detailKind: $("#detail-kind"),
    detailTitle: $("#detail-title"), detailSubtitle: $("#detail-subtitle"), detailBadges: $("#detail-badges"),
    detailReason: $("#detail-reason"), detailGrammar: $("#detail-grammar"), detailUse: $("#detail-use"), detailGate: $("#detail-gate"),
    detailVisual: $("#detail-visual"), detailLicense: $("#detail-license"), viewArtist: $("#view-artist"), copyItem: $("#copy-item"),
  };

  const normalize = (value) => String(value || "").normalize("NFKC").toLocaleLowerCase("zh-CN").replace(/\s+/g, " ").trim();
  const compact = (values) => [...new Set(values.filter(Boolean))];
  const byLocale = (a, b) => String(a).localeCompare(String(b), "zh-CN", { numeric: true });
  const BUCKETS = [
    ["license-only", "经典封面 · 需授权"],
    ["public-domain", "公版封面源流"],
    ["eagle-rock-lineage", "鹰翼摇滚脉络"],
    ["western-country-lineage", "西部乡村脉络"],
  ];
  const VIEWS = [["covers", "封面"], ["artists", "艺人"]];
  const bucketIds = BUCKETS.map(([id]) => id);
  const curatedBuckets = new Set(["eagle-rock-lineage", "western-country-lineage"]);
  const decadeOf = (item) => item.decade || `${Math.floor(Number(String(item.year).match(/\d{4}/)?.[0] || 0) / 10) * 10}s`;
  const genreOf = (item) => item.genreGroup || item.genre || "其他";

  for (const item of records) {
    item._search = normalize([
      item.title, item.artist, item.year, item.decade, item.genre, item.genreGroup, item.visualFamily,
      item.visualType, item.grammar, item.classicReason, item.opportunity, item.licenseStatus, item.pathStatus,
    ].filter(Boolean).join(" "));
  }

  function readState() {
    const query = new URLSearchParams(location.search);
    const bucket = bucketIds.includes(query.get("bucket")) ? query.get("bucket") : "license-only";
    const defaultSort = curatedBuckets.has(bucket) ? "curated" : "curated";
    return {
      bucket,
      view: ["covers", "artists"].includes(query.get("view")) ? query.get("view") : "covers",
      decade: query.get("decade") || "全部",
      genre: query.get("genre") || "全部",
      visual: query.get("visual") || "全部",
      artist: query.get("artist") || "",
      q: query.get("q") || "",
      sort: ["curated", "year", "title", "artist", "score"].includes(query.get("sort")) ? query.get("sort") : defaultSort,
      page: Math.max(1, Number(query.get("page")) || 1),
      item: query.get("item") || "",
    };
  }
  let state = readState();
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
    image.addEventListener("error", () => {
      image.hidden = true;
      image.parentElement?.classList.add("is-image-missing");
    }, { once: true });
    return image;
  }
  function bucketLabel(value) { return BUCKETS.find(([id]) => id === value)?.[1] || value; }
  function writeState(replace = false) {
    const query = new URLSearchParams();
    if (state.bucket !== "license-only") query.set("bucket", state.bucket);
    if (state.view !== "covers") query.set("view", state.view);
    if (state.decade !== "全部") query.set("decade", state.decade);
    if (state.genre !== "全部") query.set("genre", state.genre);
    if (state.visual !== "全部") query.set("visual", state.visual);
    if (state.artist) query.set("artist", state.artist);
    if (state.q) query.set("q", state.q);
    if (state.sort !== "curated") query.set("sort", state.sort);
    if (state.page > 1) query.set("page", String(state.page));
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
  function genres() { return compact(bucketRecords().map(genreOf)).sort(byLocale); }
  function visuals() { return compact(bucketRecords().map((item) => item.visualFamily)).sort(byLocale); }
  function decades() {
    return compact(bucketRecords().map(decadeOf).filter((value) => /^\d{4}s$/.test(value))).sort();
  }
  function yearSort(value) {
    const fullYear = String(value || "").match(/(?:^|\D)((?:1[0-9]{3}|20[0-9]{2}))(?:\D|$)/);
    return fullYear ? Number(fullYear[1]) : 9999;
  }
  function filteredAlbums({ ignoreArtist = false } = {}) {
    const q = normalize(state.q);
    const source = bucketRecords().filter((item) => {
      if (q && !item._search.includes(q)) return false;
      if (state.decade !== "全部" && decadeOf(item) !== state.decade) return false;
      if (state.genre !== "全部" && genreOf(item) !== state.genre) return false;
      if (state.visual !== "全部" && item.visualFamily !== state.visual) return false;
      if (!ignoreArtist && state.artist && item.artist !== state.artist) return false;
      return true;
    });
    if (state.sort === "curated") return [...source].sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));
    return [...source].sort((a, b) => {
      if (state.sort === "title") return byLocale(a.title, b.title);
      if (state.sort === "artist") return byLocale(a.artist, b.artist) || yearSort(a.year) - yearSort(b.year);
      if (state.sort === "score") return Number(b.classicScore || 0) - Number(a.classicScore || 0) || yearSort(a.year) - yearSort(b.year);
      return yearSort(a.year) - yearSort(b.year) || byLocale(a.title, b.title);
    });
  }
  function artistGroups() {
    const groups = new Map();
    for (const item of filteredAlbums({ ignoreArtist: true })) {
      const name = item.artist || "未知艺人";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(item);
    }
    return [...groups.entries()].map(([artist, albums]) => ({ artist, albums }))
      .sort((a, b) => b.albums.length - a.albums.length || byLocale(a.artist, b.artist));
  }

  function fillSelect(select, label, values, selected) {
    select.replaceChildren(el("option", "", label), ...values.map((value) => el("option", "", value)));
    select.options[0].value = "全部";
    for (let index = 1; index < select.options.length; index += 1) select.options[index].value = values[index - 1];
    select.value = values.includes(selected) ? selected : "全部";
  }

  function renderFacets() {
    dom.bucketFacets.replaceChildren();
    dom.bucketTabs.replaceChildren();
    for (const [id, label] of BUCKETS) {
      const count = bucketRecords(id).length;
      const activate = () => setState({ bucket: id, view: "covers", decade: "全部", genre: "全部", visual: "全部", artist: "", q: "", sort: "curated", page: 1, item: "" });
      dom.bucketFacets.append(facet(label, count, state.bucket === id, activate));
      dom.bucketTabs.append(facet(label, count, state.bucket === id, activate, true));
    }

    dom.viewFacets.replaceChildren();
    dom.viewTabs.replaceChildren();
    for (const [id, label] of VIEWS) {
      const count = id === "covers" ? filteredAlbums().length : artistGroups().length;
      const activate = () => setState({ view: id, artist: id === "artists" ? "" : state.artist, page: 1, item: "" });
      dom.viewFacets.append(facet(label, count, state.view === id, activate));
      dom.viewTabs.append(facet(label, count, state.view === id, activate, true));
    }

    dom.decadeFacets.replaceChildren();
    for (const decade of ["全部", ...decades()]) {
      const count = bucketRecords().filter((item) => decade === "全部" || decadeOf(item) === decade).length;
      dom.decadeFacets.append(facet(decade === "全部" ? "全部年代" : decade, count, state.decade === decade, () => setState({ decade, page: 1, item: "" })));
    }

    dom.genreChips.replaceChildren();
    for (const genre of ["全部", ...genres()]) {
      const count = bucketRecords().filter((item) => genre === "全部" || genreOf(item) === genre).length;
      dom.genreChips.append(facet(genre === "全部" ? "全部类型" : genre, count, state.genre === genre, () => setState({ genre, page: 1, artist: "", item: "" }), true));
    }
  }

  function coverCard(item) {
    const node = button("", "cover-card", () => open(item));
    const media = el("span", "cover-card__media");
    media.append(imageNode(item.image, `${item.artist || ""} ${item.title}`.trim()));
    media.append(el("span", "cover-card__status", item.canonTier || item.licenseStatus || item.pathStatus));
    const body = el("span", "cover-card__body");
    body.append(el("span", "cover-card__title", item.title));
    body.append(el("span", "cover-card__artist", item.artist || item.visualType));
    const meta = el("span", "cover-card__meta");
    meta.append(el("span", "", item.year), el("span", "", item.genreGroup || item.visualType || item.genre));
    body.append(meta);
    node.append(media, body);
    return node;
  }

  function artistCard(group) {
    const node = button("", "artist-card", () => setState({ view: "covers", artist: group.artist, q: "", page: 1, item: "" }));
    const mosaic = el("span", `artist-card__mosaic artist-card__mosaic--${Math.min(group.albums.length, 4)}`);
    for (const item of group.albums.slice(0, 4)) mosaic.append(imageNode(item.image, `${group.artist} · ${item.title}`));
    const years = group.albums.map((item) => yearSort(item.year)).filter((year) => year !== 9999);
    const range = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "年代待核";
    const body = el("span", "artist-card__body");
    body.append(el("span", "artist-card__title", group.artist));
    body.append(el("span", "artist-card__meta", `${group.albums.length} 张 · ${range}`));
    node.append(mosaic, body);
    return node;
  }

  function render() {
    dom.search.value = state.q;
    dom.sort.value = state.sort;
    fillSelect(dom.genre, "全部类型", genres(), state.genre);
    fillSelect(dom.visual, "全部视觉方法", visuals(), state.visual);
    renderFacets();

    const source = state.view === "artists" ? artistGroups() : filteredAlbums();
    const perPage = state.view === "artists" ? 28 : 40;
    const pageCount = Math.max(1, Math.ceil(source.length / perPage));
    if (state.page > pageCount) state.page = pageCount;
    const pageItems = source.slice((state.page - 1) * perPage, state.page * perPage);

    dom.grid.hidden = state.view !== "covers";
    dom.artistGrid.hidden = state.view !== "artists";
    if (state.view === "covers") dom.grid.replaceChildren(...pageItems.map(coverCard));
    else dom.artistGrid.replaceChildren(...pageItems.map(artistCard));

    dom.empty.hidden = source.length > 0;
    dom.pager.hidden = source.length <= perPage;
    dom.prev.disabled = state.page <= 1;
    dom.next.disabled = state.page >= pageCount;
    dom.pagerStatus.textContent = `${state.page} / ${pageCount}`;

    const title = state.artist || (state.view === "artists" ? "艺人" : bucketLabel(state.bucket));
    dom.resultTitle.textContent = title;
    dom.resultCount.textContent = String(source.length);
    dom.resultNote.textContent = state.bucket === "license-only"
      ? "封面研究 · 禁止直接生产"
      : state.bucket === "public-domain"
        ? "具体图源仍按证据级别复核"
        : "专辑参考 + 公版历史母题";

    const classic = bucketRecords("license-only");
    const country = classic.filter((item) => item.genreGroup === "Country / Americana").length;
    dom.topMeta.textContent = `${classic.length} 封面 · ${compact(classic.map((item) => item.artist)).length} 艺人 · ${country} 乡村`;
    document.title = `${title}｜经典专辑封面`;

    if (state.item) {
      const item = records.find((candidate) => candidate.id === state.item);
      if (item && !dom.dialog.open) open(item, true);
      else if (!item) setState({ item: "" }, true);
    }
  }

  function badge(text, ok = false) { return el("span", `badge${ok ? " badge--ok" : ""}`, text); }
  function open(item, fromRoute = false) {
    current = item;
    if (!fromRoute) {
      state.item = item.id;
      writeState();
    }
    dom.detailImage.hidden = false;
    dom.detailImage.src = item.image;
    dom.detailImage.alt = `${item.artist || ""} ${item.title}`.trim();
    dom.detailImage.referrerPolicy = "no-referrer";
    dom.detailKind.textContent = item.canonTier || bucketLabel(item.bucket);
    dom.detailTitle.textContent = item.title;
    dom.detailSubtitle.textContent = [item.artist, item.year, item.genre].filter(Boolean).join(" · ");
    dom.detailBadges.replaceChildren(
      badge(item.licenseStatus || "研究参考", item.bucket === "public-domain"),
      item.classicScore ? badge(`经典度 ${item.classicScore}`) : badge(item.pathStatus || item.evidenceLevel || "待复核"),
      badge(item.genreGroup || item.visualFamily || "其他"),
    );
    dom.detailReason.textContent = item.classicReason || item.trendSignal || "作为该艺术路径的视觉源流记录。";
    dom.detailGrammar.textContent = item.grammar || "待复核";
    dom.detailUse.textContent = item.opportunity || item.use || "待复核";
    dom.detailGate.textContent = item.rightsGate || item.avoid || "待复核";
    dom.detailVisual.href = item.visualSourceUrl || item.sourceUrl;
    dom.detailVisual.hidden = !(item.visualSourceUrl || item.sourceUrl);
    dom.detailLicense.href = item.licenseUrl || item.sourceUrl;
    dom.detailLicense.hidden = !(item.licenseUrl || item.sourceUrl);
    dom.viewArtist.hidden = !item.artist;
    if (!dom.dialog.open) dom.dialog.showModal();
  }

  async function copy(text, control) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const area = el("textarea");
      area.value = text;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    const previous = control.textContent;
    control.textContent = "已复制";
    setTimeout(() => { control.textContent = previous; }, 1200);
  }

  function reset() {
    setState({ bucket: "license-only", view: "covers", decade: "全部", genre: "全部", visual: "全部", artist: "", q: "", sort: "curated", page: 1, item: "" });
  }

  dom.search.addEventListener("input", () => setState({ q: dom.search.value, artist: "", page: 1, item: "" }, true));
  dom.genre.addEventListener("change", () => setState({ genre: dom.genre.value, artist: "", page: 1, item: "" }));
  dom.visual.addEventListener("change", () => setState({ visual: dom.visual.value, page: 1, item: "" }));
  dom.sort.addEventListener("change", () => setState({ sort: dom.sort.value, page: 1, item: "" }));
  dom.reset.addEventListener("click", reset);
  dom.emptyReset.addEventListener("click", reset);
  dom.prev.addEventListener("click", () => setState({ page: Math.max(1, state.page - 1), item: "" }));
  dom.next.addEventListener("click", () => setState({ page: state.page + 1, item: "" }));
  dom.copyFilter.addEventListener("click", (event) => copy(location.href, event.currentTarget));
  dom.viewArtist.addEventListener("click", () => {
    if (!current?.artist) return;
    dom.dialog.close();
    setState({ view: "covers", artist: current.artist, q: "", page: 1, item: "" });
  });
  dom.copyItem.addEventListener("click", (event) => current && copy([
    current.title, current.artist, current.year, current.genre, current.canonTier,
    current.classicReason, current.grammar, current.opportunity || current.use,
    current.rightsGate, current.visualSourceUrl || current.sourceUrl, current.licenseUrl,
  ].filter(Boolean).join("\n"), event.currentTarget));
  dom.dialog.addEventListener("close", () => {
    if (state.item) {
      state.item = "";
      writeState(true);
    }
  });
  window.addEventListener("popstate", () => {
    state = readState();
    if (dom.dialog.open) dom.dialog.close();
    render();
  });

  if (!records.length) {
    dom.empty.hidden = false;
    dom.empty.querySelector(".empty__title").textContent = "数据未载入";
  } else {
    render();
  }
})();
