/**
 * 小狗屋共用墙 - CloudBase 云函数
 * 函数名建议：wall
 *
 * 控制台还要做：
 * 1) 环境变量 WALL_TOKEN = 网站进门密码（现在是 qwyz）
 * 2) HTTP 访问服务：关联本函数，路径 /wall，鉴权关
 * 3) 数据库已有集合 wall（函数会读写 _id=shared）
 */
const cloud = require("@cloudbase/node-sdk");

const DOC_ID = "shared";
const COLLECTION = "wall";

function headerMap(headers) {
  const out = {};
  const src = headers || {};
  Object.keys(src).forEach(function (key) {
    out[String(key).toLowerCase()] = src[key];
  });
  return out;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function respond(origin, data, statusCode) {
  return {
    isBase64Encoded: false,
    statusCode: statusCode || 200,
    headers: corsHeaders(origin),
    body: JSON.stringify(data),
  };
}

function authorized(headers, tokenExpect) {
  const expect = String(tokenExpect || "").trim();
  if (!expect) return false;
  const raw = String(headers.authorization || "");
  const token = raw.replace(/^Bearer\s+/i, "").trim();
  return token === expect;
}

function parseBody(event) {
  if (!event || event.body == null || event.body === "") return {};
  let text = event.body;
  if (event.isBase64Encoded) {
    text = Buffer.from(text, "base64").toString("utf8");
  }
  if (typeof text === "object") return text;
  return JSON.parse(String(text));
}

function mergeById(left, right, idKey) {
  const map = {};
  [].concat(left || [], right || []).forEach(function (item) {
    if (!item || item[idKey] == null) return;
    const id = String(item[idKey]);
    const prev = map[id];
    if (
      !prev ||
      Number(item.updatedAt || item.at || 0) >= Number(prev.updatedAt || prev.at || 0)
    ) {
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
    features: next.features
      ? mergeById(base.features, next.features, "id")
      : base.features || [],
    pages: next.pages ? mergePages(base.pages, next.pages) : base.pages || {},
    stamps: next.stamps ? mergeStamps(base.stamps, next.stamps) : base.stamps || [],
    week: next.week ? mergeWeek(base.week, next.week) : base.week || {},
    updatedAt: Date.now(),
  };
}

function stripMeta(doc) {
  if (!doc || typeof doc !== "object") return {};
  const out = Object.assign({}, doc);
  delete out._id;
  delete out._openid;
  return out;
}

exports.main = async function (event, context) {
  const headers = headerMap(event && event.headers);
  const origin = headers.origin || "*";
  const method = String(
    (event && (event.httpMethod || event.requestContext && event.requestContext.httpMethod)) ||
      "GET"
  ).toUpperCase();

  if (method === "OPTIONS") {
    return {
      isBase64Encoded: false,
      statusCode: 204,
      headers: corsHeaders(origin),
      body: "",
    };
  }

  const tokenExpect = process.env.WALL_TOKEN || "";
  if (!authorized(headers, tokenExpect)) {
    return respond(origin, { error: "暗号不对" }, 401);
  }

  const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
  const db = app.database();
  const col = db.collection(COLLECTION);

  let stored = {};
  try {
    const got = await col.doc(DOC_ID).get();
    const data = got && got.data;
    if (Array.isArray(data) && data[0]) stored = stripMeta(data[0]);
    else if (data && typeof data === "object" && !Array.isArray(data)) {
      stored = stripMeta(data);
    }
  } catch (e) {
    stored = {};
  }

  if (method === "GET") {
    return respond(origin, stored, 200);
  }

  if (method === "PUT") {
    let incoming = {};
    try {
      incoming = parseBody(event);
    } catch (e) {
      return respond(origin, { error: "内容不是 JSON" }, 400);
    }
    const merged = mergeWall(stored, incoming);
    try {
      await col.doc(DOC_ID).set(merged);
    } catch (e) {
      try {
        await col.add(Object.assign({ _id: DOC_ID }, merged));
      } catch (err) {
        return respond(origin, { error: "写入失败: " + String(err && err.message || err) }, 500);
      }
    }
    return respond(origin, merged, 200);
  }

  return respond(origin, { error: "不支持的方法" }, 405);
};
