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
    largestSpend: $("#largest-spend"),
    largestSpendLabel: $("#largest-spend-label"),
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
    spendingDetail: $("#spending-detail"),
    detailEvidence: $("#detail-evidence"),
    detailAudiences: $("#detail-audiences"),
    detailAngles: $("#detail-angles"),
    detailAvoid: $("#detail-avoid"),
    detailSource: $("#detail-source"),
    visualLinks: $("#visual-links"),
    operationList: $("#operation-list"),
    relatedIpGrid: $("#related-ip-grid"),
    weatherHorizon: $("#weather-horizon"),
    weatherMarketGrid: $("#weather-market-grid"),
    weatherSelectedGroup: $("#weather-selected-group"),
    weatherSelectedTitle: $("#weather-selected-title"),
    weatherSelectedMeta: $("#weather-selected-meta"),
    weatherSelectedLevel: $("#weather-selected-level"),
    weatherWeekStrip: $("#weather-week-strip"),
    weatherSelectedProducts: $("#weather-selected-products"),
    weatherSelectedStates: $("#weather-selected-states"),
    weatherSelectedRain: $("#weather-selected-rain"),
    weatherSelectedNote: $("#weather-selected-note"),
    customerRegionStatus: $("#customer-region-status"),
    warehouseDataStatus: $("#warehouse-data-status"),
    eastCoreStates: $("#east-core-states"),
    eastExtensionStates: $("#east-extension-states"),
    weatherSource: $("#weather-source"),
    zoneSource: $("#zone-source"),
    censusSource: $("#census-source"),
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
  const geography = dataset.geographyModel;
  const spendingModel = dataset.spendingModel || {};
  const spendingProfiles = spendingModel.profiles || {};
  const weather = geography?.weather;
  const weatherMarkets = weather?.markets || [];
  const weatherRules = weather?.apparelRules || [];
  const defaultWeatherMarket = weatherMarkets.find((market) => market.id === "east-core")?.id || weatherMarkets[0]?.id || "";
  const weatherWeekOptions = [0, 4, 8, 12];

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
  const formatMoney = (value) => {
    if (!Number.isFinite(value)) return "金额待补";
    if (value >= 1000) {
      const trillions = value / 1000;
      return `$${trillions.toFixed(trillions >= 10 ? 1 : 2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}T`;
    }
    const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return `$${value.toFixed(digits).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}B`;
  };
  const formatPercent = (value) => Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%` : "—";
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

  function readState() {
    const params = new URLSearchParams(location.search);
    const requestedRange = params.get("range");
    const requestedType = params.get("type");
    const requestedWeatherWeek = Number(params.get("weatherWeek"));
    const requestedWeatherMarket = params.get("weatherMarket");
    return {
      q: params.get("q") || "",
      range: rangeOptions.some((item) => item.key === requestedRange) ? requestedRange : "90",
      type: types.includes(requestedType) ? requestedType : "全部",
      priority: ["0", "3", "4", "5"].includes(params.get("priority")) ? params.get("priority") : "4",
      event: params.get("event") || "",
      payday: params.get("payday") !== "0",
      region: params.get("region") !== "0",
      weatherWeek: weatherWeekOptions.includes(requestedWeatherWeek) ? requestedWeatherWeek : 0,
      weatherMarket: weatherMarkets.some((market) => market.id === requestedWeatherMarket) ? requestedWeatherMarket : defaultWeatherMarket,
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
    if (state.weatherWeek) params.set("weatherWeek", state.weatherWeek);
    if (state.weatherMarket && state.weatherMarket !== defaultWeatherMarket) params.set("weatherMarket", state.weatherMarket);
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
      event.spendingPower?.relationshipLabel,
      event.spendingPower?.profileId ? spendingProfiles[event.spendingPower.profileId]?.labelZh : "",
    ].flat().join(" "));
  }

  function spendingProfile(event) {
    const link = event?.spendingPower;
    if (!link || link.status !== "available") return null;
    return spendingProfiles[link.profileId] || null;
  }

  function spendingBadge(event) {
    const link = event.spendingPower;
    const profile = spendingProfile(event);
    if (!profile?.target) {
      const badge = el("span", "gantt-money gantt-money--empty", "专项金额暂无");
      badge.title = link?.noteZh || "暂无统一全美专项金额";
      return badge;
    }
    const suffix = link.relationship === "included"
      ? "总盘内"
      : link.relationship === "proxy"
        ? "代理"
        : link.relationship === "context"
          ? "背景盘"
          : profile.target.status === "model_estimate" ? "预估" : "官方";
    const badge = el("span", `gantt-money gantt-money--${link.relationship}`, `${formatMoney(profile.target.value)} ${suffix}`);
    badge.title = `${profile.labelZh}；${link.relationshipLabel}；${profile.scopeZh}`;
    return badge;
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
      const profile = spendingProfile(event);
      row.setAttribute("aria-label", `${event.nameZh}，${eventDateLabel(event)}，${profile?.target ? formatMoney(profile.target.value) : "专项金额暂无"}`);
      if (selectedEvent?.id === event.id) row.classList.add("is-selected");

      const label = el("div", "gantt-label");
      label.append(el("span", "gantt-date", eventDateLabel(event)));
      const name = el("span", "gantt-name");
      name.append(el("strong", "", event.nameZh), el("span", "", `${event.type} · ${event.evidenceStatus}`));
      label.append(name, spendingBadge(event));

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

  function pointStatusLabel(point) {
    const labels = {
      actual_reported: "实绩",
      measured_online_sales: "线上实绩",
      survey_estimate: "调查预期",
      estimated_donations: "估算捐赠",
      official_forecast_midpoint: "官方预测中值",
      report_edition: "报告值",
      model_estimate: "趋势预估",
      official_report: "官方报告值",
      official_partial_season: "官方阶段值",
    };
    return labels[point.status] || point.statusLabel || "报告值";
  }

  function renderSpendingDetail(event) {
    const link = event.spendingPower;
    const profile = spendingProfile(event);
    if (!profile?.target) {
      const empty = el("div", "spending-empty");
      empty.append(
        el("div", "eyebrow", "消费金额"),
        el("strong", "", link?.headlineZh || "暂无统一全美专项金额"),
        el("p", "", link?.noteZh || "公开来源未提供可比的全国专项消费序列。")
      );
      dom.spendingDetail.replaceChildren(empty);
      return;
    }

    const target = profile.target;
    const headline = el("div", "spending-headline");
    const headlineCopy = el("div", "spending-headline__copy");
    headlineCopy.append(
      el("div", "eyebrow", `${link.relationshipLabel} · 可信度 ${profile.confidence}`),
      el("strong", "spending-value", formatMoney(target.value)),
      el("span", "spending-target-label", `${target.year} · ${target.statusLabel}`),
      el("p", "", profile.scopeZh)
    );
    const rangeText = Number.isFinite(target.lower) && Number.isFinite(target.upper)
      ? `${formatMoney(target.lower)}–${formatMoney(target.upper)}`
      : "官方值，无模型区间";
    const forecastBox = el("div", "spending-range");
    forecastBox.append(el("span", "", "方向区间"), el("strong", "", rangeText));
    headline.append(headlineCopy, forecastBox);

    const series = [...profile.history];
    if (!series.some((point) => point.year === target.year)) series.push({ ...target, isTarget: true });
    const maxValue = Math.max(...series.map((point) => point.value), 1);
    const chart = el("div", "spending-chart");
    chart.style.gridTemplateColumns = `repeat(${Math.max(1, series.length)}, minmax(48px, 1fr))`;
    chart.setAttribute("aria-label", `${profile.labelZh}年度趋势`);
    chart.append(...series.map((point) => {
      const cell = el("div", `spending-bar-cell${point.isTarget ? " is-target" : ""}`);
      const value = el("span", "spending-bar-value", formatMoney(point.value));
      const track = el("div", "spending-bar-track");
      const bar = el("i", "spending-bar");
      bar.style.height = `${Math.max(8, (point.value / maxValue) * 100)}%`;
      track.append(bar);
      cell.append(value, track, el("b", "", point.year), el("small", "", pointStatusLabel(point)));
      cell.title = `${point.year} · ${formatMoney(point.value)} · ${pointStatusLabel(point)}`;
      return cell;
    }));

    const firstSlice = profile.categorySlices?.[0];
    const metrics = el("div", "spending-metrics");
    const metricItems = [
      [profile.coverage.completeFiveYears ? "5 年 CAGR" : `${profile.coverage.historyPoints} 年 CAGR`, formatPercent(profile.trend.cagr)],
      ["最近一年同比", formatPercent(profile.trend.latestYoY)],
      ["历史覆盖", profile.coverage.completeFiveYears ? "5 / 5" : `${profile.coverage.historyPoints} / 5`],
      [firstSlice ? `${firstSlice.year} ${firstSlice.label}` : "相关品类切片", firstSlice ? formatMoney(firstSlice.value) : "暂无"],
    ];
    metrics.append(...metricItems.map(([label, value]) => {
      const item = el("div", "spending-metric");
      item.append(el("span", "", label), el("strong", "", value));
      return item;
    }));

    const footer = el("div", "spending-foot");
    const note = el("p", "", `${link.noteZh} ${profile.noteZh}`.trim());
    const sources = el("div", "spending-sources");
    sources.append(...profile.sources.map((source) => {
      const anchor = el("a", "source-link", source.label);
      anchor.href = source.url;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      return anchor;
    }));
    footer.append(note, sources);
    dom.spendingDetail.replaceChildren(headline, chart, metrics, footer);
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
      el("span", "status-chip", event.spendingPower.status === "available" ? event.spendingPower.relationshipLabel : "金额待补"),
      el("span", "status-chip", `${event.relatedIps.length} 个关联 IP`),
    );
    renderSpendingDetail(event);
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

  function interpolateNormal(market, date) {
    const current = market.monthly[date.getMonth()];
    const next = market.monthly[(date.getMonth() + 1) % 12];
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const ratio = daysInMonth > 1 ? (date.getDate() - 1) / (daysInMonth - 1) : 0;
    const interpolate = (key) => {
      const from = Number(current?.[key]);
      const to = Number(next?.[key]);
      if (!Number.isFinite(from)) return Number.isFinite(to) ? to : null;
      if (!Number.isFinite(to)) return from;
      return from + (to - from) * ratio;
    };
    return Object.fromEntries(["highF", "lowF", "meanF", "spanHighF", "spanLowF", "precipIn", "snowIn"].map((key) => [key, interpolate(key)]));
  }

  function apparelRule(meanF) {
    return weatherRules.find((rule) => meanF >= rule.minMeanF) || weatherRules[weatherRules.length - 1];
  }

  function weatherPoint(market, weekOffset) {
    const date = addDays(today, weekOffset * 7);
    const normal = interpolateNormal(market, date);
    const rule = apparelRule(normal.meanF);
    return { date, dateIso: localIso(date), ...normal, rule };
  }

  function rounded(value) {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  function temperatureSpan(point) {
    return Number.isFinite(point.spanLowF) && Number.isFinite(point.spanHighF)
      ? `${rounded(point.spanLowF)}–${rounded(point.spanHighF)}°F`
      : `${rounded(point.lowF)}–${rounded(point.highF)}°F`;
  }

  function rainSnowCopy(point) {
    const rain = Number.isFinite(point.precipIn) ? `月降水常态约 ${point.precipIn.toFixed(1)} in` : "降水数据待补";
    const snow = Number.isFinite(point.snowIn) && point.snowIn >= 0.5
      ? `；月降雪常态约 ${point.snowIn.toFixed(1)} in`
      : Number.isFinite(point.snowIn) ? "；常态降雪较少" : "；降雪数据不完整";
    return `${rain}${snow}`;
  }

  function stateChips(states) {
    return states.map((state) => el("span", "state-chip", state));
  }

  function renderRegion() {
    dom.regionPanel.hidden = !state.region;
    if (!state.region) return;
    const selectedMarket = weatherMarkets.find((market) => market.id === state.weatherMarket) || weatherMarkets[0];
    if (!selectedMarket) return;
    const selectedPoint = weatherPoint(selectedMarket, state.weatherWeek);

    dom.weatherHorizon.querySelectorAll("button[data-week]").forEach((button) => {
      const active = Number(button.dataset.week) === state.weatherWeek;
      button.className = `btn btn--sm ${active ? "btn--secondary is-active" : "btn--ghost"}`;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    dom.weatherMarketGrid.replaceChildren(...weatherMarkets.map((market) => {
      const point = weatherPoint(market, state.weatherWeek);
      const button = el("button", `weather-market-card${market.id === selectedMarket.id ? " is-selected" : ""}`);
      button.type = "button";
      button.dataset.level = point.rule.level;
      button.setAttribute("aria-pressed", market.id === selectedMarket.id ? "true" : "false");
      const title = el("div", "weather-market-card__title");
      title.append(el("strong", "", market.labelZh), el("span", "", `保暖 ${point.rule.level}`));
      button.append(
        title,
        el("b", "weather-market-card__temp", temperatureSpan(point)),
        el("span", "weather-market-card__product", point.rule.products.slice(0, 2).join(" / ")),
        el("small", "", `${market.logisticsGroup} · ${market.states.join(" ")}`)
      );
      button.addEventListener("click", () => setState({ weatherMarket: market.id }));
      return button;
    }));

    dom.weatherSelectedGroup.textContent = `${selectedMarket.logisticsGroup} · 最近五年历史均值`;
    dom.weatherSelectedTitle.textContent = selectedMarket.labelZh;
    dom.weatherSelectedMeta.textContent = `${formatDate(selectedPoint.dateIso, true)} · ${temperatureSpan(selectedPoint)} · 代表 ${selectedMarket.representativeCities.join(" / ")}`;
    dom.weatherSelectedLevel.textContent = `保暖 ${selectedPoint.rule.level}`;
    dom.weatherSelectedLevel.dataset.level = selectedPoint.rule.level;
    dom.weatherSelectedProducts.textContent = selectedPoint.rule.products.join(" · ");
    dom.weatherSelectedStates.textContent = selectedMarket.states.join(" · ");
    dom.weatherSelectedRain.textContent = rainSnowCopy(selectedPoint);
    dom.weatherSelectedNote.textContent = selectedMarket.note;

    dom.weatherWeekStrip.replaceChildren(...Array.from({ length: 13 }, (_, week) => {
      const point = weatherPoint(selectedMarket, week);
      const cell = el("div", `weather-week${week === state.weatherWeek ? " is-selected" : ""}`);
      cell.dataset.level = point.rule.level;
      cell.append(
        el("span", "", formatDate(point.dateIso)),
        el("strong", "", `${rounded(point.meanF)}°`),
        el("small", "", point.rule.products[0])
      );
      return cell;
    }));

    const logistics = geography.logistics;
    dom.eastCoreStates.replaceChildren(...stateChips(logistics.eastCoastCore));
    dom.eastExtensionStates.replaceChildren(...stateChips(logistics.eastCoastExtension));
    dom.customerRegionStatus.textContent = `${geography.customerOrders.rule} 需要字段：${geography.customerOrders.requiredFields.join("、")}。`;
    dom.warehouseDataStatus.textContent = `${logistics.warehouseDataStatus} USPS Zone 按起始 ZIP 与目的 ZIP 的距离确定，不能只按“美东 / 美西”口头分区。`;
    dom.weatherSource.href = weather.sourcePage;
    dom.zoneSource.href = logistics.zoneSourceUrl;
    dom.censusSource.href = geography.censusReference.sourceUrl;
    dom.regionWarning.textContent = weather.methodology;
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
    const seenProfiles = new Set();
    const ranked = visibleEvents.flatMap((event) => {
      const link = event.spendingPower;
      const profile = spendingProfile(event);
      if (!profile?.target || !profile.rankable || !["direct", "proxy"].includes(link.relationship) || seenProfiles.has(profile.id)) return [];
      seenProfiles.add(profile.id);
      return [{ event, profile }];
    }).sort((a, b) => b.profile.target.value - a.profile.target.value);
    const largest = ranked[0];
    dom.largestSpend.textContent = largest ? formatMoney(largest.profile.target.value) : "暂无";
    dom.largestSpendLabel.textContent = largest ? `${largest.event.nameZh} · ${largest.event.spendingPower.relationshipLabel}` : "窗口无可比金额";
    dom.resultCount.textContent = visibleEvents.length;
    dom.topMeta.textContent = `${dataset.counts.events} 节点 · ${dataset.counts.spendingAvailable} 个金额关联 · 近五年趋势`;
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
  dom.weatherHorizon.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-week]");
    if (button) setState({ weatherWeek: Number(button.dataset.week) });
  });
  dom.copyFilter.addEventListener("click", () => {
    navigator.clipboard.writeText(location.href).then(() => {
      const original = dom.copyFilter.textContent;
      dom.copyFilter.textContent = "已复制";
      window.setTimeout(() => { dom.copyFilter.textContent = original; }, 1200);
    }).catch(() => {});
  });
  const reset = () => setState({ q: "", range: "90", type: "全部", priority: "4", event: "", payday: true, region: true, weatherWeek: 0, weatherMarket: defaultWeatherMarket });
  dom.reset.addEventListener("click", reset);
  dom.emptyReset.addEventListener("click", reset);
  window.addEventListener("popstate", () => { state = readState(); render(); });

  writeState(true);
  render();
})();
