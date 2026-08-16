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
  <a href="#功能特性">功能特性</a> •
  <a href="#系统要求">系统要求</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#本地打包">本地打包</a> •
  <a href="#技术架构">技术架构</a> •
  <a href="#开源许可">开源许可</a>
</p>

</div>

---

## 概述

KaoyanFlow 是一款专为研究生入学考试备考设计的跨平台桌面排期工具。它将微观的每日三段式（上午 / 下午 / 晚上）学习计划与宏观的学科总体完成度统计打通，帮助考生有序管理长周期的复习规划。

---

## 功能特性

### 1. 每日日程规划 (Daily Timeline)
- **三段式颗粒度**：按上午、下午、晚上排布各学科学习任务与考点；
- **多重视图**：支持紧凑表格视图、周看板视图与月度日历视图切换；
- **月份筛选与历史折叠**：支持按公历月份筛选排期，可折叠隐藏当天之前的历史记录；
- **休息日管理**：支持单休、双休或自定义休息日设定，可切换休息日与学习日状态。

### 2. 学科看板与统计 (Subject Dashboard)
- **自动汇总统计**：基于每日排期数据，自动计算各学科的计划课时数、已完成课时数及完成百分比；
- **初试倒计时**：基于设定的初试目标日期显示剩余备考天数；
- **重点板块跟踪**：展示当前正在进行的知识模块与剩余排期进度。

### 3. 月度战略里程碑 (Monthly Milestones)
- **按月制定阶段目标**：将全周期复习目标按自然月份进行拆解；
- **目标与状态对照**：支持记录各月的主题、备考阶段（基础/强化/冲刺）与具体目标清单。

### 4. 任务预设与题库管理 (Presets Hub)
- **知识点与板块分类**：支持按学科自定义题库板块与章节考点列表；
- **级联更新机制**：修改或删除考点名称时，可选择同步更新全量日程中已引用的同名任务。

### 5. 智能排期顺延 (Schedule Shifter)
- **自动顺延**：遭遇突发情况时，可输入顺延天数，系统自动跳过例行休息日，将后续未完成任务向后平移；
- **快照还原**：顺延或批量操作后提供快照撤回机制，防止误操作。

### 6. 批量规律排期 (Batch Scheduling)
- **周期性规律填充**：支持按每日、隔日或每周固定日期批量生成指定板块的任务排期；
- **冲突处理**：支持在填充时选择覆盖现有任务或保留已有安排。

### 7. 本地优先与数据管理 (Local-First Storage)
- **本地文件存储**：数据直接保存在本地系统目录（`workspaces.json`），无需注册与联网；
- **滚动安全备份**：数据变动时自动在 `backups/` 目录保留快照；
- **多规划区与回收站**：支持创建多个独立的备考规划区，删除的规划区可在回收站保留 7 天并支持恢复。

---

## 系统要求

| 操作系统 | 架构支持 | 最低版本要求 |
| :--- | :--- | :--- |
| **macOS** | **Apple Silicon (arm64)** | macOS 10.15 (Catalina) 或更高版本 |
| **Windows** | **x64 (64-bit)** | Windows 10 / Windows 11 |

> **说明**：macOS 目前仅支持搭载 Apple 芯片（M 系列）的设备，暂未提供 Intel (x86_64) 架构的预编译版本。

---

## 快速开始

### 运行环境
- [Node.js](https://nodejs.org/) (`>= 18.0.0`)
- npm 或 yarn

### 本地开发与启动

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

## 本地打包

本项目使用 `electron-builder` 进行打包构建：

```bash
# 构建 macOS 应用程序 (.app / .dmg)
npm run build:mac

# 仅构建本地解压运行目录
npm run pack

# 构建 Windows 安装包 (.exe / Portable)
npm run build:win
```

构建输出文件位于 `dist/` 目录。

---

## 技术架构

```text
KaoyanFlow/
├── index.html           # 页面结构与模态弹窗
├── style.css            # 样式与主题变量定义
├── main.js              # Electron 主进程：窗口管理、文件持久化、版本更新检查
├── preload.js           # Electron 预加载脚本与安全 API 暴露
├── data-init.js         # 默认学科数据骨架与规划区初始化工厂
├── app.js               # 渲染进程主逻辑：状态管理、排期计算、统计分析与 DOM 渲染
└── vendor/
    └── fontawesome/     # 本地化矢量图标库
```

- **原生技术栈**：基于 HTML5、Vanilla CSS 与 ES6+ JavaScript 构建，无需前端打包构建工具；
- **数据流设计**：视图与统计指标均由内部状态对象实时派生，保证数据一致性。

---

## 开源许可

本项目基于 [MIT License](LICENSE) 协议开源。
