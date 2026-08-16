<div align="center">

# <img src="https://api.iconify.design/fa6-solid:graduation-cap.svg?color=%232563eb" width="32" height="32" style="vertical-align: -6px;" /> KaoyanFlow

<p align="center">
  <strong>现代化 · 任务驱动型 · 全周期考研备考排期与宏观进度攻坚系统</strong>
</p>

<p align="center">
  <a href="https://github.com/luanyufei/KaoyanFlow/releases"><img src="https://img.shields.io/badge/Release-v1.0.0-2563eb?style=flat-square&logo=github" alt="Release"></a>
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-475569?style=flat-square&logo=apple" alt="Platform">
  <img src="https://img.shields.io/badge/Stack-Electron%2033%20%7C%20Vanilla%20JS-059669?style=flat-square&logo=javascript" alt="Stack">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-d97706?style=flat-square" alt="License"></a>
  <a href="https://github.com/luanyufei"><img src="https://img.shields.io/badge/Author-FEEFEENOON-7c3aed?style=flat-square" alt="Author"></a>
</p>

<p align="center">
  <a href="#核心功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#桌面端打包">桌面端打包</a> •
  <a href="#架构与设计理念">技术架构</a> •
  <a href="#作者与鸣谢">作者与鸣谢</a>
</p>

</div>

---

## <img src="https://api.iconify.design/fa6-solid:circle-question.svg?color=%232563eb" width="20" height="20" style="vertical-align: -3px;" /> 为什么需要 KaoyanFlow

在长达数月乃至一整年的考研备战过程中，普通的待办清单（Todo List）和通用日历软件往往无法满足复杂的考研需求：

- **普通待办软件**：仅记录零散事项，缺乏按日划分（上午 / 下午 / 晚上）的三段式作息颗粒度，更无法统计各学科的宏观攻坚进度；
- **通用日历 / 甘特图**：一旦遇到突发事件（生病、学校期末考试、毕业设计），几十天的备考排期全部被打乱，手动挪动日程极其繁琐；
- **在线文档 / 云笔记**：排版维护繁琐，缺乏数据关联与图表分析，且存在断网不可用或数据隐私顾虑。

**KaoyanFlow** 将**微观的每日三段式任务排期**与**宏观的学科攻坚进度大盘**深度打通，让每一天的复习节奏与宏观进度尽在掌控。

---

## <img src="https://api.iconify.design/fa6-solid:cubes.svg?color=%232563eb" width="20" height="20" style="vertical-align: -3px;" /> 核心功能特性

### <img src="https://api.iconify.design/fa6-solid:calendar-days.svg?color=%232563eb" width="18" height="18" style="vertical-align: -2px;" /> 1. 每日日程规划 (Daily Timeline)
- **三段式颗粒度排期**：按上午、下午、晚上精确排布学习科目与任务；
- **三重视图切换**：
  - **紧凑表格视图**：高密度展示全周期复习规划；
  - **周历看板视图**：按周聚焦当前冲刺重点；
  - **月度日历视图**：全景掌控全局时间分配；
- **月份筛选与历史折叠**：支持按月份快速跳转，默认自动折叠今天之前的历史日期；
- **休息日支持**：支持周六周日双休或单休灵活设定，一键切换例行休息日与临时冲刺日。

### <img src="https://api.iconify.design/fa6-solid:chart-pie.svg?color=%23059669" width="18" height="18" style="vertical-align: -2px;" /> 2. 学科看板 & 进度大盘 (Subject Dashboard & Macro Analytics)
- **100% 自动派生计算**：宏观进度无需手动记账，系统根据每日排期表自动汇总总课时、已完成课时与完成百分比；
- **全学科进度大盘**：涵盖数学、专业课、英语、思想政治理论四大核心科目；
- **智能主线板块定位**：自动识别当前攻坚主线与各模块剩余任务量。

### <img src="https://api.iconify.design/fa6-solid:bullseye.svg?color=%23dc2626" width="18" height="18" style="vertical-align: -2px;" /> 3. 月度战略里程碑 (Monthly Milestones)
- **按自然月设定攻坚战略**：将全周期备考目标拆解至每个月份；
- **定量与定性目标管理**：设定当月各学科必攻克题库与真题阶段（如「9月完成 660 题第一轮」、「10月开启真题套卷」）；
- **动态横幅联动**：每日日程规划顶部实时提示当月战略目标。

### <img src="https://api.iconify.design/fa6-solid:layer-group.svg?color=%237c3aed" width="18" height="18" style="vertical-align: -2px;" /> 4. 题库与预设库管理 (Question Bank & Presets Hub)
- **自由定制考点与章节**：支持为各大科目自由新建或重命名题库板块（如 660题、880题、1000题、历年真题、专业课通原专题等）；
- **考点级联同步更新 (Cascade Sync)**：修改或删除考点名称时，智能扫描全量日程中已引用的任务，支持一键批量同步重命名、清空或保留原文本。

