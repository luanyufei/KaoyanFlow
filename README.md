<div align="center">

# KaoyanFlow

<p align="center">
  <strong>面向考研备考的日程排期与进度管理桌面应用</strong>
</p>

<p align="center">
  <a href="https://github.com/luanyufei/KaoyanFlow/releases"><img src="https://img.shields.io/badge/Release-v1.0.0-2563eb?style=flat-square&logo=github" alt="Release"></a>
  <img src="https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon)%20%7C%20Windows-475569?style=flat-square&logo=apple" alt="Platform">
  <img src="https://img.shields.io/badge/Stack-Electron%2033%20%7C%20Vanilla%20JS-059669?style=flat-square&logo=javascript" alt="Stack">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-d97706?style=flat-square" alt="License"></a>
  <a href="https://github.com/luanyufei"><img src="https://img.shields.io/badge/Author-FEEFEENOON-7c3aed?style=flat-square" alt="Author"></a>
</p>

<p align="center">
  <a href="#概述">概述</a> •
  <a href="#功能特性">功能特性</a> •
  <a href="#系统支持">系统支持</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#本地打包">本地打包</a> •
  <a href="#项目结构">项目结构</a> •
  <a href="#版权与许可">版权与许可</a>
</p>

</div>

---

## 概述

**KaoyanFlow** 是一款专为考研学子打造的跨平台排期与宏观进度管理桌面应用。系统采用每日三段式（上午 / 下午 / 晚上）颗粒度，将微观的每日学习任务与宏观的学科完成度统计、月度里程碑深度结合，帮助考生清晰把控全周期备考节奏。

---

## 功能特性

### 1. 每日日程规划 (Daily Timeline)
- **三段式排期**：按上午、下午、晚上分别排布各学科学习任务与考点内容；
- **多重视图**：支持紧凑表格视图、周看板视图与月度日历视图切换；
- **月份筛选与历史折叠**：支持按公历月份快速筛选排期，支持一键折叠隐藏当天之前的历史记录；
- **休息日管理**：支持单休、双休与自定义休息日配置，支持快速切换休息日与学习日状态。

### 2. 学科看板与进度统计 (Subject Dashboard)
- **自动化指标派生**：以每日排期表为唯一事实源，实时自动计算各学科的总课时、已完成课时及完成百分比；
- **初试倒计时**：基于目标初试日期动态显示剩余备考天数；
- **重点板块追踪**：直观展示各学科进行中的知识板块与复习进度。

### 3. 月度备考里程碑 (Monthly Milestones)
- **阶段目标拆解**：按自然月份制定备考主线、阶段重点（基础 / 强化 / 冲刺）与具体量化目标；
- **目标对照管理**：直观记录每月攻坚重点与实际达成情况。

### 4. 题库与预设管理 (Question Bank & Presets)
- **模块化考点库**：支持按学科自定义维护题库集、板块分类与章节考点；
- **级联同步更新**：修改或删除预设考点时，支持选择全量同步更新历史与未来日程中的对应任务。

### 5. 智能排期顺延 (Smart Schedule Shift)
- **学习日顺延**：遭遇突发变动时，系统自动跳过例行休息日，将指定日期起的未完成任务按学习日整体后移；
- **撤回保障**：顺延与批量操作后提供 5 秒快速撤回机制，防止误操作。

### 6. 规律排期向导 (Batch Scheduling)
- **周期性规律填充**：支持按每日、隔日或每周固定周期批量生成指定考点任务；
- **冲突处理策略**：填充时可自主选择覆盖现有安排或跳过已占用时段。

### 7. 本地存储与多规划区 (Local-First Persistence)
- **本地文件持久化**：数据直存本地物理文件（`workspaces.json`），完全断网可用，保护个人备考数据隐私；
- **滚动安全备份**：数据变动时自动在 `backups/` 目录保留历史快照；
- **多档案隔离**：支持创建多个独立的考研规划区，删除的规划区可在回收站保留 7 天并支持一键恢复。

---

## 系统支持

| 操作系统 | 架构支持 | 最低系统版本 |
| :--- | :--- | :--- |
| **macOS** | **Apple Silicon (arm64)** | macOS 11.0 (Big Sur) 及以上 |
| **Windows** | **x64 / arm64** | Windows 10 / Windows 11 |

> **说明**：
> - macOS 安装包原生适配 Apple Silicon（M 系列芯片）；
> - Windows 安装程序内置适配 x64（Intel/AMD）与 arm64（高通骁龙/ARM 设备），安装时将自动识别并部署对应架构程序。

---

## 快速开始

### 环境准备
- [Node.js](https://nodejs.org/) (`>= 18.0.0`)
- npm 或 yarn

### 本地运行

```bash
# 1. 克隆代码仓库
git clone https://github.com/luanyufei/KaoyanFlow.git
cd KaoyanFlow

# 2. 安装项目依赖
npm install

# 3. 启动开发客户端
npm start
```

---

## 本地打包

本项目使用 `electron-builder` 进行跨平台构建打包：

```bash
# 构建 macOS 应用程序 (.dmg / .zip)
npm run build:mac

# 构建 Windows 安装程序 (.exe)
npm run build:win

# 仅构建本地解压运行目录 (dist/mac-arm64 或 dist/win-unpacked)
npm run pack
```

构建产物输出于 `dist/` 目录。

---

## 项目结构

```text
KaoyanFlow/
├── index.html           # 应用主界面结构与各模块弹窗定义
├── style.css            # 全局样式系统、8 色主题调色盘与暗黑模式适配
├── main.js              # Electron 主进程：窗口生命周期管理、本地文件读写与版本更新检测
├── preload.js           # 预加载脚本：上下文隔离桥接与系统级 API 暴露
├── data-init.js         # 预设学科题库配置、初始示例数据与新建规划区数据生成
├── app.js               # 渲染进程主逻辑：状态管理、排期运算、派生统计分析与视图渲染
└── vendor/
    └── fontawesome/     # 本地化 Font Awesome 6 矢量图标库
```

---

## 版权与许可 (Copyright & License)

- **版权归属**：本项目由 [FEEFEENOON (luanyufei)](https://github.com/luanyufei) 独立设计与开发，享有完整的原创著作权。
- **严禁商用声明**：本项目仅供考研个人学习交流与备考规划使用。**未经原作者明确书面授权许可，严禁任何个人或商业机构将本项目的全部或部分代码、编译安装包、界面设计、逻辑实现及衍生版本用于任何形式的商业盈利、收费课程、付费分发或捆绑销售**。
- **开源协议**：本项目基于 [MIT License](LICENSE) 协议开源。在合规的非商业用途下，任何引用或二次开发均须完整保留原作者署名及原始版权声明。
