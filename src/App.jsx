import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  Camera,
  CheckCircle2,
  FileSearch,
  Home,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MapPinned,
  Phone,
  Ruler,
  Search,
  Send,
  ShieldCheck,
  Shirt,
  Sparkles,
  Sprout,
  UserCircle,
  UserRoundPlus,
  Weight,
  X,
} from "lucide-react";

const API_BASE = "";
const UPLOAD_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || "";
const KNU_CENTER = { lat: 35.8908, lng: 128.6111 };
const ALERT_ROW_SIZE = 100;
const AUTH_TOKEN_KEY = "findlostpeople.authToken";
const MISSING_MESSAGE_KEYWORDS = [
  "실종",
  "배회",
  "미귀가",
  "찾습니다",
  "발견시",
  "보호중",
];

const tabs = [
  { id: "map", label: "실시간 지도", icon: MapPin },
  { id: "search", label: "실종자 검색", icon: Search },
  { id: "stats", label: "통계", icon: BarChart3 },
  { id: "register", label: "보호자 등록", icon: UserRoundPlus },
  { id: "mypage", label: "마이페이지", icon: UserCircle },
];

function getTabLabel(tab) {
  return tab.id === "register" ? "실종자 등록" : tab.label;
}

const statsSections = [
  { id: "region", label: "지역 분석" },
  { id: "time", label: "최근 발생 추이" },
  { id: "demographic", label: "성별·연령 분석" },
];

const myPageSections = [
  { id: "info", label: "내정보" },
  { id: "reports", label: "내 제보내역" },
];

const trendYears = [2023, 2024, 2025, 2026];

const regionAnalysisLayout = [
  { id: "seoul", names: ["서울특별시", "서울"], label: "서울", row: 1, col: 2 },
  { id: "gyeonggi", names: ["경기도", "경기"], label: "경기", row: 1, col: 3 },
  { id: "incheon", names: ["인천광역시", "인천"], label: "인천", row: 2, col: 1 },
  { id: "gangwon", names: ["강원특별자치도", "강원도", "강원"], label: "강원", row: 1, col: 4 },
  { id: "chungnam", names: ["충청남도", "충남"], label: "충남", row: 3, col: 2 },
  { id: "sejong", names: ["세종특별자치시", "세종"], label: "세종", row: 2, col: 2 },
  { id: "chungbuk", names: ["충청북도", "충북"], label: "충북", row: 2, col: 3 },
  { id: "daejeon", names: ["대전광역시", "대전"], label: "대전", row: 3, col: 3 },
  { id: "gyeongbuk", names: ["경상북도", "경북"], label: "경북", row: 3, col: 4 },
  { id: "jeonbuk", names: ["전북특별자치도", "전라북도", "전북"], label: "전북", row: 4, col: 2 },
  { id: "daegu", names: ["대구광역시", "대구"], label: "대구", row: 4, col: 4 },
  { id: "gwangju", names: ["광주광역시", "광주"], label: "광주", row: 5, col: 2 },
  { id: "jeonnam", names: ["전라남도", "전남"], label: "전남", row: 6, col: 2 },
  { id: "gyeongnam", names: ["경상남도", "경남"], label: "경남", row: 5, col: 3 },
  { id: "ulsan", names: ["울산광역시", "울산"], label: "울산", row: 5, col: 4 },
  { id: "busan", names: ["부산광역시", "부산"], label: "부산", row: 6, col: 4 },
  { id: "jeju", names: ["제주특별자치도", "제주도", "제주"], label: "제주", row: 7, col: 2 },
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

function getSourceLabel(person) {
  if (person.sourceType === "local") return "직접 등록";
  if (person.status === "disaster-message") return "실종 문자경보";
  if (person.sourceLabel) return person.sourceLabel;
  return "공식 API";
}

function isMissingMessageAlert(person) {
  if (person.status !== "disaster-message") return true;

  const name = String(person.name || "").trim();
  const hasName = Boolean(
    name && !name.includes("미상") && !name.includes("誘몄긽"),
  );
  if (!hasName) return false;

  const text = [
    person.name,
    person.clothing,
    person.features,
    person.locationText,
  ].join(" ");

  return MISSING_MESSAGE_KEYWORDS.some((keyword) => text.includes(keyword));
}

function getUserMapCenter(user) {
  const lat = Number(user?.lat);
  const lng = Number(user?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
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
  if (value.startsWith("/uploads/")) {
    return `${UPLOAD_BASE}${value}`;
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
  preferredCenter,
) {
  const markersRef = useRef([]);
  const hasCenteredRef = useRef(false);
  const hasFittedMarkersRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!KAKAO_JS_KEY || !isVisible || !container) return;
    let cancelled = false;

    function createMap(targetContainer) {
      if (cancelled || !targetContainer || instanceRef.current) return;

      targetContainer.innerHTML = "";
      const initialCenter = preferredCenter || KNU_CENTER;
      const initialLevel = 8;

      instanceRef.current = new window.kakao.maps.Map(targetContainer, {
        center: new window.kakao.maps.LatLng(initialCenter.lat, initialCenter.lng),
        level: initialLevel,
      });

      [0, 120, 320].forEach((delay) => window.setTimeout(() => {
        if (!instanceRef.current) return;
        instanceRef.current?.relayout?.();
        instanceRef.current.setCenter(
          new window.kakao.maps.LatLng(initialCenter.lat, initialCenter.lng),
        );
        instanceRef.current.setLevel(initialLevel);
      }, delay));

      hasCenteredRef.current = false;
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
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      instanceRef.current = null;
      hasCenteredRef.current = false;
      hasFittedMarkersRef.current = false;
      if (container) container.innerHTML = "";
      setMapReady(false);
    };
  }, [containerRef, instanceRef, isVisible, preferredCenter]);

  useEffect(() => {
    if (
      !mapReady ||
      !preferredCenter ||
      !instanceRef.current ||
      !window.kakao?.maps ||
      hasCenteredRef.current
    ) {
      return;
    }

    instanceRef.current.setCenter(
      new window.kakao.maps.LatLng(preferredCenter.lat, preferredCenter.lng),
    );
    instanceRef.current.setLevel(8);
    instanceRef.current.relayout?.();
    hasCenteredRef.current = true;
  }, [mapReady, preferredCenter, instanceRef]);

  useEffect(() => {
    if (!mapReady || !instanceRef.current || !window.kakao?.maps) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const visible = people.filter((person) => person.lat && person.lng);
    hasFittedMarkersRef.current = false;

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

    if (visible.length > 0 && !preferredCenter && !hasFittedMarkersRef.current) {
      const bounds = new window.kakao.maps.LatLngBounds();

      visible.forEach((person) => {
        bounds.extend(new window.kakao.maps.LatLng(person.lat, person.lng));
      });

      instanceRef.current.setBounds(bounds);
      instanceRef.current.relayout?.();
      hasFittedMarkersRef.current = true;
    }
  }, [people, onSelect, mapReady, instanceRef, preferredCenter]);
}

