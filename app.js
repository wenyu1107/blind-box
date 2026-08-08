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
  const OPENING_MS = 2200;

  const config = window.GIFT_CONFIG || {};
  const rules = config.rules || {};
  const challengeCfg = config.challenge || {};
  const items = Array.isArray(config.items) ? config.items : [];

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
    challengeBackBtn: document.getElementById("challenge-back-btn"),
    resultCard: document.getElementById("result-card"),
    resultType: document.getElementById("result-type"),
    resultTitle: document.getElementById("result-title"),
    resultText: document.getElementById("result-text"),
    history: document.getElementById("history"),
    historyList: document.getElementById("history-list"),
    sparkles: document.getElementById("sparkles"),
  };

  let lastItemId = null;
  let drawing = false;
  let history = loadHistory();
  let unlocked = loadUnlocked();
  let questionQueue = [];
  let questionIndex = 0;
  let answering = false;

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
    if (challengeCfg.requireEveryDraw) return false;
    try {
      return localStorage.getItem(UNLOCK_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function persistUnlocked() {
    if (challengeCfg.requireEveryDraw) return;
    try {
      localStorage.setItem(UNLOCK_KEY, "1");
    } catch (e) {
      console.warn("保存解锁状态失败:", e);
    }
  }

  function challengeEnabled() {
    return Boolean(
      challengeCfg.enabled &&
        Array.isArray(challengeCfg.questions) &&
        challengeCfg.questions.length
    );
  }

  function needsChallenge() {
    return challengeEnabled() && !unlocked;
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
    els.openBtn.classList.toggle("is-locked", locked);
    els.lockHint.hidden = !locked;
    els.lockHint.textContent = locked
      ? "盲盒已上锁，先通过解密考验"
      : "";
    els.ctaBtn.textContent = locked
      ? config.challengeCtaLabel || "开始解密"
      : config.ctaLabel || "拆开盲盒";
  }

  function showPanel(name) {
    const map = {
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

  function renderEvidence(evidence) {
    if (!els.challengeEvidence || !els.evidenceList) return;
    els.evidenceList.innerHTML = "";
    if (!Array.isArray(evidence) || !evidence.length) {
      els.challengeEvidence.hidden = true;
      return;
    }

    const note = document.createElement("p");
    note.className = "evidence-note";

    function syncNote() {
      const opened = els.evidenceList.querySelectorAll(".evidence-item.is-open").length;
      note.textContent =
        "已查阅 " + opened + " / " + evidence.length + "（建议全部看完再作答）";
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
      body.textContent = item.content || "";

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
    renderEvidence(q.evidence);
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
      // 长文题不自动聚焦，避免挡住证物区
      if (!q.story && !(q.evidence && q.evidence.length)) {
        els.challengeInput.focus();
      }
    }
  }

  function startChallenge() {
    const source = challengeCfg.questions.slice();
    questionQueue = challengeCfg.shuffle ? shuffleCopy(source) : source;
    questionIndex = 0;
    showPanel("challenge");
    renderQuestion();
  }

  function completeChallenge() {
    unlocked = true;
    persistUnlocked();
    updateProgress();
    showFeedback(true, challengeCfg.successText || "解密成功！");
    window.setTimeout(function () {
      syncHeroCta();
      showPanel("hero");
    }, 900);
  }

  function advanceOrFinish(explain) {
    showFeedback(true, explain ? "答对了！ " + explain : "答对了！");
    questionIndex += 1;
    updateProgress();

    const wait = explain ? Math.min(2800, 1200 + String(explain).length * 12) : 700;
    window.setTimeout(function () {
      if (questionIndex >= questionQueue.length) {
        completeChallenge();
      } else {
        renderQuestion();
      }
    }, wait);
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
      window.setTimeout(function () {
        btn.classList.remove("is-wrong");
        answering = false;
        clearFeedback();
      }, 900);
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
    advanceOrFinish(q.explain);
    window.setTimeout(function () {
      els.challengeInput.disabled = false;
    }, 800);
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

  function draw() {
    if (drawing) return;

    if (needsChallenge()) {
      startChallenge();
      return;
    }

    const item = pickItem();
    if (!item) {
      alert(config.emptyHint || "奖池是空的。");
      return;
    }

    drawing = true;
    showPanel("opening");

    window.setTimeout(function () {
      lastItemId = item.id;
      renderResult(item);
      pushHistory(item);
      showPanel("result");
      drawing = false;
    }, OPENING_MS);
  }

  function goHome() {
    if (drawing) return;
    syncHeroCta();
    showPanel("hero");
  }

  function onHeroAction() {
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
  }

  function init() {
    if (!challengeEnabled()) {
      unlocked = true;
    }
    applyCopy();
    createSparkles();
    renderHistory();
    bindEvents();
    showPanel("hero");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
