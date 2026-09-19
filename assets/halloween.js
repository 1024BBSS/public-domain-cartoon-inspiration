(() => {
  const data = window.PUBLIC_DOMAIN_HALLOWEEN_DATA;
  if (!data) return;

  const $ = (id) => document.getElementById(id);
  const dom = {
    meta: $("top-meta"),
    modes: $("mode-tabs"),
    lanes: $("lane-tabs"),
    scope: $("scope-strip"),
    search: $("search"),
    title: $("result-title"),
    count: $("result-count"),
    note: $("result-note"),
    works: $("work-grid"),
    signals: $("signal-grid"),
    empty: $("empty-state"),
    dialog: $("detail-dialog"),
    detailImages: $("detail-images"),
    detailLane: $("detail-lane"),
    detailTitle: $("detail-title"),
    detailSubtitle: $("detail-subtitle"),
    detailBadges: $("detail-badges"),
    detailUse: $("detail-use"),
    detailAvoid: $("detail-avoid"),
    detailStyles: $("detail-styles"),
    detailEvidence: $("detail-evidence"),
    detailSource: $("detail-source"),
    detailSearch: $("detail-search"),
  };

  const params = new URLSearchParams(location.search);
  const state = {
    view: ["classic", "trend", "blocked"].includes(params.get("view")) ? params.get("view") : "classic",
    lane: params.get("lane") || "全部",
    q: params.get("q") || "",
  };

  const modeConfig = [
    { id: "classic", label: "可用原画", count: data.counts.works },
    { id: "trend", label: "近 15 天趋势", count: data.counts.signals },
    { id: "blocked", label: "IP-BLOCK", count: data.counts.blocked },
  ];

  const normalize = (value) => String(value || "").normalize("NFKC").toLowerCase();
  const textMatch = (item, q) => {
    if (!q) return true;
    const text = normalize(Object.values(item).flat(4).filter((value) => typeof value !== "object").join(" "));
    return text.includes(normalize(q));
  };

  function syncUrl() {
    const next = new URL(location.href);
    next.search = "";
    if (state.view !== "classic") next.searchParams.set("view", state.view);
    if (state.lane !== "全部" && state.view === "classic") next.searchParams.set("lane", state.lane);
    if (state.q) next.searchParams.set("q", state.q);
    history.replaceState(null, "", next);
  }

  function button(label, count, active, onClick, className) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = `${className}${active ? " is-active" : ""}`;
    node.innerHTML = `${label}<span class="${className}__count">${count}</span>`;
    node.addEventListener("click", onClick);
    return node;
  }

  function renderModes() {
    dom.modes.replaceChildren(...modeConfig.map((mode) => button(
      mode.label,
      mode.count,
      state.view === mode.id,
      () => {
        state.view = mode.id;
        state.lane = "全部";
        render();
      },
      "mode-button",
    )));
  }

  function renderLanes() {
    if (state.view !== "classic") {
      dom.lanes.hidden = true;
      return;
    }
    dom.lanes.hidden = false;
    const counts = data.works.reduce((map, work) => map.set(work.lane, (map.get(work.lane) || 0) + 1), new Map());
    const lanes = [["全部", data.works.length], ...[...counts.entries()].sort((a, b) => b[1] - a[1])];
    dom.lanes.replaceChildren(...lanes.map(([lane, count]) => button(
      lane,
      count,
      state.lane === lane,
      () => {
        state.lane = lane;
        render();
      },
      "lane-button",
    )));
  }

  function imageGrid(work) {
    const media = document.createElement("div");
    media.className = `work-card__media${work.images.length === 1 ? " is-single" : ""}`;
    for (const image of work.images.slice(0, 4)) {
      const img = document.createElement("img");
      img.src = image.image;
      img.alt = `${work.title} · ${image.subtitle}`;
      img.loading = "lazy";
      media.append(img);
    }
    const count = document.createElement("span");
    count.className = "work-card__count";
    count.textContent = `${work.imageCount} 画面`;
    media.append(count);
    return media;
  }

  function openWork(work) {
    dom.detailImages.className = `detail-media detail-media--grid${work.images.length === 1 ? " is-single" : ""}`;
    dom.detailImages.replaceChildren(...work.images.map((image) => {
      const img = document.createElement("img");
      img.src = image.image;
      img.alt = `${work.title} · ${image.subtitle}`;
      return img;
    }));
    dom.detailLane.textContent = `${work.lane} · ${work.year}`;
    dom.detailTitle.textContent = work.title;
    dom.detailSubtitle.textContent = work.subtitle || work.characters.join(" · ");
    dom.detailBadges.replaceChildren(...[
      [work.rightsStatus, "badge badge--ok"],
      [`证据 ${work.evidenceLevel}`, "badge"],
      [work.awarenessLevel, "badge"],
    ].map(([label, className]) => {
      const span = document.createElement("span");
      span.className = className;
      span.textContent = label;
      return span;
    }));
    dom.detailUse.textContent = work.usage;
    dom.detailAvoid.textContent = work.avoid;
    dom.detailStyles.textContent = work.styles.join(" · ");
    dom.detailEvidence.textContent = `${work.copyrightRoute}；${work.imageRights}`;
    dom.detailSource.href = work.sourceUrl;
    dom.detailSearch.href = `index.html?view=images&q=${encodeURIComponent(work.title)}`;
    dom.dialog.showModal();
  }

  function workCard(work) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "work-card";
    card.append(imageGrid(work));
    const body = document.createElement("div");
    body.className = "work-card__body";
    body.innerHTML = `
      <div class="work-card__eyebrow">${work.lane} · ${work.year}</div>
      <h2 class="work-card__title">${work.title}</h2>
      <p class="work-card__summary">${work.usage}</p>
      <div class="work-card__meta"><span>${work.rightsStatus}</span><span>证据 ${work.evidenceLevel}</span></div>
    `;
    card.append(body);
    card.addEventListener("click", () => openWork(work));
    return card;
  }

  function externalLinks(items) {
    const wrap = document.createElement("div");
    wrap.className = "signal-card__links";
    for (const item of (items || []).slice(0, 4)) {
      const link = document.createElement("a");
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = item.label;
      wrap.append(link);
    }
    return wrap;
  }

  function signalCard(item, blocked = false) {
    const card = document.createElement("article");
    card.className = `signal-card${blocked ? " signal-card--blocked" : ""}`;
    const examples = blocked ? item.examples : item.visualGrammar;
    const sources = blocked ? item.sources : item.evidence;
    card.innerHTML = `
      <div class="signal-card__eyebrow">${blocked ? "受保护参照" : item.lane} <span class="signal-card__rank">${blocked ? "" : `#${item.rank}`}</span></div>
      <h2 class="signal-card__title">${item.title}</h2>
      <p class="signal-card__summary">${blocked ? item.signal : item.summary}</p>
      <div class="signal-card__tags">${examples.map((value) => `<span class="mini-tag">${value}</span>`).join("")}</div>
      <p class="signal-card__bridge"><strong>${blocked ? "可观察" : "公版桥接"}</strong>：${blocked ? item.use : item.publicDomainBridge.join(" · ")}</p>
      <span class="${blocked ? "badge badge--danger" : "badge"}">${item.status}</span>
    `;
    card.append(externalLinks(sources));
    return card;
  }

  function renderScope() {
    dom.scope.className = `scope-strip${state.view === "blocked" ? " is-blocked" : state.view === "trend" ? " is-trend" : ""}`;
    if (state.view === "classic") {
      dom.scope.innerHTML = '<span class="scope-strip__status">可看图再开发</span><span>只列具体公版版本与开放馆藏；现代角色、后期造型、商标和现代录音仍分开核验。</span>';
    } else if (state.view === "trend") {
      dom.scope.innerHTML = `<span class="scope-strip__status">观察样本</span><span>${data.trend.window.from}—${data.trend.window.to}；单日搜索快照，不代表平台增长率或销量。</span>`;
    } else {
      dom.scope.innerHTML = '<span class="scope-strip__status">不可直接商品化</span><span>这些条目只说明当下传播线索；角色、面具、名称、音乐、海报和官方商品均不得照搬。</span>';
    }
  }

  function render() {
    syncUrl();
    renderModes();
    renderLanes();
    renderScope();
    dom.search.value = state.q;
    dom.works.hidden = state.view !== "classic";
    dom.signals.hidden = state.view === "classic";
    dom.empty.hidden = true;

    if (state.view === "classic") {
      const list = data.works.filter((work) => (state.lane === "全部" || work.lane === state.lane) && textMatch(work, state.q));
      dom.title.textContent = state.lane === "全部" ? "经典画面" : state.lane;
      dom.count.textContent = list.length;
      dom.note.textContent = `${list.reduce((sum, work) => sum + work.imageCount, 0)} 张图`;
      dom.works.replaceChildren(...list.map(workCard));
      dom.empty.hidden = list.length > 0;
    } else {
      const blocked = state.view === "blocked";
      const source = blocked ? data.trend.blocked : data.trend.signals;
      const list = source.filter((item) => textMatch(item, state.q));
      dom.title.textContent = blocked ? "受保护参照" : "近 15 天趋势";
      dom.count.textContent = list.length;
      dom.note.textContent = blocked ? "只看机制" : "TikTok 公开样本";
      dom.signals.replaceChildren(...list.map((item) => signalCard(item, blocked)));
      dom.empty.hidden = list.length > 0;
    }
  }

  dom.meta.textContent = `${data.counts.works} 作品 · ${data.counts.images} 画面 · ${data.counts.signals} 趋势`;
  dom.search.addEventListener("input", () => {
    state.q = dom.search.value.trim();
    render();
  });
  $("empty-reset").addEventListener("click", () => {
    state.q = "";
    state.lane = "全部";
    render();
  });
  $("copy-page").addEventListener("click", async (event) => {
    try {
      await navigator.clipboard.writeText(location.href);
      event.currentTarget.textContent = "已复制";
      setTimeout(() => { event.currentTarget.textContent = "复制当前页"; }, 1200);
    } catch {
      event.currentTarget.textContent = "复制失败";
    }
  });

  render();
})();
