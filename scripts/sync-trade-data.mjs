import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geoCentroid } from "d3-geo";
import { unzipSync, strFromU8 } from "fflate";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const countries = require("i18n-iso-countries");
const ruLocale = require("i18n-iso-countries/langs/ru.json");
const world = require("world-atlas/countries-110m.json");

countries.registerLocale(ruLocale);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = path.join(ROOT, "data", "raw");
const OUTPUT_DIR = path.join(ROOT, "public", "data", "trade");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "kazakhstan-trade.json");

const SOURCES = {
  annual: {
    url: "https://stat.gov.kz/api/iblock/element/347387/file/ru/",
    file: path.join(RAW_DIR, "trade-partners-2025.xlsx"),
  },
  current: {
    url: "https://stat.gov.kz/api/iblock/element/347256/file/ru/",
    file: path.join(RAW_DIR, "trade-partners-jan-may-2026.xlsx"),
  },
  products: {
    url: "https://stat.gov.kz/api/iblock/element/347499/file/ru/",
    file: path.join(RAW_DIR, "trade-products-2025.xlsx"),
  },
};

const GROUP_ROWS = new Set([
  "Всего",
  "Страны СНГ",
  "Страны ЕАЭС",
  "Страны вне ЕАЭС",
  "Остальные страны мира",
  "Европа",
  "Страны ЕС",
  "Страны вне ЕС",
  "Азия",
  "Америка",
  "Африка",
  "Австралия и Океания",
]);

// Wording in the statistical workbook occasionally differs from ISO's Russian locale.
const ISO_ALIASES = {
  "Кыргызстан": "KGZ",
  "Туркменистан": "TKM",
  "Ангилья (Брит.)": "AIA",
  "Папуа-новая Гвинея": "PNG",
  "Гуам (Сша)": "GUM",
  "Республика Латвия": "LVA",
  "Фарерские Острова": "FRO",
  "Гибралтар (Брит.)": "GIB",
  "Черногория (Монтенегро)": "MNE",
  "Македония": "MKD",
  "Французские Южные Территории": "ATF",
  "Объединенные Арабские Эмираты": "ARE",
  "Ирак": "IRQ",
  "Республика Ирак": "IRQ",
  "Ирак, Республика Ирак": "IRQ",
  "Иран": "IRN",
  "Иран, Исламская Республика": "IRN",
  "Корея, народно-Демократическая Республика": "PRK",
  "Каймановы Острова (Брит.)": "CYM",
  "Острова Теркс И Кайкос": "TCA",
  "Соединенные Штаты Америки": "USA",
  "Виргинские Острова (Брит.)": "VGB",
  "Виргинские Острова, Сша": "VIR",
  "Центрально-Африканская Республика": "CAF",
  "Сейшелы": "SYC",
  "Остров Святой Елены": "SHN",
  "Острова Кука (Н.Зел.)": "COK",
  "Самоа, Независимое Государство": "WSM",
  "Китай": "CHN",
  "Французская Гвиана": "GUF",
  "Малые Тихоокеан.Отдален.Ост-Ва С.Ш.": "UMI",
  "Коморские Острова": "COM",
  "Южная Африка": "ZAF",
  "Кокосовые (Килинг) Острова": "CCK",
  "Питкерн": "PCN",
  "Кот-Д'Ивуар": "CIV",
  "Свазиленд": "SWZ",
  "Микронезия, Федеративные Штаты": "FSM",
  "Боливия (Многонациональное Государство)": "BOL",
  "Бонэйр, Синт-Эстатиус и Саба": "BES",
  "Бруней-Даруссалам": "BRN",
  "Венесуэла (Боливарианская Республика)": "VEN",
  "Виргинские острова (Брит.)": "VGB",
  "Виргинские острова (США)": "VIR",
  "Гонконг (Китай)": "HKG",
  "Иран (Исламская Республика)": "IRN",
  "Китайская Народная Республика": "CHN",
  "КНДР": "PRK",
  "Конго": "COG",
  "Корея, Республика": "KOR",
  "Косово": "XKX",
  "Кот-д'Ивуар": "CIV",
  "Лаосская Народно-Демократическая Республика": "LAO",
  "Макао (Китай)": "MAC",
  "Микронезия (Федеративные Штаты)": "FSM",
  "Молдова, Республика": "MDA",
  "Палестина, Государство": "PSE",
  "Сирийская Арабская Республика": "SYR",
  "Соединенное Королевство": "GBR",
  "Соединенные Штаты": "USA",
  "Тайвань (Китай)": "TWN",
  "Танзания, Объединенная Республика": "TZA",
  "Тимор-Лесте": "TLS",
  "Фолклендские острова (Мальвинские)": "FLK",
  "Чешская Республика": "CZE",
};

