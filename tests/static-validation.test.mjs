import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const appSource = read("app.js");
const chartSource = read("charts.js");
const cssSource = read("app.css");
const i18nSource = read("i18n.js");
const mainHtml = read("index.html");

function quotedArray(name) {
  const match = appSource.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  assert.ok(match, `Could not find ${name}`);
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) => item[1]);
}

function htmlIds(html) {
  return [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
}

function localHtmlReferences(html) {
  return [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((reference) =>
      reference &&
      !reference.startsWith("#") &&
      !reference.startsWith("data:") &&
      !/^[a-z][a-z0-9+.-]*:/i.test(reference),
    );
}

function resolvedReference(htmlRelativePath, reference) {
  const clean = reference.split(/[?#]/, 1)[0];
  const target = path.normalize(path.join(path.dirname(htmlRelativePath), clean));
  return target.endsWith(path.sep) ? path.join(target, "index.html") : target;
}

function loadCatalogs() {
  const sandbox = { window: {} };
  vm.runInNewContext(i18nSource, sandbox, { filename: "i18n.js" });
  return sandbox.window.HealthI18n.catalogs;
}

function loadAppHooks() {
  const storage = new Map();
  const window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    HealthI18n: {
      normalizeLanguage: (value) => (value === "zh-Hant" ? value : "en"),
      translate: (key) => key,
      locale: () => "en-GB",
    },
  };
  const document = {
    body: { dataset: {} },
    currentScript: { src: "http://localhost:8000/app.js" },
    addEventListener: () => {},
  };
  const sandbox = {
    URL,
    Date,
    Intl,
    Map,
    Set,
    Uint8Array,
    console,
    document,
    navigator: { language: "en" },
    window,
  };
  vm.runInNewContext(appSource, sandbox, { filename: "app.js" });
  return sandbox.window.HealthTrackerTestHooks;
}

test("JavaScript parses without unsafe HTML sinks or private server credentials", () => {
  for (const relativePath of ["app.js", "charts.js", "i18n.js"]) {
    const source = read(relativePath);
    assert.doesNotMatch(source, /\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/, relativePath);
  }
  const repositoryText = [appSource, chartSource, i18nSource, read("supabase-config.js")].join("\n");
  assert.doesNotMatch(
    repositoryText,
    /\b(?:service_role|sb_secret_|DATABASE_URL)\b|postgres(?:ql)?:\/\//i,
  );
});

test("record, form, chart, card and category keys remain internally consistent", () => {
  const recordKeys = quotedArray("RECORD_KEYS");
  const formKeys = quotedArray("FORM_CATEGORY_KEYS");
  const chartKeys = quotedArray("CHART_KEYS");
  assert.deepEqual(recordKeys, [
    "weight",
    "water",
    "cardio",
    "strength",
    "food",
    "groceries",
    "mealPrep",
    "calories",
    "foodDesire",
    "exerciseDesire",
  ]);
  assert.deepEqual(formKeys, recordKeys.slice(0, 8));
  assert.deepEqual(chartKeys, ["weight", "water", "cardio", "strength", "food"]);
  assert.match(appSource, /const CARD_KEYS = \[\.\.\.FORM_CATEGORY_KEYS, "progress", "foodDesire"\]/);

  const categoryBlock = appSource.match(
    /const categoryConfigs = \[([\s\S]*?)\n  \];\n\n  const progressCard/,
  )?.[1];
  assert.ok(categoryBlock, "Could not parse categoryConfigs");
  const categoryKeys = [...categoryBlock.matchAll(/^    \{\n      key: "([^"]+)"/gm)].map(
    (match) => match[1],
  );
  assert.deepEqual(categoryKeys, recordKeys);
  assert.ok(!recordKeys.includes("progress"), "Derived progress view must not be stored remotely");
});

test("main HTML has unique IDs and every app.js ID selector exists", () => {
  const ids = htmlIds(mainHtml);
  assert.equal(new Set(ids).size, ids.length, "Duplicate IDs found in index.html");
  const selectorIds = [
    ...appSource.matchAll(/document\.querySelector\(["']#([a-zA-Z0-9_-]+)["']\)/g),
  ].map((match) => match[1]);
  const missing = [...new Set(selectorIds)].filter((id) => !ids.includes(id));
  assert.deepEqual(missing, [], `Missing index.html IDs: ${missing.join(", ")}`);
});

test("every local asset referenced by main HTML exists and uses a Pages-safe relative path", () => {
  const references = localHtmlReferences(mainHtml);
  const absolute = references.filter((reference) => reference.startsWith("/"));
  assert.deepEqual(absolute, [], `Root-relative paths break GitHub project Pages: ${absolute.join(", ")}`);
  const missing = references
    .map((reference) => resolvedReference("index.html", reference))
    .filter((relativePath) => !exists(relativePath));
  assert.deepEqual(missing, [], `Missing main-page assets: ${missing.join(", ")}`);
});

test("standalone food-desire page has the correct app mode, IDs and relative assets", () => {
  assert.ok(exists("food-desire/index.html"), "Missing food-desire/index.html");
  const miniHtml = read("food-desire/index.html");
  assert.match(miniHtml, /<body\s+data-app-mode="food-desire">/);
  assert.match(miniHtml, /<link\s+rel="manifest"\s+href="\.\/manifest\.webmanifest"/);
  assert.match(miniHtml, /(?:src|href)="\.\.\/app\.js"/);
  assert.match(miniHtml, /(?:src|href)="\.\.\/app\.css"/);

  const ids = htmlIds(miniHtml);
  assert.equal(new Set(ids).size, ids.length, "Duplicate IDs found in food-desire/index.html");
  const selectorIds = [
    ...appSource.matchAll(/document\.querySelector\(["']#([a-zA-Z0-9_-]+)["']\)/g),
  ].map((match) => match[1]);
  const missingIds = [...new Set(selectorIds)].filter((id) => !ids.includes(id));
  assert.deepEqual(
    missingIds,
    [],
    `Mini app loads shared app.js but lacks required IDs: ${missingIds.join(", ")}`,
  );

  const references = localHtmlReferences(miniHtml);
  const absolute = references.filter((reference) => reference.startsWith("/"));
  assert.deepEqual(absolute, [], `Root-relative mini-app paths: ${absolute.join(", ")}`);
  const missingAssets = references
    .map((reference) => resolvedReference("food-desire/index.html", reference))
    .filter((relativePath) => !exists(relativePath));
  assert.deepEqual(missingAssets, [], `Missing mini-app assets: ${missingAssets.join(", ")}`);
});

test("English and Traditional Chinese catalogs have identical keys and cover literal references", () => {
  const catalogs = loadCatalogs();
  const enKeys = Object.keys(catalogs.en).sort();
  const zhKeys = Object.keys(catalogs["zh-Hant"]).sort();
  assert.deepEqual(zhKeys, enKeys, "Translation catalogs have different key sets");

  const literalAppKeys = [...appSource.matchAll(/\bt\(\s*["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
  const htmlKeys = [
    ...mainHtml.matchAll(/\bdata-i18n(?:-placeholder)?="([^"]+)"/g),
  ].map((match) => match[1]);
  const requiredFamilies = [
    ...["weight", "water", "cardio", "strength", "food", "groceries", "mealPrep", "calories", "progress", "foodDesire", "exerciseDesire"].map((key) => `tracker.${key}.title`),
    ...["weight", "water", "cardio", "strength", "food"].flatMap((key) => [
      `chart.${key}.title`,
      `chart.${key}.subtitle`,
      `chart.${key}.y`,
    ]),
    ...["weight", "water", "cardio", "strength"].map((key) => `chart.series.${key}`),
    ...["breakfast", "lunch", "dinner", "total"].map((key) => `chart.series.${key}`),
  ];
  const referenced = [...new Set([...literalAppKeys, ...htmlKeys, ...requiredFamilies])];
  const missing = referenced.filter((key) => !(key in catalogs.en));
  assert.deepEqual(missing, [], `Missing translation keys: ${missing.join(", ")}`);
});

test("new UI components have production CSS coverage", () => {
  const selectors = [
    ".control-row",
    ".chart-panel",
    ".all-charts-grid",
    ".progress-chart",
    ".chart-scroller",
    ".chart-legend",
    ".chart-point",
    ".rating-scale",
    ".rating-button",
    ".desire-panel",
    ".food-desire-panel",
    ".hunger-button",
    ".mini-summary",
    ".subpanel",
    ".date-range-form",
    ".sr-only",
    ".print-chart-section",
  ];
  const missing = selectors.filter((selector) => !cssSource.includes(selector));
  assert.deepEqual(missing, [], `Missing CSS selectors: ${missing.join(", ")}`);
  assert.match(cssSource, /env\(safe-area-inset-(?:top|bottom)\)/);
});

test("charts expose SVG semantics plus an accessible data-table fallback", () => {
  assert.match(chartSource, /role:\s*["']img["']/);
  assert.match(chartSource, /svgElement\(["']title["']/);
  assert.match(chartSource, /svgElement\(["']desc["']/);
  assert.match(chartSource, /createAccessibleTable\(model\)/);
  assert.match(chartSource, /line\.dash/);
  assert.match(appSource, /day\.total \+= calories/);
  assert.match(appSource, /number\(record\.sets\) \* number\(record\.reps\)/);
});

test("PWA manifests, mini app, local SDK, icons and service worker are complete", () => {
  const required = [
    "manifest.webmanifest",
    "pwa-register.js",
    "sw.js",
    "vendor/supabase.min.js",
    "food-desire/index.html",
    "food-desire/manifest.webmanifest",
  ];
  const missing = required.filter((relativePath) => !exists(relativePath));
  assert.deepEqual(missing, [], `Missing PWA files: ${missing.join(", ")}`);

  const mainManifest = JSON.parse(read("manifest.webmanifest"));
  const miniManifest = JSON.parse(read("food-desire/manifest.webmanifest"));
  for (const [label, manifest] of [
    ["main", mainManifest],
    ["food desire", miniManifest],
  ]) {
    assert.ok(manifest.id, `${label} manifest needs a stable id`);
    assert.ok(manifest.start_url, `${label} manifest needs start_url`);
    assert.ok(manifest.scope, `${label} manifest needs scope`);
    assert.ok(!manifest.start_url.startsWith("/"), `${label} start_url must be Pages-relative`);
    assert.ok(!manifest.scope.startsWith("/"), `${label} scope must be Pages-relative`);
    assert.equal(manifest.display, "standalone");
    const sizes = new Set((manifest.icons || []).map((icon) => icon.sizes));
    assert.ok(sizes.has("192x192"), `${label} manifest needs a 192x192 icon`);
    assert.ok(sizes.has("512x512"), `${label} manifest needs a 512x512 icon`);
  }
  assert.notEqual(mainManifest.id, miniManifest.id, "The two PWAs need distinct manifest IDs");
  const mainStart = new URL(mainManifest.start_url, "https://example.test/Health-Tracker/manifest.webmanifest").href;
  const miniStart = new URL(
    miniManifest.start_url,
    "https://example.test/Health-Tracker/food-desire/manifest.webmanifest",
  ).href;
  assert.notEqual(mainStart, miniStart, "The two PWAs need distinct resolved start URLs");

  const iconReferences = [
    ...(mainManifest.icons || []).map((icon) => ["", icon.src]),
    ...(miniManifest.icons || []).map((icon) => ["food-desire", icon.src]),
  ];
  const missingIcons = iconReferences
    .filter(([, src]) => !/^[a-z][a-z0-9+.-]*:/i.test(src))
    .map(([base, src]) => path.normalize(path.join(base, src)))
    .filter((relativePath) => !exists(relativePath));
  assert.deepEqual(missingIcons, [], `Missing manifest icons: ${missingIcons.join(", ")}`);

  const registration = read("pwa-register.js");
  assert.match(registration, /navigator\.serviceWorker\.register/);
  const installBindingOwners = [appSource, registration].filter((source) =>
    /querySelectorAll\(\s*["']\[data-pwa-install\]["']\s*\)[\s\S]{0,240}addEventListener/.test(source),
  );
  assert.equal(
    installBindingOwners.length,
    1,
    "Standalone install buttons must have exactly one click-handler owner",
  );
  const worker = read("sw.js");
  assert.match(worker, /request\.method\s*!==\s*["']GET["']/);
  assert.match(worker, /url\.origin\s*!==\s*self\.location\.origin/);
  assert.doesNotMatch(worker, /supabase\.co|\/auth\/v1|\/rest\/v1/i);
  assert.match(worker, /appUrl\(["']vendor\/supabase\.min\.js["']\)/);
  assert.match(
    worker,
    /startsWith\(["']health-tracker-shell-["']\)/,
    "Activation must only delete old Health Tracker caches, never caches owned by other GitHub Pages apps",
  );
});

test("food desire and exercise desire preserve required data semantics", () => {
  assert.match(appSource, /hungerOccurredAt = new Date\(\)\.toISOString\(\)/);
  assert.match(appSource, /id:\s*makeId\(\)[\s\S]*occurredAt/);
  assert.match(appSource, /foodDesired:\s*elements\.foodDesired\.value/);
  assert.match(appSource, /if \(elements\.foodDesired\.value === "others" && !otherFood\)/);
  assert.match(appSource, /window\.setTimeout\([\s\S]*?, 2000\)/);
  assert.match(appSource, /exerciseDesireSaveQueue = exerciseDesireSaveQueue\.then/);
  assert.match(appSource, /findIndex\(\(record\) => record\.date === date\)/);
  assert.match(appSource, /printCategories\(\["exerciseDesire"\]/);
});

test("pure aggregation and date-range hooks behave correctly", () => {
  const hooks = loadAppHooks();
  assert.ok(hooks, "HealthTrackerTestHooks was not exposed");
  const totals = hooks.aggregateDaily(
    [
      { date: "2026-08-01", value: 2 },
      { date: "2026-08-01", value: 1.5 },
      { date: "2026-08-03", value: 4 },
      { date: "not-a-date", value: 100 },
    ],
    (record) => record.value,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(totals)), [
    ["2026-08-01", 3.5],
    ["2026-08-03", 4],
  ]);

  const records = [
    { date: "2026-08-01", id: "a" },
    { date: "2026-08-02", id: "b" },
    { date: "2026-08-03", id: "c" },
  ];
  assert.deepEqual(
    JSON.parse(JSON.stringify(hooks.filterDateRange(records, "2026-08-01", "2026-08-03"))).map(
      (record) => record.id,
    ),
    ["c", "b", "a"],
    "Custom range must include both boundary dates",
  );
});

test("Supabase migration expands the category constraint without weakening owner RLS", () => {
  const sqlFiles = fs
    .readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => path.join(entry.parentPath || entry.path, entry.name));
  const sql = sqlFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.match(sql, /foodDesire/);
  assert.match(sql, /exerciseDesire/);
  assert.match(sql, /health_entries_category_check/);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /auth\.uid\(\).*user_id|user_id.*auth\.uid\(\)/is);
  assert.doesNotMatch(sql, /disable row level security/i);
});
