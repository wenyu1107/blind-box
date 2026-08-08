// -*- coding: utf-8 -*-
/**
 * 恋爱盲盒内容配置：文案、解密题、奖池与抽取概率都在这里改。
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
  emptyHint: "奖池空了，去 data.js 里再加一点心意吧。",

  // 抽取规则
  rules: {
    // 是否避免与上一次结果相同
    avoidConsecutiveRepeat: true,
    // 本地记录最近几条（0 表示不展示历史）
    historyLimit: 5,
  },

  /**
   * 开箱前解密关卡
   * - enabled: 是否启用
   * - requireEveryDraw: true=每次抽都要答题；false=答对一次后本机记住，可直接开箱
   * - shuffle: 是否打乱题目顺序
   * - questions: 题目列表（需全部答对才解锁）
   *
   * 题型 mode:
   * - choice: 选择题，填 choices + correctIndex（从 0 开始）
   * - text: 填空题，填 answers（任一匹配即可；忽略大小写、空格与标点）
   *
   * kind 仅作展示标签：detective=侦探题，turtle=海龟汤
   */
  challenge: {
    enabled: true,
    requireEveryDraw: false,
    shuffle: false,
    introTitle: "开箱前的小考验",
    introText: "五道题全部答对，盲盒才会为你打开。提示可以点，但答案要自己想哦。",
    successText: "解密成功！盲盒已经解锁～",
    failText: "还差一点，再想想～",
    questions: [
      {
        id: "q1",
        kind: "detective",
        mode: "choice",
        title: "案发现场",
        prompt:
          "房间里只开着一盏台灯。他推门进去，发现地上有一滩水、几根碎冰，还有一条死掉的金鱼。凶手最可能是谁？",
        hint: "想想「什么东西融化后会变成水」。",
        choices: ["猫", "小偷", "空调", "邻居"],
        correctIndex: 0,
        explain: "猫打翻了鱼缸，金鱼死了；冰块是用来镇鱼的，融化后变成一滩水。",
      },
      {
        id: "q2",
        kind: "detective",
        mode: "choice",
        title: "电梯谜案",
        prompt:
          "有个男人住在 10 楼。晴天他坐电梯到 1 楼出门；雨天他坐电梯到 10 楼回家。为什么？",
        hint: "注意他的身高，和「雨天多了什么」。",
        choices: ["他恐高", "他撑伞才能按到 10", "电梯坏了", "他雨天不上班"],
        correctIndex: 1,
        explain: "他个子矮，晴天只能按到低楼层按钮，走楼梯回家；雨天有伞，可以捅到 10 楼按钮。",
      },
      {
        id: "q3",
        kind: "detective",
        mode: "choice",
        title: "沙漠足迹",
        prompt:
          "沙漠里发现一具男子尸体，身边只有一个未打开的包裹。包裹里最可能是什么？",
        hint: "他本来可以活下来，却没打开包裹。",
        choices: ["水", "地图", "降落伞", "手机"],
        correctIndex: 2,
        explain: "他是跳伞的人，包裹里是没打开的降落伞。",
      },
      {
        id: "q4",
        kind: "detective",
        mode: "choice",
        title: "停电夜",
        prompt:
          "夜里突然停电，屋里一片漆黑。她却准确无误地从抽屉里拿出黑色袜子，而不是白色袜子。为什么？",
        hint: "她「看见」了吗？还是其实根本不需要看见？",
        choices: ["她有夜视仪", "她靠记忆摸的", "其实只有黑袜子", "她开了手电筒"],
        correctIndex: 2,
        explain: "抽屉里本来就全是黑袜子，随便拿都是黑色的。",
      },
      {
        id: "q5",
        kind: "detective",
        mode: "text",
        title: "封存档案·失踪的钥匙",
        story:
          "周六 20:45，你刷卡回家，准备开启今晚的惊喜盲盒。\n\n抽屉没有被撬过，却已半开——原本封在信封里、用来启动盲盒的「银色钥匙」不见了。茶几上散落着几份未整理的证物，监控室只截出片段日志。\n\n嫌疑对象有四人：\n1）合租室友阿宁\n2）快递员小周\n3）楼下邻居陈姐\n4）来送水果的表弟明仔\n\n门锁完好，说明拿走钥匙的人，要么本就有门禁权限，要么根本没有进门。请逐一翻开证物，拼出真相，并回答：谁拿走了银色钥匙？",
        evidence: [
          {
            label: "证物 A · 门禁与对讲",
            content:
              "19:42  阿宁刷卡出门\n20:05  快递员小周按门铃（对讲：「包裹放门口了哈」）\n20:18  有人使用【室内钥匙】从外开门进入（非刷卡）\n20:31  室内钥匙再次用于出门\n20:45  你刷卡回家\n\n备注：只有住户持有「室内钥匙」；快递与访客通常只能刷卡或等主人开门。",
          },
          {
            label: "证物 B · 快递面单",
            content:
              "签收栏手写「代收：阿宁」，系统时间 20:07。\n包裹被放在门外鞋架旁，胶带完好，内含你提前订的零食，与失踪钥匙无关。\n\n疑点：若阿宁 19:42 已出门看电影，20:07 如何代签？",
          },
          {
            label: "证物 C · 电影票根",
            content:
              "票面：《夜色回声》，开场 20:00，座位 7 排 12。\n票根被整齐夹在室友书桌日历里，撕口很新。\n背面铅笔字：「别担心，钥匙我替你保管。」字迹与阿宁留言条一致。",
          },
          {
            label: "证物 D · 茶几水杯",
            content:
              "一杯柠檬水，20:45 回家时杯壁仍微温，口红印色号与阿宁常用色相同。\n杯垫下压着一张便利贴：「电影太无聊，提前回来了～」\n\n若人一直在电影院到散场，杯壁不应仍温，也不会写「提前回来」。",
          },
          {
            label: "证物 E · 邻居口供",
            content:
              "陈姐：20:10 左右下楼扔垃圾，看见门口有快递，没进你家。\n明仔：19:50 送完水果就走了，你当时还没回家，他是阿宁开的门——但门禁显示阿宁 19:42 已出门，时间对不上，明仔可能记错，或有人冒用说辞。",
          },
        ],
        prompt: "综合全部证物，谁拿走了银色钥匙？（填写姓名或称呼）",
        hint: "先看谁能在 20:18 用「室内钥匙」进门；再核对「看电影」的不在场证明是否成立。",
        answers: ["阿宁", "室友", "室友阿宁", "合租室友", "合租室友阿宁"],
        explain:
          "20:18 / 20:31 的室内钥匙记录，只有住户阿宁做得到。票根与「代收」说明她并未真去看电影；微温柠檬水与便利贴证明她提前回家，拿走钥匙并写下保管留言。快递员未进屋，邻居与表弟都没有室内钥匙。",
      },
    ],
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
