/**
 * 27考研计划数据初始化模块 (data-init.js) - v2.1 全预设规范化版
 * 时间跨度：2026-08-16 至 2026-12-20
 * 科目：数学一、专业课（通信原理）、英语一、政治
 * 所有日程全部按照题库/知识库标准预设格式统一转换
 */

const DEFAULT_SCHEDULE_START = "2026-08-16";
const DEFAULT_SCHEDULE_END = "2026-12-20";
const EXAM_DATE = "2026-12-20";

// 全学科五级级联分类知识库 (Taxonomy Tree)
const TAXONOMY_TREE = {
    math: {
        id: "math",
        name: "数学一",
        icon: "fa-solid fa-calculator",
        badgeClass: "badge-amber",
        submodules: {
            m660: {
                id: "m660",
                name: "数学660题",
                hasQuestionType: true, // 660专属：选择题与填空题分开
                questionTypes: {
                    choice: {
                        id: "choice",
                        name: "选择题",
                        presets: [
                            "函数极限连续a",
                            "函数极限连续b",
                            "导数与微分a",
                            "导数与微分b",
                            "微分中值定理及导数应用",
                            "不定积分+定积分与反常积分a",
                            "定积分与反常积分b",
                            "定积分与反常积分c",
                            "定积分应用+微分方程a",
                            "微分方程b",
                            "多元微分a",
                            "多元微分b+二重积分a",
                            "二重积分b",
                            "无穷级数选择题",
                            "线代行列式与矩阵选择题",
                            "线代特征值与二次型选择题",
                            "概率论随机变量选择题",
                            "数理统计与参数估计选择题"
                        ]
                    },
                    blank: {
                        id: "blank",
                        name: "填空题",
                        presets: [
                            "二重积分填空题",
                            "无穷级数a",
                            "无穷级数b",
                            "无穷级数c+多元积分a",
                            "多元积分b",
                            "多元积分c",
                            "极限与导数填空题",
                            "中值定理与方程填空题",
                            "线代矩阵秩与线性方程组填空题",
                            "概率论大数定律与中心极限定理填空题"
                        ]
                    }
                }
            },
            m880: {
                id: "m880",
                name: "李林880题",
                hasQuestionType: false,
                presets: [
                    "函数、极限与连续篇",
                    "一元函数微分学计算与证明",
                    "一元函数积分学及几何应用",
                    "多元函数微分学与极值",
                    "二重积分与重积分计算",
                    "微分方程与差分方程",
                    "无穷级数与常数项级数",
                    "多元积分学 (曲线、曲面积分)",
                    "线性代数基础篇强化题组",
                    "概率论与数理统计提高篇"
                ]
            },
            m1000: {
                id: "m1000",
                name: "张宇1000题强化篇",
                hasQuestionType: false,
                presets: [
                    "高数极限与导数强化题组精刷",
                    "高数微分中值定理与不等式证明",
                    "高数不定积分与定积分综合强化",
                    "高数多元函数微积分强化题组",
                    "高数二重积分与空间解析几何强化",
                    "高数无穷级数审敛与幂级数求和",
                    "高数多元积分学 (格林/高斯/斯托克斯定理)",
                    "线代向量与线性方程组强化题组",
                    "线代特征值与二次型强化题组",
                    "概率多维随机变量与数理统计强化"
                ]
            },
            past_paper_1: {
                id: "past_paper_1",
                name: "数学真题一轮",
                hasQuestionType: false,
                presets: [
                    "2000-2005年真题分类精做",
                    "2006-2010年真题套卷精做",
                    "2011-2015年真题套卷限时突破",
                    "高数真题大题专项归纳",
                    "线代真题大题满分训练",
                    "概率真题大题规范书写"
                ]
            },
            paper_sets: {
                id: "paper_sets",
                name: "数学模拟套卷",
                hasQuestionType: false,
                presets: [
                    "李林考前6套卷",
                    "李林终极预测4套卷",
                    "合工大超越共创5套卷",
                    "张宇最后8套卷",
                    "张宇最后4套卷",
                    "全真考场3小时限时模考 (8:30-11:30)"
                ]
            },
            past_paper_2: {
                id: "past_paper_2",
                name: "数学真题二轮",
                hasQuestionType: false,
                presets: [
                    "近10年真题 (2016-2025) 全真计时重刷",
                    "真题错题本与高频失分点二刷",
                    "考前真题计算量与规范答题复盘"
                ]
            },
            zhangyu_series: {
                id: "zhangyu_series",
                name: "张宇级数强化",
                hasQuestionType: false,
                presets: [
                    "张宇级数06、07",
                    "张宇级数08、09",
                    "张宇级数10-12"
                ]
            },
            zhangyu_multivar: {
                id: "zhangyu_multivar",
                name: "张宇多元微积分强化",
                hasQuestionType: false,
                presets: [
                    "张宇多元积分预备01-04a",
                    "张宇多元积分预备04b-06",
                    "张宇多元积分01-03",
                    "张宇多元积分04、05",
                    "张宇多元积分06、07",
                    "张宇多元积分08-10"
                ]
            },
            fanghao_prob: {
                id: "fanghao_prob",
                name: "方浩概率基础 (8天攻坚)",
                hasQuestionType: false,
                presets: [
                    "方浩概率基础 [Day 1/8]",
                    "方浩概率基础 [Day 2/8]",
                    "方浩概率基础 [Day 3/8]",
                    "方浩概率基础 [Day 4/8]",
                    "方浩概率基础 [Day 5/8]",
                    "方浩概率基础 [Day 6/8]",
                    "方浩概率基础 [Day 7/8]",
                    "方浩概率基础 [Day 8/8 预计基础结束]"
                ]
            },
            linear_algebra: {
                id: "linear_algebra",
                name: "线代强化视频 (机动消化)",
                hasQuestionType: false,
                presets: [
                    "线代强化视频01 (机动消化)",
                    "线代强化视频02 (机动消化)",
                    "线代强化视频03 (机动消化)"
                ]
            }
        }
    },
    major: {
        id: "major",
        name: "通信原理",
        icon: "fa-solid fa-tower-broadcast",
        badgeClass: "badge-indigo",
        submodules: {
            comm_basic: {
                id: "comm_basic",
                name: "通原基础课",
                presets: [
                    "专业课通信原理至少看3个视频",
                    "专业课通信原理至少看4个视频",
                    "通信原理第1-3章 绪论与确知信号分析",
                    "通信原理第4章 模拟调制系统 (AM/DSB/SSB/FM)",
                    "通信原理第5章 模拟信号数字化 (PCM/DPCM/ΔM)",
                    "通信原理第6章 数字基带传输 (Nyquist准则/眼图/时域均衡)",
                    "通信原理第7章 数字带通传输 (2ASK/2FSK/2PSK/2DPSK/QAM)",
                    "通信原理第8章 新型数字带通调制与差错控制编码",
                    "通信原理第80集 基础视频大结局收官"
                ]
            },
            comm_exercise_1: {
                id: "comm_exercise_1",
                name: "通原习题一轮",
                presets: [
                    "通信原理第4章 模拟调制课后重点习题精做",
                    "通信原理第5章 模拟信号数字化课后计算大题",
                    "通信原理第6章 数字基带传输经典计算与误码率推导",
                    "通信原理第7章 数字调制与抗噪性能对比分析题",
                    "通信原理各章重点例题归纳总结"
                ]
            },
            comm_past_paper_1: {
                id: "comm_past_paper_1",
                name: "通原真题一轮",
                presets: [
                    "历年真题分类精做：模拟调制与解调",
                    "历年真题分类精做：基带传输与无码间串扰",
                    "历年真题分类精做：带通调制系统与最佳接收机",
                    "历年真题分类精做：差错控制与信道编码大题"
                ]
            },
            comm_exercise_2: {
                id: "comm_exercise_2",
                name: "通原习题二轮",
                presets: [
                    "通信原理核心计算大题二刷与技巧提炼",
                    "通信原理易错概念与公式推导复盘",
                    "辅导书提高篇与典型综合大题专项攻坚"
                ]
            },
            comm_short_questions: {
                id: "comm_short_questions",
                name: "通原小题",
                presets: [
                    "通信原理核心概念简答题专项背诵",
                    "通信原理填空题与选择题题库精做",
                    "通信原理经典判断题与名词解释默写",
                    "核心公式默写与单位量纲自查"
                ]
            },
            comm_past_paper_2: {
                id: "comm_past_paper_2",
                name: "通原真题二轮",
                presets: [
                    "近10年通信原理真题套卷计时全真模考",
                    "通信原理真题套卷答题卡规范书写与复盘",
                    "真题高频大题模型与满分解法总结"
                ]
            },
            comm_external_papers: {
                id: "comm_external_papers",
                name: "通原外校真题",
                presets: [
                    "北京邮电大学通信原理历年经典大题借鉴",
                    "南京邮电大学通信原理历年高频真题精做",
                    "外校经典压轴题拓展思维与防冷门"
                ]
            }
        }
    },
    english: {
        id: "english",
        name: "英语一",
        icon: "fa-solid fa-language",
        badgeClass: "badge-emerald",
        submodules: {
            reading_single: {
                id: "reading_single",
                name: "英语真题阅读",
                presets: [
                    "2010年真题阅读 Text 1 精读与长难句剖析",
                    "2011-2015年真题阅读单篇精读 (每2-3天1篇)",
                    "2016-2020年真题阅读单篇精读与逻辑线索梳理",
                    "2021-2025年真题阅读单篇精做与命题人套路总结"
                ]
            },
            timed_objective: {
                id: "timed_objective",
                name: "英语真题客观题",
                presets: [
                    "真题客观题全真计时模考 (完形+阅读4篇+新题型，限时80分钟)",
                    "真题客观题二刷计时突破 (每周一次)",
                    "客观题错题归因与段落逻辑复盘"
                ]
            },
            writing_practice: {
                id: "writing_practice",
                name: "英语作文练习",
                presets: [
                    "英语小作文各类书信与通知模板背诵仿写",
                    "英语大作文图画图表作文高分框架与主题词积累",
                    "历年真题作文限时手写仿写 (每2-3天1篇)"
                ]
            },
            vocab: {
                id: "vocab",
                name: "英语核心单词",
                presets: [
                    "考研大纲5500词高频词早晚碎片时间轮刷",
                    "历年真题阅读高频熟词生义与短语默写"
                ]
            }
        }
    },
    politics: {
        id: "politics",
        name: "思想政治理论",
        icon: "fa-solid fa-landmark",
        badgeClass: "badge-rose",
        submodules: {
            sim_choice: {
                id: "sim_choice",
                name: "政治模拟选择题",
                presets: [
                    "肖秀荣1000题马原部分选择题精刷",
                    "肖秀荣1000题毛中特/史纲/思修选择题精做",
                    "腿姐/徐涛冲刺模拟卷选择题刷题"
                ]
            },
            past_choice: {
                id: "past_choice",
                name: "政治真题选择题",
                presets: [
                    "近10年政治真题选择题分类精做与陷阱识别",
                    "真题易混淆概念与时政热点专题整理"
                ]
            },
            essay_sprint: {
                id: "essay_sprint",
                name: "政治大题背诵",
                presets: [
                    "肖秀荣终极预测4套卷 (肖四) 大题核心考点狂背",
                    "肖秀荣8套卷 (肖八) 大题提纲与答题套路梳理",
                    "考前时事政治与核心会议要点集中冲刺"
                ]
            }
        }
    }
};

