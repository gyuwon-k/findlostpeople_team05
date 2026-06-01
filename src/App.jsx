import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  FileSearch,
  Loader2,
  LogOut,
  MapPin,
  MapPinned,
  Phone,
  Ruler,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  UserRoundPlus,
  Weight,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || "";
const KNU_CENTER = { lat: 35.8908, lng: 128.6111 };
const ALERT_ROW_SIZE = 100;
const AUTH_TOKEN_KEY = "findlostpeople.authToken";

const tabs = [
  { id: "map", label: "실시간 지도", icon: MapPin },
  { id: "search", label: "실종자 검색", icon: Search },
  { id: "stats", label: "통계", icon: BarChart3 },
  { id: "register", label: "보호자 등록", icon: UserRoundPlus },
];

function getTabLabel(tab) {
  return tab.id === "register" ? "실종자 등록" : tab.label;
}

const statsSections = [
  { id: "region", label: "지역 분석" },
  { id: "time", label: "최근 발생 추이" },
  { id: "demographic", label: "성별·연령 분석" },
];

const regionGroups = {
  서울특별시: [
    "종로구",
    "중구",
    "용산구",
    "성동구",
    "광진구",
    "동대문구",
    "중랑구",
    "성북구",
    "강북구",
    "도봉구",
    "노원구",
    "은평구",
    "서대문구",
    "마포구",
    "양천구",
    "강서구",
    "구로구",
    "금천구",
    "영등포구",
    "동작구",
    "관악구",
    "서초구",
    "강남구",
    "송파구",
    "강동구",
  ],
  부산광역시: [
    "중구",
    "서구",
    "동구",
    "영도구",
    "부산진구",
    "동래구",
    "남구",
    "북구",
    "해운대구",
    "사하구",
    "금정구",
    "강서구",
    "연제구",
    "수영구",
    "사상구",
    "기장군",
  ],
  대구광역시: [
    "중구",
    "동구",
    "서구",
    "남구",
    "북구",
    "수성구",
    "달서구",
    "달성군",
    "군위군",
  ],
  인천광역시: [
    "중구",
    "동구",
    "미추홀구",
    "연수구",
    "남동구",
    "부평구",
    "계양구",
    "서구",
    "강화군",
    "옹진군",
  ],
  광주광역시: ["동구", "서구", "남구", "북구", "광산구"],
  대전광역시: ["동구", "중구", "서구", "유성구", "대덕구"],
  울산광역시: ["중구", "남구", "동구", "북구", "울주군"],
  세종특별자치시: [],
  경기도: [
    "수원시",
    "성남시",
    "의정부시",
    "안양시",
    "부천시",
    "광명시",
    "평택시",
    "동두천시",
    "안산시",
    "고양시",
    "과천시",
    "구리시",
    "남양주시",
    "오산시",
    "시흥시",
    "군포시",
    "의왕시",
    "하남시",
    "용인시",
    "파주시",
    "이천시",
    "안성시",
    "김포시",
    "화성시",
    "광주시",
    "양주시",
    "포천시",
    "여주시",
    "연천군",
    "가평군",
    "양평군",
  ],
  강원특별자치도: [
    "춘천시",
    "원주시",
    "강릉시",
    "동해시",
    "태백시",
    "속초시",
    "삼척시",
    "홍천군",
    "횡성군",
    "영월군",
    "평창군",
    "정선군",
    "철원군",
    "화천군",
    "양구군",
    "인제군",
    "고성군",
    "양양군",
  ],
  충청북도: [
    "청주시",
    "충주시",
    "제천시",
    "보은군",
    "옥천군",
    "영동군",
    "증평군",
    "진천군",
    "괴산군",
    "음성군",
    "단양군",
  ],
  충청남도: [
    "천안시",
    "공주시",
    "보령시",
    "아산시",
    "서산시",
    "논산시",
    "계룡시",
    "당진시",
    "금산군",
    "부여군",
    "서천군",
    "청양군",
    "홍성군",
    "예산군",
    "태안군",
  ],
  전북특별자치도: [
    "전주시",
    "군산시",
    "익산시",
    "정읍시",
    "남원시",
    "김제시",
    "완주군",
    "진안군",
    "무주군",
    "장수군",
    "임실군",
    "순창군",
    "고창군",
    "부안군",
  ],
  전라남도: [
    "목포시",
    "여수시",
    "순천시",
    "나주시",
    "광양시",
    "담양군",
    "곡성군",
    "구례군",
    "고흥군",
    "보성군",
    "화순군",
    "장흥군",
    "강진군",
    "해남군",
    "영암군",
    "무안군",
    "함평군",
    "영광군",
    "장성군",
    "완도군",
    "진도군",
    "신안군",
  ],
  경상북도: [
    "포항시",
    "경주시",
    "김천시",
    "안동시",
    "구미시",
    "영주시",
    "영천시",
    "상주시",
    "문경시",
    "경산시",
    "의성군",
    "청송군",
    "영양군",
    "영덕군",
    "청도군",
    "고령군",
    "성주군",
    "칠곡군",
    "예천군",
    "봉화군",
    "울진군",
    "울릉군",
  ],
  경상남도: [
    "창원시",
    "진주시",
    "통영시",
    "사천시",
    "김해시",
    "밀양시",
    "거제시",
    "양산시",
    "의령군",
    "함안군",
    "창녕군",
    "고성군",
    "남해군",
    "하동군",
    "산청군",
    "함양군",
    "거창군",
    "합천군",
  ],
  제주특별자치도: ["제주시", "서귀포시"],
};

