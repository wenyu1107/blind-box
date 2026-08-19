// -*- coding: utf-8 -*-
/**
 * 盲盒内容配置：文案、解密题、奖池与抽取概率都在这里改。
 *
 * weight：相对权重，越大越容易抽到。
 * 实际概率 ≈ 该项 weight / 所有可抽项 weight 之和
 * 例：weight 30 与 weight 10，前者大约是后者的 3 倍概率。
 */
window.GIFT_CONFIG = {
  // 页面文案
  brand: "周末盲盒",
  nickname: "亲爱的",
  headline: "今天的惊喜，拆开才知道",
  subtitle: "把本周的烦恼交给盲盒，周末一起享受惊喜吧",
  ctaLabel: "拆开盲盒",
  challengeCtaLabel: "开始解密",
  againLabel: "再抽一次",
  drawnLabel: "查看今日结果",
  drawnHint: "今天已经抽过啦，结果不会变哦～",
  emptyHint: "奖池空了，去 data.js 里再加一点心意吧。",

  /**
   * 小狗屋首页
   * - weekendOnly: 周末盲盒是否仅非工作日可进（周六日 + extraOpenDates）
   * - extraOpenDates: 额外开放日，格式 YYYYMMDD（节假日）
   * - extraClosedDates: 额外关闭日（调休上班）
   * - features: 入口列表，后续加功能只要追加一项
   */
  home: {
    title: "小狗屋",
    subtitle: "一间会呼吸的小屋。摸摸小狗，看看窗外。",
    weekendOnly: true,
    extraOpenDates: [],
    extraClosedDates: [],
    debugForceOpen: false,
    closedHint: "工作日小狗在看家，盲盒周末才开门～",
    defaultTheme: "line",
    moods: {
      default: [
        "今天想被摸摸",
        "今天想晒太阳",
        "今天想挨着你坐",
        "今天想吃一点点零食",
        "今天想被叫一声乖狗",
        "今天想把头放在你腿上",
      ],
      rain: [
        "下雨了，想挨着你睡",
        "窗玻璃是凉的，爪子想暖一暖",
        "雨声正好，不想出门",
      ],
      snow: [
        "下雪了，想穿一件小衣服",
        "想把鼻子贴在玻璃上看雪",
      ],
      weekend: [
        "周末到了，尾巴停不下来",
        "今天可以拆盲盒，好期待",
        "想围着门口转圈圈",
      ],
      night: [
        "灯关了，想被抱一会儿",
        "夜里很安静，想听你说话",
        "月亮来了，小狗要守门",
      ],
    },
    features: [
      {
        id: "blind-box",
        title: "周末盲盒",
        desc: "拆一拆今天的惊喜",
        type: "link",
        href: "./box.html",
        weekendOnly: true,
        pinned: true,
      },
      {
        id: "wish-board",
        title: "心愿板",
        desc: "想做的事写在这里",
        type: "page",
        weekendOnly: false,
      },
      {
        id: "photo-wall",
        title: "小日记",
        desc: "随便写一点今天的事",
        type: "page",
        weekendOnly: false,
      },
    ],
    /**
     * 两人同一面墙（Cloudflare Worker）
     * 把 url 换成你的 Worker 地址后，便签/小事/爪印/房间会云端共用。
     * 例：https://puppy-wall.你的用户名.workers.dev
     */
    wall: {
      enabled: true,
      url: "",
    },
  },

  /**
   * 开场密码（最先出现）
   * 改 password 即可；enabled: false 可关掉
   */
  gate: {
    enabled: true,
    password: "19981005",
    title: "先输入密码",
    subtitle: "输入正确才能进入小狗屋～",
    placeholder: "请输入密码",
    submitLabel: "进入",
    failText: "暗号不对，再试试～",
    // true：本机记住已通过，刷新不用再输；正式惊喜可改 false
    remember: false,
  },

  // 抽取规则
  rules: {
    // 最多可抽次数（配合 drawScope）
    maxDraws: 1,
    // day = 当天只能抽一次，刷新也是同一结果；forever = 永久只能抽一次
    drawScope: "day",
    // 是否避免与上一次结果相同
    avoidConsecutiveRepeat: true,
    // 本地记录最近几条（0 表示不展示历史）
    historyLimit: 0,
  },

  /**
   * 开箱前解密关卡（题目来自 cases.json）
   *
   * 【怎么选案件】
   * 1) 手动指定（推荐发给她之前改好）：
   *    casePick: "id"
   *    caseId: "case-007"          // 改成你想要的案件编号
   *
   * 2) 打开页面时人工下拉选择：
   *    casePick: "manual"
   *
   * 3) 每次随机一案：
   *    casePick: "random"
   *
   * 4) 多案串联：
   *    casePick: "list"
   *    caseIds: ["case-001", "case-012"]
   *
   * forceChallenge: true 时忽略本机「已解锁」缓存，强制先答题
   * （调试用；正式给她玩可改回 false）
   */
  challenge: {
    enabled: true,
    requireEveryDraw: false,
    forceChallenge: false,
    shuffle: false,
    introTitle: "开箱前的档案题",
    introText:
      "破获这一桩案子才能打开盲盒。证物只提供事实，不会直接告诉你谁是答案——请全部查阅后交叉核对。",
    successText: "解密成功！盲盒已经解锁～",
    failText: "还差一点。试试把几份证物的时间线叠在一起看～",
    nextLabel: "下一题",
    finishLabel: "解锁盲盒",

    caseSource: "./cases.json",
    casePick: "id",
    caseId: "case-001",
    // casePick: "manual",
    // casePick: "random",
    // casePick: "list",
    // caseIds: ["case-001", "case-007"],

    // 一般保持 []，让程序从 cases.json 读取
    questions: [],
  },

  // 奖池：type = reward | punish | sweet；weight = 相对抽取权重
  items: [
    {
      id: "r1",
      type: "reward",
      weight:999,
      title: "礼物卡",
      text: "阿婆全集 - 84套限量典藏版",
    },
    {
      id: "r2",
      type: "reward",
      weight: 14,
      title: "请客卡",
      text: "中午或晚上想吃什么，我请——你点什么我都买单。",
    },
    {
      id: "r3",
      type: "reward",
      weight: 12,
      title: "看视频",
      text: "一起看你想看的视频，零食我准备。",
    },
    {
      id: "r4",
      type: "reward",
      weight: 12,
      title: "赖床特权",
      text: "周末可以多睡一小时，早餐送到床边。",
    },
    {
      id: "r5",
      type: "reward",
      weight: 12,
      title: "夸夸时刻",
      text: "听我认真夸你三分钟，不许打断。",
    },
    {
      id: "p3",
      type: "punish",
      weight: 12,
      title: "清唱一曲",
      text: "当场唱一首歌给你听",
    },
    {
      id: "s1",
      type: "sweet",
      weight: 12,
      title: "走走停停",
      text: "一起散步 30 分钟，路上只聊开心的事。",
    },
    {
      id: "s2",
      type: "sweet",
      weight: 12,
      title: "今日复盘",
      text: "认真听你讲今天发生的事，中途不做任何事情。",
    },
    {
      id: "s3",
      type: "sweet",
      weight: 14,
      title: "拥抱券",
      text: "现在就抱一会儿，直到你说可以松手。",
    },
    {
      id: "s4",
      type: "sweet",
      weight: 12,
      title: "玩游戏",
      text: "陪我玩一会游戏吧。",
    },
    {
      id: "s5",
      type: "sweet",
      weight: 4,
      title: "说走就走",
      text: "马上去你想去的地方旅行——目的地你定，行程我来安排。",
    },
  ],
};

