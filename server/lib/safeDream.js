import { normalizeMissingPerson } from "./normalize.js";

const ALERT_URL = "https://www.safe182.go.kr/api/lcm/amberList.do";
const SEARCH_URL = "https://www.safe182.go.kr/api/lcm/findChildList.do";

function requireSafeDreamConfig(config) {
  if (!config.safeDreamId || !config.safeDreamKey) {
    const error = new Error(
      "SAFEDREAM_ESNTL_ID and SAFEDREAM_AUTH_KEY are required.",
    );
    error.status = 503;
    error.code = "SAFEDREAM_CONFIG_MISSING";
    throw error;
  }
}

function normalizePayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.response?.body?.items))
    return data.response.body.items;

  if (data?.result && data.result !== "00") {
    const error = new Error(data.msg || "SafeDream API returned an error.");
    error.status = data.result === "80" ? 429 : 502;
    error.code = `SAFEDREAM_${data.result}`;
    throw error;
  }

  return [];
}

function parseResponseText(text) {
  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed);
  } catch {
    return parseXmlLikeResponse(trimmed);
  }
}

function parseXmlLikeResponse(text) {
  const result = {};

  const resultMatch = text.match(/<result>(.*?)<\/result>/i);
  const msgMatch = text.match(/<msg>(.*?)<\/msg>/i);

  if (resultMatch) result.result = resultMatch[1];
  if (msgMatch) result.msg = msgMatch[1];

  const itemMatches = [...text.matchAll(/<list>([\s\S]*?)<\/list>/gi)];

  result.list = itemMatches.map((match) => {
    const item = {};

    for (const field of match[1].matchAll(/<([^/][^>]*)>([\s\S]*?)<\/\1>/g)) {
      item[field[1]] = field[2].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    }

    return item;
  });

  return result;
}

async function postSafeDream(url, config, params) {
  requireSafeDreamConfig(config);

  const body = new URLSearchParams();

  body.append("esntlId", config.safeDreamId);
  body.append("authKey", config.safeDreamKey);
  body.append("rowSize", String(params.rowSize || 50));

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (key === "rowSize") continue;
    body.append(key, String(value));
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "Mozilla/5.0",
    },
    body,
  });

  const text = await response.text();

  console.log("SafeDream request url:", url);
  console.log("SafeDream request body:", body.toString());
  console.log("SafeDream status:", response.status);
  console.log("SafeDream raw text:", text.slice(0, 1000));

  if (!response.ok) {
    throw new Error(
      `SafeDream request failed: ${response.status} ${text.slice(0, 120)}`,
    );
  }

  if (text.includes("데이터 처리 중 오류")) {
    const error = new Error(
      "SafeDream API returned an HTML error page. Check API key or request parameters.",
    );
    error.status = 502;
    error.code = "SAFEDREAM_HTML_ERROR";
    throw error;
  }

  return parseResponseText(text);
}

export async function fetchAlerts(config, query = {}) {
  const data = await postSafeDream(ALERT_URL, config, {
    page: query.page || 1,
    rowSize: query.rowSize || 50,
    detailDate1: query.detailDate1 || "",
    detailDate2: query.detailDate2 || "",
    occrde: query.occrde || "",
    occrAdres: query.occrAdres || "",
    sexdstnDscd: query.sexdstnDscd || "",
    nm: query.nm || "",
  });

  return normalizePayload(data).map(normalizeMissingPerson);
}

export async function searchMissingPeople(config, query = {}) {
  const data = await postSafeDream(SEARCH_URL, config, {
    page: query.page || 1,
    rowSize: query.rowSize || 50,
    returnURL: "https://www.safe182.go.kr/",
    detailDate1: query.detailDate1 || "",
    detailDate2: query.detailDate2 || "",
    age1: query.age1 || "",
    age2: query.age2 || "",
    occrAdres: query.occrAdres || "",
    sexdstnDscd: query.sexdstnDscd || "",
    nm: query.nm || "",
    "writngTrgetDscds[]": query.writngTrgetDscds || "010",
  });

  return normalizePayload(data).map(normalizeMissingPerson);
}