function alpha3ForName(name) {
  return ISO_ALIASES[name] ?? countries.getAlpha3Code(name, "ru");
}

function decodeXml(value = "") {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function xmlText(fragment = "") {
  return [...fragment.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
    .map((match) => decodeXml(match[1]))
    .join("");
}

function parseWorkbook(buffer) {
  const zip = unzipSync(new Uint8Array(buffer));
  const readXml = (name) => {
    const entry = zip[name];
    if (!entry) throw new Error(`Missing ${name} in workbook`);
    return strFromU8(entry);
  };

  const sharedXml = zip["xl/sharedStrings.xml"] ? readXml("xl/sharedStrings.xml") : "";
  const sharedStrings = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => xmlText(match[1]));
  const relsXml = readXml("xl/_rels/workbook.xml.rels");
  const relationships = new Map(
    [...relsXml.matchAll(/<Relationship\b([^>]+)\/?\s*>/g)].map((match) => {
      const attrs = match[1];
      return [
        attrs.match(/\bId="([^"]+)"/)?.[1],
        attrs.match(/\bTarget="([^"]+)"/)?.[1],
      ];
    }),
  );

  const workbookXml = readXml("xl/workbook.xml");
  const sheets = new Map();
  for (const match of workbookXml.matchAll(/<sheet\b([^>]+)\/?\s*>/g)) {
    const attrs = match[1];
    const name = decodeXml(attrs.match(/\bname="([^"]+)"/)?.[1]);
    const relId = attrs.match(/\br:id="([^"]+)"/)?.[1];
    const target = relationships.get(relId);
    if (!name || !target) continue;
    const normalizedTarget = target.startsWith("/")
      ? target.slice(1)
      : path.posix.normalize(`xl/${target}`);
    sheets.set(name, readXml(normalizedTarget));
  }

  return { sheets, sharedStrings };
}