### <img src="https://api.iconify.design/fa6-solid:bolt.svg?color=%23f59e0b" width="18" height="18" style="vertical-align: -2px;" /> 5. 智能排期顺延引擎 (Smart Schedule Shifter)
- **突发情况一键顺延**：遭遇突发事件时，只需输入顺延天数，系统**自动跳过所有休息日**，将未完成任务按学习日向后智能平移；
- **5秒快照一键撤回 (Snapshot Undo)**：顺延操作后自动弹出撤回提示，误操作随时无损秒级还原。

### <img src="https://api.iconify.design/fa6-solid:wand-magic-sparkles.svg?color=%2306b6d4" width="18" height="18" style="vertical-align: -2px;" /> 6. 规律排期向导 (Batch Periodic Scheduling)
- **按规律批量排期**：支持按照「每日循环」、「隔天交替」、「每周固定日」批量将某一题库考点排入指定时段；
- **实时冲突预览**：智能检测排期冲突，支持覆盖或跳过已有任务。

### <img src="https://api.iconify.design/fa6-solid:shield-halved.svg?color=%2310b981" width="18" height="18" style="vertical-align: -2px;" /> 7. 本地物理存储与数据主权 (Local-First Architecture)
- **纯本地物理文件存储**：数据直接写入本地安全文件（`~/Library/Application Support/kaoyanflow/KaoyanFlow_Data/workspaces.json`），无需注册、无需联网，数据主权完全属于用户；
- **滚动安全备份**：数据变动自动在 `backups/` 目录保留历史快照；
- **多规划区（Multi-Workspace）隔离**：支持创建多个独立的考研规划区，支持一键导出/导入 `.json` 备份。

---

## <img src="https://api.iconify.design/fa6-solid:palette.svg?color=%232563eb" width="20" height="20" style="vertical-align: -3px;" /> 界面与交互设计

- **VSCode 极简桌面标题栏**：规划区居中胶囊切换，右上角集成极简三线功能菜单；
- **固定视口三段式布局**：顶部导航与底部状态栏始终静止，排期内容独立纵向滚动；
- **macOS 原生悬浮式自动隐藏滚动条**：滚动时轻柔浮现，停止滚动 1 秒内丝滑渐隐，不遮挡表格；
- **无缝深浅双主题 (Dark/Light Theme)**：精心调校的对比度与色彩，白天专注清晰，夜晚温润护眼。

---

## <img src="https://api.iconify.design/fa6-solid:rocket.svg?color=%232563eb" width="20" height="20" style="vertical-align: -3px;" /> 快速开始

### 环境依赖
- [Node.js](https://nodejs.org/) (建议版本 `>= 18.0.0`)
- npm / yarn / pnpm

### 本地运行与开发

```bash
# 1. 克隆代码仓库
git clone https://github.com/luanyufei/KaoyanFlow.git
cd KaoyanFlow

# 2. 安装依赖
npm install

# 3. 启动桌面客户端
npm start
```

---

## <img src="https://api.iconify.design/fa6-solid:box-archive.svg?color=%232563eb" width="20" height="20" style="vertical-align: -3px;" /> 桌面端打包

本项目已配置完善的 `electron-builder` 本地打包管线，可一键构建各平台独立可执行文件：

```bash
# 构建 macOS 客户端 (.app / .dmg)
npm run build:mac

# 快速生成本地 macOS 免签应用包
npm run pack

# 构建 Windows 客户端 (.exe / Portable)
npm run build:win
```

打包完成后，产物将生成在 `dist/` 目录下。

---

## <img src="https://api.iconify.design/fa6-solid:sitemap.svg?color=%232563eb" width="20" height="20" style="vertical-align: -3px;" /> 架构与设计理念

```text
KaoyanFlow/
├── index.html           # 结构骨架：三段式视口、Tab 容器、模态弹窗
├── style.css            # 完整设计系统：原生 CSS 变量、悬浮滚动条、响应式
├── main.js              # Electron 主进程：窗口管理、原生标题栏、IPC 通信与物理文件读写
├── preload.js           # Electron 安全沙箱桥接脚本
├── data-init.js         # 数据工厂：默认五级考研知识库架构与规划区初始化工厂
├── app.js               # 核心大脑：状态机、排期引擎、自动化宏观统计、级联同步
└── vendor/
    └── fontawesome/     # Font Awesome 6 本地化矢量图标库
```

- **零重型框架负担**：基于纯原生 HTML5 + Vanilla CSS3 + Modern ES6 JavaScript 构建，极速响应，启动毫秒级；
- **唯一事实源架构**：所有统计、图表、倒计时指标均由 `state.schedule` 实时派生计算，数据一致性有坚实保障。

---

## <img src="https://api.iconify.design/fa6-solid:heart.svg?color=%23ec4899" width="20" height="20" style="vertical-align: -3px;" /> 关于作者

- **作者**：**FEEFEENOON**
- **GitHub**：[@luanyufei](https://github.com/luanyufei)

如果你在考研备考中使用 KaoyanFlow 获得了帮助，欢迎给本项目点一个 Star 支持！  
祝愿每一位心怀梦想、披荆斩棘的考研学子：**一战成硕，成功上岸！**

---

## <img src="https://api.iconify.design/fa6-solid:scale-balanced.svg?color=%232563eb" width="20" height="20" style="vertical-align: -3px;" /> 开源许可证

本项目采用 [MIT License](LICENSE) 许可证开源。
