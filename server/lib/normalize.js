function normalizePhotoUrl(item) {
  const value = firstValue(item, ["photoUrl", "tknphotoFile", "photo", "imageUrl"]);
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/")) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (value.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(value)) {
    return `data:image/jpeg;base64,${value.replace(/\s/g, "")}`;
  }

  return "";
}

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

export function normalizeMissingPerson(item, index = 0) {
  const locationText = firstValue(item, ["occrAdres", "occrAdresNm", "address", "locationText"]);
  const clothing = firstValue(item, ["alldressingDscd", "clothing", "wearing", "etcSpfeatr"], "착의 정보 미제공");
  const features = [
    firstValue(item, ["etcSpfeatr", "features"]),
    firstValue(item, ["height"]) ? `신장 ${firstValue(item, ["height"])}cm` : "",
    firstValue(item, ["bdwgh"]) ? `체중 ${firstValue(item, ["bdwgh"])}kg` : "",
    firstValue(item, ["frmDscd"]) ? `체격 ${firstValue(item, ["frmDscd"])}` : "",
    firstValue(item, ["hairshpeDscd"]) ? `두발 ${firstValue(item, ["hairshpeDscd"])}` : ""
  ].filter(Boolean);

  const lat = toNumber(firstValue(item, ["lat", "latitude", "y"]));
  const lng = toNumber(firstValue(item, ["lng", "longitude", "x"]));

  return {
    id: firstValue(item, ["id", "rnum", "seq", "msspsnIdntfccd"], `${firstValue(item, ["nm"], "unknown")}-${index}`),
    name: firstValue(item, ["nm", "name"], "이름 미상"),
    age: firstValue(item, ["ageNow", "age"], "미상"),
    gender: firstValue(item, ["sexdstnDscd", "gender"], "미상"),
    photoUrl: normalizePhotoUrl(item),
    missingAt: parseDate(firstValue(item, ["occrde", "missingAt", "detailDate"])),
    locationText,
    lat,
    lng,
    clothing,
    features: features.join(" · ") || "특징 정보 미제공",
    sourceUrl: firstValue(item, ["sourceUrl", "detailUrl"], "https://www.safe182.go.kr/"),
    status: firstValue(item, ["status"], "official")
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
  const parts = cleaned.split(/\s+/);
  return parts.slice(0, 2).join(" ") || cleaned;
}

export function fallbackCenter() {
  return SEOUL_CENTER;
}
