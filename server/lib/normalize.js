const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

function firstValue(source, keys, fallback = "") {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return fallback;
}

function parseDate(value) {
  if (!value) return "";
  const text = String(value).replace(/[^\d]/g, "");
  if (text.length < 8) return String(value);
  const yyyy = text.slice(0, 4);
  const mm = text.slice(4, 6);
  const dd = text.slice(6, 8);
  const hh = text.length >= 10 ? text.slice(8, 10) : "";
  const min = text.length >= 12 ? text.slice(10, 12) : "";
  return [yyyy, mm, dd].join("-") + (hh ? ` ${hh}:${min || "00"}` : "");
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePhotoUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/")
  ) {
    return value;
  }
  if (value.startsWith("/9j/")) {
    return `data:image/jpeg;base64,${value}`;
  }
  return `data:image/jpeg;base64,${value}`;
}

export function normalizeMissingPerson(item, index = 0) {
  const locationText = firstValue(item, [
    "occrAdres",
    "occrAdresNm",
    "address",
    "locationText",
  ]);
  const clothing = firstValue(
    item,
    ["alldressingDscd", "clothing", "wearing", "etcSpfeatr"],
    "착의 정보 미제공",
  );
  const height = firstValue(item, ["height"]);
  const weight = firstValue(item, ["bdwgh", "weight"]);
  const bodyType = firstValue(item, ["frmDscd", "bodyType"]);
  const features = [
    firstValue(item, ["etcSpfeatr", "features"]),
    firstValue(item, ["hairshpeDscd"])
      ? `두발 ${firstValue(item, ["hairshpeDscd"])}`
      : "",
  ].filter(Boolean);

  const lat = toNumber(firstValue(item, ["lat", "latitude", "y"]));
  const lng = toNumber(firstValue(item, ["lng", "longitude", "x"]));

  return {
    id: firstValue(
      item,
      ["id", "rnum", "seq", "msspsnIdntfccd"],
      `${firstValue(item, ["nm"], "unknown")}-${index}`,
    ),
    name: firstValue(item, ["nm", "name"], "이름 미상"),
    age: firstValue(item, ["ageNow", "age"], "미상"),
    gender: firstValue(item, ["sexdstnDscd", "gender"], "미상"),
    photoUrl: normalizePhotoUrl(
      firstValue(item, ["photoUrl", "tknphotoFile", "photo", "imageUrl"]),
    ),
    missingAt: parseDate(
      firstValue(item, ["occrde", "missingAt", "detailDate"]),
    ),
    locationText,
    lat,
    lng,
    clothing,
    height,
    weight,
    bodyType,
    features: features.join(" · ") || "특징 정보 미제공",
    sourceUrl: firstValue(
      item,
      ["sourceUrl", "detailUrl"],
      "https://www.safe182.go.kr/",
    ),
    status: firstValue(item, ["status"], "official"),
  };
}

export function summarizeRegions(people) {
  const counts = new Map();
  for (const person of people) {
    const region = extractRegion(person.locationText);
    const current = counts.get(region) || { region, count: 0, recent: 0 };
    current.count += 1;
    if (person.missingAt) current.recent += 1;
    counts.set(region, current);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function extractRegion(locationText) {
  if (!locationText) return "지역 미상";
  const cleaned = String(locationText).trim();
  if (!cleaned || cleaned === "주소지") return "지역 미상";

  const first = cleaned.split(/\s+/)[0] || "";

  const regionMap = new Map([
    ["서울", "서울특별시"],
    ["서울시", "서울특별시"],
    ["서울특별시", "서울특별시"],
    ["부산", "부산광역시"],
    ["부산시", "부산광역시"],
    ["부산광역시", "부산광역시"],
    ["대구", "대구광역시"],
    ["대구시", "대구광역시"],
    ["대구광역시", "대구광역시"],
    ["인천", "인천광역시"],
    ["인천시", "인천광역시"],
    ["인천광역시", "인천광역시"],
    ["광주", "광주광역시"],
    ["광주시", "광주광역시"],
    ["광주광역시", "광주광역시"],
    ["대전", "대전광역시"],
    ["대전시", "대전광역시"],
    ["대전광역시", "대전광역시"],
    ["울산", "울산광역시"],
    ["울산시", "울산광역시"],
    ["울산광역시", "울산광역시"],
    ["세종", "세종특별자치시"],
    ["세종시", "세종특별자치시"],
    ["세종특별자치시", "세종특별자치시"],
    ["경기", "경기도"],
    ["경기도", "경기도"],
    ["강원", "강원특별자치도"],
    ["강원도", "강원특별자치도"],
    ["강원특별자치도", "강원특별자치도"],
    ["충북", "충청북도"],
    ["충청북도", "충청북도"],
    ["충남", "충청남도"],
    ["충청남도", "충청남도"],
    ["전북", "전북특별자치도"],
    ["전라북도", "전북특별자치도"],
    ["전북특별자치도", "전북특별자치도"],
    ["전남", "전라남도"],
    ["전라남도", "전라남도"],
    ["경북", "경상북도"],
    ["경상북도", "경상북도"],
    ["경남", "경상남도"],
    ["경상남도", "경상남도"],
    ["제주", "제주특별자치도"],
    ["제주도", "제주특별자치도"],
    ["제주특별자치도", "제주특별자치도"],
  ]);

  if (regionMap.has(first)) return regionMap.get(first);

  for (const [key, value] of regionMap.entries()) {
    if (cleaned.startsWith(key) || cleaned.includes(key)) return value;
  }

  const cityCountyMap = new Map([
    ["순천", "전라남도"],
    ["순천시", "전라남도"],
    ["강진", "전라남도"],
    ["강진군", "전라남도"],
    ["강진군읍", "전라남도"],
    ["경주", "경상북도"],
    ["경주시", "경상북도"],
    ["강화", "인천광역시"],
    ["강화군", "인천광역시"],
    ["강화읍", "인천광역시"],
    ["성남", "경기도"],
    ["성남시", "경기도"],
    ["성남수정", "경기도"],
    ["수정구", "경기도"],
  ]);

  for (const [key, value] of cityCountyMap.entries()) {
    if (cleaned.includes(key)) return value;
  }

  if (cleaned === "능동" || cleaned.endsWith(" 능동")) return "지역 미상";

  return "지역 미상";
}

export function fallbackCenter() {
  return SEOUL_CENTER;
}
