import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "source/apparel-weather-normals.json");

const stations = [
  { id: "USW00014739", label: "Boston Logan", city: "Boston", state: "MA" },
  { id: "USW00094728", label: "New York Central Park", city: "New York", state: "NY" },
  { id: "USW00013743", label: "Washington Reagan", city: "Washington", state: "DC / VA" },
  { id: "USW00013874", label: "Atlanta Hartsfield", city: "Atlanta", state: "GA" },
  { id: "USW00012839", label: "Miami International", city: "Miami", state: "FL" },
  { id: "USW00094846", label: "Chicago O'Hare", city: "Chicago", state: "IL" },
  { id: "USW00003927", label: "Dallas Fort Worth", city: "Dallas–Fort Worth", state: "TX" },
  { id: "USW00023174", label: "Los Angeles International", city: "Los Angeles", state: "CA" },
  { id: "USW00023183", label: "Phoenix Sky Harbor", city: "Phoenix", state: "AZ" },
  { id: "USW00024233", label: "Seattle Tacoma", city: "Seattle", state: "WA" },
  { id: "USW00003017", label: "Denver International", city: "Denver", state: "CO" },
  { id: "USW00026451", label: "Anchorage International", city: "Anchorage", state: "AK" },
  { id: "USW00022521", label: "Honolulu International", city: "Honolulu", state: "HI" }
];

const markets = [
  {
    id: "east-core",
    labelZh: "美东核心",
    labelEn: "East Coast Core",
    stations: ["USW00014739", "USW00094728", "USW00013743"],
    states: ["ME", "NH", "VT", "MA", "RI", "CT", "NY", "NJ", "PA", "DE", "MD", "DC", "VA", "WV"],
    logisticsGroup: "美东核心",
    note: "货代运营口径；从新英格兰到中大西洋并包含 VA / WV，不等于 Census Northeast。"
  },
  {
    id: "east-extension",
    labelZh: "美东扩展",
    labelEn: "East Coast Extension",
    stations: ["USW00013874", "USW00012839"],
    states: ["NC", "SC", "GA", "FL"],
    logisticsGroup: "美东扩展",
    note: "东海岸宽口径；南北温差大，Atlanta 与 Miami 共同给出范围。"
  },
  {
    id: "great-lakes-plains",
    labelZh: "五大湖 / 平原",
    labelEn: "Great Lakes & Plains",
    stations: ["USW00094846"],
    states: ["OH", "MI", "IN", "IL", "WI", "MN", "IA", "MO", "ND", "SD", "NE", "KS"],
    logisticsGroup: "美中",
    note: "用 Chicago 代表转冷节奏；平原州温差和风寒需结合真实周度天气。"
  },
  {
    id: "south-central",
    labelZh: "南中部 / 德州",
    labelEn: "South Central",
    stations: ["USW00003927"],
    states: ["TX", "OK", "AR", "LA", "TN", "AL", "MS", "KY"],
    logisticsGroup: "南部内陆",
    note: "用 Dallas–Fort Worth 代表；湾岸湿度与田纳西高地会有偏差。"
  },
  {
    id: "california-southwest",
    labelZh: "加州 / 西南",
    labelEn: "California & Southwest",
    stations: ["USW00023174", "USW00023183"],
    states: ["CA", "NV", "AZ", "NM"],
    logisticsGroup: "美西",
    note: "LAX 与 Phoenix 共同给出沿海—沙漠范围；不把两地视为同一天气。"
  },
  {
    id: "pacific-northwest",
    labelZh: "太平洋西北",
    labelEn: "Pacific Northwest",
    stations: ["USW00024233"],
    states: ["WA", "OR"],
    logisticsGroup: "美西北",
    note: "用 Seattle–Tacoma 代表；防雨层的重要性高于单看温度。"
  },
  {
    id: "mountain-west",
    labelZh: "山地西部",
    labelEn: "Mountain West",
    stations: ["USW00003017"],
    states: ["CO", "UT", "ID", "MT", "WY"],
    logisticsGroup: "山地",
    note: "用 Denver 代表；海拔差异会放大昼夜温差。"
  },
  {
    id: "alaska",
    labelZh: "阿拉斯加",
    labelEn: "Alaska",
    stations: ["USW00026451"],
    states: ["AK"],
    logisticsGroup: "非本土州",
    note: "用 Anchorage 代表；偏远地区运费与时效必须单独核价。"
  },
  {
    id: "hawaii",
    labelZh: "夏威夷",
    labelEn: "Hawaii",
    stations: ["USW00022521"],
    states: ["HI"],
    logisticsGroup: "非本土州",
    note: "用 Honolulu 代表；全年偏轻薄，运费与时效单独核价。"
  }
];