function parseSheetRows(workbook, sheetName) {
  const sheet = workbook.sheets.get(sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} was not found`);
  const rows = new Map();
  const populatedCells = sheet.replace(/<c\b[^>]*\/>/g, "");

  for (const match of populatedCells.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attrs = match[1];
    const body = match[2];
    const ref = attrs.match(/\br="([A-Z]+)(\d+)"/)?.slice(1);
    if (!ref) continue;
    const [, rowNumber] = ref;
    const type = attrs.match(/\bt="([^"]+)"/)?.[1];
    const rawValue = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
    let value = rawValue;
    if (type === "s" && rawValue !== undefined) value = workbook.sharedStrings[Number(rawValue)];
    if (type === "inlineStr") value = xmlText(body);
    if (type !== "s" && type !== "inlineStr" && rawValue !== undefined && rawValue !== "") {
      const numeric = Number(rawValue);
      value = Number.isFinite(numeric) ? numeric : decodeXml(rawValue);
    }
    const row = rows.get(Number(rowNumber)) ?? {};
    row[ref[0]] = value;
    rows.set(Number(rowNumber), row);
  }

  return [...rows.entries()]
    .filter(([, row]) => typeof row.A === "string" && row.A.trim() && typeof row.B === "number")
    .map(([, row]) => ({
      name: row.A.trim(),
      turnover: Number(row.B) || 0,
      turnoverShare: Number(row.C) || 0,
      export: Number(row.D) || 0,
      exportShare: Number(row.E) || 0,
      import: Number(row.F) || 0,
      importShare: Number(row.G) || 0,
    }));
}

function parseProductDetails(buffer) {
  const wantedFiles = new Set(["xl/sharedStrings.xml", "xl/worksheets/sheet4.xml"]);
  const zip = unzipSync(new Uint8Array(buffer), { filter: (file) => wantedFiles.has(file.name) });
  const sharedXml = strFromU8(zip["xl/sharedStrings.xml"]);
  const sharedStrings = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((match) => xmlText(match[1]));
  const sheet = strFromU8(zip["xl/worksheets/sheet4.xml"]);
  const productsByCountry = new Map();
  let currentProduct = null;

  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*?)(?<!\/)>([\s\S]*?)<\/c>/g)) {
      const ref = cellMatch[1].match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!ref || !["A", "B", "AZ", "BB"].includes(ref)) continue;
      const type = cellMatch[1].match(/\bt="([^"]+)"/)?.[1];
      const rawValue = cellMatch[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (rawValue === undefined) continue;
      cells[ref] = type === "s" ? sharedStrings[Number(rawValue)] : Number(rawValue);
    }

    if (typeof cells.A === "string" && /^\d{4}$/.test(cells.A) && typeof cells.B === "string") {
      currentProduct = { code: cells.A, name: cells.B.trim() };
      continue;
    }
    if (!currentProduct || typeof cells.B !== "string" || GROUP_ROWS.has(cells.B.trim())) continue;
    const alpha3 = alpha3ForName(cells.B.trim());
    if (!alpha3) continue;
    const exportValue = Number(cells.AZ) || 0;
    const importValue = Number(cells.BB) || 0;
    if (exportValue <= 0 && importValue <= 0) continue;
    const countryProducts = productsByCountry.get(alpha3) ?? new Map();
    const item = countryProducts.get(currentProduct.code) ?? {
      code: currentProduct.code,
      name: currentProduct.name,
      export: 0,
      import: 0,
    };
    item.export += exportValue / 1000;
    item.import += importValue / 1000;
    countryProducts.set(currentProduct.code, item);
    productsByCountry.set(alpha3, countryProducts);
  }

  return new Map([...productsByCountry].map(([alpha3, productMap]) => {
    const products = [...productMap.values()];
    const buildTop = (direction) => products
      .filter((product) => product[direction] > 0)
      .sort((a, b) => b[direction] - a[direction])
      .slice(0, 8)
      .map((product) => ({ code: product.code, name: product.name, value: product[direction] }));
    return [alpha3, { export: buildTop("export"), import: buildTop("import") }];
  }));
}

function toMillions(row) {
  if (!row) return null;
  return {
    turnover: row.turnover / 1000,
    export: row.export / 1000,
    import: row.import / 1000,
    turnoverShare: row.turnoverShare,
    exportShare: row.exportShare,
    importShare: row.importShare,
  };
}

function percentChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function growth(current, previous) {
  if (!current || !previous) return null;
  return {
    turnover: percentChange(current.turnover, previous.turnover),
    export: percentChange(current.export, previous.export),
    import: percentChange(current.import, previous.import),
  };
}

async function downloadSource(source, force) {
  if (!force && existsSync(source.file)) return;
  const response = await fetch(source.url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${source.url}`);
  await writeFile(source.file, Buffer.from(await response.arrayBuffer()));
}

