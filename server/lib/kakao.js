import { fallbackCenter } from "./normalize.js";

const KAKAO_GEOCODE_URL = "https://dapi.kakao.com/v2/local/search/address.json";

export async function geocodeAddress(address, restApiKey) {
  if (!address || !restApiKey) return null;

  const url = new URL(KAKAO_GEOCODE_URL);
  url.searchParams.set("query", address);

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${restApiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Kakao geocode failed: ${response.status}`);
  }

  const data = await response.json();
  const first = data.documents?.[0];
  if (!first) return null;

  return {
    lat: Number(first.y),
    lng: Number(first.x)
  };
}

export async function enrichWithCoordinates(people, restApiKey) {
  const enriched = [];
  for (const person of people) {
    if (person.lat && person.lng) {
      enriched.push(person);
      continue;
    }

    const coordinates = await geocodeAddress(person.locationText, restApiKey).catch(() => null);
    enriched.push({
      ...person,
      lat: coordinates?.lat ?? null,
      lng: coordinates?.lng ?? null,
      geocodeStatus: coordinates ? "resolved" : "unresolved",
      mapCenter: coordinates || fallbackCenter()
    });
  }
  return enriched;
}
