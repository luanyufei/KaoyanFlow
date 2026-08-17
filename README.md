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
  <a href="#安装方法">安装方法</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#本地打包">本地打包</a> •
  <a href="#项目结构">项目结构</a> •
  <a href="#版权与许可">版权与许可</a>
</p>

</div>

---

## 概述

KaoyanFlow 是一个本地运行的考研备考排期与进度管理桌面应用。

它以每日三段式（上午 / 下午 / 晚上）日程表为核心数据源，自动汇总各学科复习进度与月度目标。所有数据均保存在本地，无需联网即可使用。

---

## 功能特性

### 每日日程规划
- **三段式排期**：每天划分为上午、下午、晚上三个固定时段，分别记录学科任务与考点。
- **多种视图模式**：提供紧凑表格、周看板和月度日历三种视图。
- **筛选与折叠**：可按月份快速过滤日程，也支持一键折叠过去日期的历史记录。
- **休息日配置**：支持单休、双休及自定义休息日，随时切换某一天的学习/休息状态。

### 学科看板与进度统计
- **自动计算进度**：直接根据日程表的完成情况计算各学科总课时、已完成课时与完成百分比，不需要手动统计。
- **初试倒计时**：根据设定的初试日期实时计算剩余备考天数。
- **重点板块跟踪**：汇总展示各科目正在进行的知识板块与章节进度。

### 月度备考里程碑
- **阶段目标拆解**：按自然月设定备考主线、阶段重心（基础 / 强化 / 冲刺）与量化目标。
- **进度对照**：记录各月份的任务规划与实际达成情况。

### 题库与预设管理
- **考点预设库**：按学科建立知识点板块与章节习题集（如 660、880、历年真题等）。
- **级联同步**：在预设库中重命名或删除考点时，可一键同步更新历史与未来日程中的同名任务。

### 智能排期顺延
- **跳过休息日后移**：遇到突发情况复习中断时，指定起始日期将未完成任务按学习日整体往后顺延，自动避开休息日。
- **快速撤回通道**：顺延等批量操作后 5 秒内可一键还原，防止误触。

### 规律排期向导
- **周期批量生成**：支持按每天、隔天或每周固定周期快速填充复习计划。
- **排期冲突处理**：批量填充时可选择覆盖现有任务或跳过已占用时段。

### 本地存储与多规划区
- **本地文件存储**：数据保存于本地物理文件（`workspaces.json`），完全断网可用，保护隐私。
- **滚动安全备份**：数据变动时自动在 `backups/` 目录保留历史快照。
- **多规划区管理**：支持创建多个独立的备考档案；误删的规划区在回收站保留 7 天，支持一键恢复。

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

## 安装方法

直接前往 [GitHub Releases 最新发布页](https://github.com/luanyufei/KaoyanFlow/releases/latest) 下载对应系统的安装包：

### macOS (Apple Silicon)
1. 下载 `KaoyanFlow-*-arm64.dmg`（或 `.zip` 压缩包）；
2. 双击打开镜像，将 `KaoyanFlow.app` 拖入 `Applications`（应用程序）文件夹；
3. 若首次打开提示“已损坏”或“无法验证开发者”，在系统终端中执行如下命令即可正常启动：
   ```bash
   xattr -cr /Applications/KaoyanFlow.app
   ```

### Windows (x64 / arm64)
1. 下载 `KaoyanFlow Setup *.exe`；
2. 双击运行安装向导，按提示完成安装即可（安装程序会自动识别并部署适配您设备架构的程序）。

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
