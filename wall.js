// -*- coding: utf-8 -*-
/**
 * 小狗屋云端墙：同步到 CloudBase 云函数 / Cloudflare Worker（同一套 GET/PUT + Bearer）。
 */
(function (global) {
  "use strict";

  const TOKEN_KEY = "puppy-house-wall-token";

  function wallCfg() {
    const home = (global.GIFT_CONFIG && global.GIFT_CONFIG.home) || {};
    return home.wall || {};
  }

  function gatePassword() {
    const gate = (global.GIFT_CONFIG && global.GIFT_CONFIG.gate) || {};
    return String(gate.password || "").trim();
  }

  function enabled() {
    const cfg = wallCfg();
    return Boolean(cfg.enabled !== false && String(cfg.url || "").trim());
  }

  function endpoint() {
    return String(wallCfg().url || "").trim().replace(/\/+$/, "");
  }

  function rememberToken(token) {
    const value = String(token || "").trim();
    if (!value) return;
    try {
      sessionStorage.setItem(TOKEN_KEY, value);
    } catch (e) {
      // ignore
    }
  }

  function token() {
    try {
      const saved = sessionStorage.getItem(TOKEN_KEY);
      if (saved) return saved;
    } catch (e) {
      // ignore
    }
    return gatePassword();
  }

  function request(method, body) {
    if (!enabled()) {
      return Promise.reject(new Error("云端墙未配置"));
    }
    const cfg = wallCfg();
    const timeoutMs = Number(cfg.timeoutMs) > 0 ? Number(cfg.timeoutMs) : 8000;
    const headers = {
      Authorization: "Bearer " + token(),
    };
    const opts = { method: method, headers: headers };
    if (body) {
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    let timer = null;
    if (controller) {
      opts.signal = controller.signal;
      timer = window.setTimeout(function () {
        controller.abort();
      }, timeoutMs);
    }
    return fetch(endpoint(), opts)
      .then(function (res) {
        return res.text().then(function (text) {
          let data = {};
          if (text) {
            try {
              data = JSON.parse(text);
            } catch (e) {
              data = { error: "返回不是 JSON" };
            }
          }
          if (!res.ok) {
            throw new Error((data && data.error) || "同步失败");
          }
          return data;
        });
      })
      .finally(function () {
        if (timer) window.clearTimeout(timer);
      });
  }

  function pull() {
    return request("GET");
  }

  function put(snapshot) {
    return request("PUT", snapshot || {});
  }

  global.PuppyWall = {
    enabled: enabled,
    rememberToken: rememberToken,
    pull: pull,
    put: put,
  };
})(window);