const historyStart = "2021-01-01";
const historyEnd = "2025-12-31";
const historyYears = [2021, 2022, 2023, 2024, 2025];
const sourceApiBase = "https://www.ncei.noaa.gov/access/services/data/v1";
const sourcePage = "https://www.ncei.noaa.gov/access/search/data-search/daily-summaries";

function sourceUrl(stationId) {
  const params = new URLSearchParams({
    dataset: "daily-summaries",
    stations: stationId,
    startDate: historyStart,
    endDate: historyEnd,
    format: "json",
    units: "standard",
    includeAttributes: "false",
    dataTypes: "TMAX,TMIN,PRCP,SNOW"
  });
  return `${sourceApiBase}?${params}`;
}

async function fetchStationRows(station) {
  const url = sourceUrl(station.id);
  const response = await fetch(url, { headers: { "User-Agent": "public-domain-cartoon-inspiration/1.0" } });
  if (!response.ok) throw new Error(`${station.id} NOAA request failed: ${response.status} ${response.statusText}`);
  const rows = await response.json();
  return { station, rows, url };
}

const number = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed > -9000 ? parsed : null;
};
const mean = (values) => {
  const usable = values.filter(Number.isFinite);
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
};
const sum = (values) => values.filter(Number.isFinite).reduce((total, value) => total + value, 0);
const round = (value) => Number.isFinite(value) ? Math.round(value * 10) / 10 : null;

function aggregateStation(station, rows, url) {
  const groups = new Map();
  for (const row of rows) {
    const [yearText, monthText] = String(row.DATE || "").split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    if (!historyYears.includes(year) || month < 1 || month > 12) continue;
    const key = `${year}-${month}`;
    if (!groups.has(key)) groups.set(key, { year, month, high: [], low: [], precip: [], snow: [] });
    const group = groups.get(key);
    group.high.push(number(row.TMAX));
    group.low.push(number(row.TMIN));
    group.precip.push(number(row.PRCP));
    group.snow.push(number(row.SNOW));
  }

  const completeValue = (group, values, reducer = mean) => {
    const expected = new Date(Date.UTC(group.year, group.month, 0)).getUTCDate();
    const valid = values.filter(Number.isFinite);
    return valid.length / expected >= 0.8 ? reducer(valid) : null;
  };

  const monthly = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const yearGroups = historyYears.map((year) => groups.get(`${year}-${month}`)).filter(Boolean);
    const highByYear = yearGroups.map((group) => completeValue(group, group.high));
    const lowByYear = yearGroups.map((group) => completeValue(group, group.low));
    const precipByYear = yearGroups.map((group) => completeValue(group, group.precip, sum));
    const snowByYear = yearGroups.map((group) => completeValue(group, group.snow, sum));
    const highF = mean(highByYear);
    const lowF = mean(lowByYear);
    return {
      month,
      highF: round(highF),
      lowF: round(lowF),
      meanF: round(mean([highF, lowF])),
      precipIn: round(mean(precipByYear)),
      snowIn: round(mean(snowByYear)),
      temperatureYears: highByYear.filter(Number.isFinite).length,
      precipitationYears: precipByYear.filter(Number.isFinite).length,
      snowYears: snowByYear.filter(Number.isFinite).length
    };
  });

  for (const row of monthly) {
    if (row.temperatureYears < 4) throw new Error(`${station.id} has only ${row.temperatureYears} usable temperature years for month ${row.month}`);
  }
  station.sourceApi = url;
  station.dailyRows = rows.length;
  station.monthly = monthly;
}

