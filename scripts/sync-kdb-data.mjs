import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TRADE_FILE = path.join(ROOT, "public", "data", "trade", "kazakhstan-trade.json");
const OUTPUT_FILE = path.join(ROOT, "public", "data", "trade", "kdb-import-profile.json");

const KDB_PAGE = "https://www.kdb.kz/analytics/analiticheskiy-portal-importnogo-profilya-stran-mira/";
const POWER_BI = {
  apiBase: "https://wabi-west-europe-b-primary-api.analysis.windows.net",
  resourceKey: "30cd03e7-d5c2-4e7d-a43b-31d86714445f",
  modelId: 7278384,
  reportUrl: "https://app.powerbi.com/view?r=eyJrIjoiMzBjZDAzZTctZDVjMi00ZTdkLWE0M2ItMzFkODY3MTQ0NDVmIiwidCI6ImQyYjg5N2M3LWZmZWEtNDdmYi1iZGUwLTk3ZDBmOWFiZGQ3YyIsImMiOjl9",
};

const WORLD = "Данные по всему миру";
const REPORTER = "Reporter";
const CATEGORY = "Категория";
const PROCESSING = "Передел (2)";
const PRODUCT = "Товар";

const column = (source, entity, property) => ({
  Column: { Expression: { SourceRef: { Source: source } }, Property: property },
  Name: `${entity}.${property}`,
});

const measure = (source, entity, property) => ({
  Measure: { Expression: { SourceRef: { Source: source } }, Property: property },
  Name: `${entity}.${property}`,
});

const inFilter = (source, property, literalValue) => ({
  Condition: {
    In: {
      Expressions: [{ Column: { Expression: { SourceRef: { Source: source } }, Property: property } }],
      Values: [[{ Literal: { Value: literalValue } }]],
    },
  },
});

const headers = () => ({
  "Content-Type": "application/json",
  "X-PowerBI-ResourceKey": POWER_BI.resourceKey,
  ActivityId: randomUUID(),
  RequestId: randomUUID(),
});

async function getModelMetadata() {
  const response = await fetch(
    `${POWER_BI.apiBase}/public/reports/${POWER_BI.resourceKey}/modelsAndExploration?preferReadOnlySession=true`,
    { headers: headers() },
  );
  const text = await response.text();
  if (!response.ok) throw new Error(`Power BI metadata failed (${response.status}): ${text}`);
  return JSON.parse(text).models?.[0] ?? {};
}

