import fs from "node:fs/promises";
import syncFs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { getOrSetCache } from "./lib/cache.js";
import { enrichWithCoordinates } from "./lib/kakao.js";
import { extractRegion, summarizeRegions } from "./lib/normalize.js";
import { fetchAlerts, searchMissingPeople } from "./lib/safeDream.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const reportPath = path.join(dataDir, "guardian-reports.local.json");

const app = express();

loadEnvFile();

const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  safeDreamId: process.env.SAFEDREAM_ESNTL_ID,
  safeDreamKey: process.env.SAFEDREAM_AUTH_KEY,
  kakaoRestKey: process.env.KAKAO_REST_API_KEY
};

const allowedOrigins = new Set([
  config.clientOrigin,
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!syncFs.existsSync(envPath)) return;

  const lines = syncFs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS origin is not allowed: ${origin}`));
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function readQuery(req) {
  return {
    page: req.query.page,
    rowSize: req.query.rowSize,
    detailDate1: req.query.detailDate1,
    detailDate2: req.query.detailDate2,
    age1: req.query.age1,
    age2: req.query.age2,
    occrAdres: req.query.occrAdres,
    sexdstnDscd: req.query.sexdstnDscd,
    nm: req.query.nm
  };
}

async function getAlerts(query) {
  const cacheKey = `alerts:${JSON.stringify(query)}`;
  return getOrSetCache(cacheKey, 1000 * 60 * 10, async () => {
    const people = await fetchAlerts(config, query);
    return enrichWithCoordinates(people, config.kakaoRestKey);
  });
}

function includesText(value, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  return String(value || "").toLowerCase().includes(needle);
}

function inAgeRange(age, min, max) {
  const parsed = Number.parseInt(age, 10);
  const minAge = Number.parseInt(min, 10);
  const maxAge = Number.parseInt(max, 10);

  if (Number.isFinite(minAge) && (!Number.isFinite(parsed) || parsed < minAge)) {
    return false;
  }

  if (Number.isFinite(maxAge) && (!Number.isFinite(parsed) || parsed > maxAge)) {
    return false;
  }

  return true;
}

function matchesGender(gender, queryGender) {
  const selected = String(queryGender || "").trim();
  if (!selected) return true;

  const normalizedGender = String(gender || "").trim();
  const genderMap = new Map([
    ["1", ["1", "남", "남자", "남성"]],
    ["2", ["2", "여", "여자", "여성"]]
  ]);
  const accepted = genderMap.get(selected) || [selected];

  return accepted.some((value) => normalizedGender === value);
}

function normalizeRegionQuery(region) {
  const value = String(region || "").trim();
  if (!value) return "";
  return extractRegion(value);
}

function matchesRegion(locationText, queryRegion) {
  const selected = String(queryRegion || "").trim();
  if (!selected) return true;

  const parts = selected.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const province = parts[0];
    const district = parts.slice(1).join(" ");
    const districtBase = district.replace(/[시군구]$/, "");
    const normalizedProvince = normalizeRegionQuery(province);
    const normalizedLocation = extractRegion(locationText);

    return (
      normalizedLocation === normalizedProvince &&
      (includesText(locationText, district) ||
        includesText(locationText, districtBase))
    );
  }

  const normalizedSelected = normalizeRegionQuery(selected);
  const normalizedLocation = extractRegion(locationText);
  const canCompareNormalizedRegion = normalizedSelected !== "지역 미상";

  return (
    includesText(locationText, selected) ||
    normalizedLocation === selected ||
    (canCompareNormalizedRegion && normalizedLocation === normalizedSelected)
  );
}

function matchesSearchQuery(person, query) {
  return (
    includesText(person.name, query.nm) &&
    matchesRegion(person.locationText, query.occrAdres) &&
    matchesGender(person.gender, query.sexdstnDscd) &&
    inAgeRange(person.age, query.age1, query.age2)
  );
}

function mergePeople(primary, fallback) {
  const seen = new Set();
  const merged = [];

  for (const person of [...primary, ...fallback]) {
    const key = person.id || `${person.name}:${person.missingAt}:${person.locationText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(person);
  }

  return merged;
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    safeDreamConfigured: Boolean(config.safeDreamId && config.safeDreamKey),
    kakaoGeocodingConfigured: Boolean(config.kakaoRestKey)
  });
});

app.get("/api/missing/alerts", asyncRoute(async (req, res) => {
  const people = await getAlerts(readQuery(req));
  res.json({
    source: "safe182",
    count: people.length,
    items: people
  });
}));

app.get("/api/missing/search", asyncRoute(async (req, res) => {
  const query = readQuery(req);
  const cacheKey = `search:${JSON.stringify(query)}`;
  const people = await getOrSetCache(cacheKey, 1000 * 60 * 10, async () => {
    const [searchResults, alertResults] = await Promise.all([
      searchMissingPeople(config, query),
      getAlerts({ rowSize: query.rowSize || 100 })
    ]);

    const enrichedSearchResults = await enrichWithCoordinates(
      searchResults,
      config.kakaoRestKey
    );
    const matchingAlerts = alertResults.filter((person) =>
      matchesSearchQuery(person, query)
    );

    return mergePeople(enrichedSearchResults, matchingAlerts).filter((person) =>
      matchesSearchQuery(person, query)
    );
  });
  res.json({
    source: "safe182",
    count: people.length,
    items: people
  });
}));

app.get("/api/stats/regions", asyncRoute(async (req, res) => {
  const people = await getAlerts(readQuery(req));
  res.json({
    source: "safe182",
    regions: summarizeRegions(people),
    total: people.length
  });
}));

app.post("/api/guardian-reports", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const required = ["guardianName", "guardianPhone", "missingName", "missingAt", "locationText"];
  const missing = required.filter((key) => !String(body[key] || "").trim());
  if (missing.length) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "필수 항목이 누락되었습니다.",
      fields: missing
    });
  }

  await fs.mkdir(dataDir, { recursive: true });
  let previous = [];
  try {
    previous = JSON.parse(await fs.readFile(reportPath, "utf8"));
  } catch {
    previous = [];
  }

  const report = {
    id: `guardian-${Date.now()}`,
    ...body,
    status: "review_pending",
    createdAt: new Date().toISOString()
  };
  previous.push(report);
  await fs.writeFile(reportPath, JSON.stringify(previous, null, 2), "utf8");

  res.status(201).json({
    report,
    message: "등록 요청이 접수되었습니다. 검토 후 공개 여부가 결정됩니다."
  });
}));

app.use((error, req, res, next) => {
  const status = error.status || 500;
  res.status(status).json({
    code: error.code || "SERVER_ERROR",
    message: error.message || "서버 오류가 발생했습니다."
  });
});

app.listen(config.port, () => {
  console.log(`API server listening on http://localhost:${config.port}`);
});
