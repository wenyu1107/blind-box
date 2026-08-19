/**
 * 小狗屋共用墙：贴到 Cloudflare Worker 编辑器后 Deploy。
 *
 * 控制台必须完成：
 * 1) KV 绑定变量名：WALL
 * 2) 环境变量 WALL_TOKEN：与网站进门密码相同
 */
function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(request, data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign(
      { "Content-Type": "application/json; charset=utf-8" },
      corsHeaders(request)
    ),
  });
}

function authorized(request, env) {
  const expect = String(env.WALL_TOKEN || "").trim();
  if (!expect) return false;
  const header = String(request.headers.get("Authorization") || "");
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token === expect;
}

function mergeById(left, right, idKey) {
  const map = {};
  [].concat(left || [], right || []).forEach(function (item) {
    if (!item || item[idKey] == null) return;
    const id = String(item[idKey]);
    const prev = map[id];
    if (!prev || Number(item.updatedAt || item.at || 0) >= Number(prev.updatedAt || prev.at || 0)) {
      map[id] = item;
    }
  });
  return Object.keys(map).map(function (key) {
    return map[key];
  });
}

function mergePages(left, right) {
  const out = Object.assign({}, left || {});
  const incoming = right || {};
  Object.keys(incoming).forEach(function (id) {
    const cur = out[id];
    const next = incoming[id];
    if (!cur || Number((next && next.at) || 0) >= Number(cur.at || 0)) {
      out[id] = next;
    }
  });
  return out;
}

function mergeStamps(left, right) {
  const map = {};
  [].concat(left || [], right || []).forEach(function (item) {
    if (!item || !item.d_s) return;
    if (!map[item.d_s] || Number(item.at || 0) > Number(map[item.d_s].at || 0)) {
      map[item.d_s] = item;
    }
  });
  return Object.keys(map)
    .sort()
    .map(function (key) {
      return map[key];
    })
    .slice(-24);
}

function mergeWeek(left, right) {
  if (!right) return left || {};
  if (!left) return right;
  if (Number(right.updatedAt || 0) >= Number(left.updatedAt || 0)) return right;
  return left;
}

function mergeWall(stored, incoming) {
  const base = stored && typeof stored === "object" ? stored : {};
  const next = incoming && typeof incoming === "object" ? incoming : {};
  return {
    notes: next.notes ? mergeById(base.notes, next.notes, "id") : base.notes || [],
    features: next.features ? mergeById(base.features, next.features, "id") : base.features || [],
    pages: next.pages ? mergePages(base.pages, next.pages) : base.pages || {},
    stamps: next.stamps ? mergeStamps(base.stamps, next.stamps) : base.stamps || [],
    week: next.week ? mergeWeek(base.week, next.week) : base.week || {},
    updatedAt: Date.now(),
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (!env.WALL) {
      return json(request, { error: "KV 未绑定，变量名必须是 WALL" }, 500);
    }
    if (!authorized(request, env)) {
      return json(request, { error: "暗号不对" }, 401);
    }

    const storedRaw = await env.WALL.get("state");
    let stored = {};
    try {
      stored = storedRaw ? JSON.parse(storedRaw) : {};
    } catch (e) {
      stored = {};
    }

    if (request.method === "GET") {
      return json(request, stored);
    }
    if (request.method === "PUT") {
      let incoming = {};
      try {
        incoming = await request.json();
      } catch (e) {
        return json(request, { error: "内容不是 JSON" }, 400);
      }
      const merged = mergeWall(stored, incoming);
      await env.WALL.put("state", JSON.stringify(merged));
      return json(request, merged);
    }
    return json(request, { error: "不支持的方法" }, 405);
  },
};