// 全部任务按预设规范化格式录入 (8.16 ~ 9.7)
const PRESET_DAILY_PLANS = {
    "2026-08-16": {
        isRest: true,
        morning: { text: "", subject: "math" },
        afternoon: { text: "", subject: "math" },
        evening: { text: "", subject: "major" },
        note: "每周例行休息日"
    },
    "2026-08-17": {
        isRest: false,
        morning: { text: "660 填空题二重积分 (机动看线代强化视频)", subject: "math" },
        afternoon: { text: "张宇级数06、07", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: ""
    },
    "2026-08-18": {
        isRest: false,
        morning: { text: "660 选择题函数极限连续a (机动看线代强化视频)", subject: "math" },
        afternoon: { text: "张宇级数08、09", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: ""
    },
    "2026-08-19": {
        isRest: false,
        morning: { text: "660 选择题函数极限连续b", subject: "math" },
        afternoon: { text: "张宇级数10-12", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: ""
    },
    "2026-08-20": {
        isRest: false,
        morning: { text: "660 选择题导数与微分a", subject: "math" },
        afternoon: { text: "张宇多元积分预备01-04a", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: ""
    },
    "2026-08-21": {
        isRest: false,
        morning: { text: "660 选择题导数与微分b", subject: "math" },
        afternoon: { text: "张宇多元积分预备04b-06", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: ""
    },
    "2026-08-22": {
        isRest: false,
        morning: { text: "660 选择题微分中值定理及导数应用", subject: "math" },
        afternoon: { text: "张宇多元积分01-03", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: ""
    },
    "2026-08-23": {
        isRest: true,
        morning: { text: "", subject: "math" },
        afternoon: { text: "", subject: "math" },
        evening: { text: "", subject: "major" },
        note: "周日休息日"
    },
    "2026-08-24": {
        isRest: false,
        morning: { text: "660 选择题不定积分+定积分与反常积分a", subject: "math" },
        afternoon: { text: "张宇多元积分04、05", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: ""
    },
    "2026-08-25": {
        isRest: false,
        morning: { text: "660 选择题定积分与反常积分b", subject: "math" },
        afternoon: { text: "张宇多元积分06、07", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: ""
    },
    "2026-08-26": {
        isRest: false,
        morning: { text: "660 选择题定积分与反常积分c", subject: "math" },
        afternoon: { text: "张宇多元积分08-10", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: "张宇多元微积分收尾"
    },
    "2026-08-27": {
        isRest: false,
        morning: { text: "660 选择题定积分应用+微分方程a", subject: "math" },
        afternoon: { text: "方浩概率基础 [Day 1/8]", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: "方浩概率论基础8天攻坚启动"
    },
    "2026-08-28": {
        isRest: false,
        morning: { text: "660 选择题微分方程b", subject: "math" },
        afternoon: { text: "方浩概率基础 [Day 2/8]", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: ""
    },
    "2026-08-29": {
        isRest: false,
        morning: { text: "660 选择题多元微分a", subject: "math" },
        afternoon: { text: "方浩概率基础 [Day 3/8]", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: ""
    },
    "2026-08-30": {
        isRest: true,
        morning: { text: "", subject: "math" },
        afternoon: { text: "", subject: "math" },
        evening: { text: "", subject: "major" },
        note: "周日休息日"
    },
    "2026-08-31": {
        isRest: false,
        morning: { text: "660 选择题多元微分b+二重积分a", subject: "math" },
        afternoon: { text: "方浩概率基础 [Day 4/8]", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: "8月复习总结与月度盘点"
    },
    "2026-09-01": {
        isRest: false,
        morning: { text: "660 选择题二重积分b+填空题无穷级数a", subject: "math" },
        afternoon: { text: "方浩概率基础 [Day 5/8]", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: "9月强化攻坚月启动"
    },
    "2026-09-02": {
        isRest: false,
        morning: { text: "660 填空题无穷级数b", subject: "math" },
        afternoon: { text: "方浩概率基础 [Day 6/8]", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: ""
    },
    "2026-09-03": {
        isRest: false,
        morning: { text: "660 填空题无穷级数c+多元积分a", subject: "math" },
        afternoon: { text: "方浩概率基础 [Day 7/8]", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: ""
    },
    "2026-09-04": {
        isRest: false,
        morning: { text: "660 填空题多元积分b", subject: "math" },
        afternoon: { text: "方浩概率基础 [Day 8/8 预计基础结束]", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: "里程碑：方浩概率基础全篇收官"
    },
    "2026-09-05": {
        isRest: false,
        morning: { text: "660 填空题多元积分c", subject: "math" },
        afternoon: { text: "数学模拟套卷 · 数学机动整理 / 弱项错题重刷与公式复盘", subject: "math" },
        evening: { text: "通原基础课 · 专业课通信原理至少看3个视频", subject: "major" },
        note: "660题高数核心题型一刷完成"
    },
    "2026-09-06": {
        isRest: true,
        morning: { text: "", subject: "math" },
        afternoon: { text: "", subject: "math" },
        evening: { text: "", subject: "major" },
        note: "周日休息日"
    }
};

// 宏观阶段与各科板块基础定义 (Macro Subjects Definition)
const INITIAL_MACRO_SUBJECTS = {
    math: {
        id: "math",
        name: "数学一",
        color: "amber",
        icon: "fa-solid fa-calculator"
    },
    major: {
        id: "major",
        name: "专业课 · 通信原理",
        color: "indigo",
        icon: "fa-solid fa-tower-broadcast"
    },
    english: {
        id: "english",
        name: "英语一",
        color: "emerald",
        icon: "fa-solid fa-language"
    },
    politics: {
        id: "politics",
        name: "思想政治理论",
        color: "rose",
        icon: "fa-solid fa-landmark"
    }
};

// 自由任务池（Backlog Pool）
const INITIAL_TASK_POOL = [
    { id: "task_1", subject: "math", title: "线代强化视频01 (机动消化)", duration: "上午做完题机动", status: "pending" },
    { id: "task_2", subject: "math", title: "线代强化视频02 (机动消化)", duration: "上午做完题机动", status: "pending" },
    { id: "task_3", subject: "math", title: "线代强化视频03 (机动消化)", duration: "上午做完题机动", status: "pending" },
    { id: "task_4", subject: "major", title: "通原习题一轮 · 通信原理第4章 模拟调制系统总结与信噪比推导", duration: "晚上", status: "pending" },
    { id: "task_5", subject: "major", title: "通原基础课 · 通信原理第6章 数字基带传输 Nyquist 准则证明", duration: "晚上", status: "pending" },
    { id: "task_6", subject: "english", title: "英语真题阅读 · 2015年英语一阅读Text 1精读与长难句剖析", duration: "下午/晚上", status: "pending" },
    { id: "task_7", subject: "math", title: "660 选择题定积分与反常积分敛散性错题二刷", duration: "上午做题", status: "pending" }
];

// 月度重点与里程碑 (8月~12月)
const INITIAL_MONTHLY_MILESTONES = [
    {
        month: "2026-08",
        title: "8月：数学660攻坚 & 概率启动 & 通原过半",
        phase: "强化攻坚期",
        color: "amber",
        goals: [
            "完成数学660题高数核心题型（极限、导数、积分、级数等）",
            "看完全部张宇级数与多元微积分强化视频",
            "8.27正式启动方浩概率论基础精讲（8天攻坚）",
            "线代3个遗留视频借上午机动时间消化完毕",
            "通信原理每晚3-4视频，推进基础过半"
        ]
    },
    {
        month: "2026-09",
        title: "9月：9.4概率收官、9.15通原基础结束 & 1000题开启",
        phase: "基础收官与题量突破",
        color: "indigo",
        goals: [
            "9月4日前：彻底结束方浩概率基础",
            "9月5日前：660题一刷收官与重难题复盘",
            "9月7日开启：张宇1000题高数强化题组大练兵",
            "9月15日前：通信原理基础视频全部结束，开启配套章节大题",
            "英语一启动真题单篇阅读精读 (每2-3天1篇)"
        ]
    },
    {
        month: "2026-10",
        title: "10月：数学真题一轮/880 & 通原真题分类突破",
        phase: "真题实战与专题突破",
        color: "blue",
        goals: [
            "数学一：推进1000题/880题提高篇，开启2000-2015真题一轮精做",
            "通信原理：完成课后大题第一轮，开启历年真题分类专题大题攻坚",
            "英语一：真题阅读单篇精读持续推进 (2010-2020)"
        ]
    },
    {
        month: "2026-11",
        title: "11月：数学真题二轮模考、通原套卷 & 英语冲刺",
        phase: "综合模考与短板查漏",
        color: "purple",
        goals: [
            "数学一：近10年真题 (2016-2025) 全真限时模考 (8:30-11:30)，严格打分复盘",
            "通信原理：近10年真题套卷模考与答题卡规范书写训练，通原小题背诵",
            "英语一：每周一次真题客观题全真计时模考 (80min)；每2-3天练习一篇作文",
            "政治：模拟选择题题库精做 (肖1000)，真题选择题专项训练"
        ]
    },
    {
        month: "2026-12",
        title: "12月：模拟套卷、通原外校真题、政治大题背诵 & 决战",
        phase: "考前冲刺与决战",
        color: "rose",
        goals: [
            "12月20日：迎战考研初试",
            "数学一：李林/超越模拟卷练手感，回顾公式本与错题本",
            "通信原理：通原外校经典题借鉴，核心公式与简答概念强化背诵",
            "英语一：大小作文模板滚瓜烂熟，保持做题手感",
            "政治：肖四肖八核心大题狂背，决胜初试！"
        ]
    }
];

/**
 * 动态生成指定日期跨度的日程骨架 (支持任意起始日与初试日)
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {string} endDateStr - YYYY-MM-DD
 * @param {string} templateType - 'standard' (含基础预设) | 'blank' (纯净空白)
 */
function generateFullScheduleSkeleton(startDateStr = DEFAULT_SCHEDULE_START, endDateStr = EXAM_DATE, templateType = 'standard', isNewWorkspace = false, restConfig = null, activeSlots = ['morning', 'afternoon', 'evening']) {
    const schedule = {};
    const startDate = new Date(startDateStr + "T00:00:00");
    const endDate = new Date(endDateStr + "T00:00:00");

    let current = new Date(startDate);
    let dayCount = 0;

    const rConfig = restConfig || { mode: 'weekly', days: [0] };
    const slots = (Array.isArray(activeSlots) && activeSlots.length > 0) ? activeSlots : ['morning', 'afternoon', 'evening'];

    while (current <= endDate) {
        dayCount++;
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday

        if (!isNewWorkspace && templateType === 'standard' && PRESET_DAILY_PLANS[dateKey]) {
            schedule[dateKey] = JSON.parse(JSON.stringify(PRESET_DAILY_PLANS[dateKey]));
        } else {
            let isRest = false;
            let note = "";

            if (rConfig.mode === 'weekly') {
                const restDays = (rConfig.days && rConfig.days.length > 0) ? rConfig.days : [0];
                if (restDays.includes(dayOfWeek)) {
                    isRest = true;
                    note = (dayOfWeek === 0 || dayOfWeek === 6) ? "周末例行休息日" : "周内例行休息日";
                }
            } else if (rConfig.mode === 'interval') {
                const interval = parseInt(rConfig.interval, 10) || 6;
                // 每隔 N 天休息 1 天 (即每满 N+1 天为休息日)
                const cycle = interval + 1;
                if (dayCount % cycle === 0) {
                    isRest = true;
                    note = `每隔${interval}天例行休息日`;
                }
            } else if (rConfig.mode === 'none') {
                isRest = false;
                note = "";
            }

            if (isRest) {
                schedule[dateKey] = {
                    isRest: true,
                    morning: [],
                    afternoon: [],
                    evening: []
                };
            } else {
                schedule[dateKey] = {
                    isRest: false,
                    morning: [],
                    afternoon: [],
                    evening: []
                };
            }
        }

        current.setDate(current.getDate() + 1);
    }

    return schedule;
}

/**
 * 动态生成工作区月度战略里程碑
 */
function generateWorkspaceMilestones(startDateStr, examDateStr, templateType = 'standard', targetYear = 27) {
    if (templateType === 'blank') {
        return [];
    }

    const tYear = parseInt(targetYear, 10) || 27;
    const examYear = 2000 + tYear - 1;
    if (tYear === 27 && (!examDateStr || examDateStr.startsWith('2026'))) {
        return JSON.parse(JSON.stringify(INITIAL_MONTHLY_MILESTONES));
    }

    // 为其他届数（如 28届、29届等）或自定义跨度动态生成高质感标准战略里程碑
    const milestones = [];
    const sDate = new Date((startDateStr || `${examYear}-08-16`) + "T00:00:00");
    const eDate = new Date((examDateStr || `${examYear}-12-20`) + "T00:00:00");

    const startMonthIndex = sDate.getFullYear() * 12 + sDate.getMonth();
    const endMonthIndex = eDate.getFullYear() * 12 + eDate.getMonth();

    const standardPhaseMap = {
        8: {
            titleSuffix: "基础强化与核心题库突破",
            phase: "强化攻坚期",
            color: "amber",
            goals: [
                "数学：推进高数/线代核心题库与强化考点（660/880题等）",
                "专业课：通读教材与系统精讲视频，建立完整知识框架体系",
                "英语：考研核心词汇攻克，启动历年真题长难句与基础精读"
            ]
        },
        9: {
            titleSuffix: "强化收官与重点题型攻坚",
            phase: "强化收官与题量突破",
            color: "indigo",
            goals: [
                "数学：完成第一轮强化题集刷题，集中攻坚薄弱章节与高频题型",
                "专业课：系统完成基础与强化课程，配套课后习题与重点章节突破",
                "英语：真题阅读单篇精读持续推进，总结题型逻辑与做题方法"
            ]
        },
        10: {
            titleSuffix: "历年真题分类精做与考点归纳",
            phase: "真题实战与专题突破",
            color: "blue",
            goals: [
                "数学：开启历年真题一轮精做，归纳真题大题解题规范与方法",
                "专业课：开启历年真题专题突破，强化核心计算与典型大题",
                "英语：真题阅读持续精练，启动小三门（完形/新题型/翻译）专项",
                "政治：马原/史纲/毛中特核心考点梳理，选择题库刷题"
            ]
        },
        11: {
            titleSuffix: "真题二轮套卷模考与全真限时训练",
            phase: "综合模考与短板查漏",
            color: "purple",
            goals: [
                "数学：近10年真题全真限时模考 (8:30-11:30)，严格打分与错题复盘",
                "专业课：真题套卷计时模考与答题规范书写训练，核心背诵点记忆",
                "英语：每周一次客观题全真计时模考，大小作文模板熟练演练",
                "政治：模拟选择题题库精做，重点选择题二刷与错题巩固"
            ]
        },
        12: {
            titleSuffix: "考前全真模拟预测卷、背诵与决战",
            phase: "考前冲刺与决战",
            color: "rose",
            goals: [
                "12月下旬：迎战考研初试",
                "数学：高质量模拟卷练手感，回归公式本与错题本",
                "专业课：核心考点与简答概念强化背诵，考前押题与大题复习",
                "英语：大小作文模板滚瓜烂熟，保持做题手感",
                "政治：核心大题与押题卷狂背，决胜初试！"
            ]
        }
    };

    for (let m = startMonthIndex; m <= endMonthIndex; m++) {
        const y = Math.floor(m / 12);
        const mon = (m % 12) + 1;
        const monStr = String(mon).padStart(2, '0');
        const monthKey = `${y}-${monStr}`;

        const template = standardPhaseMap[mon] || {
            titleSuffix: `${mon}月阶段备考战略重点`,
            phase: "阶段攻坚期",
            color: "blue",
            goals: [
                `按时完成${mon}月既定各科备考任务与复习规划`,
                "做好错题整理与定期周复盘"
            ]
        };

        milestones.push({
            id: `m_${y}_${monStr}`,
            month: monthKey,
            title: `${mon}月：${template.titleSuffix}`,
            phase: template.phase,
            color: template.color,
            goals: template.goals
        });
    }

    return milestones;
}

// 全局统一 8 种高对比度标准色彩池 (主题色与学科色完全统一命名、数量与色号)
const SUBJECT_COLOR_PALETTE = [
    'blue',    // 深邃蓝 (#2563eb / #3b82f6)
    'green',   // 翡翠绿 (#059669 / #10b981)
    'purple',  // 紫罗兰 (#7c3aed / #8b5cf6)
    'amber',   // 琥珀金 (#d97706 / #f59e0b)
    'rose',    // 玫瑰红 (#e11d48 / #f43f5e)
    'cyan',    // 青空蓝 (#0891b2 / #06b6d4)
    'orange',  // 活力橙 (#ea580c / #f97316)
    'slate'    // 极客灰 (#475569 / #94a3b8)
];

function getRandomSubjectColorPalette(count = 7) {
    const shuffled = [...SUBJECT_COLOR_PALETTE].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * 创建新规划区数据对象工厂函数
 */
function createDefaultWorkspaceSkeleton(config = {}) {
    const targetYear = parseInt(config.targetYear, 10) || 27;
    const examYear = config.examYear || (2000 + targetYear - 1);
    const userName = config.userName || "考研人";
    const earliestAllowedStartYear = examYear - 1;
    const minStartDate = `${earliestAllowedStartYear}-01-01`;
    let startDate = config.startDate || `${earliestAllowedStartYear}-08-16`;
    if (startDate < minStartDate) {
        startDate = `${earliestAllowedStartYear}-08-16`;
    }
    const examDate = config.examDate || `${examYear}-12-20`;
    const templateType = config.templateType || 'blank';
    const id = config.id || ('ws_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
    const name = config.name || `${userName}的${targetYear}考研规划`;

    // 随机抽取互不相同的专属学科颜色序列（各规划区相互独立）
    const assignedColors = getRandomSubjectColorPalette(10);
    let colorIdx = 0;

    const subjects = {};

    // 1. 数学统考
    const mathName = config.mathName || (config.mathType === 'math2' ? '数学二' : config.mathType === 'math3' ? '数学三' : config.mathType === 'none' ? null : '数学一');
    if (mathName) {
        subjects.math = {
            id: "math",
            name: mathName,
            color: assignedColors[colorIdx++] || "amber",
            icon: "fa-solid fa-calculator"
        };
    }

    // 2. 英语统考
    const englishName = config.englishName || (config.englishType === 'english2' ? '英语二' : '英语一');
    subjects.english = {
        id: "english",
        name: englishName,
        color: assignedColors[colorIdx++] || "sky",
        icon: "fa-solid fa-language"
    };

    // 3. 思想政治理论
    const politicsName = config.politicsName || '思想政治理论';
    subjects.politics = {
        id: "politics",
        name: politicsName,
        color: assignedColors[colorIdx++] || "rose",
        icon: "fa-solid fa-landmark"
    };

    // 4. 解析专业课列表 (支持多达 4 门专业课)
    const majorList = Array.isArray(config.majorSubjects) && config.majorSubjects.length > 0
        ? config.majorSubjects
        : [config.majorName || '专业课一'];

    const majorIcons = ['fa-solid fa-microchip', 'fa-solid fa-code', 'fa-solid fa-network-wired', 'fa-solid fa-laptop-code'];
    for (let i = 0; i < Math.min(4, majorList.length); i++) {
        const key = (i === 0) ? 'major' : `major${i + 1}`;
        const name = majorList[i] || `专业课${i === 0 ? '一' : i === 1 ? '二' : i === 2 ? '三' : '四'}`;
        subjects[key] = {
            id: key,
            name: name,
            color: assignedColors[colorIdx++] || "indigo",
            icon: majorIcons[i] || 'fa-solid fa-book'
        };
    }

    // 新建规划区：分类树/题库完全纯净，不携带任何预设板块与章节（空列表供用户自由创建）
    const taxonomy = {};
    Object.keys(subjects).forEach(subKey => {
        const sub = subjects[subKey];
        taxonomy[subKey] = {
            id: subKey,
            name: sub.name,
            icon: sub.icon || (subKey === 'math' ? "fa-solid fa-calculator" : "fa-solid fa-book"),
            badgeClass: `badge-${sub.color || (subKey === 'math' ? 'amber' : 'blue')}`,
            submodules: {}
        };
    });

    return {
        id: id,
        name: name,
        userName: userName,
        targetYear: targetYear,
        examYear: examYear,
        startDate: startDate,
        endDate: examDate,
        examDate: examDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
            viewMode: config.viewMode || 'table',
            showPastDays: config.showPastDays !== undefined ? config.showPastDays : false,
            monthFilter: 'all',
            subjectFilter: 'all',
            theme: config.theme || 'system',
            accentColor: config.accentColor || 'blue',
            darkStyle: config.darkStyle || 'classic',
            activeSlots: config.activeSlots || ['morning', 'afternoon', 'evening']
        },
        targetScores: config.targetScores || null,
        schedule: generateFullScheduleSkeleton(startDate, examDate, 'blank', true, config.restConfig, config.activeSlots),
        subjects: subjects,
        taskPool: [],
        milestones: generateWorkspaceMilestones(startDate, examDate, templateType, targetYear),
        taxonomy: taxonomy
    };
}

// 真实考研样板规划区生成器（家徒四壁网盘姐 · 26考研）
function createSampleWorkspace() {
    const startDate = "2024-10-08";
    const endDate = "2025-12-20";
    const examDate = "2025-12-20";
    const simulatedToday = "2025-06-18";

    // 1. 学科体系配置（双专业课：信号与系统 + 数字信号处理）
    const subjects = {
        math: {
            id: "math",
            name: "数学一",
            color: "amber",
            targetScore: 120,
            icon: "fa-solid fa-calculator"
        },
        major: {
            id: "major",
            name: "信号与系统",
            color: "blue",
            targetScore: 125,
            icon: "fa-solid fa-tower-broadcast"
        },
        major2: {
            id: "major2",
            name: "数字信号处理",
            color: "purple",
            targetScore: 115,
            icon: "fa-solid fa-wave-square"
        },
        english: {
            id: "english",
            name: "英语一",
            color: "cyan",
            targetScore: 75,
            icon: "fa-solid fa-language"
        },
        politics: {
            id: "politics",
            name: "思想政治理论",
            color: "rose",
            targetScore: 70,
            icon: "fa-solid fa-landmark"
        }
    };

    // 2. 知识库预设库 (Taxonomy)
    const taxonomy = {
        math: {
            id: "math",
            name: "数学一",
            icon: "fa-solid fa-calculator",
            badgeClass: "badge-amber",
            submodules: {
                m660: {
                    id: "m660",
                    name: "数学660题",
                    hasQuestionType: true,
                    questionTypes: {
                        choice: {
                            id: "choice",
                            name: "选择题",
                            presets: [
                                "函数极限连续选择题精做",
                                "导数与微分选择题",
                                "不定积分与定积分概念题",
                                "多元微分学选择题",
                                "二重积分选择题",
                                "无穷级数审敛选择题",
                                "线代行列式与特征值选择题",
                                "概率随机变量分布选择题"
                            ]
                        },
                        blank: {
                            id: "blank",
                            name: "填空题",
                            presets: [
                                "极限与连续填空题",
                                "微分方程特解填空题",
                                "二重积分计算填空题",
                                "幂级数收敛域填空题",
                                "矩阵秩与线性方程组填空题"
                            ]
                        }
                    }
                },
                m880: {
                    id: "m880",
                    name: "李林880题强化篇",
                    hasQuestionType: false,
                    presets: [
                        "一元微积分综合计算大题",
                        "中值定理与不等式证明专题",
                        "多元函数微分与极值计算",
                        "二重积分与曲线曲面积分",
                        "微分方程应用与综合大题",
                        "无穷级数求和函数与展开",
                        "线代二次型规范化综合题",
                        "概率多维随机变量大题"
                    ]
                },
                past_paper_1: {
                    id: "past_paper_1",
                    name: "数学真题一轮 (2005-2018)",
                    hasQuestionType: false,
                    presets: [
                        "2005-2008年真题分类精做",
                        "2009-2012年真题套卷计时模考",
                        "2013-2016年真题分类大题突破",
                        "2017-2018年真题全真模拟与错题复盘"
                    ]
                },
                paper_sets: {
                    id: "paper_sets",
                    name: "考前模拟套卷",
                    hasQuestionType: false,
                    presets: [
                        "李林考前6套卷 (全真3小时模考)",
                        "李林终极预测4套卷 (查漏补缺)",
                        "合工大超越5套卷 (计算量攻坚)"
                    ]
                }
            }
        },
        major: {
            id: "major",
            name: "信号与系统",
            icon: "fa-solid fa-tower-broadcast",
            badgeClass: "badge-indigo",
            submodules: {
                sig_basic: {
                    id: "sig_basic",
                    name: "教材核心考点与课后习题",
                    hasQuestionType: false,
                    presets: [
                        "LTI系统时域卷积积分与冲激响应",
                        "连续时间周期信号傅里叶级数(FS)",
                        "连续时间傅里叶变换(FT)性质与应用",
                        "拉普拉斯变换(LT)收敛域与系统函数H(s)",
                        "连续系统状态变量方程与稳定性分析"
                    ]
                },
                sig_past_paper: {
                    id: "sig_past_paper",
                    name: "历年真题大题专项",
                    hasQuestionType: false,
                    presets: [
                        "信号真题 01-05年大题精做",
                        "信号真题 06-12年大题分类突破",
                        "信号真题 13-20年全真套卷训练",
                        "近5年真题终极压轴题规范书写"
                    ]
                }
            }
        },
        major2: {
            id: "major2",
            name: "数字信号处理",
            icon: "fa-solid fa-wave-square",
            badgeClass: "badge-purple",
            submodules: {
                dsp_discrete: {
                    id: "dsp_discrete",
                    name: "离散系统基础与Z变换",
                    hasQuestionType: false,
                    presets: [
                        "离散时间信号与LTI系统差分方程",
                        "Z变换性质、逆变换与系统函数H(z)",
                        "离散系统因果稳定性与频响特性"
                    ]
                },
                dsp_fft: {
                    id: "dsp_fft",
                    name: "DFT与快速算法FFT",
                    hasQuestionType: false,
                    presets: [
                        "离散傅里叶级数(DFS)与DFT定义性质",
                        "频域抽样定理与循环卷积计算",
                        "基2时间抽取/频率抽取FFT算法流图"
                    ]
                },
                dsp_filter: {
                    id: "dsp_filter",
                    name: "数字滤波器设计 (IIR/FIR)",
                    hasQuestionType: false,
                    presets: [
                        "脉冲响应不变法与双线性变换法IIR设计",
                        "线性相位FIR滤波器条件与幅度特性",
                        "窗函数法与频率采样法FIR滤波器设计"
                    ]
                },
                dsp_past_paper: {
                    id: "dsp_past_paper",
                    name: "DSP历年真题大题综合",
                    hasQuestionType: false,
                    presets: [
                        "DSP真题 时频分析综合计算题",
                        "DSP真题 FFT流图与运算量分析题",
                        "DSP真题 滤波器设计大题专项"
                    ]
                }
            }
        },
        english: {
            id: "english",
            name: "英语一",
            icon: "fa-solid fa-language",
            badgeClass: "badge-sky",
            submodules: {
                eng_vocab: {
                    id: "eng_vocab",
                    name: "大纲核心词汇",
                    hasQuestionType: false,
                    presets: [
                        "红宝书核心词汇 01-10 单元速记",
                        "红宝书核心词汇 11-20 单元速记",
                        "真题高频熟词生义与派生词串讲"
                    ]
                },
                eng_reading_past: {
                    id: "eng_reading_past",
                    name: "真题阅读精读手译 (2000-2015)",
                    hasQuestionType: false,
                    presets: [
                        "2005-2008年真题阅读精读手译",
                        "2009-2012年真题阅读长难句拆解",
                        "2013-2016年真题阅读逻辑题型归纳"
                    ]
                },
                eng_recent: {
                    id: "eng_recent",
                    name: "近八年真题全真演练 (2017-2024)",
                    hasQuestionType: false,
                    presets: [
                        "近8年真题阅读限时精做 (15min/篇)",
                        "真题新题型与翻译满分技巧实战",
                        "大小作文高分框架模板定制与套写"
                    ]
                }
            }
        },
        politics: {
            id: "politics",
            name: "思想政治理论",
            icon: "fa-solid fa-landmark",
            badgeClass: "badge-rose",
            submodules: {
                pol_basic: {
                    id: "pol_basic",
                    name: "徐涛核心考案精讲",
                    hasQuestionType: false,
                    presets: [
                        "马克思主义基本原理 (唯物论/辩证法/认识论)",
                        "毛泽东思想和中国特色社会主义理论体系",
                        "中国近现代史纲要重要节点与历史脉络",
                        "思想道德与法治核心考点"
                    ]
                },
                pol_1000: {
                    id: "pol_1000",
                    name: "肖秀荣1000题精刷",
                    hasQuestionType: false,
                    presets: [
                        "马原1000题选择题精做",
                        "毛中特与史纲1000题精做",
                        "错题本高频易混考点二刷"
                    ]
                },
                pol_xiao4_8: {
                    id: "pol_xiao4_8",
                    name: "肖八肖四冲刺终极押题",
                    hasQuestionType: false,
                    presets: [
                        "肖秀荣8套卷选择题全部刷透二刷",
                        "肖秀荣4套卷选择题全真模考",
                        "肖四主观大题核心金句背诵狂背"
                    ]
                }
            }
        }
    };

    // 3. 节假日映射库（24-25年节假日精准匹配）
    const holidayMap = {
        "2024-12-31": "元旦前夕机动",
        "2025-01-01": "元旦法定休息日",
        "2025-01-28": "除夕例行休整",
        "2025-01-29": "大年初一新春团圆",
        "2025-01-30": "大年初二拜年休息",
        "2025-01-31": "大年初三休整放松",
        "2025-02-01": "大年初四机动调节",
        "2025-02-02": "大年初五休整",
        "2025-02-03": "大年初六休整",
        "2025-02-04": "大年初七开年收心",
        "2025-04-04": "清明节例行休息",
        "2025-04-05": "清明假期休整",
        "2025-05-01": "五一劳动节休整",
        "2025-05-02": "五一假期休整",
        "2025-05-03": "五一假期休整",
        "2025-05-31": "端午节例行休息",
        "2025-10-01": "国庆节例行休息",
        "2025-10-02": "国庆假期休整",
        "2025-10-03": "国庆假期休整",
        "2025-10-06": "中秋节例行休息"
    };

    // 4. 历程任务生成器（科学合理的专业课/数学/英语/政治阶段化排期）
    const schedule = {};
    const curr = new Date(startDate);
    const end = new Date(endDate);

    let studyDayCount = 0;

    while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        const dayOfWeek = curr.getDay(); // 0 is Sun, 6 is Sat
        const isSummerOrLater = (dStr >= "2025-07-01");

        // 判断是否休息日
        let isRest = false;
        let note = "";

        if (holidayMap[dStr]) {
            isRest = true;
            note = `📌 ${holidayMap[dStr]}`;
        } else if (!isSummerOrLater && (dayOfWeek === 0 || dayOfWeek === 6)) {
            // 暑假前：周末双休
            isRest = true;
            note = dayOfWeek === 0 ? "📌 周日例行休息" : "📌 周六例行休息";
        } else if (isSummerOrLater && dayOfWeek === 6) {
            // 暑假后：每周六单休
            isRest = true;
            note = "📌 周六例行休息";
        }

        if (isRest) {
            schedule[dStr] = {
                isRest: true,
                note: note,
                morning: { text: "", subject: "math", done: false },
                afternoon: { text: "", subject: "major", done: false },
                evening: { text: "", subject: "english", done: false }
            };
        } else {
            studyDayCount++;
            const isPast = (dStr < simulatedToday);
            const isToday = (dStr === simulatedToday);

            let morningTask = { text: "", subject: "math", done: isPast };
            let afternoonTask = { text: "", subject: "major", done: isPast };
            let eveningTask = { text: "", subject: "english", done: isPast };

            // --- 上午 (Morning)：始终专注数学一攻坚 ---
            if (dStr < "2025-01-01") {
                const step = ((studyDayCount - 1) % 24) + 1;
                if (step <= 8) morningTask.text = `高等数学基础 · 函数极限与连续性核心概念精讲 [第${step}讲]`;
                else if (step <= 16) morningTask.text = `高等数学基础 · 一元微分学及导数几何物理应用 [第${step - 8}讲]`;
                else morningTask.text = `高等数学基础 · 不定积分与定积分基本计算 [第${step - 16}讲]`;
                morningTask.subject = "math";
            } else if (dStr < "2025-03-01") {
                const lStep = ((studyDayCount - 1) % 18) + 1;
                if (lStep <= 6) morningTask.text = `李永乐线代基础 · 行列式计算与矩阵初等变换 [第${lStep}讲]`;
                else if (lStep <= 12) morningTask.text = `李永乐线代基础 · 向量组线性相关性与线性方程组解的结构`;
                else morningTask.text = `李永乐线代基础 · 特征值特征向量与二次型化标准型`;
                morningTask.subject = "math";
            } else if (dStr < "2025-04-15") {
                const pStep = ((studyDayCount - 1) % 12) + 1;
                morningTask.text = `余丙森概率论基础 · 随机变量概率分布与数字特征 [第${pStep}讲]`;
                morningTask.subject = "math";
            } else if (dStr < "2025-07-01") {
                const qNum = ((studyDayCount - 1) % 16) + 1;
                morningTask.text = `数学660题强化篇 · 选择题与填空题综合题组精刷 [题号 ${qNum * 10 - 9}~${qNum * 10}]`;
                morningTask.subject = "math";
            } else if (dStr < "2025-09-01") {
                const setNum = ((studyDayCount - 1) % 12) + 1;
                morningTask.text = `李林880题强化篇 · 高数微积分/线代/概率提高题综合攻坚 [专题${setNum}]`;
                morningTask.subject = "math";
            } else if (dStr < "2025-10-15") {
                const yr = 2008 + ((studyDayCount - 1) % 11);
                morningTask.text = `数学真题一轮 · ${yr}年数学一全真套卷限时模考 (8:30-11:30)`;
                morningTask.subject = "math";
            } else if (dStr < "2025-12-01") {
                const simSet = ((studyDayCount - 1) % 6) + 1;
                morningTask.text = `李林考前6套卷/超越卷 · 第${simSet}套 全真考场限时模考 (8:30-11:30)`;
                morningTask.subject = "math";
            } else {
                const set4 = ((studyDayCount - 1) % 4) + 1;
                morningTask.text = `李林终极预测4套卷 · 第${set4}套 考前保温模考 + 全科目公式定理终极默写`;
                morningTask.subject = "math";
            }

            // --- 下午 (Afternoon)：专注专业课黄金大块时间（信号与系统 / 数字信号处理） ---
            if (dStr < "2025-01-01") {
                const sigStep = ((studyDayCount - 1) % 18) + 1;
                afternoonTask.text = `信号与系统教材精读 (奥本海姆) · 连续时间LTI系统时域卷积与微积分例题 [第${sigStep}节]`;
                afternoonTask.subject = "major";
            } else if (dStr < "2025-03-01") {
                if (studyDayCount % 2 === 1) {
                    afternoonTask.text = `信号与系统 · 连续/离散傅里叶变换(FT/DTFT)性质与系统频域分析大题`;
                    afternoonTask.subject = "major";
                } else {
                    afternoonTask.text = `数字信号处理预习 (高西全) · 离散时间信号与系统时域差分方程教材精读`;
                    afternoonTask.subject = "major2";
                }
            } else if (dStr < "2025-07-01") {
                if (studyDayCount % 2 === 1) {
                    afternoonTask.text = `数字信号处理 · 离散傅里叶变换(DFT)与快速傅里叶变换(FFT)算法流图大题`;
                    afternoonTask.subject = "major2";
                } else {
                    afternoonTask.text = `数字信号处理 · IIR/FIR数字滤波器结构与双线性变换法设计大题`;
                    afternoonTask.subject = "major2";
                }
            } else if (dStr < "2025-10-01") {
                if (studyDayCount % 2 === 1) {
                    afternoonTask.text = `信号与系统重点院校考研真题大题专项 · 状态变量方程与频率响应综合题`;
                    afternoonTask.subject = "major";
                } else {
                    afternoonTask.text = `数字信号处理历年真题综合大题 · 线性相位FIR窗函数设计与频率抽样综合题`;
                    afternoonTask.subject = "major2";
                }
            } else {
                if (studyDayCount % 2 === 1) {
                    const yr = 2015 + ((studyDayCount - 1) % 9);
                    afternoonTask.text = `目标院校【信号与系统】${yr}年历年真题全真模拟答卷 (14:00-17:00)`;
                    afternoonTask.subject = "major";
                } else {
                    const yr = 2015 + ((studyDayCount - 1) % 9);
                    afternoonTask.text = `目标院校【数字信号处理】${yr}年历年真题全真模拟答卷 (14:00-17:00)`;
                    afternoonTask.subject = "major2";
                }
            }

            // --- 晚上 (Evening)：英语一词汇长难句/阅读/作文 + 错题复盘 + 政治强化背诵 ---
            if (dStr < "2025-01-01") {
                afternoonTask.subject = "major"; // 确保下午是专业课
                eveningTask.text = `恋恋有词/红宝书核心词汇速记 + 句句真研长难句拆解 + 当日数学/专业课错题复盘`;
                eveningTask.subject = "english";
            } else if (dStr < "2025-03-01") {
                eveningTask.text = `英语早年真题阅读(2000-2005)手译精析 + 核心词汇二轮滚记 + 线代定理复盘`;
                eveningTask.subject = "english";
            } else if (dStr < "2025-05-01") {
                eveningTask.text = `英语真题阅读(2006-2014)精做2篇 + 错题逻辑拆解 + 信号/DSP错题巩固`;
                eveningTask.subject = "english";
            } else if (dStr < "2025-07-01") {
                if (studyDayCount % 2 === 1) {
                    eveningTask.text = `英语历年真题阅读(2015-2018)精读 + 生词长难句摘录笔记`;
                    eveningTask.subject = "english";
                } else {
                    eveningTask.text = `思想政治理论核心考点预习 (徐涛核心考案) · 马原唯物论与辩证法框架梳理`;
                    eveningTask.subject = "politics";
                }
            } else if (dStr < "2025-10-01") {
                if (studyDayCount % 2 === 1) {
                    eveningTask.text = `肖秀荣1000题精做 · 史纲与毛中特核心历史节点分章刷题`;
                    eveningTask.subject = "politics";
                } else {
                    eveningTask.text = `英语近十年真题新题型与完形填空专项技巧突破 + 词汇保温`;
                    eveningTask.subject = "english";
                }
            } else if (dStr < "2025-11-15") {
                if (studyDayCount % 2 === 1) {
                    eveningTask.text = `肖秀荣8套卷选择题全部刷透二刷 + 政治重难点考点背诵`;
                    eveningTask.subject = "politics";
                } else {
                    eveningTask.text = `英语大小作文高分框架模板背诵 + 历年真题范文限时仿写套写`;
                    eveningTask.subject = "english";
                }
            } else {
                eveningTask.text = `肖四大题核心主观题大题狂背默写 + 时政热点总结 + 考前各科保温`;
                eveningTask.subject = "politics";
            }

            // 2025-06-18 (今日) 状态精准定制
            if (isToday) {
                morningTask.text = `660 填空题多元积分与常微分方程综合题组精刷 [今日核心攻坚]`;
                morningTask.subject = "math";
                morningTask.done = true;

                afternoonTask.text = `数字信号处理 · IIR/FIR数字滤波器结构与双线性变换法大题精解`;
                afternoonTask.subject = "major2";
                afternoonTask.done = false;

                eveningTask.text = `英语真题阅读 (2015 Text 3&4) 错题本质剖析 + 政治马原核心考点`;
                eveningTask.subject = "english";
                eveningTask.done = false;
            }

            schedule[dStr] = {
                isRest: false,
                note: "",
                morning: morningTask,
                afternoon: afternoonTask,
                evening: eveningTask
            };
        }

        curr.setDate(curr.getDate() + 1);
    }

    // 5. 里程碑规划 (15 个月份全景规划数组)
    const milestones = [
        {
            month: "2024-10",
            title: "10月：起跑夯实与基础筑基",
            phase: "基础筑基期",
            color: "primary",
            goals: [
                "高等数学一轮基础班：函数极限与导数微分概念过关",
                "信号与系统：奥本海姆课本前两章连续时间系统时域分析",
                "英语考研核心词汇突破第一轮 1500 词 + 长难句语法拆解"
            ]
        },
        {
            month: "2024-11",
            title: "11月：微积分攻坚与系统变换",
            phase: "基础筑基期",
            color: "primary",
            goals: [
                "高等数学：一元积分学、定积分几何物理应用与微分方程",
                "信号与系统：傅里叶级数(FS)与连续时间傅里叶变换(FT)性质",
                "英语长难句精析 60 句 + 当日数学与专业课错题巩固复盘"
            ]
        },
        {
            month: "2024-12",
            title: "12月：线代启动与时频分析",
            phase: "基础筑基期",
            color: "primary",
            goals: [
                "高等数学多元微积分学完 + 线性代数行列式矩阵运算启动",
                "信号与系统：拉普拉斯变换(LT)与连续LTI系统频率响应大题",
                "考研核心词汇二轮滚记 + 信号课后习题全景大过关"
            ]
        },
        {
            month: "2025-01",
            title: "1月：寒假线代深化与跨年复盘",
            phase: "寒假强化期",
            color: "primary",
            goals: [
                "李永乐线性代数基础讲义：向量组线性相关性与特征值矩阵对角化",
                "信号与系统：Z变换收敛域、逆变换与系统因果稳定性大题",
                "英语早年真题(2000-2005)手译精读 + 前期错题本系统梳理"
            ]
        },
        {
            month: "2025-02",
            title: "2月：新春调整与DSP专业课预习",
            phase: "寒假强化期",
            color: "primary",
            goals: [
                "数字信号处理DSP启动：离散时间信号与系统时域差分方程",
                "信号与系统全书知识框架图手绘梳理与重难点例题消灭",
                "英语近十年真题高频核心短语与熟词生义专项突破"
            ]
        },
        {
            month: "2025-03",
            title: "3月：春季开学与概率论基础",
            phase: "春季基础巩固",
            color: "primary",
            goals: [
                "概率论与数理统计基础班：随机变量及其常见分布与数字特征",
                "数字信号处理：离散傅里叶变换(DFT)与快速傅里叶变换(FFT)流图",
                "英语历年真题阅读(2006-2009)精做，总结长难句与题干同义替换"
            ]
        },
        {
            month: "2025-04",
            title: "4月：数学660题强化与DFT大题",
            phase: "强化突破期",
            color: "primary",
            goals: [
                "数学660题选择题精刷：函数极限连续与微积分强化题组",
                "数字信号处理：频域抽样理论与循环卷积计算大题突破",
                "英语真题阅读(2010-2013)逻辑题型归纳 + 信号错题二次复盘"
            ]
        },
        {
            month: "2025-05",
            title: "5月：660填空题与数字滤波器",
            phase: "强化突破期",
            color: "primary",
            goals: [
                "数学660题填空题多元微积分、微分方程与线代专题突破",
                "数字信号处理：IIR与线性相位FIR数字滤波器结构与设计方法",
                "英语真题阅读(2014-2016)精读 + 思想政治理论马原框架建立"
            ]
        },
        {
            month: "2025-06",
            title: "6月：期末冲刺与强化一轮收官",
            phase: "强化攻坚期",
            color: "primary",
            goals: [
                "数学880题强化篇启动：攻坚中等难度微积分与线代综合大题",
                "双专业课（信号与系统 + DSP）期末与考研重难点综合大题交叉精练",
                "英语阅读近五年真题精读收官 + 政治马原核心考点梳理"
            ]
        },
        {
            month: "2025-07",
            title: "7月：暑期黄金高强度强化",
            phase: "暑期高能强化",
            color: "primary",
            goals: [
                "李林880题强化篇高数、线代、概率论提高题组全景刷透",
                "信号与系统重点院校考研真题大题专项（状态变量方程/频域分析）",
                "政治史纲与毛中特核心考案精讲精练 + 肖秀荣1000题同步刷题"
            ]
        },
        {
            month: "2025-08",
            title: "8月：真题模考轮启动与双专业课拔高",
            phase: "暑期高能强化",
            color: "primary",
            goals: [
                "数学真题(2008-2015)全真模考演练，总结计算速度与答题规范",
                "数字信号处理历年真题综合大题攻坚（窗函数法/双线性变换综合题）",
                "政治思修法治学完，1000题一轮完成 + 英语新题型完形填空突破"
            ]
        },
        {
            month: "2025-09",
            title: "9月：近十年真题计时演练与二轮攻坚",
            phase: "秋季真题冲刺",
            color: "primary",
            goals: [
                "数学真题(2016-2021)3小时严格计时模考 + 错题本质剖析",
                "双专业课目标院校近十年真题一轮模拟，严格对照标准答案评分",
                "政治1000题二轮错题重做 + 英语近十年真题二轮刷题与生词排查"
            ]
        },
        {
            month: "2025-10",
            title: "10月：全真模拟套卷与作文专题",
            phase: "秋季真题冲刺",
            color: "primary",
            goals: [
                "数学近三年真题与李林6套卷计时模考，稳固120分以上基本盘",
                "专业课近五年真题二轮精刷，提炼答题大题模板与规范书写",
                "英语大小作文高分范文背诵仿写 + 政治肖八选择题狂刷第一轮"
            ]
        },
        {
            month: "2025-11",
            title: "11月：考前模拟与政治肖八大刷题",
            phase: "考前冲刺模考",
            color: "primary",
            goals: [
                "数学李林6套卷与合工大超越卷模考，强化考场抗压与计算准确率",
                "双专业课全真考场实战模拟（14:00-17:00）+ 核心公式清单默写",
                "政治肖八选择题刷3遍 + 英语作文每周限时仿写2篇全真答题卡套写"
            ]
        },
        {
            month: "2025-12",
            title: "12月：终极押题背诵与初试决胜",
            phase: "终极收官决胜",
            color: "primary",
            goals: [
                "数学李林4套卷保温 + 全科目公式定理终极默写扫盲",
                "政治肖四主观题大题逐题背诵滚瓜烂熟 + 时政热点核心金句背诵",
                "全真考场全科目全流程模考，调整心态作息，信心满满走向考场！"
            ]
        }
    ];

    return {
        id: "ws_sample_26",
        isSample: true,
        isReadOnly: true,
        name: "家徒四壁网盘姐的26考研规划",
        userName: "家徒四壁网盘姐",
        targetYear: "26",
        examYear: 2025,
        startDate: startDate,
        endDate: endDate,
        examDate: examDate,
        simulatedToday: simulatedToday,
        createdAt: "2024-10-08T08:00:00.000Z",
        updatedAt: "2025-06-18T18:00:00.000Z",
        preferences: {
            viewMode: "table",
            showPastDays: false,
            monthFilter: "all",
            subjectFilter: "all",
            theme: "system",
            accentColor: "blue",
            darkStyle: "classic",
            activeSlots: ["morning", "afternoon", "evening"]
        },
        targetScores: {
            total: 390,
            showInFooter: true,
            subjects: {
                math: 120,
                major: 125,
                english: 75,
                politics: 70
            }
        },
        schedule: schedule,
        subjects: subjects,
        taskPool: [],
        milestones: milestones,
        taxonomy: taxonomy
    };
}

/**
 * 全局工作区数据迁移转换器 (v1.0.0 -> v1.1.0 自动无感平滑迁移)
 * 1. 结构化任务瘦身：单字符串任务转换为结构化任务数组 [ { subject, modId, qtype, itemIdx, text } ]
 * 2. 彻底清理已弃用的 day.note / 便签字段
 * 3. 升级 schemaVersion 至 2
 */
function migrateWorkspaceData(ws) {
    if (!ws || typeof ws !== 'object') return ws;
    
    if (!ws.schedule || typeof ws.schedule !== 'object') {
        ws.schedule = {};
    }

    const taxonomy = ws.taxonomy || window.TAXONOMY_TREE || {};

    Object.keys(ws.schedule).forEach(dateKey => {
        const day = ws.schedule[dateKey];
        if (!day || typeof day !== 'object') return;

        // 移除废弃的 note 字段
        if ('note' in day) {
            delete day.note;
        }

        ['morning', 'afternoon', 'evening'].forEach(slotKey => {
            const slot = day[slotKey];
            if (!slot) {
                day[slotKey] = [];
                return;
            }

            // 如果已经是新版任务数组格式
            if (Array.isArray(slot)) {
                day[slotKey] = slot.filter(t => t && (t.text || t.modId || (t.subject && t.subject !== 'pending')));
                return;
            }

            // 如果是包装对象包含 tasks 数组
            if (Array.isArray(slot.tasks)) {
                day[slotKey] = slot.tasks.filter(t => t && (t.text || t.modId || (t.subject && t.subject !== 'pending')));
                return;
            }

            // 如果是旧版单对象格式 { text, subject, done, off, ... }
            if (typeof slot === 'object') {
                if (slot.off) {
                    day[slotKey] = [];
                    return;
                }
                const text = String(slot.text || '').trim();
                const subject = slot.subject || 'pending';
                if (!text || text === '未安排' || text.startsWith('点击编辑') || text.startsWith('点击安排') || subject === 'pending') {
                    day[slotKey] = [];
                } else {
                    let matchedModId = slot.modId || null;
                    let matchedIdx = slot.itemIdx !== undefined ? slot.itemIdx : null;
                    let matchedQType = slot.qtype || null;

                    if (!matchedModId && taxonomy && taxonomy[subject]?.submodules) {
                        const submods = taxonomy[subject].submodules;
                        for (const mId of Object.keys(submods)) {
                            const mod = submods[mId];
                            if (mod.hasQuestionType && mod.questionTypes) {
                                for (const qk of Object.keys(mod.questionTypes)) {
                                    const qObj = mod.questionTypes[qk];
                                    if (Array.isArray(qObj.presets)) {
                                        const idx = qObj.presets.findIndex(p => text.includes(p) || p.includes(text));
                                        if (idx !== -1) {
                                            matchedModId = mId;
                                            matchedQType = qk;
                                            matchedIdx = idx;
                                            break;
                                        }
                                    }
                                }
                            } else if (Array.isArray(mod.presets)) {
                                const idx = mod.presets.findIndex(p => text.includes(p) || p.includes(text));
                                if (idx !== -1) {
                                    matchedModId = mId;
                                    matchedIdx = idx;
                                    break;
                                }
                            }
                            if (matchedModId) break;
                        }
                    }

                    day[slotKey] = [{
                        subject: subject,
                        text: text,
                        modId: matchedModId,
                        qtype: matchedQType,
                        itemIdx: matchedIdx,
                        done: !!slot.done
                    }];
                }
            } else {
                day[slotKey] = [];
            }
        });
    });

    ws.schemaVersion = 2;
    return ws;
}

function getSlotTasks(day, slotKey) {
    if (!day) return [];
    const slot = day[slotKey];
    if (!slot) return [];
    if (Array.isArray(slot)) {
        return slot.filter(t => t && (t.text || t.modId || (t.subject && t.subject !== 'pending')));
    }
    if (typeof slot === 'object') {
        if (Array.isArray(slot.tasks)) {
            return slot.tasks.filter(t => t && (t.text || t.modId || (t.subject && t.subject !== 'pending')));
        }
        if (slot.text && slot.text.trim() && slot.subject && slot.subject !== 'pending') {
            return [slot];
        }
    }
    return [];
}

// 导出全局初始数据对象与分类树
window.TAXONOMY_TREE = TAXONOMY_TREE;
window.generateFullScheduleSkeleton = generateFullScheduleSkeleton;
window.generateWorkspaceMilestones = generateWorkspaceMilestones;
window.createDefaultWorkspaceSkeleton = createDefaultWorkspaceSkeleton;
window.createSampleWorkspace = createSampleWorkspace;
window.migrateWorkspaceData = migrateWorkspaceData;
window.getSlotTasks = getSlotTasks;
window.APP_INITIAL_DATA = {
    schedule: generateFullScheduleSkeleton(),
    subjects: INITIAL_MACRO_SUBJECTS,
    taskPool: INITIAL_TASK_POOL,
    milestones: INITIAL_MONTHLY_MILESTONES,
    taxonomy: TAXONOMY_TREE,
    startDate: DEFAULT_SCHEDULE_START,
    endDate: DEFAULT_SCHEDULE_END,
    examDate: EXAM_DATE,
    version: "1.1.0"
};