async function main() {
  const forceDownload = process.argv.includes("--download");
  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all(Object.values(SOURCES).map((source) => downloadSource(source, forceDownload)));

  const [annualWorkbook, currentWorkbook] = await Promise.all([
    readFile(SOURCES.annual.file).then(parseWorkbook),
    readFile(SOURCES.current.file).then(parseWorkbook),
  ]);
  const productDetails = await readFile(SOURCES.products.file).then(parseProductDetails);

  const annual2024 = parseSheetRows(annualWorkbook, "2024");
  const annual2025 = parseSheetRows(annualWorkbook, "2025");
  const current2025 = parseSheetRows(currentWorkbook, "2025");
  const current2026 = parseSheetRows(currentWorkbook, "2026");

  const indexes = Object.fromEntries(
    Object.entries({ annual2024, annual2025, current2025, current2026 }).map(([key, rows]) => [
      key,
      new Map(rows.map((row) => [row.name, row])),
    ]),
  );
  const totals = Object.fromEntries(
    Object.entries(indexes).map(([key, index]) => [key, toMillions(index.get("Всего"))]),
  );

  const features = feature(world, world.objects.countries).features;
  const atlasById = new Map(features.map((country) => [String(country.id).padStart(3, "0"), country]));
  const unmatched = new Set();
  const partnerRecords = new Map();
  const periods = { annual2024, annual2025, current2025, current2026 };
  for (const [period, rows] of Object.entries(periods)) {
    for (const row of rows) {
      if (GROUP_ROWS.has(row.name)) continue;
      const alpha3 = alpha3ForName(row.name);
      if (!alpha3) unmatched.add(row.name);
      const key = alpha3 ?? `STAT-${row.name}`;
      const record = partnerRecords.get(key) ?? { key, alpha3: alpha3 ?? null, names: [], periods: {} };
      if (!record.names.includes(row.name)) record.names.push(row.name);
      record.periods[period] = row;
      partnerRecords.set(key, record);
    }
  }

  const partners = [...partnerRecords.values()].map((record) => {
    const { alpha3 } = record;
    const numericId = alpha3 ? countries.alpha3ToNumeric(alpha3) : undefined;
    const mapFeature = numericId ? atlasById.get(numericId) : undefined;
    const annual24 = toMillions(record.periods.annual2024);
    const annual25 = toMillions(record.periods.annual2025);
    const current25 = toMillions(record.periods.current2025);
    const current26 = toMillions(record.periods.current2026);
    return {
      key: record.key,
      alpha3,
      mapId: mapFeature ? numericId : null,
      nameRu: record.names.at(-1),
      aliasesRu: record.names.length > 1 ? record.names.slice(0, -1) : [],
      worldName: mapFeature?.properties?.name ?? null,
      coordinates: mapFeature ? geoCentroid(mapFeature) : null,
      annual: { "2024": annual24, "2025": annual25 },
      current: { "2025": current25, "2026": current26 },
      products2025: productDetails.get(alpha3) ?? { export: [], import: [] },
      currentGrowth: growth(current26, current25),
      annualGrowth: growth(annual25, annual24),
      balance: current26 ? current26.export - current26.import : annual25 ? annual25.export - annual25.import : 0,
    };
  });

  partners.sort((a, b) =>
    (b.current["2026"]?.turnover ?? b.annual["2025"]?.turnover ?? 0) -
    (a.current["2026"]?.turnover ?? a.annual["2025"]?.turnover ?? 0),
  );
  partners.forEach((partner, index) => { partner.rank = index + 1; });

  const reconciliationPeriods = [
    ["annual", "2024", totals.annual2024],
    ["annual", "2025", totals.annual2025],
    ["current", "2025", totals.current2025],
    ["current", "2026", totals.current2026],
  ];
  for (const [scope, year, total] of reconciliationPeriods) {
    for (const field of ["turnover", "export", "import"]) {
      const partnerSum = partners.reduce((sum, partner) => sum + (partner[scope][year]?.[field] ?? 0), 0);
      if (Math.abs(partnerSum - total[field]) > 0.001) {
        throw new Error(`Reconciliation failed for ${scope} ${year} ${field}: ${partnerSum} !== ${total[field]}`);
      }
    }
  }

  const dataset = {
    metadata: {
      title: "Внешняя торговля Республики Казахстан по странам",
      source: "Бюро национальной статистики АСПиР РК",
      sourcePage: "https://stat.gov.kz/ru/industries/economy/foreign-market/spreadsheets/",
      sourceFiles: [SOURCES.annual.url, SOURCES.current.url, SOURCES.products.url],
      reuseTerms: "https://stat.gov.kz/ru/description/",
      generatedAt: new Date().toISOString(),
      units: "million USD",
      annualPeriod: "2025 год",
      currentPeriod: "январь–май 2026",
      comparisonPeriod: "январь–май 2025",
      productPeriod: "2025 год",
      productClassification: "ТН ВЭД ЕАЭС, 4 знака",
      publishedAt: "2026-07-15",
      note: "Показатели исходных таблиц БНС переведены из тысяч в миллионы долларов США.",
    },
    coverage: {
      partners: partners.length,
      currentPartners: partners.filter((partner) => partner.current["2026"]?.turnover).length,
      mappedPartners: partners.filter((partner) => partner.mapId).length,
      detailedPartners: partners.filter((partner) => partner.products2025.export.length || partner.products2025.import.length).length,
    },
    totals: {
      annual: { "2024": totals.annual2024, "2025": totals.annual2025 },
      current: { "2025": totals.current2025, "2026": totals.current2026 },
      currentGrowth: growth(totals.current2026, totals.current2025),
      annualGrowth: growth(totals.annual2025, totals.annual2024),
    },
    partners,
  };

  await writeFile(OUTPUT_FILE, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  console.log(`Wrote ${partners.length} partners (${dataset.coverage.mappedPartners} mapped) to ${path.relative(ROOT, OUTPUT_FILE)}`);
  if (unmatched.size) console.warn(`Unmatched ISO names (${unmatched.size}): ${[...unmatched].join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