function App() {
  const [activeTab, setActiveTab] = useState("map");
  const [activeStatsSection, setActiveStatsSection] = useState("region");
  const [activeMyPageSection, setActiveMyPageSection] = useState("info");
  const [listSort, setListSort] = useState("recent");
  const [alerts, setAlerts] = useState([]);
  const [localPeople, setLocalPeople] = useState([]);
  const [searchMapPeople, setSearchMapPeople] = useState([]);
  const [disasterStatsAlerts, setDisasterStatsAlerts] = useState([]);
  const [statsDataLoaded, setStatsDataLoaded] = useState(false);
  const [mapDisasterPeople, setMapDisasterPeople] = useState([]);
  const [mapDisasterLoading, setMapDisasterLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
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

  useEffect(() => {
    if (activeTab !== "stats" || statsDataLoaded) return;

    let cancelled = false;

    fetchJson("/api/disaster-missing/messages")
      .then((data) => {
        if (cancelled) return;
        setDisasterStatsAlerts((data.items || []).filter(isMissingMessageAlert));
        setStatsDataLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setDisasterStatsAlerts([]);
        setStatsDataLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, statsDataLoaded]);

  const userMapCenter = useMemo(() => getUserMapCenter(currentUser), [currentUser]);

  const loadMapDisasterPeople = useCallback(
    async () => {
      if (!authToken) {
        setMapDisasterPeople([]);
        return;
      }

      const params = new URLSearchParams({
        limit: "24",
        candidateLimit: "80",
        geocodeLimit: "18",
      });

      if (currentUser?.lat && currentUser?.lng) {
        params.set("lat", String(currentUser.lat));
        params.set("lng", String(currentUser.lng));
      }

      setMapDisasterLoading(true);
      try {
        const data = await fetchAuthJson(
          `/api/missing/map-disaster?${params.toString()}`,
          authToken,
        );
        setMapDisasterPeople((data.items || []).filter(isMissingMessageAlert));
      } catch (err) {
        setMapDisasterPeople([]);
      } finally {
        setMapDisasterLoading(false);
      }
    },
    [authToken, currentUser],
  );

  useEffect(() => {
    if (!authToken) return;
    loadMapDisasterPeople();
  }, [loadMapDisasterPeople]);

  const statsAlerts = useMemo(
    () => mergePeopleForView(alerts, disasterStatsAlerts),
    [alerts, disasterStatsAlerts],
  );

  const statsRegions = useMemo(() => {
    const regionCounts = new Map();

    statsAlerts.forEach((person) => {
      const region = getDisplayRegion(person.locationText);
      regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
    });

    return [...regionCounts.entries()]
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);
  }, [statsAlerts]);

  const mapAlerts = useMemo(() => {
    const merged = [
      ...alerts.map((person) => ({
        ...person,
        sourceType: person.sourceType || "official",
      })),
      ...mapDisasterPeople,
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
  }, [alerts, mapDisasterPeople, localPeople, searchMapPeople, timeFilter, sourceFilter]);

  const sidebarAlerts = useMemo(() => {
    const merged = mapAlerts;

    return merged.filter((person) => {
      const matchesTime =
        timeFilter === "all" || getMissingDateBucket(person.missingAt) === timeFilter;
      return matchesTime && sourceMatches(person, sourceFilter);
    });
  }, [mapAlerts, timeFilter, sourceFilter]);

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
    const items = [...sidebarAlerts];

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
    }).slice(0, 140);
  }, [sidebarAlerts, listSort]);

  useKakaoMap(
    mapContainerRef,
    mapInstanceRef,
    mapAlerts,
    toggleSelectedPerson,
    hasEntered,
    userMapCenter,
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
    setReportTarget(null);
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

            if (tab.id === "mypage") {
              return (
                <div className="nav-group" key={tab.id}>
                  <button
                    className={activeTab === tab.id ? "tab active" : "tab"}
                    type="button"
                    aria-expanded={activeTab === "mypage"}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{getTabLabel(tab)}</span>
                  </button>

                  {activeTab === "mypage" && (
                    <div className="tab-child-list" aria-label="마이페이지 하위 메뉴">
                      {myPageSections.map((section) => (
                        <button
                          key={section.id}
                          className={
                            activeMyPageSection === section.id
                              ? "tab-child active"
                              : "tab-child"
                          }
                          type="button"
                          onClick={() => {
                            setActiveTab("mypage");
                            setActiveMyPageSection(section.id);
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
          alerts={sidebarAlerts}
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
            mapDisasterLoading={mapDisasterLoading}
            locatedCount={locatedCount}
            userMapCenter={userMapCenter}
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
            onOpenReport={setReportTarget}
          />
        </div>

        <div
          className={
            activeTab === "search" ? "view-pane active" : "view-pane hidden"
          }
        >
          <SearchView
            onSelect={showSearchPersonOnMap}
            onOpenReport={setReportTarget}
            setActiveTab={setActiveTab}
          />
        </div>

        <div
          className={
            activeTab === "stats" ? "view-pane active" : "view-pane hidden"
          }
        >
          {activeTab === "stats" && (
            <StatsView
              activeSection={activeStatsSection}
              stats={statsRegions.length ? statsRegions : stats}
              alerts={statsAlerts.length ? statsAlerts : alerts}
              loading={!statsDataLoaded}
            />
          )}
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

        <div
          className={
            activeTab === "mypage" ? "view-pane active" : "view-pane hidden"
          }
        >
          <MyPageView
            activeSection={activeMyPageSection}
            authToken={authToken}
            user={currentUser}
            locatedCount={locatedCount}
            mapCount={mapAlerts.length}
            localCount={localPeople.length}
          />
        </div>
      </main>

      {reportTarget && (
        <SightingReportModal
          authToken={authToken}
          person={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}

function MapView({
  alerts,
  error,
  loading,
  mapDisasterLoading,
  locatedCount,
  userMapCenter,
  mapRef,
  mapInstanceRef,
  selected,
  isDetailOpen,
  onRefresh,
  onSelect,
  onCloseDetail,
  onOpenReport,
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

            {!loading && mapDisasterLoading && (
              <OverlayNotice
                icon={Loader2}
                text="현재 지도 주변 실종 문자경보를 불러오는 중입니다."
                spinning
              />
            )}

            {!userMapCenter && (
              <OverlayNotice
                icon={MapPin}
                text="회원 주소 좌표가 없어 기본 위치에서 지도를 시작합니다."
              />
            )}

            {!loading && !mapDisasterLoading && locatedCount === 0 && (
              <OverlayNotice
                icon={MapPin}
                text="좌표가 확인된 실종자 데이터가 아직 없습니다."
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
            <PersonDetail person={selected} onOpenReport={onOpenReport} />
          </div>
          </aside>
        ) : null}
    </div>
  </section>
  );
}

function MyPageView({
  activeSection,
  authToken,
  user,
  locatedCount,
  mapCount,
  localCount,
}) {
  const hasAddressPoint = Number.isFinite(Number(user?.lat)) && Number.isFinite(Number(user?.lng));
  const isReports = activeSection === "reports";
  const [reportSummary, setReportSummary] = useState(null);
  const [showBadgeGuide, setShowBadgeGuide] = useState(false);

  useEffect(() => {
    if (!authToken) {
      setReportSummary(null);
      return;
    }

    let cancelled = false;
    fetchAuthJson("/api/sighting-reports/mine", authToken)
      .then((data) => {
        if (!cancelled) setReportSummary(data.summary || null);
      })
      .catch(() => {
        if (!cancelled) setReportSummary(null);
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, activeSection]);

  const badge = reportSummary?.badge;
  const badgeGuide = reportSummary?.badgeGuide || [];

  return (
    <section className="content-view mypage-view" aria-labelledby="mypage-title">
      <div className="section-heading">
        <div>
          <h2 id="mypage-title">{isReports ? "\uB0B4 \uC81C\uBCF4\uB0B4\uC5ED" : "\uB0B4\uC815\uBCF4"}</h2>
          <p>
            {isReports
              ? "\uB0B4\uAC00 \uC791\uC131\uD55C \uC2E4\uC885 \uC81C\uBCF4\uB97C \uAC80\uD1A0 \uC0C1\uD0DC\uC640 \uD568\uAED8 \uD655\uC778\uD569\uB2C8\uB2E4."
              : "\uB85C\uADF8\uC778\uD55C \uACC4\uC815\uACFC \uC9C0\uC5ED \uAE30\uC900 \uC704\uCE58\uB97C \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}
          </p>
        </div>
      </div>

      {isReports ? (
        <MyReportList authToken={authToken} />
      ) : (
        <div className="mypage-grid">
          <article className="profile-panel">
            <div className="profile-avatar" aria-hidden="true">
              {user?.name?.slice(0, 1) || "?"}
            </div>
            <div>
              <span>{"\uB0B4 \uACC4\uC815"}</span>
              <div className="profile-name-row">
                <h3>{user?.name || "\uC774\uB984 \uC5C6\uC74C"}</h3>
                {badge && (
                  <div className="badge-wrap">
                    <span className={"trust-badge " + badge.id}>
                      <span className="badge-emblem" aria-hidden="true">
                        <BadgeIcon icon={badge.icon} level={badge.level} />
                      </span>
                      <span>Lv.{badge.level} {badge.label}</span>
                    </span>
                    <button
                      className="badge-guide-button"
                      type="button"
                      aria-label={"\uBC43\uC9C0 \uB808\uBCA8 \uAC00\uC774\uB4DC"}
                      aria-expanded={showBadgeGuide}
                      onClick={() => setShowBadgeGuide((current) => !current)}
                    >
                      ?
                    </button>
                    {showBadgeGuide && (
                      <div className="badge-guide-panel">
                        <div className="badge-guide-heading">
                          <strong>{"\uBC43\uC9C0 \uB808\uBCA8 \uAC00\uC774\uB4DC"}</strong>
                          <span>{"\uC81C\uBCF4 \uD3EC\uC778\uD2B8\uAC00 \uC313\uC774\uBA74 \uC790\uB3D9\uC73C\uB85C \uC62C\uB77C\uAC11\uB2C8\uB2E4."}</span>
                        </div>
                        <div className="badge-guide-list">
                          {badgeGuide.map((item) => (
                            <div
                              className={item.id === badge.id ? "badge-guide-row active" : "badge-guide-row"}
                              key={item.id}
                            >
                              <span className={"mini-badge-emblem " + item.id} aria-hidden="true">
                                <BadgeIcon icon={item.icon} level={item.level} />
                              </span>
                              <div>
                                <strong>Lv.{item.level} {item.label}</strong>
                                <span>{item.minPoints}P {"\uC774\uC0C1"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p>{hasAddressPoint ? "\uC8FC\uC18C \uC88C\uD45C \uD655\uC778\uB428" : "\uC8FC\uC18C \uC88C\uD45C \uBBF8\uD655\uC778"}</p>
            </div>
          </article>

          <div className="profile-info-list">
            <ProfileInfoItem icon={Mail} label={"\uC774\uBA54\uC77C"} value={user?.email || "\uBBF8\uB4F1\uB85D"} />
            <ProfileInfoItem icon={Home} label={"\uC8FC\uC18C"} value={user?.address || "\uBBF8\uB4F1\uB85D"} />
            <ProfileInfoItem
              icon={MapPinned}
              label={"\uC9C0\uC5ED \uC88C\uD45C"}
              value={
                hasAddressPoint
                  ? Number(user.lat).toFixed(6) + ", " + Number(user.lng).toFixed(6)
                  : "\uC88C\uD45C \uC5C6\uC74C"
              }
            />
            <ProfileInfoItem
              icon={CalendarClock}
              label={"\uAC00\uC785\uC77C"}
              value={formatShortDate(user?.createdAt)}
            />
          </div>

          <div className="status-row wide mypage-stats">
            <Metric label={"\uC81C\uBCF4 \uD3EC\uC778\uD2B8"} value={String(reportSummary?.totalPoints || 0) + "P"} />
            <Metric label={"\uC81C\uBCF4 \uC218"} value={String(reportSummary?.totalReports || 0) + "\uAC74"} />
            <Metric label={"\uC0AC\uC9C4\uCCA8\uBD80 \uC81C\uBCF4"} value={String(reportSummary?.photoReports || 0) + "\uAC74"} />
          </div>
        </div>
      )}
    </section>
  );
}

function MyReportList({ authToken }) {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authToken) {
      setReports([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetchAuthJson("/api/sighting-reports/mine", authToken)
      .then((data) => {
        if (cancelled) return;
        setReports(data.items || []);
        setSummary(data.summary || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setReports([]);
        setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  if (loading) {
    return (
      <div className="mypage-list-state">
        <Loader2 className="spin" size={20} />
        {"\uC81C\uBCF4\uB0B4\uC5ED\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4."}
      </div>
    );
  }

  if (error) {
    return <div className="inline-error">{error}</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="mypage-list-state">
        <FileSearch size={22} />
        {"\uC544\uC9C1 \uC791\uC131\uD55C \uC81C\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}
      </div>
    );
  }

  return (
    <div className="my-report-list">
      {summary && (
        <div className="my-report-summary-card">
          <Metric label={"\uC81C\uBCF4 \uD3EC\uC778\uD2B8"} value={String(summary.totalPoints || 0) + "P"} />
          <Metric label={"\uC81C\uBCF4 \uC218"} value={String(summary.totalReports || 0) + "\uAC74"} />
          <Metric label={"\uC0AC\uC9C4\uCCA8\uBD80 \uC81C\uBCF4"} value={String(summary.photoReports || 0) + "\uAC74"} />
        </div>
      )}

      {reports.map((report) => (
        <article className="my-report-card" key={report.id}>
          <div className="my-report-card-head">
            <div>
              <span>{"\uC81C\uBCF4 \uB300\uC0C1"}</span>
              <h3>{report.missingPersonName || "\uC774\uB984 \uBBF8\uC0C1"}</h3>
            </div>
            <div className="report-card-badges">
              <strong>{getReportStatusLabel(report.status)}</strong>
              <strong className="point-chip">+{report.pointsAwarded || 0}P</strong>
            </div>
          </div>

          <dl className="my-report-detail-list">
            <div>
              <dt>{"\uBAA9\uACA9 \uC2DC\uAC04"}</dt>
              <dd>{report.sightedAt || "\uBBF8\uC785\uB825"}</dd>
            </div>
            <div>
              <dt>{"\uBAA9\uACA9 \uC704\uCE58"}</dt>
              <dd>{report.locationText || "\uBBF8\uC785\uB825"}</dd>
            </div>
            <div>
              <dt>{"\uC791\uC131\uC77C"}</dt>
              <dd>{formatShortDate(report.createdAt)}</dd>
            </div>
            <div>
              <dt>{"\uC5F0\uB77D\uCC98"}</dt>
              <dd>{report.contactPhone || "\uBBF8\uC785\uB825"}</dd>
            </div>
          </dl>

          <p>{report.content}</p>

          {report.photoUrl && (
            <a
              className="report-photo-link"
              href={resolvePhotoUrl(report.photoUrl)}
              target="_blank"
              rel="noreferrer"
            >
              {"\uCCA8\uBD80 \uC0AC\uC9C4 \uBCF4\uAE30"}
            </a>
          )}
        </article>
      ))}
    </div>
  );
}

function getReportStatusLabel(status) {
  if (status === "approved") return "\uD655\uC778\uB428";
  if (status === "rejected") return "\uBC18\uB824\uB428";
  return "\uAC80\uD1A0\uC911";
}

function BadgeIcon({ icon, level }) {
  const iconMap = {
    light: Sprout,
    pinlight: MapPinned,
    shieldhome: Home,
    handstar: ShieldCheck,
    ribboncheck: BadgeCheck,
    wreath: Award,
    lifelink: Sparkles,
  };
  const Icon = iconMap[icon] || BadgeCheck;

  return (
    <>
      <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
      <b>{level}</b>
    </>
  );
}

function ProfileInfoItem({ icon: Icon, label, value }) {
  return (
    <div className="profile-info-item">
      <span className="profile-info-icon">
        <Icon size={18} aria-hidden="true" />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
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
                <em>{getSourceLabel(person)}</em>
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

function SearchView({ onSelect, onOpenReport, setActiveTab }) {
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
            <strong>실종 문자 DB</strong>
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
          <a
            className="reset-button csv-download-link"
            href="/disaster-missing-messages.csv"
            download
          >
            CSV 다운로드
          </a>
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

                <button
                  className="card-action-btn report-action-btn"
                  type="button"
                  onClick={() => onOpenReport(person)}
                >
                  <Send size={16} />
                  제보하기
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

function mergePeopleForView(primary, secondary) {
  const seen = new Set();
  const merged = [];

  [...primary, ...secondary].forEach((person) => {
    const key =
      person.id || `${person.name}:${person.missingAt}:${person.locationText}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(person);
  });

  return merged;
}

function getDisplayRegion(locationText) {
  const value = String(locationText || "").trim();
  if (!value) return "지역 미상";

  const knownProvince = Object.keys(regionGroups).find((province) =>
    value.includes(province),
  );
  if (knownProvince) return knownProvince;

  const firstToken = value.split(/\s+/)[0];
  return firstToken || "지역 미상";
}

function StatsView({ activeSection, stats, alerts, loading }) {
  const topRegion = stats[0]?.region || "집계 대기";
  const [selectedRegionId, setSelectedRegionId] = useState(
    regionAnalysisLayout[0].id,
  );
  const [selectedTrendYear, setSelectedTrendYear] = useState(2026);
  const activeStatsTitle =
    statsSections.find((section) => section.id === activeSection)?.label ||
    "지역 분석";
  const monthlyStats = getMonthlyStats(alerts, selectedTrendYear);
  const demographicStats = getDemographicStats(alerts);
  const regionStats = getRegionAnalysisStats(stats, alerts, selectedRegionId);

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

        {loading && (
          <div className="stats-loading-note">
            <Loader2 className="spin" size={18} />
            통계 데이터를 불러오는 중입니다.
          </div>
        )}

        {activeSection === "region" && (
          <>
            <div className="region-analysis">
              <div className="region-map-card">
                <div className="region-map-title">
                  <strong>시도별 실종자 현황</strong>
                  <span>지역을 클릭하면 상세 현황을 확인할 수 있습니다.</span>
                </div>

                <div className="region-cartogram" aria-label="시도별 실종자 카토그램">
                  {regionStats.regions.map((region) => (
                    <button
                      className={
                        region.id === selectedRegionId
                          ? "cartogram-cell active"
                          : "cartogram-cell"
                      }
                      key={region.id}
                      style={{
                        gridColumn: region.col,
                        gridRow: region.row,
                        "--region-color": region.color,
                      }}
                      type="button"
                      onClick={() => setSelectedRegionId(region.id)}
                      title={`${region.label}: ${region.count}명`}
                    >
                      <span>{region.label}</span>
                      <strong>{region.count}</strong>
                    </button>
                  ))}
                </div>
                <div className="cartogram-legend" aria-hidden="true">
                  <span>적음</span>
                  {regionStats.legend.map((color) => (
                    <i key={color} style={{ background: color }} />
                  ))}
                  <span>많음</span>
                </div>

                {stats.length === 0 && (
                  <p className="empty-text">집계할 공식 데이터가 아직 없습니다.</p>
                )}
              </div>

              <aside className="region-detail-card">
                <div>
                  <h4>{regionStats.selected.label}</h4>
                  <span>지역 발생 비율</span>
                </div>
                <div
                  className="region-rate-ring"
                  style={{ "--region-rate": `${regionStats.selected.rate}%` }}
                >
                  <strong>{regionStats.selected.rate}%</strong>
                  <span>전체 대비</span>
                </div>
                <dl className="region-detail-list">
                  <div>
                    <dt>누적 실종자</dt>
                    <dd>{regionStats.selected.count}명</dd>
                  </div>
                  <div>
                    <dt>지역 순위</dt>
                    <dd>{regionStats.selected.rankLabel}</dd>
                  </div>
                  <div>
                    <dt>분석 대상</dt>
                    <dd>{alerts.length}명</dd>
                  </div>
                  <div>
                    <dt>상위 지역</dt>
                    <dd>{topRegion}</dd>
                  </div>
                </dl>
              </aside>
            </div>
          </>
        )}

        {activeSection === "time" && (
          <>
            <div className="year-segmented-control" aria-label="최근 발생 추이 연도 선택">
              {trendYears.map((year) => (
                <button
                  className={selectedTrendYear === year ? "active" : ""}
                  key={year}
                  type="button"
                  onClick={() => setSelectedTrendYear(year)}
                >
                  {year}년
                </button>
              ))}
            </div>

            <div className="status-row wide">
              <Metric label="집계 기간" value={monthlyStats.periodLabel} />
              <Metric label="최다 발생 월" value={monthlyStats.peakLabel} />
              <Metric label="월평균" value={monthlyStats.average} />
            </div>

            <MonthlyTrendChart rows={monthlyStats.rows} max={monthlyStats.max} />
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
                <DonutChart
                  rows={[
                    ["남성", demographicStats.gender.male],
                    ["여성", demographicStats.gender.female],
                    ["미상", demographicStats.gender.unknown],
                  ]}
                  colors={["#2a9d8f", "#e76f51", "#8fa6a0"]}
                />
              </div>

              <div>
                <h4>연령대 분포</h4>
                <DonutChart
                  rows={demographicStats.age.rows}
                  colors={["#2878a8", "#74b566", "#e9b44c", "#d85c3a", "#8fa6a0"]}
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

function getRegionAnalysisStats(stats, alerts, selectedRegionId) {
  const legend = ["#f8dfe3", "#f1b8c0", "#e88997", "#da5b6d", "#c8293f"];
  const normalizedStats = new Map(
    stats.map((item) => [String(item.region || "").trim(), item.count || 0]),
  );
  const total = Math.max(1, alerts.length || stats.reduce((sum, item) => sum + item.count, 0));
  const max = Math.max(1, ...stats.map((item) => item.count || 0));
  const regions = regionAnalysisLayout.map((region) => {
    const count =
      region.names.reduce(
        (found, name) =>
          found || normalizedStats.get(name) || normalizedStats.get(name.replace(/(특별시|광역시|특별자치시|특별자치도|자치도|도)$/u, "")),
        0,
      ) || 0;

    return {
      ...region,
      count,
      rate: Math.round((count / total) * 1000) / 10,
      strength: Math.max(0.15, count / max),
      color: count ? legend[Math.min(4, Math.ceil((count / max) * 5) - 1)] : "#f7ecee",
    };
  });
  const selected = regions.find((region) => region.id === selectedRegionId) || regions[0];
  const rank =
    [...regions]
      .sort((a, b) => b.count - a.count)
      .findIndex((region) => region.id === selected.id) + 1;

  return {
    legend,
    regions,
    selected: {
      ...selected,
      rankLabel: selected.count ? `${rank}위 / ${regions.length}개 지역` : "집계 대기",
    },
  };
}

function DonutChart({ rows, colors }) {
  const total = rows.reduce((sum, [, value]) => sum + value, 0);
  let cursor = 0;
  const segments =
    total > 0
      ? rows
          .map(([, value], index) => {
            const start = cursor;
            const size = (value / total) * 100;
            cursor += size;
            return `${colors[index % colors.length]} ${start}% ${cursor}%`;
          })
          .join(", ")
      : "#e8efec 0% 100%";

  return (
    <div className="donut-chart-card">
      <div
        className="donut-chart"
        style={{ background: `conic-gradient(${segments})` }}
        aria-label="분포 원그래프"
      >
        <div>
          <strong>{total}</strong>
          <span>건</span>
        </div>
      </div>

      <div className="donut-legend">
        {rows.map(([label, value], index) => {
          const percent = total ? Math.round((value / total) * 100) : 0;
          return (
            <div className="donut-legend-row" key={label}>
              <i style={{ background: colors[index % colors.length] }} />
              <span>{label}</span>
              <strong>
                {value}건 · {percent}%
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyTrendChart({ rows, max }) {
  return (
    <div className="monthly-chart" aria-label="월별 실종 관련 문자 추이">
      <div className="monthly-y-axis">
        <span>{max}</span>
        <span>{Math.round(max / 2)}</span>
        <span>0</span>
      </div>
      <div className="monthly-bars">
        {rows.map((row) => (
          <div className="monthly-bar-item" key={row.key}>
            <div className="monthly-bar-track">
              <div
                className="monthly-bar-fill"
                style={{ height: `${max ? (row.count / max) * 100 : 0}%` }}
                title={`${row.label}: ${row.count}건`}
              />
            </div>
            <span>{row.shortLabel}</span>
          </div>
        ))}
      </div>
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

function getMonthlyStats(alerts, selectedYear) {
  const firstMonth = 1;
  const lastMonth = 12;
  const counts = new Map();
  const rows = [];

  for (let month = firstMonth; month <= lastMonth; month += 1) {
    const key = `${selectedYear}-${String(month).padStart(2, "0")}`;
    counts.set(key, 0);
  }

  alerts.forEach((person) => {
    const date = parseMissingDate(person.missingAt);
    if (
      !date ||
      date.getFullYear() !== selectedYear ||
      date.getMonth() + 1 < firstMonth
    ) {
      return;
    }

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  counts.forEach((count, key) => {
    const [year, month] = key.split("-");
    rows.push({
      key,
      count,
      label: `${year}년 ${Number(month)}월`,
      shortLabel: month === "01" ? `${year.slice(2)}.${month}` : month,
    });
  });

  const max = Math.max(1, ...rows.map((row) => row.count));
  const peak = rows.reduce(
    (current, row) => (row.count > current.count ? row : current),
    rows[0] || { label: "-", count: 0 },
  );
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return {
    rows,
    max,
    periodLabel: `${selectedYear}.${String(firstMonth).padStart(2, "0")}~${selectedYear}.12`,
    peakLabel: `${peak.label} ${peak.count}건`,
    average: `${Math.round(total / Math.max(1, rows.length))}건`,
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
    address: "",
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
        onAuthSuccess(data);
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

          {mode === "signup" && (
            <label>
              주소
              <input
                required
                value={form.address}
                onChange={(event) =>
                  setForm({ ...form, address: event.target.value })
                }
                placeholder="예: 대구 북구 대학로 80"
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
  const photoPreviewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : ""),
    [photoFile],
  );

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

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
        <span>보호자 확인과 실종자 식별에 필요한 정보를 정확히 입력해주세요.</span>
      </div>
      <div className="section-heading">
        <h2 id="register-title">실종자 등록</h2>
        <p>입력한 정보는 직접 등록 데이터로 저장됩니다.</p>
      </div>

      <form className="register-form" onSubmit={submit}>
        <div className="register-form-card">
          <fieldset>
            <legend>보호자 정보</legend>
            <div className="register-field-grid two">
              <label>
                등록자 이름
                <input
                  value={form.guardianName}
                  onChange={(event) =>
                    setForm({ ...form, guardianName: event.target.value })
                  }
                  placeholder="예: 홍길동"
                />
              </label>

              <label>
                보호자 연락처
                <input
                  required
                  value={form.guardianPhone}
                  onChange={(event) =>
                    setForm({ ...form, guardianPhone: event.target.value })
                  }
                  placeholder="예: 010-0000-0000"
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>실종자 기본 정보</legend>
            <div className="register-field-grid">
              <label>
                실종자 이름
                <input
                  required
                  value={form.missingName}
                  onChange={(event) =>
                    setForm({ ...form, missingName: event.target.value })
                  }
                  placeholder="이름"
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
                나이
                <input
                  inputMode="numeric"
                  value={form.age}
                  onChange={(event) => setForm({ ...form, age: event.target.value })}
                  placeholder="예: 72"
                />
              </label>

              <label>
                실종 일시
                <input
                  required
                  value={form.missingAt}
                  onChange={(event) => setForm({ ...form, missingAt: event.target.value })}
                  placeholder="예: 2026-06-01 14:30"
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>마지막 확인 정보</legend>
            <div className="register-field-grid">
              <label className="wide-field">
                마지막 목격 위치
                <input
                  required
                  value={form.locationText}
                  onChange={(event) => setForm({ ...form, locationText: event.target.value })}
                  placeholder="예: 대구 북구 산격동 인근"
                />
              </label>

              <label className="wide-field">
                인상착의
                <textarea
                  value={form.clothing}
                  onChange={(event) => setForm({ ...form, clothing: event.target.value })}
                  placeholder="예: 검은 점퍼, 회색 바지, 흰 운동화"
                />
              </label>

              <label className="wide-field">
                신체 특징
                <textarea
                  value={form.features}
                  onChange={(event) => setForm({ ...form, features: event.target.value })}
                  placeholder="예: 왼쪽 팔에 흉터, 안경 착용"
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>신체 정보</legend>
            <div className="register-field-grid three">
              <label>
                키(cm)
                <input
                  inputMode="numeric"
                  value={form.height}
                  onChange={(event) => setForm({ ...form, height: event.target.value })}
                  placeholder="예: 168"
                />
              </label>

              <label>
                몸무게(kg)
                <input
                  inputMode="numeric"
                  value={form.weight}
                  onChange={(event) => setForm({ ...form, weight: event.target.value })}
                  placeholder="예: 62"
                />
              </label>

              <label>
                체형
                <input
                  value={form.bodyType}
                  onChange={(event) => setForm({ ...form, bodyType: event.target.value })}
                  placeholder="예: 보통"
                />
              </label>
            </div>
          </fieldset>
        </div>

        <aside className="register-photo-card">
          <div className="register-photo-preview">
            {photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="등록할 실종자 사진 미리보기" />
            ) : (
              <div>
                <UserRoundPlus size={36} />
                <span>사진 미리보기</span>
              </div>
            )}
          </div>

          <label className="custom-file-button">
            <input
              required
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
            />
            파일 선택
          </label>

          <p className="selected-file-name">
            {photoFile ? photoFile.name : "PNG, JPG, WEBP 파일을 등록할 수 있습니다."}
          </p>

          <button className="primary-button register-submit-button" type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
            실종자 등록
          </button>
        </aside>
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

function PersonDetail({ person, onOpenReport }) {
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

        <button
          className="primary-link report-button"
          type="button"
          onClick={() => onOpenReport?.(person)}
        >
          <Send size={16} />
          제보하기
        </button>
      </div>
    </article>
  );
}

function SightingReportModal({ authToken, person, onClose }) {
  const [form, setForm] = useState({
    sightedAt: "",
    locationText: "",
    content: "",
    contactPhone: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const photoPreviewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : ""),
    [photoFile],
  );

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);

    try {
      const photoDataUrl = photoFile ? await fileToDataUrl(photoFile) : "";
      const data = await fetchAuthJson("/api/sighting-reports", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missingPersonId: person?.id || "",
          missingPersonName: person?.name || "",
          missingAt: person?.missingAt || "",
          sourceType: person?.sourceType || person?.sourceLabel || "",
          lat: person?.lat ?? null,
          lng: person?.lng ?? null,
          ...form,
          photoDataUrl,
        }),
      });

      setMessage(data.message || "제보가 접수되었습니다.");
      setForm({
        sightedAt: "",
        locationText: "",
        content: "",
        contactPhone: "",
      });
      setPhotoFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-modal-backdrop" role="dialog" aria-modal="true">
      <section className="report-modal-card" aria-labelledby="report-modal-title">
        <button
          className="report-modal-close"
          type="button"
          aria-label="제보 창 닫기"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <div className="report-modal-heading">
          <span>실종 제보</span>
          <h2 id="report-modal-title">{person?.name || "대상 미상"} 제보하기</h2>
          <p>목격 위치와 시간을 중심으로 작성하면 검토에 도움이 됩니다.</p>
        </div>

        <form className="report-form" onSubmit={submit}>
          <div className="report-target-box">
            <PersonSummary person={person} />
          </div>

          <div className="report-field-grid">
            <label>
              목격 시간
              <input
                required
                value={form.sightedAt}
                onChange={(event) =>
                  setForm({ ...form, sightedAt: event.target.value })
                }
                placeholder="예: 2026-06-02 14:30"
              />
            </label>

            <label>
              목격 위치
              <input
                required
                value={form.locationText}
                onChange={(event) =>
                  setForm({ ...form, locationText: event.target.value })
                }
                placeholder={`예: ${person?.locationText || "대구 북구 복현오거리 근처"}`}
              />
            </label>
          </div>

          <label>
            제보 내용
            <textarea
              required
              value={form.content}
              onChange={(event) =>
                setForm({ ...form, content: event.target.value })
              }
              placeholder="옷차림, 이동 방향, 동행 여부 등 기억나는 내용을 적어주세요."
            />
          </label>

          <label>
            연락 가능한 번호
            <input
              value={form.contactPhone}
              onChange={(event) =>
                setForm({ ...form, contactPhone: event.target.value })
              }
              placeholder="선택 입력"
            />
          </label>

          <div className="report-photo-row">
            <div className="report-photo-preview">
              {photoPreviewUrl ? (
                <img src={photoPreviewUrl} alt="제보 사진 미리보기" />
              ) : (
                <div>
                  <Camera size={24} />
                  <span>사진 선택</span>
                </div>
              )}
            </div>

            <label className="custom-file-button report-file-button">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  setPhotoFile(event.target.files?.[0] || null)
                }
              />
              사진 첨부
            </label>
          </div>

          {message && (
            <div className="success-box">
              <CheckCircle2 size={18} />
              {message}
            </div>
          )}

          {error && <div className="inline-error">{error}</div>}

          <div className="report-modal-actions">
            <button className="reset-button" type="button" onClick={onClose}>
              닫기
            </button>
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              제보 접수
            </button>
          </div>
        </form>
      </section>
    </div>
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
