// -*- coding: utf-8 -*-
/**
 * 小狗屋首页：进门密码、主题与关灯、天气窗、小狗心情、本周小事与周末爪印。
 */
(function () {
  "use strict";

  const ALARM_KEY = "puppy-house-alarms";
  const NOTE_KEY = "puppy-house-notes";
  const THEME_KEY = "puppy-house-theme";
  const LIGHTS_KEY = "puppy-house-lights";
  const FEATURES_KEY = "puppy-house-features";
  const PAGES_KEY = "puppy-house-pages";
  const WEEK_KEY = "puppy-house-week";
  const STAMP_KEY = "puppy-house-stamps";
  const WEATHER_CACHE_KEY = "puppy-house-weather";
  const WEATHER_COORDS_KEY = "puppy-house-coords";
  const GATE_KEY = "love-blind-box-gate";
  const DRAWN_KEY = "love-blind-box-drawn";

  const config = window.GIFT_CONFIG || {};
  const home = config.home || {};
  const gateCfg = config.gate || {};

  const els = {
    gateScreen: document.getElementById("gate-screen"),
    gateForm: document.getElementById("gate-form"),
    gateInput: document.getElementById("gate-input"),
    gateTitle: document.getElementById("gate-title"),
    gateSub: document.getElementById("gate-sub"),
    gateFail: document.getElementById("gate-fail"),
    hubShell: document.getElementById("hub-shell"),
    hubHome: document.getElementById("hub-home"),
    date: document.getElementById("hub-date"),
    title: document.getElementById("hub-title"),
    sub: document.getElementById("hub-sub"),
    hour: document.getElementById("hand-hour"),
    minute: document.getElementById("hand-minute"),
    second: document.getElementById("hand-second"),
    digital: document.getElementById("clock-digital"),
    weekday: document.getElementById("clock-weekday"),
    alarmForm: document.getElementById("alarm-form"),
    alarmTime: document.getElementById("alarm-time"),
    alarmLabel: document.getElementById("alarm-label"),
    alarmList: document.getElementById("alarm-list"),
    noteBoard: document.getElementById("note-board"),
    noteAdd: document.getElementById("note-add"),
    featureGrid: document.getElementById("feature-grid"),
    weekendHint: document.getElementById("weekend-hint"),
    overlay: document.getElementById("alarm-overlay"),
    overlayLabel: document.getElementById("alarm-pop-label"),
    alarmStop: document.getElementById("alarm-stop"),
    themeOpen: document.getElementById("theme-open"),
    themeOverlay: document.getElementById("theme-overlay"),
    themeClose: document.getElementById("theme-close"),
    roomAdd: document.getElementById("room-add"),
    roomForm: document.getElementById("room-form"),
    roomTitle: document.getElementById("room-title"),
    roomDesc: document.getElementById("room-desc"),
    roomCancel: document.getElementById("room-cancel"),
    pageScreen: document.getElementById("page-screen"),
    pageBack: document.getElementById("page-back"),
    pageTitle: document.getElementById("page-title"),
    pageBody: document.getElementById("page-body"),
    pageSave: document.getElementById("page-save"),
    moodDog: document.getElementById("mood-dog"),
    moodText: document.getElementById("mood-text"),
    windowTemp: document.getElementById("window-temp"),
    windowLabel: document.getElementById("window-label"),
    weatherVeil: document.getElementById("weather-veil"),
    weekNote: document.getElementById("week-note"),
    weekRange: document.getElementById("week-range"),
    weekSave: document.getElementById("week-save"),
    stampWall: document.getElementById("stamp-wall"),
    stampHint: document.getElementById("stamp-hint"),
    wallStatus: document.getElementById("wall-status"),
  };

  let alarms = loadJson(ALARM_KEY, []);
  let notes = loadJson(NOTE_KEY, []);
  let features = loadFeatures();
  let pages = loadJson(PAGES_KEY, {});
  let currentTheme = localStorage.getItem(THEME_KEY) || home.defaultTheme || "line";
  let currentLights = localStorage.getItem(LIGHTS_KEY) === "night" ? "night" : "day";
  let currentWeather = "clear";
  let currentPageId = null;
  let ringingId = null;
  let beepTimer = null;
  let wallPushTimer = null;
  let wallPollTimer = null;
  let wallReady = false;

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("保存失败:", e);
    }
  }

  function loadFeatures() {
    const seed = (home.features || []).slice();
    const saved = loadJson(FEATURES_KEY, null);
    if (!Array.isArray(saved) || !saved.length) return seed;
    const savedIds = {};
    saved.forEach(function (item) {
      savedIds[item.id] = true;
    });
    seed.forEach(function (item) {
      if (item.pinned && !savedIds[item.id]) saved.unshift(item);
    });
    return saved;
  }

  function markGatePassed() {
    try {
      sessionStorage.setItem(GATE_KEY, "1");
    } catch (e) {
      // ignore
    }
    if (!gateCfg.remember) return;
    try {
      localStorage.setItem(GATE_KEY, "1");
    } catch (e) {
      // ignore
    }
  }

  function isGateUnlocked() {
    if (!gateCfg.enabled) return true;
    try {
      if (sessionStorage.getItem(GATE_KEY) === "1") return true;
    } catch (e) {
      // ignore
    }
    if (!gateCfg.remember) return false;
    try {
      return localStorage.getItem(GATE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isOpenToday() {
    return typeof window.giftIsNonWorkday === "function"
      ? window.giftIsNonWorkday(new Date())
      : new Date().getDay() === 0 || new Date().getDay() === 6;
  }

  function applyAppearance() {
    document.body.classList.remove("theme-line", "theme-puppy", "theme-night");
    document.body.classList.add("theme-" + (currentTheme === "puppy" ? "puppy" : "line"));
    if (currentLights === "night") document.body.classList.add("theme-night");
    try {
      localStorage.setItem(THEME_KEY, currentTheme);
      localStorage.setItem(LIGHTS_KEY, currentLights);
    } catch (e) {
      console.warn("保存主题失败:", e);
    }
    document.querySelectorAll(".theme-card").forEach(function (card) {
      const name = card.getAttribute("data-theme");
      const on =
        name === "night"
          ? currentLights === "night"
          : name === currentTheme && currentLights !== "night";
      card.classList.toggle("is-on", on);
    });
    if (els.themeOpen) {
      els.themeOpen.textContent = currentLights === "night" ? "开灯" : "更换主题";
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const color =
        currentLights === "night"
          ? "#141a26"
          : currentTheme === "puppy"
            ? "#fff3ee"
            : "#f4efe6";
      meta.setAttribute("content", color);
    }
    renderMood();
  }

  function onThemePick(name) {
    if (name === "night") {
      currentLights = "night";
    } else {
      currentTheme = name === "puppy" ? "puppy" : "line";
      currentLights = "day";
    }
    applyAppearance();
  }

  function hashPick(seed, list) {
    if (!list || !list.length) return "";
    let hash = 0;
    const str = String(seed);
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash * 33 + str.charCodeAt(i)) >>> 0;
    }
    return list[hash % list.length];
  }

  function todayDs() {
    return typeof window.giftFormatDs === "function"
      ? window.giftFormatDs(new Date())
      : String(new Date().getFullYear());
  }

  function renderMood() {
    if (!els.moodText) return;
    const moods = home.moods || {};
    let pool = moods.default || ["今天想被摸摸"];
    if (currentWeather === "rain" && moods.rain && moods.rain.length) {
      pool = moods.rain;
    } else if (currentWeather === "snow" && moods.snow && moods.snow.length) {
      pool = moods.snow;
    } else if (currentLights === "night" && moods.night && moods.night.length) {
      pool = moods.night;
    } else if (isOpenToday() && moods.weekend && moods.weekend.length) {
      pool = moods.weekend;
    }
    els.moodText.textContent = hashPick(
      todayDs() + currentWeather + currentLights,
      pool
    );
  }

  function wagDog() {
    document.body.classList.remove("pup-wag");
    void document.body.offsetWidth;
    document.body.classList.add("pup-wag");
    window.setTimeout(function () {
      document.body.classList.remove("pup-wag");
    }, 1600);
    playBoop();
  }

  function playBoop() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 520;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // ignore
    }
  }

  function weatherKind(code) {
    const n = Number(code);
    if (n === 0) return "clear";
    if (n <= 3) return "cloud";
    if ((n >= 71 && n <= 77) || (n >= 85 && n <= 86)) return "snow";
    if (n >= 51) return "rain";
    if (n >= 45) return "cloud";
    return "cloud";
  }

  function weatherLabel(kind) {
    if (kind === "clear") return "窗外很亮，适合晒肚皮";
    if (kind === "cloud") return "云把天挡住了一点";
    if (kind === "rain") return "在下雨，窗玻璃是凉的";
    if (kind === "snow") return "下雪了，爪子要暖和一点";
    return "看看窗外";
  }

  function applyWeather(kind, temp) {
    currentWeather = kind || "cloud";
    document.body.classList.remove(
      "weather-clear",
      "weather-cloud",
      "weather-rain",
      "weather-snow"
    );
    document.body.classList.add("weather-" + currentWeather);
    if (els.weatherVeil) {
      els.weatherVeil.classList.toggle("is-rain", currentWeather === "rain");
      els.weatherVeil.classList.toggle("is-snow", currentWeather === "snow");
    }
    if (els.windowTemp) {
      els.windowTemp.textContent = Number.isFinite(Number(temp))
        ? Math.round(Number(temp)) + "°"
        : "窗外";
    }
    if (els.windowLabel) els.windowLabel.textContent = weatherLabel(currentWeather);
    renderMood();
  }

  function getCoords(onFound) {
    const saved = loadJson(WEATHER_COORDS_KEY, null);
    if (saved && saved.lat != null && saved.lon != null) {
      onFound(saved.lat, saved.lon);
    }
    if (!navigator.geolocation) {
      if (!saved) onFound(39.9, 116.4);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        saveJson(WEATHER_COORDS_KEY, { lat: lat, lon: lon });
        onFound(lat, lon);
      },
      function () {
        if (!saved) onFound(39.9, 116.4);
      },
      { timeout: 4000, maximumAge: 86400000 }
    );
  }

  function fetchWeather(lat, lon) {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=" +
      lat +
      "&longitude=" +
      lon +
      "&current=weather_code,temperature_2m&timezone=auto";
    fetch(url)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        const current = (data && data.current) || {};
        const kind = weatherKind(current.weather_code);
        saveJson(WEATHER_CACHE_KEY, {
          kind: kind,
          temp: current.temperature_2m,
          at: Date.now(),
        });
        applyWeather(kind, current.temperature_2m);
      })
      .catch(function (err) {
        console.warn("天气获取失败:", err);
        if (els.windowLabel) {
          els.windowLabel.textContent = "天气还没看清，先摸摸小狗吧";
        }
      });
  }

  function loadWeather() {
    const cached = loadJson(WEATHER_CACHE_KEY, null);
    if (cached && Date.now() - Number(cached.at || 0) < 30 * 60 * 1000) {
      applyWeather(cached.kind, cached.temp);
      return;
    }
    getCoords(fetchWeather);
  }

  function mondayOf(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return d;
  }

  function formatMd(date) {
    return date.getMonth() + 1 + "月" + date.getDate() + "日";
  }

  function weekIdOf(monday) {
    return typeof window.giftFormatDs === "function"
      ? window.giftFormatDs(monday)
      : String(monday.getFullYear()) + pad(monday.getMonth() + 1) + pad(monday.getDate());
  }

  function loadWeekNote() {
    const monday = mondayOf(new Date());
    const sunday = new Date(monday.getTime());
    sunday.setDate(sunday.getDate() + 6);
    const id = weekIdOf(monday);
    const saved = loadJson(WEEK_KEY, {});
    if (els.weekRange) {
      els.weekRange.textContent = formatMd(monday) + " — " + formatMd(sunday);
    }
    if (els.weekNote) {
      els.weekNote.value = saved.weekId === id ? saved.text || "" : "";
    }
  }

  function saveWeekNote() {
    if (!els.weekNote) return;
    const monday = mondayOf(new Date());
    saveJson(WEEK_KEY, {
      weekId: weekIdOf(monday),
      text: els.weekNote.value,
      updatedAt: Date.now(),
      at: Date.now(),
    });
    if (els.weekSave) els.weekSave.textContent = "已贴在墙上";
    scheduleWallPush();
  }

  function collectStamps() {
    let stamps = loadJson(STAMP_KEY, []);
    if (!Array.isArray(stamps)) stamps = [];
    try {
      const raw = localStorage.getItem(DRAWN_KEY);
      const drawn = raw ? JSON.parse(raw) : null;
      if (drawn && drawn.d_s) {
        const exists = stamps.some(function (item) {
          return item.d_s === drawn.d_s;
        });
        if (!exists) {
          stamps.push({ d_s: drawn.d_s, at: drawn.at || Date.now() });
          saveJson(STAMP_KEY, stamps);
        }
      }
    } catch (e) {
      console.warn("同步爪印失败:", e);
    }
    return stamps;
  }

  function renderStamps() {
    const stamps = collectStamps().slice(-12);
    if (els.stampHint) {
      els.stampHint.textContent = stamps.length
        ? "已经盖了 " + stamps.length + " 枚。工作日就靠这些等周末。"
        : "墙上还空着。等到周末拆盲盒，就会盖一枚爪印。";
    }
    if (!els.stampWall) return;
    if (!stamps.length) {
      els.stampWall.innerHTML = [0, 1, 2, 3]
        .map(function () {
          return "<svg class=\"stamp-paw is-ghost\" viewBox=\"0 0 64 64\"><use href=\"#paw-stamp\"></use></svg>";
        })
        .join("");
      return;
    }
    els.stampWall.innerHTML = stamps
      .map(function (item) {
        const last = String(item.d_s || "0").slice(-1);
        const rot = (last.charCodeAt(0) % 17) - 8;
        const title =
          String(item.d_s).slice(4, 6) + "月" + String(item.d_s).slice(6, 8) + "日";
        return (
          "<svg class=\"stamp-paw\" title=\"" +
          escapeHtml(title) +
          "\" style=\"transform:rotate(" +
          rot +
          "deg)\" viewBox=\"0 0 64 64\"><use href=\"#paw-stamp\"></use></svg>"
        );
      })
      .join("");
  }

  function tickClock() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const week = ["日", "一", "二", "三", "四", "五", "六"][now.getDay()];
    if (els.hour) {
      els.hour.style.transform = "rotate(" + ((h % 12) * 30 + m * 0.5) + "deg)";
    }
    if (els.minute) {
      els.minute.style.transform = "rotate(" + (m * 6 + s * 0.1) + "deg)";
    }
    if (els.second) {
      els.second.style.transform = "rotate(" + s * 6 + "deg)";
    }
    if (els.digital) {
      els.digital.textContent = pad(h) + ":" + pad(m) + ":" + pad(s);
    }
    if (els.weekday) {
      els.weekday.textContent = "星期" + week;
    }
    if (els.date) {
      els.date.textContent =
        now.getFullYear() + "年" + (now.getMonth() + 1) + "月" + now.getDate() + "日";
    }
    checkAlarms(now);
  }

  function renderAlarms() {
    if (!els.alarmList) return;
    if (!alarms.length) {
      els.alarmList.innerHTML = "<li>还没有闹钟。小狗会等到你定。</li>";
      return;
    }
    els.alarmList.innerHTML = alarms
      .map(function (item) {
        const on = item.enabled !== false;
        return (
          "<li data-id=\"" +
          escapeHtml(item.id) +
          "\"><div><strong>" +
          escapeHtml(item.time) +
          "</strong> " +
          escapeHtml(item.label || "闹钟") +
          "</div><div class=\"alarm-actions\">" +
          "<button class=\"ghost-mini\" data-act=\"toggle\" type=\"button\">" +
          (on ? "开着" : "关掉了") +
          "</button>" +
          "<button class=\"ghost-mini\" data-act=\"del\" type=\"button\">删</button></div></li>"
        );
      })
      .join("");
  }

  function renderNotes() {
    if (!els.noteBoard) return;
    if (!notes.length) {
      notes = [
        { id: "n1", text: "周末再来拆盲盒", updatedAt: Date.now() },
        { id: "n2", text: "给小狗倒一点水", updatedAt: Date.now() },
      ];
      saveJson(NOTE_KEY, notes);
    }
    const shown = visibleNotes();
    els.noteBoard.innerHTML = shown
      .map(function (note) {
        return (
          "<article class=\"sticky\" data-id=\"" +
          escapeHtml(note.id) +
          "\"><textarea maxlength=\"80\">" +
          escapeHtml(note.text || "") +
          "</textarea><button class=\"ghost-mini\" type=\"button\" data-act=\"del-note\">丢掉</button></article>"
        );
      })
      .join("");
  }

  function renderFeatures() {
    const open = isOpenToday();
    if (els.weekendHint) {
      els.weekendHint.textContent = open
        ? "今天休息，盲盒开门。其它房间随时都能进、都能写。"
        : (home.closedHint || "工作日盲盒关门") +
          (typeof window.giftNextOpenHint === "function"
            ? " " + window.giftNextOpenHint(new Date())
            : "") +
          " 其它房间不受影响。";
    }
    if (!els.featureGrid) return;
    els.featureGrid.innerHTML = visibleFeatures()
      .map(function (item) {
        const weekendLocked =
          item.id === "blind-box" && home.weekendOnly !== false && !open;
        const cls =
          "feature-tile" +
          (item.id === "blind-box" ? " is-primary" : "") +
          (weekendLocked ? " is-locked" : "");
        const desc = weekendLocked
          ? home.closedHint || "工作日暂不开放"
          : item.desc || "点开写一点";
        const del =
          item.pinned || item.id === "blind-box"
            ? ""
            : "<button class=\"tile-del\" data-act=\"del-room\" type=\"button\" aria-label=\"删除\">×</button>";
        return (
          "<div class=\"" +
          cls +
          "\" data-id=\"" +
          escapeHtml(item.id) +
          "\" data-locked=\"" +
          (weekendLocked ? "1" : "0") +
          "\"><strong>" +
          escapeHtml(item.title || "房间") +
          "</strong><span>" +
          escapeHtml(desc) +
          "</span>" +
          del +
          "</div>"
        );
      })
      .join("");
  }

  function openPage(id) {
    const item = features.find(function (f) {
      return f.id === id;
    });
    if (!item || item.deleted) return;
    currentPageId = id;
    const page = pages[id] || { title: item.title || "未命名", body: "" };
    els.pageTitle.value = page.title || item.title || "";
    els.pageBody.value = page.body || "";
    els.pageSave.textContent = "会自动保存";
    els.hubHome.hidden = true;
    els.pageScreen.hidden = false;
  }

  function closePage() {
    currentPageId = null;
    els.pageScreen.hidden = true;
    els.hubHome.hidden = false;
  }

  function saveCurrentPage() {
    if (!currentPageId) return;
    pages[currentPageId] = {
      title: els.pageTitle.value.trim() || "未命名房间",
      body: els.pageBody.value,
      at: Date.now(),
    };
    saveJson(PAGES_KEY, pages);
    features = features.map(function (item) {
      if (item.id === currentPageId) {
        item.title = pages[currentPageId].title;
        item.updatedAt = Date.now();
      }
      return item;
    });
    saveJson(FEATURES_KEY, features);
    els.pageSave.textContent = "已保存";
    renderFeatures();
    scheduleWallPush();
  }

  function visibleNotes() {
    return (notes || []).filter(function (note) {
      return note && !note.deleted;
    });
  }

  function visibleFeatures() {
    return (features || []).filter(function (item) {
      return item && !item.deleted;
    });
  }

  function isEditingShared() {
    const el = document.activeElement;
    if (!el) return false;
    if (el.id === "week-note" || el.id === "page-body" || el.id === "page-title") return true;
    return Boolean(el.closest && el.closest("#note-board"));
  }

  function wallSnapshot() {
    return {
      notes: notes,
      features: features,
      pages: pages,
      stamps: loadJson(STAMP_KEY, []),
      week: loadJson(WEEK_KEY, {}),
    };
  }

  function setWallStatus(text) {
    if (!els.wallStatus) return;
    if (!window.PuppyWall || !window.PuppyWall.enabled()) {
      els.wallStatus.hidden = true;
      return;
    }
    els.wallStatus.hidden = !text;
    els.wallStatus.textContent = text || "";
  }

  function applyRemoteWall(state) {
    if (!state || typeof state !== "object") return;
    const editing = isEditingShared();
    if (!editing && Array.isArray(state.notes)) {
      notes = state.notes;
      saveJson(NOTE_KEY, notes);
      renderNotes();
    }
    if (Array.isArray(state.features)) {
      features = state.features;
      const seed = home.features || [];
      seed.forEach(function (item) {
        if (!item.pinned) return;
        const exists = features.some(function (row) {
          return row.id === item.id && !row.deleted;
        });
        if (!exists) features.unshift(item);
      });
      saveJson(FEATURES_KEY, features);
      renderFeatures();
    }
    if (state.pages && typeof state.pages === "object") {
      pages = state.pages;
      saveJson(PAGES_KEY, pages);
      if (currentPageId && !editing) {
        const page = pages[currentPageId] || {};
        els.pageTitle.value = page.title || "";
        els.pageBody.value = page.body || "";
      }
    }
    if (Array.isArray(state.stamps)) {
      saveJson(STAMP_KEY, state.stamps);
      renderStamps();
    }
    if (!editing && state.week && typeof state.week === "object") {
      saveJson(WEEK_KEY, state.week);
      loadWeekNote();
    }
  }

  function scheduleWallPush() {
    if (!window.PuppyWall || !window.PuppyWall.enabled() || !wallReady) return;
    window.clearTimeout(wallPushTimer);
    wallPushTimer = window.setTimeout(function () {
      window.PuppyWall.put(wallSnapshot())
        .then(function (merged) {
          applyRemoteWall(merged);
          setWallStatus("两个人同一面墙，已同步");
        })
        .catch(function (err) {
          console.warn("上传共用墙失败:", err);
          setWallStatus("先记在这台设备上，云端稍后再试");
        });
    }, 800);
  }

  function startWallSync() {
    if (!window.PuppyWall || !window.PuppyWall.enabled()) {
      setWallStatus("");
      return;
    }
    setWallStatus("正在对齐共用墙…");
    window.PuppyWall.pull()
      .then(function (state) {
        applyRemoteWall(state);
        wallReady = true;
        return window.PuppyWall.put(wallSnapshot());
      })
      .then(function (merged) {
        applyRemoteWall(merged);
        setWallStatus("两个人同一面墙，已同步");
      })
      .catch(function (err) {
        console.warn("拉取共用墙失败:", err);
        wallReady = true;
        setWallStatus("云端暂时连不上，先用这台设备");
      });
    if (wallPollTimer) window.clearInterval(wallPollTimer);
    wallPollTimer = window.setInterval(function () {
      if (!window.PuppyWall.enabled() || isEditingShared()) return;
      window.PuppyWall.pull()
        .then(function (state) {
          applyRemoteWall(state);
          setWallStatus("两个人同一面墙，已同步");
        })
        .catch(function (err) {
          console.warn("刷新共用墙失败:", err);
        });
    }, 15000);
  }

  function enterHub() {
    els.gateScreen.hidden = true;
    els.hubShell.hidden = false;
    applyAppearance();
    loadWeather();
    renderStamps();
    startWallSync();
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // ignore
    }
  }

  function startRing(alarm) {
    ringingId = alarm.id;
    if (els.overlayLabel) {
      els.overlayLabel.textContent = (alarm.label || "闹钟") + "  " + alarm.time;
    }
    if (els.overlay) els.overlay.hidden = false;
    playBeep();
    beepTimer = window.setInterval(playBeep, 900);
    if (window.Notification && Notification.permission === "granted") {
      try {
        new Notification(alarm.label || "小狗屋闹钟", { body: alarm.time });
      } catch (e) {
        // ignore
      }
    }
  }

  function stopRing() {
    ringingId = null;
    if (beepTimer) {
      window.clearInterval(beepTimer);
      beepTimer = null;
    }
    if (els.overlay) els.overlay.hidden = true;
  }

  function checkAlarms(now) {
    if (ringingId) return;
    const hm = pad(now.getHours()) + ":" + pad(now.getMinutes());
    const sec = now.getSeconds();
    if (sec > 1) return;
    const dayKey =
      typeof window.giftFormatDs === "function"
        ? window.giftFormatDs(now)
        : String(now.getFullYear());
    alarms.forEach(function (item) {
      if (item.enabled === false) return;
      if (item.time === hm && item.lastFired !== hm + "-" + dayKey) {
        item.lastFired = hm + "-" + dayKey;
        saveJson(ALARM_KEY, alarms);
        startRing(item);
      }
    });
  }

  function bindGateAndTheme() {
    if (els.gateForm) {
      els.gateForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const expect = String(gateCfg.password || "").trim();
        const input = String(els.gateInput.value || "").trim();
        if (!gateCfg.enabled || input === expect) {
          if (window.PuppyWall) window.PuppyWall.rememberToken(input || expect);
          markGatePassed();
          enterHub();
          return;
        }
        els.gateFail.hidden = false;
        els.gateInput.value = "";
        els.gateInput.focus();
      });
    }

    if (els.themeOpen) {
      els.themeOpen.addEventListener("click", function () {
        if (currentLights === "night") {
          currentLights = "day";
          applyAppearance();
          return;
        }
        els.themeOverlay.hidden = false;
      });
    }
    if (els.themeClose) {
      els.themeClose.addEventListener("click", function () {
        els.themeOverlay.hidden = true;
      });
    }
    if (els.themeOverlay) {
      els.themeOverlay.addEventListener("click", function (event) {
        const card = event.target.closest(".theme-card");
        if (card) onThemePick(card.getAttribute("data-theme"));
        if (event.target === els.themeOverlay) els.themeOverlay.hidden = true;
      });
    }
    if (els.moodDog) els.moodDog.addEventListener("click", wagDog);
    if (els.weekNote) els.weekNote.addEventListener("input", saveWeekNote);
  }

  function bindRoomsAndPages() {
    if (els.roomAdd) {
      els.roomAdd.addEventListener("click", function () {
        els.roomForm.hidden = false;
        els.roomTitle.focus();
      });
    }
    if (els.roomCancel) {
      els.roomCancel.addEventListener("click", function () {
        els.roomForm.hidden = true;
      });
    }
    if (els.roomForm) {
      els.roomForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const title = els.roomTitle.value.trim();
        if (!title) return;
        if (visibleFeatures().length >= 6) {
          if (!window.confirm("门口有点挤了，4到6个房间刚刚好。还要再加吗？")) return;
        }
        const id = "room-" + Date.now();
        features.push({
          id: id,
          title: title,
          desc: els.roomDesc.value.trim() || "点开写一点",
          type: "page",
          weekendOnly: false,
          updatedAt: Date.now(),
        });
        pages[id] = { title: title, body: "", at: Date.now() };
        saveJson(FEATURES_KEY, features);
        saveJson(PAGES_KEY, pages);
        els.roomTitle.value = "";
        els.roomDesc.value = "";
        els.roomForm.hidden = true;
        renderFeatures();
        scheduleWallPush();
      });
    }

    if (els.featureGrid) {
      els.featureGrid.addEventListener("click", function (event) {
        const del = event.target.closest("[data-act='del-room']");
        const tile = event.target.closest(".feature-tile");
        if (del && tile) {
          event.stopPropagation();
          const id = tile.getAttribute("data-id");
          if (!window.confirm("把这个房间从门口拿走？里面写过的字也会一起清掉。")) return;
          const now = Date.now();
          features = features.map(function (item) {
            if (item.id === id) {
              item.deleted = true;
              item.updatedAt = now;
            }
            return item;
          });
          if (pages[id]) {
            pages[id].deleted = true;
            pages[id].at = now;
          }
          saveJson(FEATURES_KEY, features);
          saveJson(PAGES_KEY, pages);
          renderFeatures();
          scheduleWallPush();
          return;
        }
        if (!tile) return;
        const id = tile.getAttribute("data-id");
        const item = features.find(function (f) {
          return f.id === id;
        });
        if (!item) return;
        if (tile.getAttribute("data-locked") === "1") {
          window.alert(home.closedHint || "工作日盲盒不开门");
          return;
        }
        if (item.type === "link" || item.id === "blind-box") {
          window.location.href = item.href || "./box.html";
          return;
        }
        openPage(id);
      });
    }

    if (els.pageBack) els.pageBack.addEventListener("click", closePage);
    if (els.pageTitle) els.pageTitle.addEventListener("input", saveCurrentPage);
    if (els.pageBody) els.pageBody.addEventListener("input", saveCurrentPage);
  }

  function bindWidgets() {
    if (els.alarmForm) {
      els.alarmForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const time = els.alarmTime.value;
        if (!time) return;
        alarms.push({
          id: "a" + Date.now(),
          time: time,
          label: (els.alarmLabel.value || "闹钟").trim(),
          enabled: true,
        });
        els.alarmLabel.value = "";
        saveJson(ALARM_KEY, alarms);
        renderAlarms();
        if (window.Notification && Notification.permission === "default") {
          Notification.requestPermission();
        }
      });
    }

    if (els.alarmList) {
      els.alarmList.addEventListener("click", function (event) {
        const btn = event.target.closest("button");
        const row = event.target.closest("li");
        if (!btn || !row) return;
        const id = row.getAttribute("data-id");
        const act = btn.getAttribute("data-act");
        if (act === "del") {
          alarms = alarms.filter(function (item) {
            return item.id !== id;
          });
        }
        if (act === "toggle") {
          alarms = alarms.map(function (item) {
            if (item.id === id) item.enabled = item.enabled === false;
            return item;
          });
        }
        saveJson(ALARM_KEY, alarms);
        renderAlarms();
      });
    }

    if (els.noteAdd) {
      els.noteAdd.addEventListener("click", function () {
        notes.unshift({ id: "n" + Date.now(), text: "", updatedAt: Date.now() });
        saveJson(NOTE_KEY, notes);
        renderNotes();
        scheduleWallPush();
      });
    }

    if (els.noteBoard) {
      els.noteBoard.addEventListener("input", function (event) {
        const area = event.target;
        if (area.tagName !== "TEXTAREA") return;
        const id = area.closest(".sticky").getAttribute("data-id");
        notes = notes.map(function (note) {
          if (note.id === id) {
            note.text = area.value;
            note.updatedAt = Date.now();
          }
          return note;
        });
        saveJson(NOTE_KEY, notes);
        scheduleWallPush();
      });
      els.noteBoard.addEventListener("click", function (event) {
        const btn = event.target.closest("[data-act='del-note']");
        if (!btn) return;
        const id = btn.closest(".sticky").getAttribute("data-id");
        notes = notes.map(function (note) {
          if (note.id === id) {
            note.deleted = true;
            note.updatedAt = Date.now();
          }
          return note;
        });
        saveJson(NOTE_KEY, notes);
        renderNotes();
        scheduleWallPush();
      });
    }

    if (els.alarmStop) els.alarmStop.addEventListener("click", stopRing);
  }

  function bindEvents() {
    bindGateAndTheme();
    bindRoomsAndPages();
    bindWidgets();
  }

  function init() {
    if (els.title && home.title) els.title.textContent = home.title;
    if (els.sub && home.subtitle) els.sub.textContent = home.subtitle;
    if (els.gateTitle && gateCfg.title) els.gateTitle.textContent = gateCfg.title;
    if (els.gateSub && gateCfg.subtitle) els.gateSub.textContent = gateCfg.subtitle;
    document.title = home.title || "小狗屋";
    applyAppearance();
    renderAlarms();
    renderNotes();
    renderFeatures();
    loadWeekNote();
    renderStamps();
    bindEvents();
    tickClock();
    window.setInterval(tickClock, 1000);

    if (isGateUnlocked()) {
      enterHub();
    } else if (els.gateInput) {
      els.gateInput.focus();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
