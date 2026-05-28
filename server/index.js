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
import { summarizeRegions } from "./lib/normalize.js";
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
    const results = await searchMissingPeople(config, query);
    return enrichWithCoordinates(results, config.kakaoRestKey);
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
