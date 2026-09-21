(() => {
  "use strict";

  const dataset = window.CONSUMER_CALENDAR_DATA;
  if (!dataset?.events?.length) {
    document.body.textContent = "美国消费力日历数据载入失败。";
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const dom = {
    main: $("#main-content"),
    topMeta: $("#top-meta"),
    search: $("#search"),
    rangeSelect: $("#range-select"),
    typeSelect: $("#type-select"),
    prioritySelect: $("#priority-select"),
    reset: $("#reset"),
    emptyReset: $("#empty-reset"),
    copyFilter: $("#copy-filter"),
    rangeFacets: $("#range-facets"),
    typeFacets: $("#type-facets"),
    paydayToggle: $("#payday-toggle"),
    regionToggle: $("#region-toggle"),
    paydayPanel: $("#payday-panel"),
    regionPanel: $("#region-panel"),
    todayLabel: $("#today-label"),
    windowLabel: $("#window-label"),
    activeCount: $("#active-count"),
    nextAnchor: $("#next-anchor"),
    paydaySource: $("#payday-source"),
    paydayDistribution: $("#payday-distribution"),
    paydayAxis: $("#payday-axis"),
    eventAxis: $("#event-axis"),
    cashTrack: $("#cash-track"),
    paydayWarning: $("#payday-warning"),
    resultCount: $("#result-count"),
    rows: $("#event-rows"),
    empty: $("#empty-state"),
    detailType: $("#detail-type"),
    detailTitle: $("#detail-title"),
    detailSubtitle: $("#detail-subtitle"),
    detailStatus: $("#detail-status"),
    detailEvidence: $("#detail-evidence"),
    detailAudiences: $("#detail-audiences"),
    detailAngles: $("#detail-angles"),
    detailAvoid: $("#detail-avoid"),
    detailSource: $("#detail-source"),
    visualLinks: $("#visual-links"),
    operationList: $("#operation-list"),
    relatedIpGrid: $("#related-ip-grid"),
    regionVisible: $("#region-visible"),
    regionSelected: $("#region-selected"),
    regionSubtitle: $("#region-subtitle"),
    regionMap: $("#region-map"),
    regionRanking: $("#region-ranking"),
    regionNote: $("#region-note"),
    regionSource: $("#region-source"),
    regionWarning: $("#region-warning"),
  };

  const DAY = 86400000;
  const types = [...new Set(dataset.events.map((event) => event.type))];
  const typeOrder = ["零售节点", "节日 / 信仰", "文化社群", "体育 / 娱乐", "季节 / 生活", "公共纪念", "现金流"];
  types.sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));
  const rangeOptions = [
    { key: "90", label: "未来 90 天" },
    { key: "180", label: "未来 180 天" },
    { key: "all", label: "全部资料" },
  ];
  const regionKeys = ["west", "midwest", "northeast", "south"];
  const regionByKey = new Map(dataset.regionModel.regions.map((region) => [region.key, region]));

  const pad = (value) => String(value).padStart(2, "0");
  const localIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parseDate = (value) => new Date(`${value}T00:00:00`);
  const addDays = (date, days) => new Date(date.getTime() + days * DAY);
  const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / DAY);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const normalize = (value) => String(value || "").normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
  const formatDate = (value, withYear = false) => {
    if (!value) return "无单一当天";
    const date = parseDate(value);
    return `${withYear ? `${date.getFullYear()}.` : ""}${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
  };
  const formatRange = (start, end) => start === end ? formatDate(start, true) : `${formatDate(start, true)}–${formatDate(end, true)}`;
  const todayActual = new Date();
  todayActual.setHours(0, 0, 0, 0);
  const dataMin = dataset.events.reduce((min, event) => event.seasonStart < min ? event.seasonStart : min, dataset.events[0].seasonStart);
  const dataMax = dataset.events.reduce((max, event) => event.seasonEnd > max ? event.seasonEnd : max, dataset.events[0].seasonEnd);
  const actualIso = localIso(todayActual);
  const today = actualIso >= dataMin && actualIso <= dataMax ? todayActual : parseDate(dataset.asOf);
  const todayIso = localIso(today);

  let state = readState();
  let visibleEvents = [];
  let selectedEvent = null;
  let regionMode = "visible";

  function readState() {
    const params = new URLSearchParams(location.search);
    const requestedRange = params.get("range");
    const requestedType = params.get("type");
    return {
      q: params.get("q") || "",
      range: rangeOptions.some((item) => item.key === requestedRange) ? requestedRange : "90",
      type: types.includes(requestedType) ? requestedType : "全部",
      priority: ["0", "3", "4", "5"].includes(params.get("priority")) ? params.get("priority") : "4",
      event: params.get("event") || "",
      payday: params.get("payday") !== "0",
      region: params.get("region") !== "0",
    };
  }

  function writeState(replace = false) {
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.range !== "90") params.set("range", state.range);
    if (state.type !== "全部") params.set("type", state.type);
    if (state.priority !== "4") params.set("priority", state.priority);
    if (state.event) params.set("event", state.event);
    if (!state.payday) params.set("payday", "0");
    if (!state.region) params.set("region", "0");
    const query = params.toString();
    history[replace ? "replaceState" : "pushState"](null, "", `${location.pathname}${query ? `?${query}` : ""}`);
  }

  function setState(patch, replace = false) {
    state = { ...state, ...patch };
    writeState(replace);
    render();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function windowRange() {
    if (state.range === "all") return { start: parseDate(dataMin), end: parseDate(dataMax) };
    return { start: today, end: addDays(today, Number(state.range)) };
  }

  function searchText(event) {
    return normalize([
      event.nameZh,
      event.nameEn,
      event.type,
      event.audiences,
      event.productAngles,
      event.visualQueries,
      event.relatedIps?.flatMap((ip) => [ip.name, ip.nameZh, ip.category]),
    ].flat().join(" "));
  }

  function filteredEvents() {
    const { start, end } = windowRange();
    const startIso = localIso(start);
    const endIso = localIso(end);
    const q = normalize(state.q);
    const minPriority = Number(state.priority);
    return dataset.events.filter((event) => {
      if (event.seasonEnd < startIso || event.seasonStart > endIso) return false;
      if (state.type !== "全部" && event.type !== state.type) return false;
      if (minPriority && event.priority < minPriority) return false;
      if (q && !searchText(event).includes(q)) return false;
      return true;
    }).sort((a, b) => {
      const aDate = a.anchorDate || a.peakStart || a.seasonStart;
      const bDate = b.anchorDate || b.peakStart || b.seasonStart;
      return aDate.localeCompare(bDate) || b.priority - a.priority;
    });
  }

  function position(dateValue, range = windowRange()) {
    const total = Math.max(1, range.end - range.start);
    return clamp(((parseDate(dateValue) - range.start) / total) * 100, 0, 100);
  }

  function monthSegments(range = windowRange()) {
    const segments = [];
    const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    const endExclusive = addDays(range.end, 1);
    while (cursor < endExclusive) {
      const monthStart = cursor < range.start ? range.start : new Date(cursor);
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const monthEnd = nextMonth > endExclusive ? endExclusive : nextMonth;
      const left = ((monthStart - range.start) / (endExclusive - range.start)) * 100;
      const width = ((monthEnd - monthStart) / (endExclusive - range.start)) * 100;
      segments.push({
        left,
        width,
        label: `${cursor.getFullYear()}.${pad(cursor.getMonth() + 1)}`,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return segments;
  }

  function renderAxis(container) {
    const nodes = monthSegments().map((segment) => {
      const node = el("span", "axis-month", segment.label);
      node.style.left = `${segment.left}%`;
      node.style.width = `${segment.width}%`;
      return node;
    });
    container.replaceChildren(...nodes);
  }

  function guideNodes() {
    return monthSegments().slice(1).map((segment) => {
      const guide = el("i", "gantt-guide");
      guide.style.left = `${segment.left}%`;
      return guide;
    });
  }

  function adjustedWeekday(date) {
    const out = new Date(date);
    if (out.getDay() === 6) out.setDate(out.getDate() - 1);
    if (out.getDay() === 0) out.setDate(out.getDate() - 2);
    return out;
  }

  function lastBusinessDay(year, monthIndex) {
    return adjustedWeekday(new Date(year, monthIndex + 1, 0));
  }

  function paydayMarkers() {
    const range = windowRange();
    const markerMap = new Map();
    const add = (date, type, label) => {
      if (date < range.start || date > range.end) return;
      const key = localIso(date);
      if (!markerMap.has(key)) markerMap.set(key, { date, types: [], labels: [] });
      markerMap.get(key).types.push(type);
      markerMap.get(key).labels.push(label);
    };
    for (let cursor = new Date(range.start); cursor <= range.end; cursor = addDays(cursor, 1)) {
      if (cursor.getDay() === 5) add(cursor, "friday", "周五：周薪 + 一组双周薪常见窗口");
    }
    const monthCursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    while (monthCursor <= range.end) {
      const year = monthCursor.getFullYear();
      const month = monthCursor.getMonth();
      add(adjustedWeekday(new Date(year, month, 1)), "semi", "1 日附近：半月薪观察窗");
      add(adjustedWeekday(new Date(year, month, 15)), "semi", "15 日附近：半月薪观察窗");
      add(lastBusinessDay(year, month), "month", "月末：月薪 + 一部分半月薪观察窗");
      monthCursor.setMonth(monthCursor.getMonth() + 1);
    }
    return [...markerMap.values()].sort((a, b) => a.date - b.date);
  }

  function renderPayday() {
    dom.paydayPanel.hidden = !state.payday;
    if (!state.payday) return;
    const model = dataset.paydayModel;
    dom.paydaySource.href = model.sourceUrl;
    dom.paydayWarning.textContent = model.warning;
    dom.paydayDistribution.replaceChildren(...model.frequencies.map((item) => {
      const node = el("div", "payday-stat");
      node.append(el("strong", "", `${item.label} ${item.share}%`), el("span", "", item.timing));
      node.title = `${item.note}；单位：${model.unit}`;
      return node;
    }));
    renderAxis(dom.paydayAxis);
    const range = windowRange();
    dom.cashTrack.replaceChildren(...paydayMarkers().map((marker) => {
      const primaryType = marker.types.includes("month") ? "month" : marker.types.includes("semi") ? "semi" : "friday";
      const node = el("i", `cash-marker cash-marker--${primaryType}`);
      node.style.left = `${position(localIso(marker.date), range)}%`;
      node.append(el("span", "", `${formatDate(localIso(marker.date), true)} · ${marker.labels.join("；")}`));
      return node;
    }));
  }

  function priorityDots(priority) {
    const wrap = el("span", "priority-dots");
    for (let index = 1; index <= 5; index += 1) wrap.append(el("i", index <= priority ? "is-on" : ""));
    wrap.title = `运营强度 ${priority} / 5`;
    return wrap;
  }

  function eventDateLabel(event) {
    if (!event.anchorDate) return "连续";
    return formatDate(event.anchorDate);
  }

  function renderRows() {
    const range = windowRange();
    renderAxis(dom.eventAxis);
    const rows = visibleEvents.map((event) => {
      const row = el("article", "gantt-row");
      row.dataset.id = event.id;
      row.dataset.priority = event.priority;
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", `${event.nameZh}，${eventDateLabel(event)}`);
      if (selectedEvent?.id === event.id) row.classList.add("is-selected");

      const label = el("div", "gantt-label");
      label.append(el("span", "gantt-date", eventDateLabel(event)));
      const name = el("span", "gantt-name");
      name.append(el("strong", "", event.nameZh), el("span", "", `${event.type} · ${event.evidenceStatus}`));
      label.append(name, priorityDots(event.priority));

      const track = el("div", "gantt-track");
      track.append(...guideNodes());
      const seasonStart = event.seasonStart < localIso(range.start) ? localIso(range.start) : event.seasonStart;
      const seasonEnd = event.seasonEnd > localIso(range.end) ? localIso(range.end) : event.seasonEnd;
      const season = el("span", "season-bar");
      season.style.left = `${position(seasonStart, range)}%`;
      season.style.width = `${Math.max(0.35, position(seasonEnd, range) - position(seasonStart, range))}%`;
      season.title = `消费季 ${formatRange(event.seasonStart, event.seasonEnd)}`;
      track.append(season);

      if (event.peakEnd >= localIso(range.start) && event.peakStart <= localIso(range.end)) {
        const peakStart = event.peakStart < localIso(range.start) ? localIso(range.start) : event.peakStart;
        const peakEnd = event.peakEnd > localIso(range.end) ? localIso(range.end) : event.peakEnd;
        const peak = el("span", "peak-bar");
        peak.style.left = `${position(peakStart, range)}%`;
        peak.style.width = `${Math.max(0.35, position(peakEnd, range) - position(peakStart, range))}%`;
        peak.title = `建议高峰 ${formatRange(event.peakStart, event.peakEnd)}`;
        track.append(peak);
      }

      if (event.anchorDate && event.anchorDate >= localIso(range.start) && event.anchorDate <= localIso(range.end)) {
        const pin = el("i", "anchor-pin");
        pin.style.left = `${position(event.anchorDate, range)}%`;
        pin.title = `当天 ${formatDate(event.anchorDate, true)}`;
        track.append(pin);
      }

      if (today >= range.start && today <= range.end) {
        const todayPin = el("i", "today-pin");
        todayPin.style.left = `${position(todayIso, range)}%`;
        track.append(todayPin);
      }

      row.append(label, track);
      const select = () => selectEvent(event.id);
      row.addEventListener("click", select);
      row.addEventListener("keydown", (eventKey) => {
        if (eventKey.key === "Enter" || eventKey.key === " ") {
          eventKey.preventDefault();
          select();
        }
      });
      return row;
    });
    dom.rows.replaceChildren(...rows);
    dom.rows.hidden = rows.length === 0;
    dom.empty.hidden = rows.length !== 0;
  }

  function selectEvent(id, replace = true) {
    const event = dataset.events.find((item) => item.id === id);
    if (!event) return;
    selectedEvent = event;
    state.event = event.id;
    writeState(replace);
    renderRows();
    renderDetail();
    renderRegion();
  }

  function relativeStatus(event) {
    if (todayIso < event.seasonStart) return `消费季 ${daysBetween(todayIso, event.seasonStart)} 天后开始`;
    if (todayIso > event.seasonEnd) return "消费季已结束";
    if (event.anchorDate && todayIso <= event.anchorDate) return `距当天 ${daysBetween(todayIso, event.anchorDate)} 天`;
    return "消费季进行中";
  }

  function operationStatus(stage) {
    if (todayIso > stage.end) return { label: "已过", className: "is-past" };
    if (todayIso >= stage.start && todayIso <= stage.end) return { label: "现在", className: "is-now" };
    return { label: "待做", className: "is-future" };
  }

  function renderDetail() {
    const event = selectedEvent;
    if (!event) return;
    dom.detailType.textContent = `${event.type} · 运营强度 ${event.priority} / 5`;
    dom.detailTitle.textContent = `${event.nameZh} / ${event.nameEn}`;
    const dateCopy = event.anchorDate
      ? `当天 ${formatDate(event.anchorDate, true)}；活动范围 ${formatRange(event.eventStart, event.eventEnd)}`
      : `连续季节；活动范围 ${formatRange(event.eventStart, event.eventEnd)}`;
    dom.detailSubtitle.textContent = `${dateCopy}；消费季建议 ${formatRange(event.seasonStart, event.seasonEnd)}。`;
    dom.detailStatus.replaceChildren(
      el("span", "status-chip status-chip--accent", relativeStatus(event)),
      el("span", "status-chip", event.evidenceStatus),
      el("span", "status-chip", `${event.relatedIps.length} 个关联 IP`),
    );
    dom.detailEvidence.textContent = event.evidenceStatus;
    dom.detailAudiences.textContent = event.audiences.join(" · ");
    dom.detailAngles.textContent = event.productAngles.join(" · ");
    dom.detailAvoid.textContent = event.avoid;
    dom.detailSource.href = event.sourceUrl;
    dom.detailSource.textContent = `核验日期来源 · ${event.sourceLabel}`;
    dom.visualLinks.replaceChildren(...event.visualLinks.map((link) => {
      const node = el("a", "query-chip", `搜 ${link.label}`);
      node.href = link.url;
      return node;
    }));

    dom.operationList.replaceChildren(...event.operations.map((stage) => {
      const status = operationStatus(stage);
      const card = el("article", `operation-card ${status.className}`);
      const top = el("div", "operation-card__top");
      top.append(el("strong", "", stage.label), el("span", "", status.label));
      card.append(top, el("p", "", stage.action), el("small", "", formatRange(stage.start, stage.end)));
      return card;
    }));

    if (event.relatedIps.length) {
      dom.relatedIpGrid.replaceChildren(...event.relatedIps.map((ip) => {
        const card = el("a", "ip-mini-card");
        card.href = ip.searchUrl;
        const image = el("img");
        image.src = ip.visualImage;
        image.alt = `${ip.nameZh || ip.name} 视觉参考`;
        image.loading = "lazy";
        const copy = el("div", "ip-mini-card__copy");
        copy.append(el("strong", "", ip.nameZh || ip.name), el("span", "", `${ip.category} · ${ip.rightsLane}`));
        card.append(image, copy);
        return card;
      }));
    } else {
      dom.relatedIpGrid.replaceChildren(el("p", "ip-empty", "当前未强行绑定角色 IP；先使用上方视觉查询进入题材素材，避免文化误配。"));
    }
  }

  function aggregateRegions(events) {
    const totalPriority = events.reduce((sum, event) => sum + event.priority, 0) || 1;
    return Object.fromEntries(regionKeys.map((key) => {
      const weighted = events.reduce((sum, event) => sum + (event.regions[key] || 1) * event.priority, 0) / totalPriority;
      return [key, { raw: weighted, score: Math.round((weighted / 4) * 100) }];
    }));
  }

  function selectedRegions(event) {
    return Object.fromEntries(regionKeys.map((key) => [key, { raw: event?.regions[key] || 1, score: Math.round(((event?.regions[key] || 1) / 4) * 100) }]));
  }

  function heatLevel(score) {
    if (score >= 88) return 4;
    if (score >= 63) return 3;
    if (score >= 38) return 2;
    return 1;
  }

  function renderRegion() {
    dom.regionPanel.hidden = !state.region;
    if (!state.region) return;
    const values = regionMode === "selected" && selectedEvent ? selectedRegions(selectedEvent) : aggregateRegions(visibleEvents);
    dom.regionVisible.className = `btn btn--sm ${regionMode === "visible" ? "btn--secondary is-active" : "btn--ghost"}`;
    dom.regionSelected.className = `btn btn--sm ${regionMode === "selected" ? "btn--secondary is-active" : "btn--ghost"}`;
    dom.regionSubtitle.textContent = regionMode === "selected" && selectedEvent
      ? `${selectedEvent.nameZh} · 规则型运营优先级`
      : `${visibleEvents.length} 个可见节点 · 优先级加权`;
    dom.regionMap.replaceChildren(...regionKeys.map((key) => {
      const region = regionByKey.get(key);
      const value = values[key];
      const cell = el("article", `region-cell region-cell--${key}`);
      cell.dataset.heat = heatLevel(value.score);
      cell.append(el("strong", "", region.labelZh), el("span", "", region.label), el("small", "", region.states), el("b", "", value.score));
      return cell;
    }));
    const ranking = regionKeys.map((key) => ({ key, ...values[key] })).sort((a, b) => b.score - a.score);
    dom.regionRanking.replaceChildren(...ranking.map((item) => {
      const region = regionByKey.get(item.key);
      const row = el("div", "region-rank");
      const track = el("span", "region-rank-track");
      const bar = el("i", "region-rank-bar");
      bar.style.width = `${item.score}%`;
      track.append(bar);
      row.append(el("span", "", region.labelZh), track, el("b", "", item.score));
      return row;
    }));
    dom.regionNote.textContent = regionMode === "selected" && selectedEvent
      ? selectedEvent.regionNote
      : "当前分值由可见节点的事件强度与地区规则加权；接入 CA / TX / FL / NY 等州级订单后应替换为真实销售热力。";
    dom.regionSource.href = dataset.regionModel.sourceUrl;
    dom.regionWarning.textContent = dataset.regionModel.warning;
  }

  function renderFacets() {
    const typeCounts = Object.fromEntries(types.map((type) => [type, dataset.events.filter((event) => event.type === type).length]));
    dom.rangeFacets.replaceChildren(...rangeOptions.map((item) => {
      const button = el("button", `facet-button${state.range === item.key ? " is-active" : ""}`);
      button.type = "button";
      button.append(el("span", "", item.label));
      button.addEventListener("click", () => setState({ range: item.key }));
      return button;
    }));
    const typeItems = [{ key: "全部", label: "全部类型", count: dataset.events.length }, ...types.map((type) => ({ key: type, label: type, count: typeCounts[type] }))];
    dom.typeFacets.replaceChildren(...typeItems.map((item) => {
      const button = el("button", `facet-button${state.type === item.key ? " is-active" : ""}`);
      button.type = "button";
      button.append(el("span", "", item.label), el("small", "", item.count));
      button.addEventListener("click", () => setState({ type: item.key }));
      return button;
    }));
  }

  function renderSummary() {
    const range = windowRange();
    dom.todayLabel.textContent = formatDate(todayIso, true);
    dom.windowLabel.textContent = `${formatDate(localIso(range.start))}–${formatDate(localIso(range.end))}`;
    dom.activeCount.textContent = visibleEvents.length;
    const next = visibleEvents.find((event) => event.anchorDate && event.anchorDate >= todayIso);
    dom.nextAnchor.textContent = next ? `${formatDate(next.anchorDate)} ${next.nameZh}` : "无";
    dom.resultCount.textContent = visibleEvents.length;
    dom.topMeta.textContent = `${dataset.counts.events} 节点 · 默认从今天看未来 90 天`;
  }

  function render() {
    dom.search.value = state.q;
    dom.rangeSelect.value = state.range;
    dom.typeSelect.value = state.type;
    dom.prioritySelect.value = state.priority;
    dom.paydayToggle.checked = state.payday;
    dom.regionToggle.checked = state.region;
    visibleEvents = filteredEvents();
    selectedEvent = dataset.events.find((event) => event.id === state.event && visibleEvents.some((visible) => visible.id === event.id)) || visibleEvents[0] || null;
    if (selectedEvent && state.event !== selectedEvent.id) {
      state.event = selectedEvent.id;
      writeState(true);
    }
    renderFacets();
    renderSummary();
    renderPayday();
    renderRows();
    renderDetail();
    renderRegion();
    document.title = `${state.range === "90" ? "未来 90 天" : state.range === "180" ? "未来 180 天" : "全部"}｜美国消费力日历`;
  }

  for (const type of types) {
    const option = el("option", "", type);
    option.value = type;
    dom.typeSelect.append(option);
  }

  let searchTimer = 0;
  dom.search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => setState({ q: dom.search.value }, true), 140);
  });
  dom.rangeSelect.addEventListener("change", () => setState({ range: dom.rangeSelect.value }));
  dom.typeSelect.addEventListener("change", () => setState({ type: dom.typeSelect.value }));
  dom.prioritySelect.addEventListener("change", () => setState({ priority: dom.prioritySelect.value }));
  dom.paydayToggle.addEventListener("change", () => setState({ payday: dom.paydayToggle.checked }));
  dom.regionToggle.addEventListener("change", () => setState({ region: dom.regionToggle.checked }));
  dom.regionVisible.addEventListener("click", () => { regionMode = "visible"; renderRegion(); });
  dom.regionSelected.addEventListener("click", () => { regionMode = "selected"; renderRegion(); });
  dom.copyFilter.addEventListener("click", () => {
    navigator.clipboard.writeText(location.href).then(() => {
      const original = dom.copyFilter.textContent;
      dom.copyFilter.textContent = "已复制";
      window.setTimeout(() => { dom.copyFilter.textContent = original; }, 1200);
    }).catch(() => {});
  });
  const reset = () => setState({ q: "", range: "90", type: "全部", priority: "4", event: "", payday: true, region: true });
  dom.reset.addEventListener("click", reset);
  dom.emptyReset.addEventListener("click", reset);
  window.addEventListener("popstate", () => { state = readState(); render(); });

  writeState(true);
  render();
})();
