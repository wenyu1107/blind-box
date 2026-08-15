// -*- coding: utf-8 -*-
/**
 * 恋爱盲盒交互：解密解锁、开箱动画、加权抽签与历史记录。
 */
(function () {
  "use strict";

  const TYPE_LABEL = {
    reward: "奖励",
    punish: "惩罚",
    sweet: "甜蜜",
  };

  const KIND_LABEL = {
    detective: "侦探题",
    turtle: "海龟汤",
  };

  const STORAGE_KEY = "love-blind-box-history";
  const UNLOCK_KEY = "love-blind-box-unlocked";
  const DRAWN_KEY = "love-blind-box-drawn";
  const GATE_KEY = "love-blind-box-gate";
  const OPENING_MS = 2200;

  const config = window.GIFT_CONFIG || {};
  const rules = config.rules || {};
  const challengeCfg = config.challenge || {};
  const gateCfg = config.gate || {};
  const items = Array.isArray(config.items) ? config.items : [];

  let caseLibrary = null;
  let casesLoadError = null;
  let activeCaseId = challengeCfg.caseId || null;
  let gatePassed = false;

  const els = {
    brand: document.getElementById("brand"),
    nickname: document.getElementById("nickname"),
    headline: document.getElementById("headline"),
    subtitle: document.getElementById("subtitle"),
    ctaBtn: document.getElementById("cta-btn"),
    openBtn: document.getElementById("open-btn"),
    againBtn: document.getElementById("again-btn"),
    homeBtn: document.getElementById("home-btn"),
    lockHint: document.getElementById("lock-hint"),
    casePicker: document.getElementById("case-picker"),
    caseSelect: document.getElementById("case-select"),
    panelGate: document.getElementById("panel-gate"),
    gateBrand: document.getElementById("gate-brand"),
    gateTitle: document.getElementById("gate-title"),
    gateSubtitle: document.getElementById("gate-subtitle"),
    gateForm: document.getElementById("gate-form"),
    gateInput: document.getElementById("gate-input"),
    gateSubmit: document.getElementById("gate-submit"),
    gateFeedback: document.getElementById("gate-feedback"),
    panelHero: document.getElementById("panel-hero"),
    panelChallenge: document.getElementById("panel-challenge"),
    panelOpening: document.getElementById("panel-opening"),
    panelResult: document.getElementById("panel-result"),
    challengeKicker: document.getElementById("challenge-kicker"),
    challengeIntro: document.getElementById("challenge-intro"),
    challengeProgress: document.getElementById("challenge-progress"),
    challengeKind: document.getElementById("challenge-kind"),
    challengeStep: document.getElementById("challenge-step"),
    challengeTitle: document.getElementById("challenge-title"),
    challengeStory: document.getElementById("challenge-story"),
    challengeEvidence: document.getElementById("challenge-evidence"),
    evidenceList: document.getElementById("evidence-list"),
    challengePrompt: document.getElementById("challenge-prompt"),
    challengeChoices: document.getElementById("challenge-choices"),
    challengeForm: document.getElementById("challenge-form"),
    challengeInput: document.getElementById("challenge-input"),
    challengeHintBtn: document.getElementById("challenge-hint-btn"),
    challengeHint: document.getElementById("challenge-hint"),
    challengeFeedback: document.getElementById("challenge-feedback"),
    challengeNextBtn: document.getElementById("challenge-next-btn"),
    challengeBackBtn: document.getElementById("challenge-back-btn"),
    resultCard: document.getElementById("result-card"),
    resultType: document.getElementById("result-type"),
    resultTitle: document.getElementById("result-title"),
    resultText: document.getElementById("result-text"),
    drawnNote: document.getElementById("drawn-note"),
    history: document.getElementById("history"),
    historyList: document.getElementById("history-list"),
    sparkles: document.getElementById("sparkles"),
  };

  let lastItemId = null;
  let drawing = false;
  let history = loadHistory();
  let unlocked = false;
  let drawnRecord = loadDrawnRecord();
  let questionQueue = [];
  let questionIndex = 0;
  let answering = false;
  let awaitingNext = false;

  function unlockStorageKey() {
    const id = activeCaseId || challengeCfg.caseId || challengeCfg.casePick || "default";
    return UNLOCK_KEY + ":" + id;
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("读取历史失败:", e);
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn("保存历史失败:", e);
    }
  }

  function loadUnlocked() {
    if (!challengeCfg.enabled) return true;
    if (challengeCfg.forceChallenge) return false;
    if (challengeCfg.requireEveryDraw) return false;
    try {
      return localStorage.getItem(unlockStorageKey()) === "1";
    } catch (e) {
      return false;
    }
  }

  function persistUnlocked() {
    if (challengeCfg.requireEveryDraw) return;
    try {
      localStorage.setItem(unlockStorageKey(), "1");
      // 清理旧版全局解锁标记，避免以后误跳过题目
      localStorage.removeItem(UNLOCK_KEY);
    } catch (e) {
      console.warn("保存解锁状态失败:", e);
    }
  }

  function maxDraws() {
    const n = Number(rules.maxDraws);
    if (!Number.isFinite(n) || n <= 0) return Infinity;
    return n;
  }

  function todayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return String(y) + m + d;
  }

  function drawScope() {
    return rules.drawScope === "forever" ? "forever" : "day";
  }

  function loadDrawnRecord() {
    try {
      const raw = localStorage.getItem(DRAWN_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      // day 模式：只认「今天」的结果；跨天视为未抽，可再抽一次
      if (drawScope() === "day") {
        if (parsed.d_s !== todayKey()) return null;
      }
      return parsed;
    } catch (e) {
      console.warn("读取抽奖记录失败:", e);
      return null;
    }
  }

  function persistDrawnRecord(item) {
    drawnRecord = {
      id: item.id,
      type: item.type,
      title: item.title,
      text: item.text,
      d_s: todayKey(),
      at: Date.now(),
    };
    try {
      localStorage.setItem(DRAWN_KEY, JSON.stringify(drawnRecord));
    } catch (e) {
      console.warn("保存抽奖记录失败:", e);
    }
  }

  function hasDrawn() {
    // 重新按当天规则读一次，避免跨天仍占着旧结果
    drawnRecord = loadDrawnRecord();
    return Boolean(drawnRecord);
  }

  function canDrawMore() {
    if (drawing) return false;
    if (!hasDrawn()) return true;
    const limit = maxDraws();
    if (!Number.isFinite(limit)) return true;
    // 当天 / 永久：已有有效抽奖记录则不能再抽
    if (limit <= 1) return false;
    return history.length < limit;
  }

  function setDrawButtonsDisabled(disabled) {
    if (els.ctaBtn) els.ctaBtn.disabled = Boolean(disabled);
    if (els.openBtn) els.openBtn.disabled = Boolean(disabled);
    if (els.againBtn) els.againBtn.disabled = Boolean(disabled);
  }

  function challengeEnabled() {
    if (!challengeCfg.enabled) return false;
    if (Array.isArray(challengeCfg.questions) && challengeCfg.questions.length) {
      return true;
    }
    return Boolean(
      challengeCfg.caseSource ||
        challengeCfg.caseId ||
        challengeCfg.casePick === "random" ||
        challengeCfg.casePick === "manual" ||
        (Array.isArray(challengeCfg.caseIds) && challengeCfg.caseIds.length)
    );
  }

  function questionsReady() {
    return Array.isArray(challengeCfg.questions) && challengeCfg.questions.length > 0;
  }

  function needsChallenge() {
    if (!challengeEnabled()) return false;
    if (casesLoadError) return true;
    if (!questionsReady() && challengeCfg.caseSource) return true;
    return !unlocked;
  }

  function normalizeCase(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      id: raw.id,
      kind: raw.kind || "detective",
      mode: raw.mode || (raw.choices ? "choice" : "text"),
      requireDeepAll: raw.requireDeepAll !== false,
      title: raw.title,
      story: raw.story,
      evidence: raw.evidence || [],
      prompt: raw.prompt,
      placeholder: raw.placeholder,
      hint: raw.hint,
      answers: raw.answers || [],
      explain: raw.explain,
      choices: raw.choices,
      correctIndex: raw.correctIndex,
    };
  }

  function libraryList(library) {
    if (Array.isArray(library)) return library;
    if (library && Array.isArray(library.cases)) return library.cases;
    return [];
  }

  function selectCasesFromLibrary(library) {
    const list = libraryList(library);
    if (!list.length) return [];

    const pick = challengeCfg.casePick || "id";
    if (pick === "random") {
      const one = list[Math.floor(Math.random() * list.length)];
      activeCaseId = one && one.id;
      return [normalizeCase(one)].filter(Boolean);
    }
    if (pick === "manual") {
      const selectedId =
        (els.caseSelect && els.caseSelect.value) ||
        activeCaseId ||
        challengeCfg.caseId ||
        (list[0] && list[0].id);
      const found = list.find(function (c) {
        return c.id === selectedId;
      }) || list[0];
      activeCaseId = found && found.id;
      return [normalizeCase(found)].filter(Boolean);
    }
    if (pick === "list" && Array.isArray(challengeCfg.caseIds)) {
      const selected = challengeCfg.caseIds
        .map(function (id) {
          return list.find(function (c) {
            return c.id === id;
          });
        })
        .map(normalizeCase)
        .filter(Boolean);
      activeCaseId = selected[0] && selected[0].id;
      return selected;
    }

    const id = challengeCfg.caseId || "case-001";
    const found =
      list.find(function (c) {
        return c.id === id;
      }) || list[0];
    activeCaseId = found && found.id;
    return [normalizeCase(found)].filter(Boolean);
  }

  function fillCaseSelect(list) {
    if (!els.caseSelect || !els.casePicker) return;
    const manual = challengeCfg.casePick === "manual";
    els.casePicker.hidden = !manual;
    if (!manual) return;

    els.caseSelect.innerHTML = "";
    list.forEach(function (c) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.id + " · " + (c.title || "未命名案件");
      els.caseSelect.appendChild(opt);
    });
    const prefer = challengeCfg.caseId || activeCaseId || (list[0] && list[0].id);
    if (prefer) els.caseSelect.value = prefer;
    activeCaseId = els.caseSelect.value;
  }

  function loadCaseLibrary() {
    if (caseLibrary) {
      return Promise.resolve(caseLibrary);
    }
    const src = challengeCfg.caseSource || "./cases.json";
    return fetch(src)
      .then(function (res) {
        if (!res.ok) {
          throw new Error("案件库加载失败: HTTP " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        caseLibrary = data;
        casesLoadError = null;
        fillCaseSelect(libraryList(data));
        return data;
      });
  }

  function ensureQuestions() {
    if (
      Array.isArray(challengeCfg.questions) &&
      challengeCfg.questions.length &&
      challengeCfg.casePick !== "manual" &&
      challengeCfg.casePick !== "random"
    ) {
      activeCaseId = challengeCfg.questions[0].id || activeCaseId;
      return Promise.resolve(challengeCfg.questions);
    }

    return loadCaseLibrary()
      .then(function (data) {
        const selected = selectCasesFromLibrary(data);
        if (!selected.length) {
          throw new Error("案件库为空，或 caseId 无效（请检查 data.js）");
        }
        challengeCfg.questions = selected;
        unlocked = loadUnlocked();
        return selected;
      })
      .catch(function (err) {
        casesLoadError = err;
        throw err;
      });
  }

  function applyCopy() {
    if (config.brand) {
      els.brand.textContent = config.brand;
      document.title = config.brand;
    }
    if (config.nickname) els.nickname.textContent = config.nickname;
    if (config.headline) els.headline.textContent = config.headline;
    if (config.subtitle) els.subtitle.textContent = config.subtitle;
    if (config.againLabel) els.againBtn.textContent = config.againLabel;
    if (challengeCfg.introTitle) {
      els.challengeKicker.textContent = challengeCfg.introTitle;
    }
    if (challengeCfg.introText) {
      els.challengeIntro.textContent = challengeCfg.introText;
    }
    syncHeroCta();
  }

  function syncHeroCta() {
    const locked = needsChallenge();
    const finished = hasDrawn() && !canDrawMore();
    els.lockHint.classList.remove("is-error");

    els.openBtn.classList.toggle("is-locked", (locked || Boolean(casesLoadError)) && !finished);

    if (casesLoadError) {
      els.lockHint.hidden = false;
      els.lockHint.classList.add("is-error");
      els.lockHint.textContent =
        "案件库加载失败。请用本地服务器或 GitHub Pages 打开（不要直接双击 HTML）。";
      els.ctaBtn.textContent = "重试加载案件";
      setDrawButtonsDisabled(false);
      return;
    }

    if (finished) {
      els.lockHint.hidden = false;
      els.lockHint.textContent =
        config.drawnHint ||
        (drawScope() === "day"
          ? "今天已经抽过啦，结果不会变哦～"
          : "这份惊喜只能拆一次哦～");
      els.ctaBtn.textContent = config.drawnLabel || "查看今日结果";
      setDrawButtonsDisabled(false);
      return;
    }

    els.lockHint.hidden = !locked;
    els.lockHint.textContent = locked
      ? "盲盒已上锁，先通过解密考验" +
        (activeCaseId && challengeCfg.casePick !== "manual"
          ? "（" + activeCaseId + "）"
          : "")
      : "";
    els.ctaBtn.textContent = locked
      ? config.challengeCtaLabel || "开始解密"
      : config.ctaLabel || "拆开盲盒";
    setDrawButtonsDisabled(drawing);
  }

  function syncResultActions() {
    // 当天/永久限一次：不显示「再抽一次」
    const showAgain = false;

    if (els.againBtn) {
      els.againBtn.hidden = !showAgain;
      if (config.againLabel) els.againBtn.textContent = config.againLabel;
    }
    if (els.drawnNote) {
      els.drawnNote.hidden = !hasDrawn();
      els.drawnNote.textContent =
        config.drawnHint ||
        (drawScope() === "day"
          ? "今天已经抽过啦，结果不会变哦～"
          : "这份惊喜只能拆一次哦，好好收下吧～");
    }
  }

  function showPanel(name) {
    const map = {
      gate: els.panelGate,
      hero: els.panelHero,
      challenge: els.panelChallenge,
      opening: els.panelOpening,
      result: els.panelResult,
    };
    Object.keys(map).forEach(function (key) {
      const panel = map[key];
      if (!panel) return;
      const active = key === name;
      panel.hidden = !active;
      if (active) {
        panel.dataset.active = "true";
        panel.style.animation = "none";
        void panel.offsetWidth;
        panel.style.animation = "";
      } else {
        delete panel.dataset.active;
      }
    });
  }

  function gateEnabled() {
    return Boolean(gateCfg.enabled && String(gateCfg.password || "").length);
  }

  function loadGatePassed() {
    if (!gateEnabled()) return true;
    if (!gateCfg.remember) return false;
    try {
      return localStorage.getItem(GATE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function persistGatePassed() {
    if (!gateCfg.remember) return;
    try {
      localStorage.setItem(GATE_KEY, "1");
    } catch (e) {
      console.warn("保存密码状态失败:", e);
    }
  }

  function applyGateCopy() {
    if (!els.panelGate) return;
    if (config.brand && els.gateBrand) els.gateBrand.textContent = config.brand;
    if (gateCfg.title && els.gateTitle) els.gateTitle.textContent = gateCfg.title;
    if (gateCfg.subtitle && els.gateSubtitle) {
      els.gateSubtitle.textContent = gateCfg.subtitle;
    }
    if (gateCfg.placeholder && els.gateInput) {
      els.gateInput.placeholder = gateCfg.placeholder;
    }
    if (gateCfg.submitLabel && els.gateSubmit) {
      els.gateSubmit.textContent = gateCfg.submitLabel;
    }
  }

  function enterAfterGate() {
    gatePassed = true;
    persistGatePassed();
    syncHeroCta();
    if (hasDrawn() && !canDrawMore() && !needsChallenge()) {
      showDrawnResult();
    } else {
      showPanel("hero");
    }
  }

  function onGateSubmit(event) {
    event.preventDefault();
    if (!gateEnabled()) {
      enterAfterGate();
      return;
    }
    const input = String((els.gateInput && els.gateInput.value) || "").trim();
    const expect = String(gateCfg.password || "").trim();
    if (input === expect) {
      if (els.gateFeedback) {
        els.gateFeedback.hidden = true;
      }
      enterAfterGate();
      return;
    }
    if (els.gateFeedback) {
      els.gateFeedback.hidden = false;
      els.gateFeedback.textContent = gateCfg.failText || "密码不对";
    }
    if (els.gateInput) {
      els.gateInput.value = "";
      els.gateInput.focus();
    }
  }

  function goHome() {
    if (drawing) return;
    if (gateEnabled() && !gatePassed) {
      showPanel("gate");
      return;
    }
    syncHeroCta();
    showPanel("hero");
  }

  function itemWeight(item) {
    const w = Number(item.weight);
    if (!Number.isFinite(w) || w <= 0) return 1;
    return w;
  }

  function pickItem() {
    if (!items.length) return null;

    let pool = items.slice();
    if (rules.avoidConsecutiveRepeat && lastItemId && pool.length > 1) {
      pool = pool.filter(function (item) {
        return item.id !== lastItemId;
      });
    }

    const total = pool.reduce(function (sum, item) {
      return sum + itemWeight(item);
    }, 0);
    if (total <= 0) return pool[0] || null;

    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i += 1) {
      roll -= itemWeight(pool[i]);
      if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function renderResult(item) {
    const type = item.type || "sweet";
    els.resultCard.dataset.type = type;
    els.resultType.textContent = TYPE_LABEL[type] || "惊喜";
    els.resultTitle.textContent = item.title || "惊喜卡";
    els.resultText.textContent = item.text || "";
  }

  function pushHistory(item) {
    const limit = Number(rules.historyLimit);
    if (!limit || limit <= 0) {
      els.history.hidden = true;
      return;
    }

    history.unshift({
      id: item.id,
      type: item.type,
      title: item.title,
      text: item.text,
      at: Date.now(),
    });
    history = history.slice(0, limit);
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    const limit = Number(rules.historyLimit);
    if (!limit || limit <= 0 || !history.length) {
      els.history.hidden = true;
      els.historyList.innerHTML = "";
      return;
    }

    els.history.hidden = false;
    els.historyList.innerHTML = history
      .map(function (entry) {
        const label = TYPE_LABEL[entry.type] || "惊喜";
        const title = escapeHtml(entry.title || "");
        return (
          "<li><strong>" +
          escapeHtml(label) +
          "</strong>" +
          title +
          "</li>"
        );
      })
      .join("");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeAnswer(str) {
    return String(str || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[，。！？、,.!?;；:："'“”‘’（）()【】\[\]《》<>]/g, "");
  }

  function matchTextAnswer(userInput, accepted) {
    const user = normalizeAnswer(userInput);
    if (!user) return false;
    return (accepted || []).some(function (ans) {
      const key = normalizeAnswer(ans);
      if (!key) return false;
      return user === key || user.indexOf(key) !== -1 || key.indexOf(user) !== -1;
    });
  }

  function shuffleCopy(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function updateProgress() {
    const total = questionQueue.length || 1;
    const done = questionIndex;
    const pct = Math.round((done / total) * 100);
    els.challengeProgress.innerHTML = "<span style=\"width:" + pct + "%\"></span>";
  }

  function clearFeedback() {
    els.challengeFeedback.hidden = true;
    els.challengeFeedback.textContent = "";
    els.challengeFeedback.classList.remove("is-ok", "is-bad");
    hideNextButton();
  }

  function hideNextButton() {
    awaitingNext = false;
    if (!els.challengeNextBtn) return;
    els.challengeNextBtn.hidden = true;
  }

  function showNextButton(isLast) {
    if (!els.challengeNextBtn) return;
    awaitingNext = true;
    els.challengeNextBtn.hidden = false;
    els.challengeNextBtn.textContent = isLast
      ? challengeCfg.finishLabel || "解锁盲盒"
      : challengeCfg.nextLabel || "下一题";
    els.challengeNextBtn.focus();
  }

  function showFeedback(ok, text) {
    els.challengeFeedback.hidden = false;
    els.challengeFeedback.textContent = text;
    els.challengeFeedback.classList.toggle("is-ok", ok);
    els.challengeFeedback.classList.toggle("is-bad", !ok);
  }

  function currentQuestion() {
    return questionQueue[questionIndex] || null;
  }

  function renderStory(story) {
    if (!els.challengeStory) return;
    if (!story) {
      els.challengeStory.hidden = true;
      els.challengeStory.innerHTML = "";
      return;
    }
    const parts = String(story)
      .split(/\n\s*\n/)
      .map(function (p) {
        return p.trim();
      })
      .filter(Boolean);
    els.challengeStory.innerHTML = parts
      .map(function (p) {
        return "<p>" + escapeHtml(p).replace(/\n/g, "<br />") + "</p>";
      })
      .join("");
    els.challengeStory.hidden = false;
  }

  function setSubmitEnabled(enabled) {
    if (!els.challengeForm) return;
    if (els.challengeInput) els.challengeInput.disabled = !enabled;
    const submitBtn = els.challengeForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = !enabled;
  }

  function renderEvidence(evidence, options) {
    if (!els.challengeEvidence || !els.evidenceList) return;
    els.evidenceList.innerHTML = "";
    if (!Array.isArray(evidence) || !evidence.length) {
      els.challengeEvidence.hidden = true;
      return;
    }

    const requireDeepAll = Boolean(options && options.requireDeepAll);
    const note = document.createElement("p");
    note.className = "evidence-note";

    function deepCount() {
      return els.evidenceList.querySelectorAll(".evidence-item.is-deep").length;
    }

    function syncNote() {
      const opened = els.evidenceList.querySelectorAll(".evidence-item.is-open").length;
      const deep = deepCount();
      if (requireDeepAll) {
        const ready = deep >= evidence.length;
        note.classList.toggle("is-ready", ready);
        note.textContent = ready
          ? "深入检视已完成，可以作答了"
          : "初看 " +
            opened +
            " / " +
            evidence.length +
            "，深入检视 " +
            deep +
            " / " +
            evidence.length +
            "（需全部深入后才能提交）";
        setSubmitEnabled(ready);
      } else {
        note.textContent =
          "已查阅 " + opened + " / " + evidence.length + "（建议全部看完再作答）";
      }
    }

    evidence.forEach(function (item, idx) {
      const wrap = document.createElement("div");
      wrap.className = "evidence-item";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "evidence-toggle";
      toggle.textContent = item.label || "证物 " + (idx + 1);

      const body = document.createElement("div");
      body.className = "evidence-body";

      const hasLayers = Boolean(item.surface || item.deep);
      if (hasLayers) {
        const surfaceLabel = document.createElement("p");
        surfaceLabel.className = "evidence-layer-label";
        surfaceLabel.textContent = "初看";

        const surface = document.createElement("p");
        surface.className = "evidence-surface";
        surface.textContent = item.surface || item.content || "";

        const deepWrap = document.createElement("div");
        deepWrap.className = "evidence-deep";

        const deepBtn = document.createElement("button");
        deepBtn.type = "button";
        deepBtn.className = "evidence-deep-btn";
        deepBtn.textContent = "深入检视";

        const deepLabel = document.createElement("p");
        deepLabel.className = "evidence-layer-label";
        deepLabel.textContent = "深入检视";
        deepLabel.hidden = true;

        const deepText = document.createElement("p");
        deepText.className = "evidence-deep-text";
        deepText.textContent = item.deep || "";
        deepText.hidden = true;

        deepBtn.addEventListener("click", function (event) {
          event.stopPropagation();
          wrap.classList.add("is-deep");
          deepBtn.disabled = true;
          deepLabel.hidden = false;
          deepText.hidden = false;
          syncNote();
        });

        deepWrap.appendChild(deepBtn);
        deepWrap.appendChild(deepLabel);
        deepWrap.appendChild(deepText);

        body.appendChild(surfaceLabel);
        body.appendChild(surface);
        body.appendChild(deepWrap);
      } else {
        const plain = document.createElement("p");
        plain.className = "evidence-surface";
        plain.textContent = item.content || "";
        body.appendChild(plain);
        // 无分层证物：展开即视为已深入
        wrap.classList.add("is-deep");
      }

      toggle.addEventListener("click", function () {
        wrap.classList.toggle("is-open");
        syncNote();
      });

      wrap.appendChild(toggle);
      wrap.appendChild(body);
      els.evidenceList.appendChild(wrap);
    });

    els.evidenceList.appendChild(note);
    syncNote();
    els.challengeEvidence.hidden = false;
  }

  function renderQuestion() {
    const q = currentQuestion();
    if (!q) return;

    answering = false;
    clearFeedback();
    els.challengeHint.hidden = true;
    els.challengeHint.textContent = q.hint || "";
    els.challengeHintBtn.hidden = !q.hint;
    els.challengeHintBtn.disabled = false;

    const kind = q.kind || "detective";
    els.challengeKind.textContent = KIND_LABEL[kind] || "谜题";
    els.challengeKind.dataset.kind = kind;
    els.challengeStep.textContent =
      questionIndex + 1 + " / " + questionQueue.length;
    els.challengeTitle.textContent = q.title || "谜题";
    renderStory(q.story);
    renderEvidence(q.evidence, { requireDeepAll: q.requireDeepAll });
    els.challengePrompt.textContent = q.prompt || "";
    els.challengePrompt.classList.toggle(
      "is-final",
      Boolean(q.story || (q.evidence && q.evidence.length))
    );
    updateProgress();

    const mode = q.mode || (q.choices ? "choice" : "text");
    if (mode === "choice" && Array.isArray(q.choices)) {
      els.challengeForm.hidden = true;
      els.challengeChoices.hidden = false;
      els.challengeChoices.innerHTML = "";
      q.choices.forEach(function (label, idx) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice-btn";
        btn.textContent = label;
        btn.addEventListener("click", function () {
          onChoice(idx, btn);
        });
        els.challengeChoices.appendChild(btn);
      });
    } else {
      els.challengeChoices.hidden = true;
      els.challengeChoices.innerHTML = "";
      els.challengeForm.hidden = false;
      els.challengeInput.value = "";
      els.challengeInput.placeholder = q.placeholder || "写下你的推理…";
      // 需要深入检视时，由 renderEvidence 控制是否可提交
      if (!q.requireDeepAll) {
        setSubmitEnabled(true);
      }
      if (!q.story && !(q.evidence && q.evidence.length)) {
        els.challengeInput.focus();
      }
    }
  }

  function startChallenge() {
    // manual / random：每次开题重新从案件库选取
    if (challengeCfg.casePick === "manual" || challengeCfg.casePick === "random") {
      challengeCfg.questions = [];
    }

    ensureQuestions()
      .then(function (questions) {
        unlocked = loadUnlocked();
        if (unlocked && !challengeCfg.forceChallenge) {
          syncHeroCta();
          showPanel("hero");
          return;
        }
        const source = questions.slice();
        questionQueue = challengeCfg.shuffle ? shuffleCopy(source) : source;
        questionIndex = 0;
        showPanel("challenge");
        renderQuestion();
      })
      .catch(function (err) {
        console.warn(err);
        syncHeroCta();
        alert(
          "案件库加载失败。请用本地服务器或 GitHub Pages 打开页面（不要直接双击 HTML）。\n" +
            String(err && err.message ? err.message : err)
        );
      });
  }

  function completeChallenge() {
    unlocked = true;
    persistUnlocked();
    updateProgress();
    syncHeroCta();
    showPanel("hero");
  }

  function advanceOrFinish(explain) {
    const isLast = questionIndex >= questionQueue.length - 1;
    const detail = explain ? "答对了！ " + explain : "答对了！";
    showFeedback(true, detail);
    showNextButton(isLast);
  }

  function onNextQuestion() {
    if (!awaitingNext) return;
    hideNextButton();
    questionIndex += 1;
    updateProgress();

    // 只有手动点击后才进入下一题 / 解锁；全程无自动跳转计时
    if (questionIndex >= questionQueue.length) {
      completeChallenge();
      return;
    }
    renderQuestion();
  }

  function onChoice(index, btn) {
    if (answering) return;
    const q = currentQuestion();
    if (!q) return;
    answering = true;

    const ok = Number(index) === Number(q.correctIndex);
    if (!ok) {
      btn.classList.add("is-wrong");
      showFeedback(false, challengeCfg.failText || "还差一点，再想想～");
      // 答错不自动跳题；短暂去掉高亮后允许重选
      window.setTimeout(function () {
        btn.classList.remove("is-wrong");
        answering = false;
      }, 600);
      return;
    }

    btn.classList.add("is-correct");
    Array.prototype.forEach.call(
      els.challengeChoices.querySelectorAll(".choice-btn"),
      function (el) {
        el.disabled = true;
      }
    );
    advanceOrFinish(q.explain);
  }

  function onTextSubmit(event) {
    event.preventDefault();
    if (answering) return;
    const q = currentQuestion();
    if (!q) return;

    const value = els.challengeInput.value;
    const ok = matchTextAnswer(value, q.answers || []);
    if (!ok) {
      showFeedback(false, challengeCfg.failText || "还差一点，再想想～");
      return;
    }

    answering = true;
    els.challengeInput.disabled = true;
    if (els.challengeForm) {
      const submitBtn = els.challengeForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
    }
    advanceOrFinish(q.explain);
  }

  function onHint() {
    const q = currentQuestion();
    if (!q || !q.hint) return;
    els.challengeHint.hidden = false;
    els.challengeHint.textContent = q.hint;
  }

  function createSparkles() {
    if (!els.sparkles) return;
    const count = 18;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const dot = document.createElement("span");
      dot.style.left = Math.random() * 100 + "%";
      dot.style.top = Math.random() * 100 + "%";
      dot.style.animationDelay = (Math.random() * 4).toFixed(2) + "s";
      dot.style.animationDuration = (3.2 + Math.random() * 2.8).toFixed(2) + "s";
      frag.appendChild(dot);
    }
    els.sparkles.appendChild(frag);
  }

  function showDrawnResult() {
    if (!drawnRecord) return;
    renderResult(drawnRecord);
    syncResultActions();
    showPanel("result");
  }

  function draw() {
    // 动画进行中 / 今天已抽过：禁止再次抽签
    if (drawing) return;

    if (!canDrawMore()) {
      showDrawnResult();
      return;
    }

    if (needsChallenge()) {
      startChallenge();
      return;
    }

    const item = pickItem();
    if (!item) {
      alert(config.emptyHint || "奖池是空的。");
      return;
    }

    // 先落盘再播动画：连点也只会是同一条结果
    drawing = true;
    setDrawButtonsDisabled(true);
    lastItemId = item.id;
    persistDrawnRecord(item);
    pushHistory(item);
    syncResultActions();
    syncHeroCta();
    showPanel("opening");

    window.setTimeout(function () {
      renderResult(item);
      showPanel("result");
      drawing = false;
      setDrawButtonsDisabled(false);
      syncHeroCta();
    }, OPENING_MS);
  }

  function onHeroAction() {
    if (!gatePassed && gateEnabled()) {
      showPanel("gate");
      return;
    }
    if (casesLoadError) {
      casesLoadError = null;
      caseLibrary = null;
      ensureQuestions()
        .then(function () {
          unlocked = loadUnlocked();
          syncHeroCta();
        })
        .catch(function (err) {
          console.warn(err);
          syncHeroCta();
        });
      return;
    }

    if (hasDrawn() && !canDrawMore()) {
      showDrawnResult();
      return;
    }
    if (needsChallenge()) {
      startChallenge();
      return;
    }
    draw();
  }

  function bindEvents() {
    els.ctaBtn.addEventListener("click", onHeroAction);
    els.openBtn.addEventListener("click", onHeroAction);
    els.againBtn.addEventListener("click", function () {
      if (!canDrawMore()) {
        showDrawnResult();
        return;
      }
      // maxDraws=1 时按钮本身已隐藏；这里再挡一层
      if (Number.isFinite(maxDraws()) && maxDraws() <= 1) {
        showDrawnResult();
        return;
      }
      if (challengeCfg.requireEveryDraw) {
        unlocked = false;
        syncHeroCta();
      }
      draw();
    });
    els.homeBtn.addEventListener("click", goHome);
    els.challengeBackBtn.addEventListener("click", goHome);
    els.challengeForm.addEventListener("submit", onTextSubmit);
    els.challengeHintBtn.addEventListener("click", onHint);
    if (els.challengeNextBtn) {
      els.challengeNextBtn.addEventListener("click", onNextQuestion);
    }
    if (els.gateForm) {
      els.gateForm.addEventListener("submit", onGateSubmit);
    }
    if (els.caseSelect) {
      els.caseSelect.addEventListener("change", function () {
        activeCaseId = els.caseSelect.value;
        challengeCfg.questions = [];
        unlocked = loadUnlocked();
        syncHeroCta();
      });
    }
  }

  function init() {
    applyCopy();
    applyGateCopy();
    createSparkles();
    renderHistory();
    syncResultActions();
    bindEvents();

    gatePassed = loadGatePassed();

    const boot = challengeEnabled()
      ? ensureQuestions().catch(function (err) {
          console.warn("预加载案件库失败:", err);
          casesLoadError = err;
          return [];
        })
      : Promise.resolve([]);

    boot.then(function () {
      if (!challengeEnabled()) {
        unlocked = true;
      } else {
        unlocked = loadUnlocked();
      }
      syncHeroCta();

      if (gateEnabled() && !gatePassed) {
        showPanel("gate");
        if (els.gateInput) els.gateInput.focus();
        return;
      }

      if (hasDrawn() && !canDrawMore() && !needsChallenge()) {
        showDrawnResult();
      } else {
        showPanel("hero");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
