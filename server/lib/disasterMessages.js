const DISASTER_MESSAGE_URL = "https://www.safetydata.go.kr/V2/api/DSSP-IF-00247";

const MISSING_KEYWORDS = [
  "실종",
  "배회",
  "치매",
  "미귀가",
  "찾습니다",
  "발견시",
  "보호중",
];

function firstValue(source, keys, fallback = "") {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return fallback;
}

function normalizePayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.body)) return data.body;
  if (Array.isArray(data?.body?.items)) return data.body.items;
  if (Array.isArray(data?.body?.item)) return data.body.item;
  if (Array.isArray(data?.response?.body?.items)) return data.response.body.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (data?.body && typeof data.body === "object") return [data.body];
  return [];
}

function getTotalCount(data) {
  return Number(data?.totalCount || data?.body?.totalCount || 0);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseDate(value) {
  if (!value) return "";
  const digits = String(value).replace(/[^\d]/g, "");
  if (digits.length < 8) return String(value);

  const yyyy = digits.slice(0, 4);
  const mm = digits.slice(4, 6);
  const dd = digits.slice(6, 8);
  const hh = digits.length >= 10 ? digits.slice(8, 10) : "";
  const min = digits.length >= 12 ? digits.slice(10, 12) : "00";

  return `${yyyy}-${mm}-${dd}${hh ? ` ${hh}:${min}` : ""}`;
}

function extractName(message) {
  const text = String(message || "");
  const patterns = [
    /실종(?:자|된)?\s*([가-힣]{2,4})/,
    /([가-힣]{2,4})\s*(?:씨|님)/,
    /([가-힣]{2,4})\s*\(\s*\d{1,3}\s*세/,
    /([가-힣]{2,4})\s*\(\s*[남여]\s*,\s*\d{1,3}\s*세/,
    /([가-힣]{2,4})\s*,?\s*\d{1,3}\s*세/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function extractAge(message) {
  return String(message || "").match(/(\d{1,3})\s*세/)?.[1] || "";
}

function extractGender(message) {
  const text = String(message || "");
  if (/남성|남자|男|\(\s*남\s*,/.test(text)) return "남자";
  if (/여성|여자|女|\(\s*여\s*,/.test(text)) return "여자";
  return "미상";
}

function isMissingMessage(item) {
  const message = firstValue(item, [
    "MSG_CN",
    "msgCn",
    "msg_cn",
    "DSSTR_MSG_CN",
    "message",
    "content",
    "CN",
  ]);

  return MISSING_KEYWORDS.some((keyword) => message.includes(keyword));
}

function normalizeDisasterMessage(item, index) {
  const message = firstValue(item, [
    "MSG_CN",
    "msgCn",
    "msg_cn",
    "DSSTR_MSG_CN",
    "message",
    "content",
    "CN",
  ]);
  const region = firstValue(
    item,
    [
      "RCPTN_RGN_NM",
      "rcptnRgnNm",
      "RGN_NM",
      "rgnNm",
      "areaNm",
      "regionName",
    ],
    "지역 정보 미제공",
  );
  const createdAt = firstValue(item, [
    "CRT_DT",
    "crtDt",
    "REG_DT",
    "regDt",
    "SNDNG_DT",
    "sndngDt",
    "createDt",
  ]);
  const id = firstValue(item, [
    "SN",
    "sn",
    "MSG_SN",
    "msgSn",
    "SNDNG_ID",
    "sndngId",
  ]);
  const name = extractName(message);

  return {
    id: `disaster-${id || `${createdAt}-${index}`}`,
    name: name || "이름 미상",
    age: extractAge(message) || "미상",
    gender: extractGender(message),
    photoUrl: "",
    missingAt: parseDate(createdAt),
    locationText: region,
    lat: null,
    lng: null,
    clothing: message,
    height: "",
    weight: "",
    bodyType: "",
    features: message || "긴급재난문자 원문 미제공",
    sourceUrl: "https://www.safetydata.go.kr/disaster-data/view?dataSn=228",
    status: "disaster-message",
    sourceLabel: "긴급재난문자",
  };
}

async function fetchDisasterMessagePage(config, query = {}) {
  if (!config.disasterMsgKey) return [];

  const url = new URL(DISASTER_MESSAGE_URL);
  url.searchParams.set("serviceKey", config.disasterMsgKey);
  url.searchParams.set("returnType", "json");
  url.searchParams.set("pageNo", String(query.page || 1));
  url.searchParams.set("numOfRows", String(query.rowSize || 100));

  let response;
  let data;
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(url);
      data = await response.json().catch(() => ({}));
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      await delay(300 * attempt);
    }
  }

  if (lastError) throw lastError;

  const resultCode = data?.header?.resultCode || data?.response?.header?.resultCode;
  if (!response.ok || (resultCode && resultCode !== "00")) {
    const message =
      data?.header?.resultMsg ||
      data?.response?.header?.resultMsg ||
      `Disaster message request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.ok ? 502 : response.status;
    throw error;
  }

  return {
    items: normalizePayload(data),
    totalCount: getTotalCount(data),
  };
}

function uniqueMessages(items) {
  const seen = new Set();
  const unique = [];

  for (const item of items) {
    const key = item.id || `${item.name}:${item.missingAt}:${item.locationText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

export async function fetchMissingDisasterMessages(config, query = {}) {
  if (!config.disasterMsgKey) return [];

  const rowSize = Number(query.rowSize || 100);
  const firstPage = await fetchDisasterMessagePage(config, {
    ...query,
    page: query.page || 1,
    rowSize,
  });

  let items = firstPage.items;

  if (query.recentPages && firstPage.totalCount > rowSize) {
    const latestPage = Math.ceil(firstPage.totalCount / rowSize);
    const pageCount = Math.max(1, Number(query.recentPages || 1));
    const pages = [];

    for (let page = latestPage; page > Math.max(0, latestPage - pageCount); page -= 1) {
      if (page !== 1) pages.push(page);
    }

    const recentPages = await Promise.all(
      pages.map((page) =>
        fetchDisasterMessagePage(config, {
          ...query,
          page,
          rowSize,
        }),
      ),
    );

    items = recentPages.flatMap((page) => page.items);
  }

  return items.filter(isMissingMessage).map(normalizeDisasterMessage);
}

export async function collectMissingDisasterMessages(config, options = {}) {
  if (!config.disasterMsgKey) {
    const error = new Error("DISASTER_MSG_API_KEY is required.");
    error.status = 503;
    throw error;
  }

  const rowSize = Number(options.rowSize || 100);
  const firstPage = await fetchDisasterMessagePage(config, {
    page: 1,
    rowSize,
  });
  const latestPage = Math.max(1, Math.ceil(firstPage.totalCount / rowSize));
  const mode = options.mode === "full" ? "full" : "quick";
  const pages =
    mode === "full"
      ? Array.from({ length: latestPage }, (_, index) => index + 1)
      : Array.from(
          { length: Math.min(Number(options.recentPages || 20), latestPage) },
          (_, index) => latestPage - index,
        );

  const collected = [];
  let calls = 0;

  for (const page of pages) {
    const result =
      page === 1
        ? firstPage
        : await fetchDisasterMessagePage(config, { page, rowSize });
    calls += page === 1 ? 1 : 1;
    collected.push(...result.items);

    if (typeof options.onProgress === "function") {
      options.onProgress({
        page,
        calls,
        totalPages: pages.length,
        totalCount: firstPage.totalCount,
      });
    }
  }

  const items = uniqueMessages(
    collected.filter(isMissingMessage).map(normalizeDisasterMessage),
  );

  return {
    mode,
    calls,
    totalCount: firstPage.totalCount,
    scannedPages: pages.length,
    latestPage,
    items,
    refreshedAt: new Date().toISOString(),
  };
}