/**
 * 是否为可开盲盒的非工作日：周六日，或 extraOpenDates；调休日 extraClosedDates 会关掉。
 */
window.giftIsNonWorkday = function (date) {
  const home = (window.GIFT_CONFIG && window.GIFT_CONFIG.home) || {};
  if (home.debugForceOpen) return true;
  const now = date instanceof Date ? date : new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const dS = String(y) + m + d;
  const closed = home.extraClosedDates || [];
  const opened = home.extraOpenDates || [];
  if (closed.indexOf(dS) !== -1) return false;
  if (opened.indexOf(dS) !== -1) return true;
  const day = now.getDay();
  return day === 0 || day === 6;
};

window.giftFormatDs = function (date) {
  const now = date instanceof Date ? date : new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return String(y) + m + d;
};

window.giftNextOpenHint = function (date) {
  const now = date instanceof Date ? new Date(date.getTime()) : new Date();
  for (let i = 0; i < 14; i += 1) {
    if (window.giftIsNonWorkday(now)) {
      if (i === 0) return "今天可以拆";
      const m = now.getMonth() + 1;
      const d = now.getDate();
      const w = ["日", "一", "二", "三", "四", "五", "六"][now.getDay()];
      return "下次开门：" + m + "月" + d + "日 周" + w;
    }
    now.setDate(now.getDate() + 1);
  }
  return "周末再来找小狗";
};