function fetchJson(path, options) {
  return fetch(`${API_BASE}${path}`, options).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || "요청을 처리하지 못했습니다.");
    }
    return payload;
  });
}

function fetchAuthJson(path, token, options = {}) {
  return fetchJson(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

function getPersonKey(person) {
  return person.id || `${person.name}:${person.missingAt}:${person.locationText}`;
}

function sourceMatches(person, sourceFilter) {
  if (sourceFilter === "all") return true;
  if (sourceFilter === "local") return person.sourceType === "local";
  return person.sourceType !== "local";
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("사진 파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function resolvePhotoUrl(photoUrl) {
  const value = String(photoUrl || "").trim();
  if (!value) return "";
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/")
  ) {
    return value;
  }
  if (value.startsWith("/uploads/") && API_BASE) {
    return `${API_BASE}${value}`;
  }
  return value;
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

function getUrgencyLabel(missingAt) {
  const bucket = getMissingDateBucket(missingAt);
  if (bucket === "week") return "최근 7일";
  if (bucket === "month") return "1개월 이내";
  if (bucket === "older") return "장기";
  return "날짜 미상";
}

function getUrgencyClass(missingAt) {
  return `urgency-${getMissingDateBucket(missingAt)}`;
}

function formatShortDate(value) {
  const parsed = parseMissingDate(value);
  if (!parsed) return value || "날짜 미상";

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function createMarkerContent(person) {
  const wrapper = document.createElement("button");
  wrapper.type = "button";
  wrapper.className = `person-marker ${getMarkerBorderClass(person.missingAt)} ${
    person.sourceType === "local" ? "local-marker" : ""
  }`;
  wrapper.title = person.name || "실종자";
  wrapper.setAttribute("aria-label", `${person.name || "실종자"} 마커`);

  const photoUrl = resolvePhotoUrl(person.photoUrl);
  if (photoUrl) {
    const img = document.createElement("img");
    img.src = photoUrl;
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

function useKakaoMap(
  containerRef,
  instanceRef,
  people,
  onSelect,
  isVisible,
) {
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!KAKAO_JS_KEY || !isVisible || !container) return;

    function createMap(targetContainer) {
      if (!targetContainer || instanceRef.current) return;

      instanceRef.current = new window.kakao.maps.Map(targetContainer, {
        center: new window.kakao.maps.LatLng(KNU_CENTER.lat, KNU_CENTER.lng),
        level: 6,
      });

      setMapReady(true);
    }

    if (window.kakao?.maps) {
      createMap(container);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false&libraries=services,clusterer`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => createMap(containerRef.current));
    };
    document.head.appendChild(script);

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [containerRef, instanceRef, isVisible]);

  useEffect(() => {
    if (!mapReady || !instanceRef.current || !window.kakao?.maps) return;

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

      marker.setMap(instanceRef.current);
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
        instanceRef.current.setBounds(nearbyBounds);
      } else {
        instanceRef.current.setCenter(
          new window.kakao.maps.LatLng(KNU_CENTER.lat, KNU_CENTER.lng),
        );
        instanceRef.current.setLevel(6);
      }
    } else {
      instanceRef.current.setCenter(
        new window.kakao.maps.LatLng(KNU_CENTER.lat, KNU_CENTER.lng),
      );
      instanceRef.current.setLevel(6);
    }
  }, [people, onSelect, mapReady, instanceRef]);
}

function App() {
  const [activeTab, setActiveTab] = useState("map");
  const [activeStatsSection, setActiveStatsSection] = useState("region");
  const [listSort, setListSort] = useState("recent");
  const [alerts, setAlerts] = useState([]);
  const [localPeople, setLocalPeople] = useState([]);
  const [searchMapPeople, setSearchMapPeople] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(() =>
    localStorage.getItem(AUTH_TOKEN_KEY) || "",
  );
  const [error, setError] = useState("");
  const [stats, setStats] = useState([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [hasEntered, setHasEntered] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!authToken) {
      setAuthLoading(false);
      return;
    }

    fetchAuthJson("/api/auth/me", authToken)
      .then((data) => {
        setCurrentUser(data.user);
        setHasEntered(true);
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthToken("");
        setCurrentUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, [authToken]);

  useEffect(() => {
    if (activeTab !== "map") return;
    if (!mapInstanceRef.current || !window.kakao?.maps) return;

    const mapInstance = mapInstanceRef.current;
    const currentCenter = mapInstance.getCenter?.();
    const currentLevel = mapInstance.getLevel?.();
    const relayout =
      typeof mapInstance.relayout === "function"
        ? mapInstance.relayout.bind(mapInstance)
        : null;
    const resize =
      typeof window.kakao.maps?.event?.trigger === "function"
        ? () => window.kakao.maps.event.trigger(mapInstance, "resize")
        : null;

    window.requestAnimationFrame(() => {
      relayout?.();
      resize?.();

      if (currentCenter) {
        mapInstance.setCenter(currentCenter);
        if (currentLevel) mapInstance.setLevel(currentLevel);
      }

      setTimeout(() => {
        relayout?.();
        resize?.();
      }, 100);
    });
  }, [activeTab]);

  const loadAlerts = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchJson(
        `/api/missing/alerts?rowSize=${ALERT_ROW_SIZE}`,
      );
      setAlerts(data.items || []);
      setSearchMapPeople([]);
      setSelected(null);
      setIsDetailOpen(false);
    } catch (err) {
      setError(err.message);
      setAlerts([]);
      setSearchMapPeople([]);
      setSelected(null);
      setIsDetailOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const loadLocalPeople = useCallback(async () => {
    if (!authToken) {
      setLocalPeople([]);
      return;
    }

    try {
      const data = await fetchAuthJson("/api/local-missing", authToken);
      setLocalPeople(data.items || []);
    } catch (err) {
      setLocalPeople([]);
    }
  }, [authToken]);

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    loadLocalPeople();
  }, [loadLocalPeople]);

  useEffect(() => {
    fetchJson("/api/stats/regions?rowSize=80")
      .then((data) => setStats(data.regions || []))
      .catch(() => setStats([]));
  }, []);

  const mapAlerts = useMemo(() => {
    const merged = [
      ...alerts.map((person) => ({ ...person, sourceType: person.sourceType || "official" })),
      ...localPeople,
    ];
    const seen = new Set(merged.map(getPersonKey));

    searchMapPeople.forEach((person) => {
      const key = getPersonKey(person);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(person);
    });

    return merged.filter((person) => {
      const matchesTime =
        timeFilter === "all" || getMissingDateBucket(person.missingAt) === timeFilter;
      return matchesTime && sourceMatches(person, sourceFilter);
    });
  }, [alerts, localPeople, searchMapPeople, timeFilter, sourceFilter]);

  const showSearchPersonOnMap = useCallback((person) => {
    setSearchMapPeople((current) => {
      const key = getPersonKey(person);
      const exists = current.some((item) => getPersonKey(item) === key);
      return exists ? current : [person, ...current];
    });
    setSelected(person);
    setIsDetailOpen(true);

    if (person.lat && person.lng && mapInstanceRef.current && window.kakao?.maps) {
      const position = new window.kakao.maps.LatLng(person.lat, person.lng);
      window.requestAnimationFrame(() => {
        mapInstanceRef.current.relayout?.();
        mapInstanceRef.current.panTo(position);
        mapInstanceRef.current.setLevel(7);
      });
      setTimeout(() => {
        mapInstanceRef.current?.relayout?.();
        mapInstanceRef.current?.panTo(position);
        mapInstanceRef.current?.setLevel(7);
      }, 120);
    }
  }, []);

  const toggleSelectedPerson = useCallback((person) => {
    setSelected((current) => {
      const isSamePerson = current?.id === person.id;
      setIsDetailOpen(!isSamePerson);
      return isSamePerson ? null : person;
    });
  }, []);

  const sortedSidebarAlerts = useMemo(() => {
    const items = [...mapAlerts];

    return items.sort((a, b) => {
      if (listSort === "age") {
        const ageA = Number.parseInt(a.age, 10);
        const ageB = Number.parseInt(b.age, 10);
        return (
          (Number.isFinite(ageB) ? ageB : -1) -
          (Number.isFinite(ageA) ? ageA : -1)
        );
      }

      if (listSort === "region") {
        return (a.locationText || "").localeCompare(b.locationText || "", "ko");
      }

      if (listSort === "located") {
        const locatedA = a.lat && a.lng ? 1 : 0;
        const locatedB = b.lat && b.lng ? 1 : 0;
        return locatedB - locatedA;
      }

      const dateA = parseMissingDate(a.missingAt)?.getTime() || 0;
      const dateB = parseMissingDate(b.missingAt)?.getTime() || 0;
      return dateB - dateA;
    });
  }, [mapAlerts, listSort]);

  useKakaoMap(
    mapContainerRef,
    mapInstanceRef,
    mapAlerts,
    toggleSelectedPerson,
    hasEntered,
  );

  const locatedCount = mapAlerts.filter(
    (person) => person.lat && person.lng,
  ).length;

  const handleAuthSuccess = ({ token, user }) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setAuthToken(token);
    setCurrentUser(user);
    setHasEntered(true);
  };

  const handleLogout = async () => {
    if (authToken) {
      await fetchAuthJson("/api/auth/logout", authToken, { method: "POST" }).catch(
        () => {},
      );
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken("");
    setCurrentUser(null);
    setLocalPeople([]);
    setHasEntered(false);
  };

  const handleLocalPersonCreated = (person) => {
    setLocalPeople((current) => [person, ...current.filter((item) => item.id !== person.id)]);
    setSelected(person);
    setIsDetailOpen(true);
    setSourceFilter("all");
    setActiveTab("map");
  };

  if (authLoading) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <Loader2 className="spin" size={28} />
          <p>로그인 상태를 확인하고 있습니다.</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  if (!hasEntered) {
    return <WelcomeView onContinue={() => setHasEntered(true)} />;
  }

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

            if (tab.id === "stats") {
              return (
                <div className="nav-group" key={tab.id}>
                  <button
                    className={activeTab === tab.id ? "tab active" : "tab"}
                    type="button"
                    aria-expanded={activeTab === "stats"}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{getTabLabel(tab)}</span>
                  </button>

                  {activeTab === "stats" && (
                    <div className="tab-child-list" aria-label="통계 하위 메뉴">
                      {statsSections.map((section) => (
                        <button
                          key={section.id}
                          className={
                            activeStatsSection === section.id
                              ? "tab-child active"
                              : "tab-child"
                          }
                          type="button"
                          onClick={() => {
                            setActiveTab("stats");
                            setActiveStatsSection(section.id);
                          }}
                        >
                          {section.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "tab active" : "tab"}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{getTabLabel(tab)}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="user-box">
          <span>{currentUser.name}</span>
          <button className="reset-button" type="button" onClick={handleLogout}>
            <LogOut size={15} />
            로그아웃
          </button>
        </div>

        <AlertListPanel
          alerts={mapAlerts}
          loading={loading}
          sortedAlerts={sortedSidebarAlerts}
          listSort={listSort}
          onChangeSort={setListSort}
          onSelect={(person) => {
            toggleSelectedPerson(person);
            setActiveTab("map");
          }}
        />
      </aside>

      <main className="workspace">
        <div
          className={
            activeTab === "map" ? "view-pane active" : "view-pane hidden"
          }
        >
          <MapView
            alerts={mapAlerts}
            error={error}
            loading={loading}
            locatedCount={locatedCount}
            mapRef={mapContainerRef}
            mapInstanceRef={mapInstanceRef}
            selected={selected}
            isDetailOpen={isDetailOpen}
            onRefresh={loadAlerts}
            timeFilter={timeFilter}
            onChangeTimeFilter={setTimeFilter}
            sourceFilter={sourceFilter}
            onChangeSourceFilter={setSourceFilter}
            onSelect={(person) => {
              toggleSelectedPerson(person);
            }}
            onCloseDetail={() => setIsDetailOpen(false)}
          />
        </div>

        <div
          className={
            activeTab === "search" ? "view-pane active" : "view-pane hidden"
          }
        >
          <SearchView
            onSelect={showSearchPersonOnMap}
            setActiveTab={setActiveTab}
          />
        </div>

        <div
          className={
            activeTab === "stats" ? "view-pane active" : "view-pane hidden"
          }
        >
          <StatsView
            activeSection={activeStatsSection}
            stats={stats}
            alerts={mapAlerts}
          />
        </div>

        <div
          className={
            activeTab === "register" ? "view-pane active" : "view-pane hidden"
          }
        >
          <RegisterView
            authToken={authToken}
            onCreated={handleLocalPersonCreated}
            onReload={loadLocalPeople}
          />
        </div>
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
  mapInstanceRef,
  selected,
  isDetailOpen,
  onRefresh,
  onSelect,
  onCloseDetail,
  timeFilter,
  onChangeTimeFilter,
  sourceFilter,
  onChangeSourceFilter,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [areaSearchError, setAreaSearchError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const moveMapToSearchResult = (lat, lng) => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return;

    const position = new window.kakao.maps.LatLng(lat, lng);
    mapInstanceRef.current.panTo(position);
    mapInstanceRef.current.setLevel(9);
  };

  const submitAreaSearch = (event) => {
    event.preventDefault();
    const keyword = searchQuery.trim();

    if (!keyword || !mapInstanceRef.current || !window.kakao?.maps?.services) {
      return;
    }

    setAreaSearchError("");

    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(keyword, (addressResults, addressStatus) => {
      if (
        addressStatus === window.kakao.maps.services.Status.OK &&
        addressResults[0]
      ) {
        moveMapToSearchResult(
          Number(addressResults[0].y),
          Number(addressResults[0].x),
        );
        return;
      }

      const places = new window.kakao.maps.services.Places();
      places.keywordSearch(keyword, (keywordResults, keywordStatus) => {
        if (
          keywordStatus === window.kakao.maps.services.Status.OK &&
          keywordResults[0]
        ) {
          moveMapToSearchResult(
            Number(keywordResults[0].y),
            Number(keywordResults[0].x),
          );
          return;
        }

        setAreaSearchError("검색한 지역을 지도에서 찾지 못했습니다.");
      });
    });
  };

  return (
    <section className="map-view">
      <header className="map-topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <ShieldCheck size={16} aria-hidden="true" />
          </div>
          <span className="topbar-title">실종 정보 위치 지도</span>
        </div>

        <form className="search-box map-search-box" onSubmit={submitAreaSearch}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="지역명 또는 주소 검색"
            aria-label="지역명 또는 주소 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button className="map-search-button" type="submit" aria-label="지도에서 지역 검색">
            <Search size={16} aria-hidden="true" />
          </button>
        </form>

        <div className="topbar-filters">
          <label className="time-filter">
            <select
              value={timeFilter}
              onChange={(event) => onChangeTimeFilter(event.target.value)}
            >
              <option value="all">📅 전체 기간</option>
              <option value="week">📅 최근 1주</option>
              <option value="month">📅 최근 1개월</option>
              <option value="older">📅 1개월 초과</option>
              <option value="unknown">📅 날짜 미상</option>
            </select>
          </label>

          <label className="status-filter">
            <select
              value={sourceFilter}
              onChange={(event) => onChangeSourceFilter(event.target.value)}
              aria-label="데이터 출처 필터"
            >
              <option value="all">전체 출처</option>
              <option value="official">공식 API</option>
              <option value="local">직접 등록</option>
            </select>
          </label>
        </div>
      </header>

      <div className={selected ? "map-layout has-detail" : "map-layout"}>
        <div className="map-area">
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

            {areaSearchError && (
              <OverlayNotice
                icon={AlertTriangle}
                text={areaSearchError}
                tone="danger"
              />
            )}

          </div>
        </div>

        {selected ? (
          <aside className="detail-panel">
          <div className="selected-detail-card">
            <div className="detail-card-heading">
              <span>실종정보</span>
              <strong>상세 카드 확인</strong>
            </div>
            <PersonDetail person={selected} />
          </div>
          </aside>
        ) : null}
    </div>
  </section>
  );
}

function AlertListPanel({
  alerts,
  loading,
  sortedAlerts,
  listSort,
  onChangeSort,
  onSelect,
}) {
  return (
    <aside className="list-panel sidebar-list-panel">
      <div className="list-panel-heading">
        <div>
          <h3>경보 목록</h3>
          <p>{alerts.length}건의 실종 경보</p>
        </div>

        <label className="list-sort">
          <span>정렬</span>
          <select
            value={listSort}
            onChange={(event) => onChangeSort(event.target.value)}
          >
            <option value="recent">최신순</option>
            <option value="age">나이순</option>
            <option value="region">지역순</option>
            <option value="located">위치 있음 먼저</option>
          </select>
        </label>
      </div>

      <div className="person-list">
        {sortedAlerts.map((person) => (
          <button
            key={person.id}
            className="person-row"
            type="button"
            onClick={() => onSelect(person)}
          >
            {resolvePhotoUrl(person.photoUrl) ? (
              <img
                className="person-row-photo"
                src={resolvePhotoUrl(person.photoUrl)}
                alt={`${person.name} 사진`}
              />
            ) : (
              <div className="person-row-avatar">
                {person.name?.slice(0, 1) || "?"}
              </div>
            )}

            <span>
              <span className="person-row-title">
                <strong>{person.name}</strong>
                <em className={`urgency-badge ${getUrgencyClass(person.missingAt)}`}>
                  {getUrgencyLabel(person.missingAt)}
                </em>
              </span>
              <small>{person.gender} · 현재 {person.age}세</small>
              <small>실종일 {formatShortDate(person.missingAt)}</small>
              <small>{person.locationText || "위치 정보 미제공"}</small>
              <span className="person-row-tags">
                <em>{person.sourceType === "local" ? "직접 등록" : "공식 API"}</em>
                <em>{person.lat && person.lng ? "위치 확인됨" : "위치 미확인"}</em>
                {person.clothing && person.clothing !== "착의 정보 미제공" && (
                  <em>{person.clothing}</em>
                )}
              </span>
            </span>
          </button>
        ))}

        {!loading && alerts.length === 0 && (
          <p className="empty-text">표시할 공식 데이터가 없습니다.</p>
        )}
      </div>
    </aside>
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
  const [cacheStatus, setCacheStatus] = useState(null);
  const [cacheLoading, setCacheLoading] = useState(false);

  const loadCacheStatus = useCallback(() => {
    fetchJson("/api/disaster-missing/cache/status")
      .then((data) => setCacheStatus(data))
      .catch(() => setCacheStatus(null));
  }, []);

  useEffect(() => {
    loadCacheStatus();
  }, [loadCacheStatus]);

  const refreshDisasterCache = async (mode) => {
    setCacheLoading(true);
    setError("");

    try {
      const data = await fetchJson("/api/disaster-missing/cache/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      setCacheStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCacheLoading(false);
    }
  };

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
    <section className="content-view search-layout">
        <div className="search-wrapper">
        <div className="search-header">
          <h2 id="search-title">
            <Search size={26} aria-hidden="true" />
            검색 조건
          </h2>
        </div>

        <form className="search-grid" onSubmit={submit}>
          <label>
            이름
            <input
              placeholder="이름을 입력하세요"
              value={form.nm}
              onChange={(event) => setForm({ ...form, nm: event.target.value })}
            />
          </label>

          <label>
            지역
            <select
              value={form.occrAdres}
              onChange={(event) =>
                setForm({ ...form, occrAdres: event.target.value })
              }
            >
              <option value="">지역을 선택하세요</option>
              {Object.entries(regionGroups).map(([province, districts]) => (
                <optgroup key={province} label={province}>
                  <option value={province}>{province} 전체</option>
                  {districts.map((district) => (
                    <option
                      key={`${province}-${district}`}
                      value={district}
                    >
                      {district}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label>
            성별
            <select
              value={form.sexdstnDscd}
              onChange={(event) =>
                setForm({ ...form, sexdstnDscd: event.target.value })
              }
            >
              <option value="">성별을 선택하세요</option>
              <option value="1">남자</option>
              <option value="2">여자</option>
            </select>
          </label>

          <label>
            최소 나이
            <input
              inputMode="numeric"
              placeholder="최소 나이"
              value={form.age1}
              onChange={(event) => setForm({ ...form, age1: event.target.value })}
            />
          </label>

          <label>
            최대 나이
            <input
              inputMode="numeric"
              placeholder="최대 나이"
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
            검색하기
          </button>
        </form>

        <button
          className="reset-button"
          type="button"
          onClick={() => {
            setForm({ nm: "", occrAdres: "", sexdstnDscd: "", age1: "", age2: "" });
            setResults([]);
            setError("");
          }}
        >
          <span>↻</span> 초기화
        </button>

        <div className="disaster-cache-box">
          <div>
            <strong>긴급문자 DB</strong>
            <span>
              {cacheStatus?.count
                ? `${cacheStatus.count}건 저장됨`
                : "저장된 데이터 없음"}
            </span>
          </div>
          <div className="cache-actions">
            <button
              className="reset-button"
              type="button"
              disabled={cacheLoading}
              onClick={() => refreshDisasterCache("quick")}
            >
              최신 갱신
            </button>
            <button
              className="reset-button"
              type="button"
              disabled={cacheLoading}
              onClick={() => refreshDisasterCache("full")}
            >
              전체 수집
            </button>
          </div>
        </div>
      </div>

      <div className="results-wrapper">
        <div className="results-header">
          <h2>검색 결과</h2>
          <span className="result-count">{results.length}건</span>
        </div>

        {error && <div className="inline-error">{error}</div>}

        <div className="results-grid">
          {results.map((person) => (
            <article key={person.id} className="result-card">
              <div className="card-left">
                {resolvePhotoUrl(person.photoUrl) ? (
                  <img
                    src={resolvePhotoUrl(person.photoUrl)}
                    alt={`${person.name} 사진`}
                    className="card-photo"
                  />
                ) : (
                  <div className="card-avatar">{person.name?.slice(0, 1) || "?"}</div>
                )}
              </div>

              <div className="card-center">
                <div className="card-badge">
                  <span className="badge-icon">!</span>
                  <span className="badge-text">실종정보</span>
                </div>

                <div className="search-result-name">
                  <h3>{person.name}</h3>
                  <span className={`urgency-badge ${getUrgencyClass(person.missingAt)}`}>
                    {getUrgencyLabel(person.missingAt)}
                  </span>
                </div>

                <dl className="result-detail-grid">
                  <div>
                    <dt>
                      <MapPinned size={16} aria-hidden="true" />
                      발생 지역
                    </dt>
                    <dd>{person.locationText || "위치 정보 미제공"}</dd>
                  </div>

                  <div>
                    <dt>
                      <CalendarClock size={16} aria-hidden="true" />
                      발생 일시
                    </dt>
                    <dd>{person.missingAt || "날짜 미상"}</dd>
                  </div>

                  <div>
                    <dt>
                      <UserRoundPlus size={16} aria-hidden="true" />
                      성별 / 나이
                    </dt>
                    <dd>
                      {person.gender} / 현재 {person.age}세
                    </dd>
                  </div>

                  <div>
                    <dt>
                      <Shirt size={16} aria-hidden="true" />
                      특징
                    </dt>
                    <dd>{person.clothing || person.features || "특징 정보 미제공"}</dd>
                  </div>
                </dl>
              </div>

              <div className="card-right">
                <button
                  className="card-action-btn"
                  type="button"
                  onClick={() => {}}
                >
                  <FileSearch size={16} />
                  상세 정보 보기
                </button>

                <button
                  className="card-action-btn"
                  type="button"
                  onClick={() => {
                    onSelect(person);
                    setActiveTab("map");
                  }}
                >
                  <MapPin size={16} />
                  지도에서 보기
                </button>
              </div>
            </article>
          ))}
        </div>

        {!loading && results.length === 0 && (
          <p className="empty-text">검색 결과가 없습니다.</p>
        )}
      </div>
    </section>
  );
}

function StatsView({ activeSection, stats, alerts }) {
  const max = Math.max(1, ...stats.map((item) => item.count));
  const topRegion = stats[0]?.region || "집계 대기";
  const activeStatsTitle =
    statsSections.find((section) => section.id === activeSection)?.label ||
    "지역 분석";
  const timeStats = getTimeStats(alerts);
  const demographicStats = getDemographicStats(alerts);

  return (
    <section className="content-view" aria-labelledby="stats-title">
      <div className="section-heading">
        <h2 id="stats-title">통계</h2>
        <p>실종자 데이터를 여러 기준으로 분석합니다.</p>
      </div>

      <div className="stats-panel">
        <div className="stats-panel-heading">
          <h3>{activeStatsTitle}</h3>
          <p>{getStatsDescription(activeSection)}</p>
        </div>

        {activeSection === "region" && (
          <>
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
          </>
        )}

        {activeSection === "time" && (
          <>
            <div className="status-row wide">
              <Metric label="최근 7일" value={timeStats.week} />
              <Metric label="1개월 이내" value={timeStats.month} />
              <Metric label="1년 이내" value={timeStats.year} />
            </div>

            <StatsBars
              max={timeStats.max}
              rows={[
                ["최근 7일", timeStats.week],
                ["1개월 이내", timeStats.month],
                ["1년 이내", timeStats.year],
                ["3년 이내", timeStats.threeYears],
                ["5년 이내", timeStats.fiveYears],
                ["10년 이내", timeStats.tenYears],
                ["10년 초과", timeStats.overTenYears],
                ["날짜 미상", timeStats.unknown],
              ]}
            />
          </>
        )}

        {activeSection === "demographic" && (
          <>
            <div className="status-row wide">
              <Metric label="남성" value={demographicStats.gender.male} />
              <Metric label="여성" value={demographicStats.gender.female} />
              <Metric label="고령 비중" value={`${demographicStats.seniorRate}%`} />
            </div>

            <div className="stats-split-grid">
              <div>
                <h4>성별 분포</h4>
                <StatsBars
                  max={demographicStats.gender.max}
                  rows={[
                    ["남성", demographicStats.gender.male],
                    ["여성", demographicStats.gender.female],
                    ["미상", demographicStats.gender.unknown],
                  ]}
                />
              </div>

              <div>
                <h4>연령대 분포</h4>
                <StatsBars
                  max={demographicStats.age.max}
                  rows={demographicStats.age.rows}
                />
              </div>
            </div>
          </>
        )}

      </div>
    </section>
  );
}

function StatsBars({ rows, max }) {
  return (
    <div className="chart-list">
      {rows.map(([label, value]) => (
        <div className="bar-row" key={label}>
          <span>{label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${max ? (value / max) * 100 : 0}%` }}
            />
          </div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function getStatsDescription(activeSection) {
  if (activeSection === "time") {
    return "실종 발생 시점을 기준으로 최근 경보와 장기 경보를 구분합니다.";
  }
  if (activeSection === "demographic") {
    return "성별과 연령대를 나눠 주의가 필요한 대상군을 확인합니다.";
  }
  return "공식 API 조회 결과를 지역 단위로 집계합니다.";
}

function getTimeStats(alerts) {
  const counts = {
    week: 0,
    month: 0,
    year: 0,
    threeYears: 0,
    fiveYears: 0,
    tenYears: 0,
    overTenYears: 0,
    unknown: 0,
  };

  alerts.forEach((person) => {
    const date = parseMissingDate(person.missingAt);
    if (!date) {
      counts.unknown += 1;
      return;
    }

    const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays <= 7) counts.week += 1;
    else if (diffDays <= 30) counts.month += 1;
    else if (diffDays <= 365) counts.year += 1;
    else if (diffDays <= 365 * 3) counts.threeYears += 1;
    else if (diffDays <= 365 * 5) counts.fiveYears += 1;
    else if (diffDays <= 365 * 10) counts.tenYears += 1;
    else counts.overTenYears += 1;
  });

  return {
    ...counts,
    max: Math.max(
      1,
      counts.week,
      counts.month,
      counts.year,
      counts.threeYears,
      counts.fiveYears,
      counts.tenYears,
      counts.overTenYears,
      counts.unknown,
    ),
  };
}

function getAgeGroup(age) {
  const parsed = Number.parseInt(age, 10);
  if (!Number.isFinite(parsed)) return "미상";
  if (parsed < 20) return "10대 이하";
  if (parsed < 40) return "20~30대";
  if (parsed < 60) return "40~50대";
  return "60대 이상";
}

function getDemographicStats(alerts) {
  const gender = { male: 0, female: 0, unknown: 0 };
  const ageCounts = new Map([
    ["10대 이하", 0],
    ["20~30대", 0],
    ["40~50대", 0],
    ["60대 이상", 0],
    ["미상", 0],
  ]);

  alerts.forEach((person) => {
    if (String(person.gender).includes("남")) gender.male += 1;
    else if (String(person.gender).includes("여")) gender.female += 1;
    else gender.unknown += 1;

    const ageGroup = getAgeGroup(person.age);
    ageCounts.set(ageGroup, (ageCounts.get(ageGroup) || 0) + 1);
  });

  const ageRows = [...ageCounts.entries()];
  const seniorCount = ageCounts.get("60대 이상") || 0;

  return {
    gender: {
      ...gender,
      max: Math.max(1, gender.male, gender.female, gender.unknown),
    },
    age: {
      rows: ageRows,
      max: Math.max(1, ...ageRows.map(([, value]) => value)),
    },
    seniorRate: alerts.length ? Math.round((seniorCount / alerts.length) * 100) : 0,
  };
}

function AuthView({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const data = await fetchJson("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        setMessage(data.message || "회원가입이 완료되었습니다.");
        setMode("login");
        setForm((current) => ({ ...current, password: "" }));
        return;
      }

      const data = await fetchJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });
      onAuthSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="section-heading">
          <div>
            <h2 id="auth-title">
              {mode === "login" ? "로그인" : "회원가입"}
            </h2>
            <p>직접 실종자를 등록하려면 계정으로 로그인해주세요.</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => setMode("login")}
          >
            로그인
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            type="button"
            onClick={() => setMode("signup")}
          >
            회원가입
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <label>
              이름
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>
          )}

          <label>
            이메일
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </label>

          <label>
            비밀번호
            <input
              required
              type="password"
              minLength={4}
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
            />
          </label>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading && <Loader2 className="spin" size={18} />}
            {mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>

        {message && <div className="success-box">{message}</div>}
        {error && <div className="inline-error">{error}</div>}
      </section>
    </div>
  );
}