async function queryData(query, projectionCount, rowCount = 30000) {
  const command = {
    SemanticQueryDataShapeCommand: {
      Query: { Version: 2, ...query },
      Binding: {
        Primary: { Groupings: [{ Projections: Array.from({ length: projectionCount }, (_, index) => index) }] },
        DataReduction: { DataVolume: 6, Primary: { Window: { Count: rowCount } } },
        Version: 1,
      },
      ExecutionMetricsKind: 1,
    },
  };
  const body = {
    version: "1.0.0",
    queries: [{ Query: { Commands: [command] } }],
    cancelQueries: [],
    modelId: POWER_BI.modelId,
  };
  const response = await fetch(`${POWER_BI.apiBase}/public/reports/querydata?synchronous=true`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Power BI query failed (${response.status}): ${text}`);
  return JSON.parse(text);
}

function decodeRows(result) {
  const data = result.results?.[0]?.result?.data;
  const select = data?.descriptor?.Select ?? [];
  const ds = data?.dsr?.DS?.[0];
  const dictionaries = ds?.ValueDicts ?? {};
  const rows = Object.values(ds?.PH?.[0] ?? {})[0] ?? [];
  const schema = rows.find((row) => row.S)?.S ?? [];
  let previous = [];

  return rows.map((row) => {
    const values = [];
    let cursor = 0;
    for (let index = 0; index < select.length; index += 1) {
      if ((row.R ?? 0) & (1 << index)) {
        values[index] = previous[index];
        continue;
      }
      if ((row["Ø"] ?? 0) & (1 << index)) {
        values[index] = null;
        continue;
      }
      let value = row.C?.[cursor];
      cursor += 1;
      const dictionaryName = schema[index]?.DN;
      if (dictionaryName && Number.isInteger(value)) value = dictionaries[dictionaryName]?.[value] ?? value;
      values[index] = value;
    }
    previous = values;
    return Object.fromEntries(select.map((item, index) => [item.Name, values[index]]));
  });
}

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const yearFromDateValue = (value) => new Date(Number(value)).getUTCFullYear();
const sharePercent = (value) => {
  const numeric = numberOrNull(value);
  return numeric === null ? null : numeric * 100;
};

async function loadTradePartnerIds() {
  const raw = JSON.parse(await readFile(TRADE_FILE, "utf8"));
  return new Set(raw.partners.map((partner) => partner.key).filter(Boolean));
}

async function loadAnnualRows() {
  const result = await queryData({
    From: [
      { Name: "w", Entity: WORLD, Type: 0 },
      { Name: "r", Entity: REPORTER, Type: 0 },
    ],
    Select: [
      column("r", REPORTER, "iso"),
      column("r", REPORTER, "Страна"),
      column("w", WORLD, "Year"),
      measure("w", WORLD, "Импорт, млн $"),
      measure("w", WORLD, "Импорт из РК, млн $"),
      measure("w", WORLD, "Доля РК, %"),
    ],
  }, 6, 10000);
  return decodeRows(result);
}

async function loadCategoryRows() {
  const result = await queryData({
    From: [
      { Name: "w", Entity: WORLD, Type: 0 },
      { Name: "r", Entity: REPORTER, Type: 0 },
      { Name: "c", Entity: CATEGORY, Type: 0 },
      { Name: "p", Entity: PROCESSING, Type: 0 },
    ],
    Select: [
      column("r", REPORTER, "iso"),
      column("r", REPORTER, "Страна"),
      column("w", WORLD, "Year"),
      column("c", CATEGORY, "тип"),
      column("c", CATEGORY, "Категория"),
      column("p", PROCESSING, "Передел"),
      measure("w", WORLD, "Импорт, млн $"),
      measure("w", WORLD, "Импорт из РК, млн $"),
      measure("w", WORLD, "Доля РК, %"),
    ],
  }, 9);
  return decodeRows(result);
}

async function loadTopProducts(iso3, dateValue) {
  const isoDate = new Date(Number(dateValue)).toISOString().slice(0, 19);
  const result = await queryData({
    From: [
      { Name: "w", Entity: WORLD, Type: 0 },
      { Name: "r", Entity: REPORTER, Type: 0 },
      { Name: "t", Entity: PRODUCT, Type: 0 },
    ],
    Select: [
      column("t", PRODUCT, "6-значный ТН ВЭД код"),
      column("t", PRODUCT, "Товар"),
      measure("w", WORLD, "Импорт, млн $"),
      measure("w", WORLD, "Импорт из РК, млн $"),
      measure("w", WORLD, "Доля РК, %"),
    ],
    Where: [
      inFilter("r", "iso", `'${iso3}'`),
      inFilter("w", "Year", `datetime'${isoDate}'`),
    ],
    OrderBy: [{
      Direction: 2,
      Expression: { Measure: { Expression: { SourceRef: { Source: "w" } }, Property: "Импорт, млн $" } },
    }],
  }, 5, 18);

  const decoded = decodeRows(result);
  return decoded
    .filter((row) => row[`${PRODUCT}.6-значный ТН ВЭД код`] && row[`${PRODUCT}.Товар`])
    .slice(0, 12)
    .map((row) => ({
      code: String(row[`${PRODUCT}.6-значный ТН ВЭД код`]).padStart(6, "0"),
      name: normalizeText(row[`${PRODUCT}.Товар`]),
      marketImport: numberOrNull(row[`${WORLD}.Импорт, млн $`]) ?? 0,
      fromKazakhstan: numberOrNull(row[`${WORLD}.Импорт из РК, млн $`]),
      kazakhstanShare: sharePercent(row[`${WORLD}.Доля РК, %`]),
    }));
}

async function withRetry(task, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

const [model, tradePartnerIds, annualRows, categoryRows] = await Promise.all([
  getModelMetadata(),
  loadTradePartnerIds(),
  loadAnnualRows(),
  loadCategoryRows(),
]);

const countries = {};
const latestDateByIso = new Map();

for (const row of annualRows) {
  const iso3 = row[`${REPORTER}.iso`];
  const nameRu = normalizeText(row[`${REPORTER}.Страна`]);
  const dateValue = numberOrNull(row[`${WORLD}.Year`]);
  if (!iso3 || !nameRu || dateValue === null || !tradePartnerIds.has(iso3)) continue;
  const country = countries[iso3] ?? { iso3, nameRu, latestYear: 0, annual: [], categories: [], products: [] };
  const year = yearFromDateValue(dateValue);
  country.annual.push({
    year,
    marketImport: numberOrNull(row[`${WORLD}.Импорт, млн $`]) ?? 0,
    fromKazakhstan: numberOrNull(row[`${WORLD}.Импорт из РК, млн $`]),
    kazakhstanShare: sharePercent(row[`${WORLD}.Доля РК, %`]),
  });
  country.latestYear = Math.max(country.latestYear, year);
  if (!latestDateByIso.has(iso3) || dateValue > latestDateByIso.get(iso3)) latestDateByIso.set(iso3, dateValue);
  countries[iso3] = country;
}

for (const country of Object.values(countries)) country.annual.sort((a, b) => a.year - b.year);

for (const row of categoryRows) {
  const iso3 = row[`${REPORTER}.iso`];
  const country = countries[iso3];
  const dateValue = numberOrNull(row[`${WORLD}.Year`]);
  const category = normalizeText(row[`${CATEGORY}.Категория`]);
  if (!country || dateValue === null || yearFromDateValue(dateValue) !== country.latestYear || !category) continue;
  country.categories.push({
    type: normalizeText(row[`${CATEGORY}.тип`]) || null,
    category,
    processing: normalizeText(row[`${PROCESSING}.Передел`]) || null,
    marketImport: numberOrNull(row[`${WORLD}.Импорт, млн $`]) ?? 0,
    fromKazakhstan: numberOrNull(row[`${WORLD}.Импорт из РК, млн $`]),
    kazakhstanShare: sharePercent(row[`${WORLD}.Доля РК, %`]),
  });
}

for (const country of Object.values(countries)) {
  country.categories.sort((a, b) => b.marketImport - a.marketImport);
}

const countryEntries = Object.entries(countries);
let completed = 0;
const failures = [];
await mapWithConcurrency(countryEntries, 4, async ([iso3, country]) => {
  try {
    country.products = await withRetry(() => loadTopProducts(iso3, latestDateByIso.get(iso3)));
  } catch (error) {
    failures.push({ iso3, message: error instanceof Error ? error.message : String(error) });
  }
  completed += 1;
  if (completed % 20 === 0 || completed === countryEntries.length) {
    console.log(`BRK products: ${completed}/${countryEntries.length}`);
  }
});

const output = {
  metadata: {
    title: "Импортный профиль торговых партнёров Казахстана",
    source: "АО «Банк Развития Казахстана»",
    sourcePage: KDB_PAGE,
    sourceReport: POWER_BI.reportUrl,
    modelName: model.displayName ?? "Импортный профиль",
    generatedAt: new Date().toISOString(),
    lastRefreshAt: model.LastRefreshTime ?? null,
    units: "million USD",
    latestYear: Math.max(...Object.values(countries).map((country) => country.latestYear)),
    note: "Данные загружены из публичной Power BI-модели аналитического портала БРК. Доля Казахстана хранится в процентах.",
  },
  coverage: {
    tradePartnersRequested: tradePartnerIds.size,
    countries: countryEntries.length,
    countriesWithProducts: countryEntries.filter(([, country]) => country.products.length).length,
    failedProductQueries: failures,
  },
  countries,
};

await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
await writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Saved ${countryEntries.length} BRK country profiles to ${path.relative(ROOT, OUTPUT_FILE)}`);
