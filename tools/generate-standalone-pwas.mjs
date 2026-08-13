import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "pwa-catalog.json"), "utf8"));
const template = fs.readFileSync(path.join(import.meta.dirname, "standalone-template.html"), "utf8");

const requiredKeys = [
  "key",
  "slug",
  "name",
  "shortName",
  "appleTitle",
  "description",
  "themeColor",
  "backgroundColor",
  "iconLabel",
];

for (const entry of catalog) {
  for (const key of requiredKeys) {
    if (!entry[key]) throw new Error(`Missing ${key} for ${entry.key || "unknown PWA"}`);
  }
}

const unique = (field) => new Set(catalog.map((entry) => entry[field])).size === catalog.length;
if (!unique("key") || !unique("slug")) throw new Error("PWA keys and slugs must be unique.");

const browserCatalog = `(() => {\n  "use strict";\n  const catalog = ${JSON.stringify(catalog, null, 2)};\n  catalog.forEach(Object.freeze);\n  Object.freeze(catalog);\n  if (typeof window !== "undefined") window.HealthPwaCatalog = catalog;\n  if (typeof self !== "undefined") self.HealthPwaCatalog = catalog;\n})();\n`;
fs.writeFileSync(path.join(root, "pwa-catalog.js"), browserCatalog);

const replaceTokens = (source, values) =>
  source.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!(key in values)) throw new Error(`Unknown template token ${key}`);
    return values[key];
  });

for (const entry of catalog) {
  const iconPrefix = entry.slug;
  const directory = path.join(root, entry.slug);
  fs.mkdirSync(path.join(directory, "icons"), { recursive: true });

  const html = replaceTokens(template, {
    APPLE_TITLE: entry.appleTitle,
    DESCRIPTION: entry.description,
    ICON_PREFIX: iconPrefix,
    KEY: entry.key,
    NAME: entry.name,
    THEME_COLOR: entry.themeColor,
  });
  fs.writeFileSync(path.join(directory, "index.html"), html);

  const manifest = {
    id: `/Health-Tracker/${entry.slug}/`,
    name: entry.name,
    short_name: entry.shortName,
    description: entry.description,
    lang: "en",
    start_url: "./",
    scope: "./",
    display: "standalone",
    display_override: ["standalone"],
    orientation: "any",
    background_color: entry.backgroundColor,
    theme_color: entry.themeColor,
    categories: entry.categories,
    prefer_related_applications: false,
    icons: [
      {
        src: `./icons/${iconPrefix}-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `./icons/${iconPrefix}-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `./icons/${iconPrefix}-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
  fs.writeFileSync(
    path.join(directory, "manifest.webmanifest"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

console.log(`Generated ${catalog.length} standalone PWA routes.`);