function WelcomeView({ onContinue }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <strong className="welcome-brand">찾았다 요놈</strong>
        <p>실종자 지도 서비스를 시작하려면 아래 버튼을 눌러주세요.</p>
        <button className="primary-button" type="button" onClick={onContinue}>
          로그인하고 시작하기
        </button>
      </div>
    </div>
  );
}

function RegisterView({ authToken, onCreated, onReload }) {
  const [form, setForm] = useState({
    guardianName: "",
    guardianPhone: "",
    missingName: "",
    age: "",
    gender: "",
    missingAt: "",
    locationText: "",
    clothing: "",
    features: "",
    height: "",
    weight: "",
    bodyType: "",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      if (!photoFile) {
        throw new Error("실종자 사진을 등록해주세요.");
      }

      const photoDataUrl = await fileToDataUrl(photoFile);
      const data = await fetchAuthJson("/api/local-missing", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photoDataUrl }),
      });

      setMessage(data.message);
      setForm({
        guardianName: "",
        guardianPhone: "",
        missingName: "",
        age: "",
        gender: "",
        missingAt: "",
        locationText: "",
        clothing: "",
        features: "",
        height: "",
        weight: "",
        bodyType: "",
      });
      setPhotoFile(null);
      onCreated?.(data.person);
      onReload?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="content-view" aria-labelledby="register-title">
      <div className="local-register-note">
        <strong>실종자 등록</strong>
        <span>등록이 완료되면 공식 API 데이터와 분리된 직접 등록 데이터로 지도에 표시됩니다.</span>
      </div>
      <div className="section-heading">
        <h2 id="register-title">실종자 등록</h2>
        <p>직접 등록한 실종자 정보는 공식 API와 분리되어 저장되고 지도에 표시됩니다.</p>
      </div>

      <div className="review-flow">
        <span className="active">정보 입력</span>
        <span>사진 등록</span>
        <span>위치 변환</span>
        <span>지도 표시</span>
      </div>

      <form className="register-form" onSubmit={submit}>
        {[
          ["guardianName", "등록자 이름"],
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
              required={["guardianPhone", "missingName", "missingAt", "locationText"].includes(key)}
              value={form[key]}
              onChange={(event) =>
                setForm({ ...form, [key]: event.target.value })
              }
            />
          </label>
        ))}

        <label>
          나이
          <input
            inputMode="numeric"
            value={form.age}
            onChange={(event) => setForm({ ...form, age: event.target.value })}
          />
        </label>

        <label>
          성별
          <select
            value={form.gender}
            onChange={(event) => setForm({ ...form, gender: event.target.value })}
          >
            <option value="">미상</option>
            <option value="남성">남성</option>
            <option value="여성">여성</option>
          </select>
        </label>

        <label>
          키(cm)
          <input
            inputMode="numeric"
            value={form.height}
            onChange={(event) => setForm({ ...form, height: event.target.value })}
          />
        </label>

        <label>
          몸무게(kg)
          <input
            inputMode="numeric"
            value={form.weight}
            onChange={(event) => setForm({ ...form, weight: event.target.value })}
          />
        </label>

        <label>
          체형
          <input
            value={form.bodyType}
            onChange={(event) => setForm({ ...form, bodyType: event.target.value })}
          />
        </label>

        <label>
          실종자 사진
          <input
            required
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
          />
        </label>

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
          실종자 등록
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
        <DetailItem icon={CalendarClock} label="실종 일시">
          <dd>{person.missingAt || "미제공"}</dd>
        </DetailItem>

        <DetailItem icon={MapPinned} label="발생 위치">
          <dd>{person.locationText || "미제공"}</dd>
        </DetailItem>

        <DetailItem icon={Shirt} label="인상착의">
          <dd>{person.clothing}</dd>
        </DetailItem>

        <DetailItem icon={Sparkles} label="특이사항">
          <dd>{person.features}</dd>
        </DetailItem>
      </dl>

      <div className="action-row">
        {person.sourceType === "local" && (
          <a className="call-link" href={`tel:${person.guardianPhone || ""}`}>
            <Phone size={16} />
            {person.guardianPhone || "보호자 연락처 없음"}
          </a>
        )}
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