const stationBatches = [];
for (let index = 0; index < stations.length; index += 4) stationBatches.push(stations.slice(index, index + 4));
for (const batch of stationBatches) {
  const results = await Promise.all(batch.map(fetchStationRows));
  for (const result of results) aggregateStation(result.station, result.rows, result.url);
}

const stationById = new Map(stations.map((station) => [station.id, station]));
for (const market of markets) {
  market.representativeCities = market.stations.map((id) => stationById.get(id).city);
  market.monthly = Array.from({ length: 12 }, (_, index) => {
    const stationRows = market.stations.map((id) => stationById.get(id).monthly[index]);
    const highs = stationRows.map((row) => row.highF);
    const lows = stationRows.map((row) => row.lowF);
    const averageHigh = mean(highs);
    const averageLow = mean(lows);
    return {
      month: index + 1,
      highF: round(averageHigh),
      lowF: round(averageLow),
      meanF: round(mean([averageHigh, averageLow])),
      spanHighF: round(Math.max(...highs.filter(Number.isFinite))),
      spanLowF: round(Math.min(...lows.filter(Number.isFinite))),
      precipIn: round(mean(stationRows.map((row) => row.precipIn))),
      snowIn: round(mean(stationRows.map((row) => row.snowIn)))
    };
  });
}

const output = {
  schemaVersion: "1.1.0",
  generatedAt: new Date().toISOString(),
  baseline: "2021–2025 recent five-year historical average",
  historyWindow: {
    start: historyStart,
    end: historyEnd,
    years: historyYears,
    rule: "最近五个完整自然年"
  },
  sourceLabel: "NOAA NCEI · Daily Summaries (2021–2025)",
  sourcePage,
  sourceApiBase,
  sourceApiDocumentation: "https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation",
  methodology: "将 NOAA 2021–2025 每日观测按站点和月份汇总为最近五年历史均值；页面再按日期在相邻月份间插值，用于未来 12 周服装需求规划。它不是天气预报，也不反映极端天气。",
  apparelRules: [
    { level: 1, minMeanF: 78, label: "炎热", products: ["背心", "短袖", "轻薄面料"] },
    { level: 2, minMeanF: 68, label: "偏暖", products: ["短袖", "薄罩衫", "轻量长袖"] },
    { level: 3, minMeanF: 58, label: "转凉", products: ["长袖", "薄卫衣", "叠穿"] },
    { level: 4, minMeanF: 45, label: "凉冷", products: ["卫衣", "针织", "轻外套"] },
    { level: 5, minMeanF: -999, label: "寒冷", products: ["抓绒", "厚卫衣", "保暖外套"] }
  ],
  logisticsDefinition: {
    eastCoastCore: ["ME", "NH", "VT", "MA", "RI", "CT", "NY", "NJ", "PA", "DE", "MD", "DC", "VA", "WV"],
    eastCoastExtension: ["NC", "SC", "GA", "FL"],
    definitionNote: "这里的‘美东’是货代 / 仓配运营口径，不是 Census Northeast。扩展口径需与具体货代确认。",
    customerDataStatus: "待接订单州 / ZIP；不把‘80% 美东’作为已验证事实。",
    warehouseDataStatus: "待接仓库 ZIP、承运商、服务、包裹重量与目的 ZIP 后计算实际 Zone 和运费。",
    zoneSourceLabel: "USPS Postal Zones",
    zoneSourceUrl: "https://pe.usps.com/text/DMM300/608.htm"
  },
  stations,
  markets
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Saved ${markets.length} apparel-weather markets from ${stations.length} NOAA stations.`);
