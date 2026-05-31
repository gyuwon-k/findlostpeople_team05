import test from "node:test";
import assert from "node:assert/strict";
import { extractRegion, normalizeMissingPerson, summarizeRegions } from "./normalize.js";

test("normalizes SafeDream alert fields into the app shape", () => {
  const result = normalizeMissingPerson({
    nm: "홍길동",
    ageNow: "21",
    sexdstnDscd: "남자",
    occrde: "202605281230",
    occrAdres: "서울시 성북구 정릉동",
    alldressingDscd: "검정 상의",
    height: "170"
  });

  assert.equal(result.name, "홍길동");
  assert.equal(result.age, "21");
  assert.equal(result.missingAt, "2026-05-28 12:30");
  assert.equal(result.locationText, "서울시 성북구 정릉동");
  assert.equal(result.height, "170");
  assert.doesNotMatch(result.features, /신장 170cm/);
});

test("summarizes regions from location text", () => {
  assert.equal(extractRegion("서울시 성북구 정릉동"), "서울특별시");
  const regions = summarizeRegions([
    { locationText: "서울시 성북구 정릉동" },
    { locationText: "서울시 성북구 길음동" },
    { locationText: "부산시 해운대구 우동" }
  ]);
  assert.equal(regions[0].region, "서울특별시");
  assert.equal(regions[0].count, 2);
});