function DetailItem({ icon: Icon, label, children }) {
  return (
    <div>
      <dt>
        <span className="detail-icon" aria-hidden="true">
          <Icon size={15} />
        </span>
        {label}
      </dt>
      {children}
    </div>
  );
}

function PersonSummary({ person, large = false }) {
  const initials = person.name?.slice(0, 1) || "?";
  const physicalItems = large
    ? [
        ["키", formatWithUnit(person.height, "cm"), Ruler],
        ["몸무게", formatWithUnit(person.weight, "kg"), Weight],
        ["체형", person.bodyType, UserRoundPlus],
      ].filter(([, value]) => value)
    : [];

  return (
    <div className={large ? "person-summary large" : "person-summary"}>
      {resolvePhotoUrl(person.photoUrl) ? (
        <img src={resolvePhotoUrl(person.photoUrl)} alt={`${person.name} 사진`} />
      ) : (
        <div className="avatar">{initials}</div>
      )}

      <div>
        <p>{person.sourceType === "local" ? "직접 등록" : "공식 경보"}</p>
        <h3>{person.name}</h3>
        <span>
          {person.gender} · 현재 {person.age}세
        </span>

        {physicalItems.length > 0 && (
          <div className="physical-info">
            {physicalItems.map(([label, value, Icon]) => (
              <span className="physical-chip" key={label}>
                <Icon size={13} aria-hidden="true" />
                <b>{label}</b>
                {value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatWithUnit(value, unit) {
  if (!value) return "";
  const text = String(value).trim();
  if (!text) return "";
  return text.includes(unit) ? text : `${text}${unit}`;
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
