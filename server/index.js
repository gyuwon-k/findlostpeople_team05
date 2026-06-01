import fs from "node:fs/promises";
import syncFs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { clearCache, getOrSetCache } from "./lib/cache.js";
import {
  collectMissingDisasterMessages,
  fetchMissingDisasterMessages
} from "./lib/disasterMessages.js";
import { enrichWithCoordinates, geocodeAddress } from "./lib/kakao.js";
import { extractRegion, summarizeRegions } from "./lib/normalize.js";
import { fetchAlerts, searchMissingPeople } from "./lib/safeDream.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const reportPath = path.join(dataDir, "guardian-reports.local.json");
const usersPath = path.join(dataDir, "users.local.json");
const sessionsPath = path.join(dataDir, "sessions.local.json");
const localMissingPath = path.join(dataDir, "local-missing.local.json");
const disasterCachePath = path.join(dataDir, "disaster-missing-cache.json");
const uploadsDir = path.join(__dirname, "uploads");

const app = express();

loadEnvFile();

const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  safeDreamId: process.env.SAFEDREAM_ESNTL_ID,
  safeDreamKey: process.env.SAFEDREAM_AUTH_KEY,
  kakaoRestKey: process.env.KAKAO_REST_API_KEY,
  disasterMsgKey: process.env.DISASTER_MSG_API_KEY
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

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS origin is not allowed: ${origin}`));
  }
}));
app.use(express.json({ limit: "12mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function readJsonFile(filePath, fallback = []) {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(String(password), salt, 100000, 64, "sha512")
    .toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  if (!user?.passwordSalt || !user?.passwordHash) return false;
  const { hash } = hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(user.passwordHash, "hex")
  );
}

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

async function getSessionUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;

  const [sessions, users] = await Promise.all([
    readJsonFile(sessionsPath),
    readJsonFile(usersPath)
  ]);
  const session = sessions.find((item) => item.token === token);
  if (!session) return null;

  const user = users.find((item) => item.id === session.userId);
  return user ? { user, session } : null;
}

function requireAuth(handler) {
  return asyncRoute(async (req, res) => {
    const auth = await getSessionUser(req);
    if (!auth) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다."
      });
    }
    req.user = auth.user;
    req.session = auth.session;
    return handler(req, res);
  });
}

function requireFields(body, fields) {
  const missing = fields.filter((key) => !String(body[key] || "").trim());
  if (missing.length) {
    const error = new Error("필수 항목을 입력해주세요.");
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    error.fields = missing;
    throw error;
  }
}

async function savePhotoDataUrl(photoDataUrl, id) {
  const text = String(photoDataUrl || "");
  const match = text.match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    const error = new Error("사진 파일은 png, jpg, webp 형식만 등록할 수 있습니다.");
    error.status = 400;
    error.code = "INVALID_PHOTO";
    throw error;
  }

  const ext = match[1].toLowerCase().replace("jpeg", "jpg");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 8 * 1024 * 1024) {
    const error = new Error("사진 파일은 8MB 이하만 등록할 수 있습니다.");
    error.status = 400;
    error.code = "PHOTO_TOO_LARGE";
    throw error;
  }

  await fs.mkdir(uploadsDir, { recursive: true });
  const fileName = `${id}.${ext}`;
  await fs.writeFile(path.join(uploadsDir, fileName), buffer);
  return `/uploads/${fileName}`;
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

function mergeCacheItems(existing, incoming) {
  const seen = new Set();
  const merged = [];

  for (const item of [...incoming, ...existing]) {
    const key = item.id || `${item.name}:${item.missingAt}:${item.locationText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

async function readDisasterCache() {
  try {
    const cache = JSON.parse(await fs.readFile(disasterCachePath, "utf8"));
    return {
      items: Array.isArray(cache.items) ? cache.items : [],
      meta: cache.meta || {}
    };
  } catch {
    return { items: [], meta: {} };
  }
}

async function writeDisasterCache(items, meta = {}) {
  await fs.mkdir(dataDir, { recursive: true });
  const payload = {
    meta: {
      ...meta,
      itemCount: items.length,
      savedAt: new Date().toISOString()
    },
    items
  };
  await fs.writeFile(disasterCachePath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

async function refreshDisasterCache(mode = "quick") {
  const current = await readDisasterCache();
  const collected = await collectMissingDisasterMessages(config, {
    mode,
    rowSize: 100,
    recentPages: 20
  });
  const items =
    collected.mode === "full"
      ? collected.items
      : mergeCacheItems(current.items, collected.items);

  const cache = await writeDisasterCache(items, {
    mode: collected.mode,
    calls: collected.calls,
    scannedPages: collected.scannedPages,
    apiTotalCount: collected.totalCount,
    latestPage: collected.latestPage,
    refreshedAt: collected.refreshedAt
  });
  clearCache();
  return cache;
}

async function getMissingDisasterMessages(query) {
  const cacheKey = `disaster-messages:${JSON.stringify(query)}`;
  return getOrSetCache(cacheKey, 1000 * 60 * 5, async () => {
    const cached = await readDisasterCache();
    if (cached.items.length > 0) {
      return cached.items;
    }

    try {
      const messages = await fetchMissingDisasterMessages(config, {
        page: query.page || 1,
        rowSize: query.rowSize || 100,
        recentPages: 20
      });
      return messages;
    } catch (error) {
      console.warn("Disaster message API skipped:", error.message);
      return [];
    }
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
  const textForNameSearch = [
    person.name,
    person.features,
    person.clothing,
    person.locationText,
  ].join(" ");

  return (
    includesText(textForNameSearch, query.nm) &&
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
    kakaoGeocodingConfigured: Boolean(config.kakaoRestKey),
    disasterMessageConfigured: Boolean(config.disasterMsgKey)
  });
});

app.post("/api/auth/signup", asyncRoute(async (req, res) => {
  const body = req.body || {};
  requireFields(body, ["name", "email", "password"]);

  const email = String(body.email).trim().toLowerCase();
  const password = String(body.password);
  if (password.length < 4) {
    return res.status(400).json({
      code: "WEAK_PASSWORD",
      message: "비밀번호는 4자 이상 입력해주세요."
    });
  }

  const users = await readJsonFile(usersPath);
  if (users.some((user) => user.email === email)) {
    return res.status(409).json({
      code: "EMAIL_EXISTS",
      message: "이미 가입된 이메일입니다."
    });
  }

  const passwordData = hashPassword(password);
  const user = {
    id: `user-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    name: String(body.name).trim(),
    email,
    passwordSalt: passwordData.salt,
    passwordHash: passwordData.hash,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  await writeJsonFile(usersPath, users);

  res.status(201).json({
    user: publicUser(user),
    message: "회원가입이 완료되었습니다. 로그인해주세요."
  });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const body = req.body || {};
  requireFields(body, ["email", "password"]);

  const email = String(body.email).trim().toLowerCase();
  const users = await readJsonFile(usersPath);
  const user = users.find((item) => item.email === email);
  if (!user || !verifyPassword(String(body.password), user)) {
    return res.status(401).json({
      code: "LOGIN_FAILED",
      message: "이메일 또는 비밀번호가 올바르지 않습니다."
    });
  }

  const sessions = await readJsonFile(sessionsPath);
  const session = {
    token: createToken(),
    userId: user.id,
    createdAt: new Date().toISOString()
  };
  sessions.push(session);
  await writeJsonFile(sessionsPath, sessions);

  res.json({
    token: session.token,
    user: publicUser(user)
  });
}));

app.get("/api/auth/me", requireAuth(async (req, res) => {
  res.json({ user: publicUser(req.user) });
}));

app.post("/api/auth/logout", requireAuth(async (req, res) => {
  const sessions = await readJsonFile(sessionsPath);
  await writeJsonFile(
    sessionsPath,
    sessions.filter((session) => session.token !== req.session.token)
  );
  res.json({ ok: true });
}));

app.get("/api/missing/alerts", asyncRoute(async (req, res) => {
  const people = await getAlerts(readQuery(req));
  res.json({
    source: "safe182",
    count: people.length,
    items: people
  });
}));

app.get("/api/local-missing", requireAuth(async (req, res) => {
  const people = await readJsonFile(localMissingPath);
  res.json({
    source: "local",
    count: people.length,
    items: people
  });
}));

app.post("/api/local-missing", requireAuth(async (req, res) => {
  const body = req.body || {};
  requireFields(body, [
    "missingName",
    "guardianPhone",
    "missingAt",
    "locationText",
    "photoDataUrl"
  ]);

  if (!config.kakaoRestKey) {
    return res.status(400).json({
      code: "KAKAO_KEY_MISSING",
      message: "KAKAO_REST_API_KEY가 없어 주소를 지도 좌표로 변환할 수 없습니다."
    });
  }

  const coordinates = await geocodeAddress(body.locationText, config.kakaoRestKey);
  if (!coordinates) {
    return res.status(400).json({
      code: "GEOCODE_FAILED",
      message: "입력한 위치를 지도에서 찾지 못했습니다. 주소나 장소명을 더 구체적으로 입력해주세요."
    });
  }

  const id = `local-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const photoUrl = await savePhotoDataUrl(body.photoDataUrl, id);
  const previous = await readJsonFile(localMissingPath);
  const person = {
    id,
    name: String(body.missingName || "").trim(),
    age: String(body.age || "").trim() || "미상",
    gender: String(body.gender || "").trim() || "미상",
    missingAt: String(body.missingAt || "").trim(),
    locationText: String(body.locationText || "").trim(),
    lat: coordinates.lat,
    lng: coordinates.lng,
    clothing: String(body.clothing || "").trim() || "착의 정보 미제공",
    features: String(body.features || "").trim() || "특징 정보 미제공",
    height: String(body.height || "").trim(),
    weight: String(body.weight || "").trim(),
    bodyType: String(body.bodyType || "").trim(),
    guardianName: String(body.guardianName || "").trim(),
    guardianPhone: String(body.guardianPhone || "").trim(),
    photoUrl,
    status: "local_registered",
    sourceType: "local",
    createdBy: req.user.id,
    createdAt: new Date().toISOString()
  };

  previous.unshift(person);
  await writeJsonFile(localMissingPath, previous);

  res.status(201).json({
    person,
    message: "실종자 등록이 완료되어 지도에 표시됩니다."
  });
}));

app.get("/api/missing/search", asyncRoute(async (req, res) => {
  const query = readQuery(req);
  const cacheKey = `search:${JSON.stringify(query)}`;
  const people = await getOrSetCache(cacheKey, 1000 * 60 * 10, async () => {
    const [searchResults, alertResults, disasterMessages] = await Promise.all([
      searchMissingPeople(config, query),
      getAlerts({ rowSize: query.rowSize || 100 }),
      getMissingDisasterMessages({ rowSize: 100 })
    ]);

    const enrichedSearchResults = await enrichWithCoordinates(
      searchResults,
      config.kakaoRestKey
    );
    const matchingAlerts = alertResults.filter((person) =>
      matchesSearchQuery(person, query)
    );
    const matchingDisasterMessages = disasterMessages.filter((person) =>
      matchesSearchQuery(person, query)
    );
    const enrichedDisasterMessages = await enrichWithCoordinates(
      matchingDisasterMessages.slice(0, 30),
      config.kakaoRestKey
    );

    return mergePeople(
      mergePeople(enrichedSearchResults, matchingAlerts),
      enrichedDisasterMessages,
    ).filter((person) => matchesSearchQuery(person, query));
  });
  res.json({
    source: "safe182+disaster-message",
    count: people.length,
    items: people
  });
}));

app.get("/api/disaster-missing/messages", asyncRoute(async (req, res) => {
  const messages = await getMissingDisasterMessages(readQuery(req));
  res.json({
    source: "disaster-message",
    count: messages.length,
    items: messages
  });
}));

app.get("/api/disaster-missing/cache/status", asyncRoute(async (req, res) => {
  const cache = await readDisasterCache();
  res.json({
    configured: Boolean(config.disasterMsgKey),
    count: cache.items.length,
    meta: cache.meta
  });
}));

app.post("/api/disaster-missing/cache/refresh", asyncRoute(async (req, res) => {
  const mode = req.body?.mode === "full" ? "full" : "quick";
  const cache = await refreshDisasterCache(mode);
  res.json({
    count: cache.items.length,
    meta: cache.meta
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
