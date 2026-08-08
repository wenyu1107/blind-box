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
  drawnLabel: "查看我的结果",
  drawnHint: "这份惊喜只能拆一次哦，好好收下吧～",
  emptyHint: "奖池空了，去 data.js 里再加一点心意吧。",

  // 抽取规则
  rules: {
    // 最多可抽次数（1 = 只能抽一次）
    maxDraws: 1,
    // 是否避免与上一次结果相同
    avoidConsecutiveRepeat: true,
    // 本地记录最近几条（0 表示不展示历史）
    historyLimit: 5,
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
    forceChallenge: true,
    shuffle: false,
    introTitle: "开箱前的档案题",
    introText:
      "破获这一桩案子才能打开盲盒。证物要先「初看」，再「深入检视」——第一眼常常有误导。",
    successText: "解密成功！盲盒已经解锁～",
    failText: "还差一点。试着把「初看」和「深入检视」对照着看～",
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
      weight: 5,
      title: "愿望卡",
      text: "一个小愿望，无条件答应（合理范围内～）",
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
      title: "电影之夜",
      text: "一起看你想看的电影，零食我准备。",
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
      id: "p1",
      type: "punish",
      weight: 6,
      title: "土味情话",
      text: "现场对我说一句土味情话，说完不许笑，说不清就重来。",
    },
    {
      id: "p2",
      type: "punish",
      weight: 12,
      title: "专属称呼",
      text: "接下来一小时，叫我一个我指定的称呼（不许害羞跳过）。",
    },
    {
      id: "p3",
      type: "punish",
      weight: 12,
      title: "清唱一曲",
      text: "当场唱一首歌给你听",
    },
    {
      id: "p4",
      type: "punish",
      weight: 12,
      title: "听令卡",
      text: "接下来 30 分钟，合理范围内我说什么你做什么。",
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
      text: "认真听你讲今天发生的事，中途不看手机。",
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
