import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileSearch,
  Loader2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || "";
const KNU_CENTER = { lat: 35.8908, lng: 128.6111 };
const ALERT_ROW_SIZE = 100;

const tabs = [
  { id: "map", label: "실시간 지도", icon: MapPin },
  { id: "search", label: "실종자 검색", icon: Search },
  { id: "stats", label: "지역 분석", icon: BarChart3 },
  { id: "register", label: "보호자 등록", icon: UserRoundPlus },
];

function fetchJson(path, options) {
  return fetch(`${API_BASE}${path}`, options).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || "요청을 처리하지 못했습니다.");
    }
    return payload;
  });
}

function parseMissingDate(value) {
  if (!value) return null;
  const normalized = String(value).replace(" ", "T");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const digits = String(value).replace(/[^\d]/g, "");
  if (digits.length >= 8) {
    const yyyy = Number(digits.slice(0, 4));
    const mm = Number(digits.slice(4, 6)) - 1;
    const dd = Number(digits.slice(6, 8));
    const hh = digits.length >= 10 ? Number(digits.slice(8, 10)) : 0;
    const min = digits.length >= 12 ? Number(digits.slice(10, 12)) : 0;
    const date = new Date(yyyy, mm, dd, hh, min);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

function getMissingDateBucket(missingAt) {
  const date = parseMissingDate(missingAt);
  if (!date) return "unknown";

  const now = Date.now();
  const diffDays = (now - date.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays <= 7) return "week";
  if (diffDays <= 30) return "month";
  return "older";
}

function getMarkerBorderClass(missingAt) {
  const bucket = getMissingDateBucket(missingAt);
  if (bucket === "week") return "border-week";
  if (bucket === "month") return "border-month";
  if (bucket === "older") return "border-older";
  return "border-unknown";
}

function createMarkerContent(person) {
  const wrapper = document.createElement("button");
  wrapper.type = "button";
  wrapper.className = `person-marker ${getMarkerBorderClass(person.missingAt)}`;
  wrapper.title = person.name || "실종자";
  wrapper.setAttribute("aria-label", `${person.name || "실종자"} 마커`);

  if (person.photoUrl) {
    const img = document.createElement("img");
    img.src = person.photoUrl;
    img.alt = `${person.name || "실종자"} 사진`;
    wrapper.appendChild(img);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "person-marker-fallback";
    fallback.textContent = person.name?.slice(0, 1) || "?";
    wrapper.appendChild(fallback);
  }

  return wrapper;
}

function useKakaoMap(containerRef, people, selected, onSelect) {
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!KAKAO_JS_KEY || !containerRef.current) return;

    if (window.kakao?.maps) {
      createMap();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false&libraries=services,clusterer`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(createMap);
    document.head.appendChild(script);

    function createMap() {
      if (!containerRef.current || mapRef.current) return;

      mapRef.current = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(KNU_CENTER.lat, KNU_CENTER.lng),
        level: 6,
      });
    }
  }, [containerRef]);

  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const visible = people.filter((person) => person.lat && person.lng);

    visible.forEach((person) => {
      const position = new window.kakao.maps.LatLng(person.lat, person.lng);
      const content = createMarkerContent(person);

      content.addEventListener("click", () => onSelect(person));

      const marker = new window.kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 0.5,
      });

      marker.setMap(mapRef.current);
      markersRef.current.push(marker);
    });

    if (visible.length > 0) {
      const hasNearby = visible.some((person) => {
        const latDiff = Math.abs(person.lat - KNU_CENTER.lat);
        const lngDiff = Math.abs(person.lng - KNU_CENTER.lng);
        return latDiff <= 0.25 && lngDiff <= 0.25;
      });

      if (hasNearby) {
        const nearbyBounds = new window.kakao.maps.LatLngBounds();

        visible.forEach((person) => {
          const latDiff = Math.abs(person.lat - KNU_CENTER.lat);
          const lngDiff = Math.abs(person.lng - KNU_CENTER.lng);

          if (latDiff <= 0.25 && lngDiff <= 0.25) {
            nearbyBounds.extend(
              new window.kakao.maps.LatLng(person.lat, person.lng),
            );
          }
        });

        nearbyBounds.extend(
          new window.kakao.maps.LatLng(KNU_CENTER.lat, KNU_CENTER.lng),
        );

        mapRef.current.setBounds(nearbyBounds);
      } else {
        mapRef.current.setCenter(
          new window.kakao.maps.LatLng(KNU_CENTER.lat, KNU_CENTER.lng),
        );
        mapRef.current.setLevel(6);
      }
    } else {
      mapRef.current.setCenter(
        new window.kakao.maps.LatLng(KNU_CENTER.lat, KNU_CENTER.lng),
      );
      mapRef.current.setLevel(6);
    }
  }, [people, onSelect]);

  useEffect(() => {
    if (
      !mapRef.current ||
      !selected?.lat ||
      !selected?.lng ||
      !window.kakao?.maps
    ) {
      return;
    }

    mapRef.current.panTo(
      new window.kakao.maps.LatLng(selected.lat, selected.lng),
    );
  }, [selected]);
}

function App() {
  const [activeTab, setActiveTab] = useState("map");
  const [alerts, setAlerts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const mapRef = useRef(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchJson(
        `/api/missing/alerts?rowSize=${ALERT_ROW_SIZE}`,
      );
      setAlerts(data.items || []);
      setSelected(null);
      setIsDetailOpen(false);
    } catch (err) {
      setError(err.message);
      setAlerts([]);
      setSelected(null);
      setIsDetailOpen(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    fetchJson("/api/stats/regions?rowSize=80")
      .then((data) => setStats(data.regions || []))
      .catch(() => setStats([]));
  }, []);

  const mapAlerts = useMemo(() => {
    if (timeFilter === "all") return alerts;
    return alerts.filter(
      (person) => getMissingDateBucket(person.missingAt) === timeFilter,
    );
  }, [alerts, timeFilter]);

  useKakaoMap(mapRef, mapAlerts, selected, (person) => {
    setSelected(person);
    setIsDetailOpen(true);
  });

  const locatedCount = mapAlerts.filter(
    (person) => person.lat && person.lng,
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={24} aria-hidden="true" />
          </div>
          <div>
            <p>자료 출처: 경찰청 안전Dream</p>
            <h1>실종자 지도</h1>
          </div>
        </div>

        <nav className="tab-list" aria-label="주요 화면">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "tab active" : "tab"}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="source-box">
          <p>공식 API 연결</p>
          <strong>{alerts.length > 0 ? "데이터 수신 중" : "설정 대기"}</strong>
          <span>API 키는 서버 환경 변수로만 관리됩니다.</span>
        </div>
      </aside>

      <main className="workspace">
        {activeTab === "map" && (
          <MapView
            alerts={mapAlerts}
            error={error}
            loading={loading}
            locatedCount={locatedCount}
            mapRef={mapRef}
            selected={selected}
            isDetailOpen={isDetailOpen}
            onRefresh={loadAlerts}
            timeFilter={timeFilter}
            onChangeTimeFilter={setTimeFilter}
            onSelect={(person) => {
              setSelected(person);
              setIsDetailOpen(Boolean(person));
            }}
            onCloseDetail={() => setIsDetailOpen(false)}
          />
        )}

        {activeTab === "search" && (
          <SearchView onSelect={setSelected} setActiveTab={setActiveTab} />
        )}

        {activeTab === "stats" && <StatsView stats={stats} alerts={alerts} />}

        {activeTab === "register" && <RegisterView />}
      </main>
    </div>
  );
}

function MapView({
  alerts,
  error,
  loading,
  locatedCount,
  mapRef,
  selected,
  isDetailOpen,
  onRefresh,
  onSelect,
  onCloseDetail,
  timeFilter,
  onChangeTimeFilter,
}) {
  return (
    <section className="map-layout" aria-labelledby="map-title">
      <div className="map-area">
        <div className="toolbar">
          <div>
            <h2 id="map-title">실시간 실종경보 지도</h2>
            <p>최근 경보를 위치 기반으로 확인하고 상세 정보로 이동합니다.</p>
          </div>

          <div className="toolbar-actions">
            <label className="time-filter">
              기간
              <select
                value={timeFilter}
                onChange={(event) => onChangeTimeFilter(event.target.value)}
              >
                <option value="all">전체</option>
                <option value="week">최근 1주</option>
                <option value="month">최근 1개월</option>
                <option value="older">1개월 초과</option>
                <option value="unknown">날짜 미상</option>
              </select>
            </label>

            <button
              className="icon-button text-button"
              type="button"
              onClick={onRefresh}
            >
              {loading ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <FileSearch size={18} />
              )}
              새로고침
            </button>
          </div>
        </div>

        <div className="marker-legend">
          <span>
            <i className="dot week" /> 최근 1주
          </span>
          <span>
            <i className="dot month" /> 최근 1개월
          </span>
          <span>
            <i className="dot older" /> 1개월 초과
          </span>
          <span>
            <i className="dot unknown" /> 날짜 미상
          </span>
        </div>

        <div className="status-row">
          <Metric label="수신 경보" value={alerts.length} />
          <Metric label="좌표 확인" value={locatedCount} />
          <Metric label="공식 연결" value="Safe182" />
        </div>

        <div className="map-canvas-wrap">
          {KAKAO_JS_KEY ? (
            <div ref={mapRef} className="map-canvas" aria-label="카카오맵" />
          ) : (
            <SetupNotice />
          )}

          {loading && (
            <OverlayNotice
              icon={Loader2}
              text="안전Dream 데이터를 불러오는 중입니다."
              spinning
            />
          )}

          {error && (
            <OverlayNotice icon={AlertTriangle} text={error} tone="danger" />
          )}

          {selected && isDetailOpen && (
            <div
              className="detail-modal-backdrop"
              role="presentation"
              onClick={onCloseDetail}
            >
              <article
                className="detail-modal-card"
                role="dialog"
                aria-modal="true"
                aria-label="실종자 상세 정보"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="detail-modal-close"
                  type="button"
                  onClick={onCloseDetail}
                  aria-label="상세 닫기"
                >
                  ×
                </button>

                <PersonDetail person={selected} />
              </article>
            </div>
          )}
        </div>
      </div>

      <aside className="detail-panel">
        <div className="list-panel">
          <h3>경보 목록</h3>

          <div className="person-list">
            {alerts.map((person) => (
              <button
                key={person.id}
                className="person-row"
                type="button"
                onClick={() => onSelect(person)}
              >
                {person.photoUrl ? (
                  <img
                    className="person-row-photo"
                    src={person.photoUrl}
                    alt={`${person.name} 사진`}
                  />
                ) : (
                  <div className="person-row-avatar">
                    {person.name?.slice(0, 1) || "?"}
                  </div>
                )}

                <span>
                  <strong>{person.name}</strong>
                  <small>{person.locationText || "위치 정보 미제공"}</small>
                </span>
              </button>
            ))}

            {!loading && alerts.length === 0 && (
              <p className="empty-text">표시할 공식 데이터가 없습니다.</p>
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}

function SearchView({ onSelect, setActiveTab }) {
  const [form, setForm] = useState({
    nm: "",
    occrAdres: "",
    sexdstnDscd: "",
    age1: "",
    age2: "",
  });

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const params = new URLSearchParams(
      Object.entries(form).filter(([, value]) => value),
    );

    try {
      const data = await fetchJson(`/api/missing/search?${params.toString()}`);
      setResults(data.items || []);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="content-view" aria-labelledby="search-title">
      <div className="section-heading">
        <h2 id="search-title">실종자 검색</h2>
        <p>안전Dream 검색 API를 조건별로 조회합니다.</p>
      </div>

      <form className="search-grid" onSubmit={submit}>
        <label>
          이름
          <input
            value={form.nm}
            onChange={(event) => setForm({ ...form, nm: event.target.value })}
          />
        </label>

        <label>
          발생 지역
          <input
            value={form.occrAdres}
            onChange={(event) =>
              setForm({ ...form, occrAdres: event.target.value })
            }
          />
        </label>

        <label>
          성별
          <select
            value={form.sexdstnDscd}
            onChange={(event) =>
              setForm({ ...form, sexdstnDscd: event.target.value })
            }
          >
            <option value="">전체</option>
            <option value="1">남자</option>
            <option value="2">여자</option>
          </select>
        </label>

        <label>
          최소 나이
          <input
            inputMode="numeric"
            value={form.age1}
            onChange={(event) => setForm({ ...form, age1: event.target.value })}
          />
        </label>

        <label>
          최대 나이
          <input
            inputMode="numeric"
            value={form.age2}
            onChange={(event) => setForm({ ...form, age2: event.target.value })}
          />
        </label>

        <button className="primary-button" type="submit">
          {loading ? (
            <Loader2 className="spin" size={18} />
          ) : (
            <Search size={18} />
          )}
          검색
        </button>
      </form>

      {error && <div className="inline-error">{error}</div>}

      <div className="results-grid">
        {results.map((person) => (
          <article key={person.id} className="result-card">
            <PersonSummary person={person} />

            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                onSelect(person);
                setActiveTab("map");
              }}
            >
              <MapPin size={16} />
              지도에서 보기
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatsView({ stats, alerts }) {
  const max = Math.max(1, ...stats.map((item) => item.count));
  const topRegion = stats[0]?.region || "집계 대기";

  return (
    <section className="content-view" aria-labelledby="stats-title">
      <div className="section-heading">
        <h2 id="stats-title">지역별 실종자 분포</h2>
        <p>공식 API 조회 결과를 지역 단위로 집계합니다.</p>
      </div>

      <div className="status-row wide">
        <Metric label="분석 대상" value={alerts.length} />
        <Metric label="상위 지역" value={topRegion} />
        <Metric label="지역 수" value={stats.length} />
      </div>

      <div className="chart-list">
        {stats.map((item) => (
          <div className="bar-row" key={item.region}>
            <span>{item.region}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <strong>{item.count}</strong>
          </div>
        ))}

        {stats.length === 0 && (
          <p className="empty-text">집계할 공식 데이터가 아직 없습니다.</p>
        )}
      </div>
    </section>
  );
}

function RegisterView() {
  const [form, setForm] = useState({
    guardianName: "",
    guardianPhone: "",
    missingName: "",
    missingAt: "",
    locationText: "",
    clothing: "",
    features: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const data = await fetchJson("/api/guardian-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      setMessage(data.message);
      setForm({
        guardianName: "",
        guardianPhone: "",
        missingName: "",
        missingAt: "",
        locationText: "",
        clothing: "",
        features: "",
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="content-view" aria-labelledby="register-title">
      <div className="section-heading">
        <h2 id="register-title">보호자 등록 요청</h2>
        <p>등록 요청은 검토 대기 상태로 저장되며 즉시 공개되지 않습니다.</p>
      </div>

      <div className="review-flow">
        <span className="active">보호자 입력</span>
        <span>인증 확인</span>
        <span>관리자 검토</span>
        <span>공개 승인</span>
      </div>

      <form className="register-form" onSubmit={submit}>
        {[
          ["guardianName", "보호자 이름"],
          ["guardianPhone", "보호자 연락처"],
          ["missingName", "실종자 이름"],
          ["missingAt", "실종 일시"],
          ["locationText", "마지막 목격 위치"],
          ["clothing", "인상착의"],
          ["features", "신체 특징"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              value={form[key]}
              onChange={(event) =>
                setForm({ ...form, [key]: event.target.value })
              }
            />
          </label>
        ))}

        <button className="primary-button" type="submit">
          <ShieldCheck size={18} />
          검토 요청 접수
        </button>
      </form>

      {message && (
        <div className="success-box">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      {error && <div className="inline-error">{error}</div>}
    </section>
  );
}

function PersonDetail({ person }) {
  return (
    <article className="selected-card">
      <PersonSummary person={person} large />

      <dl className="detail-list">
        <div>
          <dt>실종 일시</dt>
          <dd>{person.missingAt || "미제공"}</dd>
        </div>

        <div>
          <dt>발생 위치</dt>
          <dd>{person.locationText || "미제공"}</dd>
        </div>

        <div>
          <dt>인상착의</dt>
          <dd>{person.clothing}</dd>
        </div>

        <div>
          <dt>특징</dt>
          <dd>{person.features}</dd>
        </div>
      </dl>

      <div className="action-row">
        <a
          className="primary-link"
          href={person.sourceUrl || "https://www.safe182.go.kr/"}
          target="_blank"
          rel="noreferrer"
        >
          공식 상세 보기
        </a>

        <a className="call-link" href="tel:182">
          <Phone size={16} />
          182
        </a>
      </div>
    </article>
  );
}

function PersonSummary({ person, large = false }) {
  const initials = person.name?.slice(0, 1) || "?";

  return (
    <div className={large ? "person-summary large" : "person-summary"}>
      {person.photoUrl ? (
        <img src={person.photoUrl} alt={`${person.name} 사진`} />
      ) : (
        <div className="avatar">{initials}</div>
      )}

      <div>
        <p>{person.status === "official" ? "공식 경보" : person.status}</p>
        <h3>{person.name}</h3>
        <span>
          {person.gender} · 현재 {person.age}세
        </span>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="setup-notice">
      <MapPin size={30} />
      <strong>카카오맵 JavaScript 키가 필요합니다.</strong>
      <span>
        .env에 VITE_KAKAO_JAVASCRIPT_KEY를 설정하면 지도가 표시됩니다.
      </span>
    </div>
  );
}

function OverlayNotice({ icon: Icon, text, tone = "", spinning = false }) {
  return (
    <div className={`overlay-notice ${tone}`}>
      <Icon className={spinning ? "spin" : ""} size={18} />
      <span>{text}</span>
    </div>
  );
}

export default App;
