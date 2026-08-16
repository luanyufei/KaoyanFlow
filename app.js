/**
 * KaoyanFlow · 现代化任务驱动型考研备考系统 - 核心交互与业务逻辑 (v1.0.0)
 * 包含：多规划区隔离管理 / 欢迎向导 / 全动态日历 / 历史日期折叠 / 全局设置面板 / 题库管理
 */

(function () {
    'use strict';

    const WORKSPACES_STORAGE_KEY = 'kaoyan_planner_workspaces_v2';
    const LEGACY_STORAGE_KEY = '27kaoyan_plan_data_v6';
    const THEME_KEY = '27kaoyan_plan_theme';
    const ACCENT_KEY = '27kaoyan_plan_accent';
    const DARK_STYLE_KEY = '27kaoyan_plan_dark_style';
    const VIEW_MODE_KEY = '27kaoyan_plan_view_mode';

    // 全局状态管理
    const state = {
        workspaces: {},
        trashWorkspaces: {},
        sampleHidden: false,
        activeWorkspaceId: 'ws_default',
        workspace: null,
        schedule: {},
        subjects: {},
        taskPool: [],
        milestones: [],
        taxonomy: {},
        startDate: "2026-08-16",
        endDate: "2026-12-20",
        examDate: "2026-12-20",
        userName: "FEEFEENOON",
        targetYear: 27,
        currentTab: 'tab-timeline',
        viewMode: 'table', // 'table' | 'week' | 'month'
        monthFilter: 'all',
        searchKeyword: '',
        dayTypeFilter: 'all',
        subjectFilter: 'all',
        theme: 'light',
        accentColor: 'blue',
        darkStyle: 'classic',
        preferences: {
            viewMode: 'table',
            showPastDays: false,
            monthFilter: 'all',
            subjectFilter: 'all',
            theme: 'light',
            accentColor: 'blue',
            darkStyle: 'classic'
        },
        // 编辑菜单目标
        pickerTarget: {
            date: "2026-08-17",
            slot: "morning"
        },
        // 编辑模式：'mode-preset' (从题库预设选择) | 'mode-custom' (直接自定义输入)
        editMode: 'mode-preset',
        // 级联选择器暂存状态
        pickerState: {
            subject: "math",
            submodule: "m660",
            questionType: "choice",
            preset: ""
        },
        // 预设库 Tab 管理器状态
        hubState: {
            subject: "math",
            submodule: "m660",
            questionType: "choice",
            viewMode: "hub-list"
        },
        // 暂存待指派任务 ID / 里程碑编辑暂存 / 变动回调 / 休息日学习日转换暂存
        assigningTaskId: null,
        editingMilestoneMonth: null,
        editingSubmoduleKey: null,
        pendingCascadeAction: null,
        pendingRestToStudyDate: null,
        pendingStudyToRestDate: null
    };

    // ==========================================================================
    // 0. 多规划区管理与持久化 (Multi-Workspace Architecture & Zero Data Loss)
    // ==========================================================================

    async function initApp() {
        await loadWorkspaces();
        initTheme();
        initViewMode();
        initEventListeners();
        initEditModalEvents();
        initPresetHubEvents();
        initMilestoneEditorEvents();
        initCascadeSyncEvents();
        initScrollbarBehavior();
        initElectronUI();
        initAutoUpdateUI();
        updateCountdowns();
        renderAll();
    }

    async function loadWorkspaces() {
        let parsed = null;

        // 1. 优先尝试从 Electron 本地 JSON 文件读取
        if (window.electronAPI && window.electronAPI.isElectron) {
            try {
                const fileData = await window.electronAPI.loadWorkspaces();
                if (fileData && typeof fileData === 'object') {
                    parsed = fileData;
                    console.log('[Electron Storage] 成功从本地文件系统加载规划区数据');
                }
            } catch (err) {
                console.error('[Electron Storage] 读取本地文件失败:', err);
            }
        }

        // 2. 若未从文件获取到数据（非 Electron 环境或首次运行），尝试从 localStorage 读取
        if (!parsed) {
            const saved = localStorage.getItem(WORKSPACES_STORAGE_KEY);
            if (saved) {
                try {
                    parsed = JSON.parse(saved);
                } catch (e) {
                    console.error("加载多规划区失败", e);
                }
            }
        }

        if (parsed) {
            state.workspaces = parsed.workspaces || {};
            state.trashWorkspaces = parsed.trashWorkspaces || {};
            state.sampleHidden = !!parsed.sampleHidden;
            state.activeWorkspaceId = parsed.activeWorkspaceId || Object.keys(state.workspaces)[0];
        }

        // 自动清除超过 7 天的回收站数据
        purgeExpiredTrash();

        // 若仍无任何规划区（全新首次启动），创建默认纯净规划区并弹出引导向导
        if (!state.workspaces || Object.keys(state.workspaces).length === 0) {
            const newWs = window.createDefaultWorkspaceSkeleton({
                userName: '考研人',
                targetYear: 27,
                startDate: '2026-08-16',
                examDate: '2026-12-20'
            });
            state.workspaces = { [newWs.id]: newWs };
            state.activeWorkspaceId = newWs.id;
            saveWorkspaces();

            setTimeout(() => {
                openOnboardingWizard(true);
            }, 200);
        }

        syncStateWithActiveWorkspace();
    }

    function syncStateWithActiveWorkspace() {
        if (!state.workspaces[state.activeWorkspaceId]) {
            state.activeWorkspaceId = Object.keys(state.workspaces)[0];
        }
        const ws = state.workspaces[state.activeWorkspaceId];
        state.workspace = ws;
        if (!ws) {
            updateHeaderBrandUI();
            renderWorkspaceDropdown();
            return;
        }
        state.schedule = ws.schedule || {};
        state.subjects = ws.subjects || {};
        state.taskPool = ws.taskPool || [];
        state.milestones = ws.milestones || [];
        state.taxonomy = ws.taxonomy || window.TAXONOMY_TREE;
        state.startDate = ws.startDate || '2026-08-16';
        state.endDate = ws.endDate || ws.examDate || '2026-12-20';
        state.examDate = ws.examDate || '2026-12-20';
        state.userName = ws.userName || 'FEEFEENOON';
        state.targetYear = ws.targetYear || 27;
        state.preferences = ws.preferences || { viewMode: 'table', showPastDays: false, monthFilter: 'all', subjectFilter: 'all', theme: 'light', accentColor: 'blue', darkStyle: 'classic' };
        state.viewMode = state.preferences.viewMode || 'table';
        state.monthFilter = state.preferences.monthFilter || 'all';

        // 同步顶栏品牌与规划区下拉 UI
        updateHeaderBrandUI();
        renderWorkspaceDropdown();

        // 同步过去日期复选框
        const pastChk = document.getElementById('chk-show-past-days');
        if (pastChk) pastChk.checked = !!state.preferences.showPastDays;

        // 同步主题、强调色与视图
        if (state.preferences.theme) {
            setTheme(state.preferences.theme);
        }
        if (state.preferences.accentColor) {
            setAccentColor(state.preferences.accentColor);
        }
        if (state.preferences.darkStyle) {
            setDarkStyle(state.preferences.darkStyle);
        }
    }

    let saveStatusTimer = null;
    function showSavingState() {
        const indicator = document.getElementById('status-save-indicator');
        const icon = document.getElementById('status-save-icon');
        const text = document.getElementById('status-save-text');
        if (indicator && icon && text) {
            indicator.className = 'status-save-indicator saving';
            icon.className = 'fa-solid fa-circle-notch fa-spin';
            text.textContent = '正在自动保存...';
        }
    }

    function showSavedState() {
        if (saveStatusTimer) clearTimeout(saveStatusTimer);
        saveStatusTimer = setTimeout(() => {
            const indicator = document.getElementById('status-save-indicator');
            const icon = document.getElementById('status-save-icon');
            const text = document.getElementById('status-save-text');
            if (indicator && icon && text) {
                indicator.className = 'status-save-indicator saved';
                icon.className = 'fa-solid fa-check';
                text.textContent = '已自动保存';
            }
        }, 300);
    }

    function saveWorkspaces() {
        showSavingState();
        if (state.workspace && !state.workspace.isSample) {
            state.workspace.schedule = state.schedule;
            state.workspace.subjects = state.subjects;
            state.workspace.taskPool = state.taskPool;
            state.workspace.milestones = state.milestones;
            state.workspace.taxonomy = state.taxonomy;
            state.workspace.startDate = state.startDate;
            state.workspace.endDate = state.endDate;
            state.workspace.examDate = state.examDate;
            state.workspace.userName = state.userName;
            state.workspace.targetYear = state.targetYear;
            state.workspace.preferences = {
                viewMode: state.viewMode,
                showPastDays: !!(state.preferences && state.preferences.showPastDays),
                monthFilter: state.monthFilter || 'all',
                subjectFilter: state.subjectFilter || 'all',
                theme: state.preferences?.theme || state.themeChoice || 'system',
                accentColor: state.preferences?.accentColor || state.accentColor || 'blue',
                darkStyle: state.preferences?.darkStyle || state.darkStyle || 'classic'
            };
            state.workspace.updatedAt = new Date().toISOString();
        }

        const dataToSave = {
            activeWorkspaceId: state.activeWorkspaceId,
            workspaces: state.workspaces,
            trashWorkspaces: state.trashWorkspaces || {},
            sampleHidden: !!state.sampleHidden,
            savedAt: new Date().toISOString()
        };

        // 1. 同步保存至 localStorage 作为双保险
        try {
            localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (e) {}

        // 2. 在 Electron 环境中，持久化到系统本地文件并生成每日备份
        if (window.electronAPI && window.electronAPI.isElectron) {
            window.electronAPI.saveWorkspaces(dataToSave).catch(err => {
                console.error('[Electron Storage] 写入本地文件失败:', err);
            });
            window.electronAPI.saveActiveWorkspaceId(state.activeWorkspaceId).catch(err => {});
        }

        updateBadgeCounts();
        showSavedState();
    }

    async function initElectronUI() {
        if (window.electronAPI && window.electronAPI.isElectron) {
            const card = document.getElementById('electron-storage-card');
            const pathDisplay = document.getElementById('electron-storage-path-display');
            if (card) card.style.display = 'block';

            try {
                const info = await window.electronAPI.getDataPath();
                if (pathDisplay && info) {
                    pathDisplay.innerHTML = `<span style="color:var(--color-primary); font-weight:600;"><i class="fa-regular fa-file-code"></i> 数据文件：</span>${info.workspacesFile}<br><span style="color:var(--color-success); font-weight:600; margin-top:3px; display:inline-block;"><i class="fa-solid fa-clock-rotate-left"></i> 自动备份：</span>${info.backupDir}`;
                }
            } catch (err) {
                console.error('[Electron Storage] 获取路径失败:', err);
            }

            document.getElementById('btn-open-local-data-folder')?.addEventListener('click', () => {
                window.electronAPI.openDataFolder();
            });
        }
    }

    // ==========================================================================
    // 自动更新 UI 状态机与交互引擎 (圆圈下载 -> 椭圆进度 -> 立即重启)
    // ==========================================================================
    function initAutoUpdateUI() {
        const container = document.getElementById('titlebar-update-container');
        const updateBtn = document.getElementById('btn-titlebar-update');
        const updateText = document.getElementById('update-text');
        const iconIdle = updateBtn?.querySelector('.icon-update-idle');
        const iconLoading = updateBtn?.querySelector('.icon-update-loading');
        const iconRestart = updateBtn?.querySelector('.icon-update-restart');

        if (!container || !updateBtn) return;

        let currentUpdateState = 'hidden'; // 'available' | 'downloading' | 'downloaded'

        const setUpdateState = (state, data = {}) => {
            currentUpdateState = state;
            if (state === 'available') {
                container.style.display = 'inline-flex';
                updateBtn.className = 'titlebar-update-btn state-available';
                updateBtn.title = `发现新版本 v${data.latestVersion || ''}，点击开始下载`;
                if (iconIdle) iconIdle.style.display = 'inline-block';
                if (iconLoading) iconLoading.style.display = 'none';
                if (iconRestart) iconRestart.style.display = 'none';
                if (updateText) updateText.style.display = 'none';
            } else if (state === 'downloading') {
                container.style.display = 'inline-flex';
                updateBtn.className = 'titlebar-update-btn state-downloading';
                updateBtn.title = '正在下载更新包...';
                if (iconIdle) iconIdle.style.display = 'none';
                if (iconLoading) iconLoading.style.display = 'inline-block';
                if (iconRestart) iconRestart.style.display = 'none';
                if (updateText) {
                    updateText.style.display = 'inline-block';
                    updateText.textContent = `${data.percent || 0}%`;
                }
            } else if (state === 'downloaded') {
                container.style.display = 'inline-flex';
                updateBtn.className = 'titlebar-update-btn state-downloaded';
                updateBtn.title = '新版本已下载完毕，点击立即重启并应用更新';
                if (iconIdle) iconIdle.style.display = 'none';
                if (iconLoading) iconLoading.style.display = 'none';
                if (iconRestart) iconRestart.style.display = 'inline-block';
                if (updateText) {
                    updateText.style.display = 'inline-block';
                    updateText.textContent = '立即重启';
                }
            } else {
                container.style.display = 'none';
            }
        };

        // 点击更新按钮交互
        updateBtn.addEventListener('click', async () => {
            if (currentUpdateState === 'available') {
                // 点击开始下载：变形为椭圆百分比
                setUpdateState('downloading', { percent: 0 });
                if (window.electronAPI && window.electronAPI.startDownloadUpdate) {
                    window.electronAPI.startDownloadUpdate();
                } else {
                    // Web 环境/离线时的优雅仿真模拟
                    simulateWebDownload();
                }
            } else if (currentUpdateState === 'downloaded') {
                // 点击立即重启
                if (window.electronAPI && window.electronAPI.quitAndInstallUpdate) {
                    window.electronAPI.quitAndInstallUpdate();
                } else {
                    showToast('🔄 正在重启 KaoyanFlow 应用更新...', 'success');
                    setTimeout(() => window.location.reload(), 800);
                }
            }
        });

        function simulateWebDownload() {
            let p = 0;
            const timer = setInterval(() => {
                p += Math.floor(Math.random() * 12) + 6;
                if (p >= 100) {
                    p = 100;
                    clearInterval(timer);
                    setUpdateState('downloaded');
                } else {
                    setUpdateState('downloading', { percent: p });
                }
            }, 200);
        }

        // 监听 Electron 主进程推送的更新生命周期事件
        if (window.electronAPI && window.electronAPI.isElectron) {
            window.electronAPI.onUpdateAvailable((info) => {
                console.log('[AutoUpdater] 发现新版本:', info);
                setUpdateState('available', info);
            });

            window.electronAPI.onDownloadProgress((progress) => {
                if (currentUpdateState === 'downloading') {
                    setUpdateState('downloading', { percent: progress.percent });
                }
            });

            window.electronAPI.onUpdateDownloaded((info) => {
                console.log('[AutoUpdater] 更新下载完成:', info);
                setUpdateState('downloaded', info);
            });
        }

        // 暴露全局便捷调试/体验接口 (可在控制台或关于面板直接调用)
        window.triggerUpdateDemo = (version = '1.0.1') => {
            setUpdateState('available', { latestVersion: version });
            showToast(`💡 已发现最新版本 v${version}！右上角已显示下载图标`, 'info');
        };
    }

    function saveData() {
        saveWorkspaces();
    }

    /**
     * 严格公历日期校验函数
     */
    function validateDateString(dateStr, label = "日期") {
        if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
            return { valid: false, message: `请输入有效的${label}！` };
        }
        const trimmed = dateStr.trim();
        const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
        if (!match) {
            return { valid: false, message: `${label}格式不正确（格式应为 YYYY-MM-DD）！` };
        }
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const d = parseInt(match[3], 10);

        if (y < 2000 || y > 2100) {
            return { valid: false, message: `${label}年份超出合理范围（2000~2100）！` };
        }
        if (m < 1 || m > 12) {
            return { valid: false, message: `${label}月份不正确（应为 1~12 月）！` };
        }

        const daysInMonth = new Date(y, m, 0).getDate();
        if (d < 1 || d > daysInMonth) {
            return { valid: false, message: `输入的${label}不合法（${y}年${m}月最多只有${daysInMonth}天）！` };
        }

        return {
            valid: true,
            year: y,
            month: m,
            day: d,
            formatted: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        };
    }

    /**
     * 表单日期输入错误可视化设置与聚焦
     */
    function setDateInputError(inputEl, hintEl, errorMessage) {
        if (inputEl) {
            inputEl.classList.add('input-error');
            inputEl.focus();
        }
        if (hintEl) {
            hintEl.className = 'form-hint form-hint-error';
            hintEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${errorMessage}`;
        }
        showToast(errorMessage, "error");
    }

    /**
     * 清除表单日期输入的红框与错误提示
     */
    function clearDateInputError(inputEl, hintEl, defaultHintText) {
        if (inputEl) {
            inputEl.classList.remove('input-error');
        }
        if (hintEl) {
            hintEl.className = 'form-hint';
            hintEl.textContent = defaultHintText;
        }
    }

    // ==========================================================================
    // 撤回系统 (Undo Engine Core Helpers)
    // ==========================================================================

    function takeWorkspaceSnapshot() {
        if (!state.workspace) return null;
        try {
            return JSON.stringify(state.workspace);
        } catch (e) {
            console.error("Failed to take workspace snapshot:", e);
            return null;
        }
    }

    function restoreWorkspaceSnapshot(snapshotStr) {
        if (!snapshotStr) return;
        try {
            const restoredWs = JSON.parse(snapshotStr);
            state.workspace = restoredWs;
            state.workspaces[state.activeWorkspaceId] = restoredWs;
            syncStateWithActiveWorkspace();
            saveWorkspaces();
            renderAll();
            showToast("已成功撤回上一步操作！", "info");
        } catch (e) {
            console.error("Failed to restore workspace snapshot:", e);
            showToast("撤回失败", "error");
        }
    }

    // ==========================================================================
    // 只读样板间与回收站体系 (Sample Workspace & Trash Bin Engine)
    // ==========================================================================

    function isCurrentWorkspaceReadOnly() {
        return !!(state.workspace && (state.workspace.isSample || state.workspace.isReadOnly));
    }

    function checkReadOnlyAndWarn() {
        if (isCurrentWorkspaceReadOnly()) {
            showToast("样板间仅供查看，不可修改！", "warning");
            return true;
        }
        return false;
    }

    function openSampleWorkspace() {
        closeOnboardingWizard();
        closeWorkspaceDropdown();
        closeTitlebarMenu();

        // 检查 sample 是否已在 workspaces 中
        if (state.workspaces && state.workspaces['ws_sample_26']) {
            state.sampleHidden = false;
            state.activeWorkspaceId = 'ws_sample_26';
            syncStateWithActiveWorkspace();
            saveWorkspaces();
            renderAll();
            showToast("已打开【家徒四壁网盘姐】26考研样板规划区！", "success");
            return;
        }

        // 创建全新的样板规划区
        const sampleWs = window.createSampleWorkspace();
        if (!state.workspaces) state.workspaces = {};
        state.workspaces[sampleWs.id] = sampleWs;
        state.activeWorkspaceId = sampleWs.id;
        state.sampleHidden = false;

        syncStateWithActiveWorkspace();
        saveWorkspaces();
        renderAll();
        showToast("✨ 已打开【家徒四壁网盘姐】26考研样板规划区！", "success");
    }
    window.openSampleWorkspace = openSampleWorkspace;

    function purgeExpiredTrash() {
        if (!state.trashWorkspaces) return;
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;
        let changed = false;
        Object.keys(state.trashWorkspaces).forEach(id => {
            const item = state.trashWorkspaces[id];
            if (item && item.deletedAt) {
                const deletedTime = new Date(item.deletedAt).getTime();
                if (now - deletedTime > SEVEN_DAYS_MS) {
                    delete state.trashWorkspaces[id];
                    changed = true;
                }
            }
        });
        if (changed) {
            saveWorkspaces();
        }
    }

    function openTrashBinModal() {
        closeWorkspaceDropdown();
        closeTitlebarMenu();
        purgeExpiredTrash();
        renderTrashBinList();
        openModal('modal-trash-bin');
    }
    window.openTrashBinModal = openTrashBinModal;

    function renderTrashBinList() {
        const container = document.getElementById('trash-list-container');
        if (!container) return;

        const trashIds = Object.keys(state.trashWorkspaces || {});
        if (trashIds.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 36px 16px; color: var(--text-muted);">
                    <div style="font-size: 32px; margin-bottom: 10px; opacity: 0.5;"><i class="fa-solid fa-trash-can-arrow-up"></i></div>
                    <div style="font-size: 13.5px; font-weight: 600;">回收站是空的</div>
                    <div style="font-size: 11.5px; margin-top: 4px;">删除的规划区将在此暂存 7 天，可随时恢复</div>
                </div>
            `;
            return;
        }

        const now = Date.now();
        const ONE_DAY_MS = 24 * 3600 * 1000;

        container.innerHTML = trashIds.map(id => {
            const item = state.trashWorkspaces[id];
            const ws = item.workspace || {};
            const deletedTime = new Date(item.deletedAt).getTime();
            const elapsedDays = Math.floor((now - deletedTime) / ONE_DAY_MS);
            const remainingDays = Math.max(1, 7 - elapsedDays);

            const subjectCount = Object.keys(ws.subjects || {}).length;
            return `
                <div class="trash-item-card" data-trash-id="${id}">
                    <div class="trash-item-info">
                        <div class="trash-item-name">
                            <i class="fa-solid fa-graduation-cap" style="color:var(--color-primary); font-size:12px;"></i>
                            <span>${escapeHtml(ws.name || '未命名规划区')}</span>
                        </div>
                        <div class="trash-item-meta">
                            <span><i class="fa-solid fa-user" style="margin-right:3px;"></i>${escapeHtml(ws.userName || '考研人')} (${ws.targetYear || 27}届)</span>
                            <span><i class="fa-solid fa-book" style="margin-right:3px;"></i>${subjectCount}门科目</span>
                            <span class="trash-item-countdown"><i class="fa-solid fa-clock" style="margin-right:3px;"></i>剩余 ${remainingDays} 天清除</span>
                        </div>
                    </div>
                    <div class="trash-item-actions">
                        <button type="button" class="btn btn-xs btn-secondary" onclick="window.restoreWorkspaceFromTrash('${id}')" title="恢复至我的规划区">
                            <i class="fa-solid fa-rotate-left"></i> 恢复
                        </button>
                        <button type="button" class="btn btn-xs btn-ghost" onclick="window.permanentlyDeleteWorkspace('${id}')" style="color:var(--color-danger);" title="彻底删除无法找回">
                            <i class="fa-solid fa-xmark"></i> 彻底删除
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.restoreWorkspaceFromTrash = function (id) {
        if (!state.trashWorkspaces || !state.trashWorkspaces[id]) return;
        const ws = state.trashWorkspaces[id].workspace;
        delete state.trashWorkspaces[id];

        if (!state.workspaces) state.workspaces = {};
        state.workspaces[id] = ws;
        state.activeWorkspaceId = id;

        saveWorkspaces();
        syncStateWithActiveWorkspace();
        renderTrashBinList();
        renderAll();
        showToast(`✓ 已成功恢复规划区【${ws.name}】！`, "success");
    };

    window.permanentlyDeleteWorkspace = function (id) {
        if (!confirm("⚠️ 确定要彻底删除该规划区吗？彻底删除后将无法找回！")) return;
        if (state.trashWorkspaces && state.trashWorkspaces[id]) {
            delete state.trashWorkspaces[id];
            saveWorkspaces();
            renderTrashBinList();
            showToast("已彻底清除该规划区", "info");
        }
    };

    function clearAllTrash() {
        const trashIds = Object.keys(state.trashWorkspaces || {});
        if (trashIds.length === 0) {
            showToast("回收站已经是空的", "info");
            return;
        }
        if (!confirm(`⚠️ 确定要清空回收站吗？共有 ${trashIds.length} 个规划区将被彻底删除！`)) return;
        state.trashWorkspaces = {};
        saveWorkspaces();
        renderTrashBinList();
        showToast("已清空回收站", "info");
    }

    function updateHeaderBrandUI() {
        const uNameEl = document.getElementById('header-user-name');
        if (uNameEl) uNameEl.textContent = state.userName || '考研人';

        const tYearEl = document.getElementById('header-target-year');
        if (tYearEl) tYearEl.textContent = state.targetYear || 27;

        const titlebarNameEl = document.getElementById('titlebar-workspace-name');
        if (titlebarNameEl) {
            titlebarNameEl.textContent = state.workspace?.name || `${state.userName || '考研人'}的${state.targetYear || 27}考研规划`;
        }

        const isSample = !!(state.workspace && state.workspace.isSample);
        const sampleBadge = document.getElementById('titlebar-sample-badge');
        if (sampleBadge) {
            sampleBadge.style.display = isSample ? 'inline-flex' : 'none';
        }
    }

    function renderWorkspaceDropdown() {
        const listContainer = document.getElementById('workspace-list-items');
        if (!listContainer) return;

        const wsIds = Object.keys(state.workspaces || {});
        listContainer.innerHTML = wsIds.map(id => {
            const ws = state.workspaces[id];
            const isActive = (id === state.activeWorkspaceId);
            const isSample = !!ws.isSample;
            return `
                <div class="workspace-item ${isActive ? 'active' : ''}" onclick="window.switchWorkspace('${id}')">
                    <div class="workspace-item-title">
                        <i class="${isSample ? 'fa-solid fa-wand-magic-sparkles' : 'fa-solid fa-graduation-cap'}" style="font-size:12px; color:${isSample ? '#f59e0b' : 'var(--color-primary)'}; margin-right:4px;"></i>
                        <span>${escapeHtml(ws.name)}</span>
                        ${isSample ? '<span class="sample-ws-pill-badge">样板示范</span>' : ''}
                    </div>
                    ${isActive ? '<span style="font-size:11px; font-weight:700; color:var(--color-primary);"><i class="fa-solid fa-check"></i></span>' : ''}
                </div>
            `;
        }).join('');
    }

    window.switchWorkspace = function (id) {
        if (!state.workspaces[id]) return;
        state.activeWorkspaceId = id;
        syncStateWithActiveWorkspace();
        saveWorkspaces();
        closeWorkspaceDropdown();
        renderAll();
        showToast(`已切换至规划区：${state.workspace.name}`, "info");
    };

    function toggleWorkspaceDropdown(e) {
        if (e) e.stopPropagation();
        closeTitlebarMenu();
        const menu = document.getElementById('workspace-dropdown-menu');
        const wrap = document.getElementById('brand-workspace-wrapper');
        if (menu) {
            menu.classList.toggle('show');
            if (wrap) wrap.classList.toggle('open', menu.classList.contains('show'));
        }
    }

    function closeWorkspaceDropdown() {
        const menu = document.getElementById('workspace-dropdown-menu');
        const wrap = document.getElementById('brand-workspace-wrapper');
        if (menu) {
            menu.classList.remove('show');
        }
        if (wrap) {
            wrap.classList.remove('open');
        }
    }

    function toggleTitlebarMenu(e) {
        if (e) e.stopPropagation();
        closeWorkspaceDropdown();
        const menu = document.getElementById('titlebar-dropdown-menu');
        if (menu) {
            menu.classList.toggle('show');
        }
    }

    function closeTitlebarMenu() {
        const menu = document.getElementById('titlebar-dropdown-menu');
        if (menu) {
            menu.classList.remove('show');
        }
    }

    function initTheme() {
        const savedChoice = (state.preferences && state.preferences.theme) || localStorage.getItem(THEME_KEY) || 'system';
        setTheme(savedChoice);

        const savedAccent = (state.preferences && state.preferences.accentColor) || localStorage.getItem(ACCENT_KEY) || 'blue';
        setAccentColor(savedAccent);

        const savedDarkStyle = (state.preferences && state.preferences.darkStyle) || localStorage.getItem(DARK_STYLE_KEY) || 'classic';
        setDarkStyle(savedDarkStyle);

        // 监听操作系统深色/浅色模式切换
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (state.themeChoice === 'system') {
                    applyResolvedTheme('system');
                }
            });
        }
    }

    function applyResolvedTheme(choice) {
        let resolved = choice;
        if (choice === 'system') {
            resolved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', resolved);
    }

    function setTheme(choice) {
        if (!['light', 'dark', 'system'].includes(choice)) choice = 'system';
        state.themeChoice = choice;
        state.theme = choice;
        if (state.preferences) state.preferences.theme = choice;
        if (state.workspace && !state.workspace.isSample) {
            if (!state.workspace.preferences) state.workspace.preferences = {};
            state.workspace.preferences.theme = choice;
        }
        localStorage.setItem(THEME_KEY, choice);

        applyResolvedTheme(choice);

        // 同步右上角三线菜单栏主题分段控制按钮
        const badge = document.getElementById('menu-current-theme-badge');
        if (badge) {
            badge.textContent = choice === 'light' ? '浅色' : choice === 'dark' ? '深色' : '跟随系统';
        }

        document.querySelectorAll('#theme-segmented-control .theme-seg-btn').forEach(btn => {
            const val = btn.getAttribute('data-theme-choice');
            btn.classList.toggle('active', val === choice);
        });
    }

    function setAccentColor(color) {
        if (!['blue', 'green', 'purple', 'amber', 'rose', 'cyan', 'orange', 'slate'].includes(color)) color = 'blue';
        state.accentColor = color;
        if (state.preferences) state.preferences.accentColor = color;
        if (state.workspace && !state.workspace.isSample) {
            if (!state.workspace.preferences) state.workspace.preferences = {};
            state.workspace.preferences.accentColor = color;
        }
        localStorage.setItem(ACCENT_KEY, color);
        document.documentElement.setAttribute('data-accent', color);

        document.querySelectorAll('.onb-accent-swatch').forEach(swatch => {
            swatch.classList.toggle('selected', swatch.getAttribute('data-accent-val') === color);
        });
    }

    function setDarkStyle(style) {
        if (!['classic', 'pure-black'].includes(style)) style = 'classic';
        state.darkStyle = style;
        if (state.preferences) state.preferences.darkStyle = style;
        if (state.workspace && !state.workspace.isSample) {
            if (!state.workspace.preferences) state.workspace.preferences = {};
            state.workspace.preferences.darkStyle = style;
        }
        localStorage.setItem(DARK_STYLE_KEY, style);
        document.documentElement.setAttribute('data-dark-style', style);

        document.querySelectorAll('.onb-dark-depth-card').forEach(card => {
            card.classList.toggle('selected', card.getAttribute('data-depth') === style);
        });
    }

    function toggleTheme() {
        // 三态循环：浅色 -> 跟随系统 -> 深色 -> 浅色
        const nextMap = { light: 'system', system: 'dark', dark: 'light' };
        const next = nextMap[state.themeChoice || 'system'] || 'system';
        setTheme(next);
        saveWorkspaces();
        const textMap = { light: '已切换为保持浅色', system: '已切换为跟随系统', dark: '已切换为保持深色' };
        showToast(textMap[next] || '外观样式已更新');
    }

    function initViewMode() {
        let savedMode = (state.preferences && state.preferences.viewMode) || localStorage.getItem(VIEW_MODE_KEY) || 'table';
        if (savedMode === 'card') savedMode = 'month';
        setViewMode(savedMode, false);
    }

    function setViewMode(mode, doRender = true) {
        state.viewMode = mode;
        if (state.preferences) state.preferences.viewMode = mode;
        localStorage.setItem(VIEW_MODE_KEY, mode);
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            if (btn.getAttribute('data-mode') === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        if (doRender) {
            saveWorkspaces();
            renderTimeline();
        }
    }

    // ==========================================================================
    // 渲染管理
    // ==========================================================================

    function renderAll() {
        const hasWorkspaces = !!(state.workspace && Object.keys(state.workspaces || {}).length > 0);
        document.body.classList.toggle('is-empty-workspace', !hasWorkspaces);

        const emptyScreen = document.getElementById('empty-workspace-screen');
        const appHeader = document.querySelector('.app-header');
        const statusBar = document.getElementById('app-status-bar');
        const tabContents = document.querySelectorAll('.tab-content');
        const brandWrapper = document.getElementById('brand-workspace-wrapper');
        const menuWrapper = document.getElementById('titlebar-menu-wrapper');
        const updateContainer = document.getElementById('titlebar-update-container');

        if (!hasWorkspaces) {
            if (emptyScreen) emptyScreen.style.display = 'flex';
            if (appHeader) appHeader.style.display = 'none';
            if (statusBar) statusBar.style.display = 'none';
            if (brandWrapper) brandWrapper.style.display = 'none';
            if (menuWrapper) menuWrapper.style.display = 'none';
            if (updateContainer) updateContainer.style.display = 'none';
            tabContents.forEach(t => t.style.display = 'none');
            return;
        }

        if (emptyScreen) emptyScreen.style.display = 'none';
        if (appHeader) appHeader.style.display = 'flex';
        if (statusBar) statusBar.style.display = 'flex';
        if (brandWrapper) brandWrapper.style.display = 'inline-flex';
        if (menuWrapper) menuWrapper.style.display = 'block';

        const currentTab = state.activeTab || state.currentTab || 'tab-timeline';
        state.activeTab = currentTab;
        state.currentTab = currentTab;

        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab') === currentTab);
        });

        tabContents.forEach(t => {
            if (t.id === currentTab) {
                t.style.display = 'block';
                t.classList.add('active');
            } else {
                t.style.display = 'none';
                t.classList.remove('active');
            }
        });

        syncSubjectDropdowns();
        renderMonthFilters();
        renderTimeline();
        renderAnalyticsDashboard();
        renderMacroSubjects();
        renderMilestones();
        renderPresetHub();
        updateCountdowns();
        updateBadgeCounts();
        updateHeaderBrandUI();
        renderWorkspaceDropdown();
        renderFooterTargetScore();
    }

    function getOverflowDates() {
        const keys = Object.keys(state.schedule).filter(k => k > state.examDate).sort();
        return keys.filter(k => {
            const day = state.schedule[k];
            if (!day) return false;
            return (day.morning?.text?.trim() || day.afternoon?.text?.trim() || day.evening?.text?.trim());
        });
    }

    function cleanEmptyOverflowDates() {
        const keys = Object.keys(state.schedule).filter(k => k > state.examDate);
        keys.forEach(k => {
            const day = state.schedule[k];
            if (!day || (!day.morning?.text?.trim() && !day.afternoon?.text?.trim() && !day.evening?.text?.trim())) {
                delete state.schedule[k];
            }
        });
    }

    function updateOverflowAlertBanner() {
        const banner = document.getElementById('overflow-alert-banner');
        if (!banner) return;

        const overflowDates = getOverflowDates();
        if (overflowDates.length > 0) {
            banner.style.display = 'flex';
            const textEl = document.getElementById('overflow-alert-text');
            if (textEl) {
                textEl.innerHTML = `<strong><i class="fa-solid fa-triangle-exclamation"></i> 任务超出范围，需修改：</strong>当前有 <strong>${overflowDates.length} 天</strong> 的任务顺延超出了 ${state.examDate} 考研初试日期（${overflowDates[0]} ~ ${overflowDates[overflowDates.length - 1]}）！超期占位不可直接编辑，需向前提前排期消除。`;
            }
        } else {
            banner.style.display = 'none';
        }
    }

    // ==========================================================================
    // 宏观任务驱动分析引擎 (Automated Task-Driven Macro Analytics Engine)
    // ==========================================================================

    function matchTaskToSubmodule(subjectKey, taskText, customTaxonomy) {
        const text = (taskText || '').trim();
        if (!text) return { id: 'other', name: '常规自习' };

        const taxonomy = customTaxonomy || state.taxonomy || window.TAXONOMY_TREE || {};
        const curSub = taxonomy ? taxonomy[subjectKey] : null;
        let submodulesObj = curSub?.submodules || {};
        if (Object.keys(submodulesObj).length === 0 && curSub?.types) {
            submodulesObj = Object.assign({}, curSub.types.practice?.submodules || {}, curSub.types.lecture?.submodules || {});
        }

        const modKeys = Object.keys(submodulesObj);

        // 1. 严格直接匹配用户自己设定的板块名称
        for (const modId of modKeys) {
            const mod = submodulesObj[modId];
            if (mod && mod.name && text.includes(mod.name)) {
                return { id: modId, name: mod.name };
            }
        }

        // 2. 严格直接匹配用户自己在该板块下设定的预设清单
        for (const modId of modKeys) {
            const mod = submodulesObj[modId];
            if (mod) {
                const presets = mod.presets || (mod.questionTypes ? Object.values(mod.questionTypes).flatMap(q => q.presets || []) : []);
                if (presets.some(p => p && (text.includes(p) || p.includes(text)))) {
                    return { id: modId, name: mod.name };
                }
            }
        }

        // 3. 用户自定义文本分隔符提取 (如 "李林880 · 极限" -> "李林880")
        if (text.includes(' · ')) {
            const prefix = text.split(' · ')[0].trim();
            if (prefix) return { id: `user_${prefix}`, name: prefix };
        }
        if (text.includes('：')) {
            const prefix = text.split('：')[0].trim();
            if (prefix && prefix.length <= 15) return { id: `user_${prefix}`, name: prefix };
        }

        // 4. 回退：直接使用用户定义的第一个板块，或使用学科自身名称
        if (modKeys.length > 0) {
            return { id: modKeys[0], name: submodulesObj[modKeys[0]].name };
        }

        const subName = (state.subjects && state.subjects[subjectKey]?.name) || '学科';
        return { id: `sub_${subjectKey}`, name: `${subName}` };
    }

    function computeAutomatedMacroStats(targetMonth = null) {
        const monthFilter = (targetMonth !== undefined && targetMonth !== null) ? targetMonth : (state.macroMonthFilter || 'all');
        const todayStr = getTodayDateStr();
        const taxonomy = getPresetHubTaxonomy();
        const subjects = state.subjects || (state.workspace && state.workspace.subjects) || {};
        const subKeys = Object.keys(subjects);

        const stats = {
            totalAll: 0,
            completedAll: 0,
            remainingAll: 0,
            totalPct: 0,
            totalDays: 0,
            studiedDaysCount: 0,
            restDaysCount: 0,
            targetMonth: monthFilter,
            subjects: {}
        };

        subKeys.forEach(k => {
            const s = subjects[k];
            stats.subjects[k] = {
                id: k,
                name: s.name,
                color: s.color || 'primary',
                icon: s.icon || 'fa-solid fa-book',
                totalTasks: 0,
                completedTasks: 0,
                remainingTasks: 0,
                completionPct: 0,
                scheduledDays: new Set(),
                firstDate: null,
                lastDate: null,
                modulesMap: {}
            };
        });

        const uniqueStudiedDates = new Set();
        const uniqueRestDates = new Set();

        let dateKeys = Object.keys(state.schedule).sort();
        if (monthFilter && monthFilter !== 'all') {
            dateKeys = dateKeys.filter(k => k.startsWith(monthFilter));
        }
        stats.totalDays = dateKeys.length;

        dateKeys.forEach(dateKey => {
            const day = state.schedule[dateKey];
            if (!day) return;

            if (day.isRest) {
                uniqueRestDates.add(dateKey);
                return;
            }

            let dayHadTask = false;

            ['morning', 'afternoon', 'evening'].forEach(slotKey => {
                const slot = day[slotKey];
                if (slot && slot.text && slot.text.trim()) {
                    const subKey = slot.subject && stats.subjects[slot.subject] ? slot.subject : (subKeys[0] || 'math');
                    const subStat = stats.subjects[subKey];
                    if (!subStat) return;

                    dayHadTask = true;
                    const isCompleted = (dateKey <= todayStr);

                    subStat.totalTasks++;
                    stats.totalAll++;
                    if (isCompleted) {
                        subStat.completedTasks++;
                        stats.completedAll++;
                    } else {
                        subStat.remainingTasks++;
                        stats.remainingAll++;
                    }

                    subStat.scheduledDays.add(dateKey);
                    if (!subStat.firstDate || dateKey < subStat.firstDate) subStat.firstDate = dateKey;
                    if (!subStat.lastDate || dateKey > subStat.lastDate) subStat.lastDate = dateKey;

                    // 匹配所属板块
                    const matchedMod = matchTaskToSubmodule(subKey, slot.text, taxonomy);
                    if (!subStat.modulesMap[matchedMod.id]) {
                        subStat.modulesMap[matchedMod.id] = {
                            id: matchedMod.id,
                            name: matchedMod.name,
                            total: 0,
                            completed: 0,
                            remaining: 0,
                            progressPct: 0,
                            startDate: dateKey,
                            targetDate: dateKey
                        };
                    }

                    const modStat = subStat.modulesMap[matchedMod.id];
                    modStat.total++;
                    if (isCompleted) modStat.completed++;
                    else modStat.remaining++;

                    if (dateKey < modStat.startDate) modStat.startDate = dateKey;
                    if (dateKey > modStat.targetDate) modStat.targetDate = dateKey;
                }
            });

            if (dayHadTask) uniqueStudiedDates.add(dateKey);
        });

        stats.studiedDaysCount = uniqueStudiedDates.size;
        stats.restDaysCount = uniqueRestDates.size;
        stats.totalPct = stats.totalAll > 0 ? Math.round((stats.completedAll / Math.max(1, stats.totalAll)) * 100) : 0;

        const nowDate = new Date(todayStr + "T00:00:00");

        // 计算各模块状态与起止天数
        subKeys.forEach(k => {
            const subStat = stats.subjects[k];
            subStat.completionPct = subStat.totalTasks > 0 ? Math.round((subStat.completedTasks / Math.max(1, subStat.totalTasks)) * 100) : 0;
            subStat.daysCount = subStat.scheduledDays.size;

            const rawModules = Object.values(subStat.modulesMap);
            rawModules.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.targetDate.localeCompare(b.targetDate));

            subStat.modules = rawModules.map(mod => {
                mod.progressPct = mod.total > 0 ? Math.round((mod.completed / mod.total) * 100) : 0;
                const targetD = new Date(mod.targetDate + "T00:00:00");
                const startD = new Date(mod.startDate + "T00:00:00");
                const diffDays = Math.ceil((targetD - nowDate) / (1000 * 60 * 60 * 24));
                const startDiffDays = Math.ceil((startD - nowDate) / (1000 * 60 * 60 * 24));

                let status = 'in_progress';
                if (mod.progressPct === 100 || diffDays < 0) {
                    status = 'finished';
                } else if (startDiffDays > 0) {
                    status = 'upcoming';
                } else {
                    status = 'in_progress';
                }

                return {
                    ...mod,
                    diffDays: diffDays,
                    startDiffDays: startDiffDays,
                    status: status
                };
            });
        });

        return stats;
    }

    // 动态提取当前正在进行的未完成板块（按目标截止日期先后排序）
    function getActiveUpcomingModules() {
        const stats = computeAutomatedMacroStats();
        const activeList = [];

        Object.keys(stats.subjects).forEach(subKey => {
            const subStat = stats.subjects[subKey];
            (subStat.modules || []).forEach(mod => {
                if (mod.status === 'in_progress' || (mod.status === 'upcoming' && mod.startDiffDays <= 14)) {
                    activeList.push({
                        subjectKey: subKey,
                        subjectName: subStat.name,
                        icon: subStat.icon,
                        name: mod.name,
                        startDate: mod.startDate,
                        targetDate: mod.targetDate,
                        diffDays: mod.diffDays,
                        completed: mod.completed,
                        total: mod.total,
                        status: mod.status
                    });
                }
            });
        });

        // 按 targetDate 升序排列（最先到期的排在前面）
        activeList.sort((a, b) => a.diffDays - b.diffDays);
        return activeList;
    }

    function updateCountdowns() {
        const todayStr = getTodayDateStr();
        const now = new Date(todayStr + "T00:00:00");

        // 1. 初试倒计时
        const examTarget = new Date(state.examDate + "T00:00:00");
        const diffExam = Math.max(0, Math.ceil((examTarget - now) / (1000 * 60 * 60 * 24)));
        const examEl = document.getElementById('countdown-days');
        if (examEl) examEl.textContent = diffExam;

        const examLabelEl = document.getElementById('pill-exam-countdown-label');
        if (examLabelEl && state.examDate) {
            const parts = state.examDate.split('-');
            if (parts.length >= 3) {
                examLabelEl.textContent = `距 ${parseInt(parts[1], 10)}.${parseInt(parts[2], 10)} 初试`;
            }
        }

        // 2. 动态获取正在进行中的学科板块（像顶部月度目标一样，整组胶囊在跑马灯轨道中平滑滚动）
        const macroStats = computeAutomatedMacroStats();
        const activeModules = getActiveUpcomingModules();

        const container = document.getElementById('dynamic-active-milestones');
        if (container) {
            if (macroStats.totalAll === 0) {
                container.innerHTML = '';
            } else if (activeModules.length === 0) {
                container.innerHTML = `<span style="font-size: 11px; color: var(--text-muted);"><i class="fa-solid fa-circle-check" style="color:var(--color-success); margin-right:4px;"></i>当前所有阶段任务已全部收官！</span>`;
            } else {
                const singleCapsulesHtml = activeModules.map(item => {
                    const formattedDate = item.targetDate.split('-').slice(1).map(n => parseInt(n, 10)).join('.');
                    const daysText = item.diffDays < 0 ? `逾期${Math.abs(item.diffDays)}天` : `${item.diffDays}天`;
                    const badgeColor = item.diffDays <= 7 ? 'style="color: var(--color-danger); font-weight: 700;"' : '';
                    const iconHtml = item.icon ? `<i class="${item.icon}" style="margin-right:4px;"></i>` : '';

                    return `
                        <span class="status-milestone-capsule" onclick="window.jumpToDate('${item.targetDate}')" title="${escapeHtml(item.subjectName)} · ${escapeHtml(item.name)} (目标截止: ${item.targetDate})，点击直达日历">
                            ${iconHtml}<span class="capsule-name">${formattedDate} ${escapeHtml(item.name)}</span>
                            <span class="capsule-days" ${badgeColor}>${daysText}</span>
                        </span>
                    `;
                }).join('');

                // 复制多份以实现完全无缝的向左循环平滑滚动
                const repeatCount = activeModules.length <= 2 ? 4 : 2;
                let marqueeTrackHtml = '';
                for (let r = 0; r < repeatCount; r++) {
                    marqueeTrackHtml += singleCapsulesHtml;
                }

                container.innerHTML = `
                    <div class="status-marquee-container" title="鼠标悬停可暂停滚动">
                        <div class="status-marquee-track">
                            ${marqueeTrackHtml}
                        </div>
                    </div>
                `;
            }
        }
    }

    function updateBadgeCounts() {
        // 仅计算 examDate 范围内的合法天数
        const validDates = Object.keys(state.schedule).filter(k => k <= state.examDate);
        const totalDaysEl = document.getElementById('badge-total-days');
        if (totalDaysEl) totalDaysEl.textContent = `${validDates.length}天`;

        const taskCountEl = document.getElementById('badge-task-count');
        if (taskCountEl) {
            taskCountEl.textContent = `全科总览`;
        }

        const milestoneCountEl = document.getElementById('badge-milestone-count');
        if (milestoneCountEl) {
            milestoneCountEl.textContent = `${state.milestones.length}个里程碑`;
        }
    }

    // ==========================================================================
    // 1. 每日三段日程视图 (Timeline Multi-View)
    // ==========================================================================

    function renderMonthFilters() {
        const container = document.getElementById('month-filters');
        if (!container) return;

        const dateKeys = Object.keys(state.schedule || {}).sort();
        const months = [];
        const yearsSet = new Set();
        dateKeys.forEach(d => {
            if (d <= state.examDate) {
                const mPrefix = d.substring(0, 7);
                if (!months.includes(mPrefix)) {
                    months.push(mPrefix);
                    yearsSet.add(d.substring(0, 4));
                }
            }
        });

        // 检查当前的 monthFilter 是否在月份列表中，若不在则置为 all
        if (state.monthFilter !== 'all' && !months.includes(state.monthFilter)) {
            state.monthFilter = 'all';
        }

        const hasMultipleYears = yearsSet.size > 1;

        let pillsHtml = `<button class="month-pill month-pill-all ${state.monthFilter === 'all' ? 'active' : ''}" data-month="all">全部</button>`;
        pillsHtml += `<div class="month-pills-scroll-track" id="month-pills-scroll-track">`;

        months.forEach(mKey => {
            const parts = mKey.split('-');
            const yearShort = parts[0].slice(2);
            const mNum = parseInt(parts[1], 10);
            const label = hasMultipleYears ? `${yearShort}年${mNum}月` : `${mNum}月`;
            const isActive = (state.monthFilter === mKey) ? 'active' : '';
            pillsHtml += `<button class="month-pill ${isActive}" data-month="${mKey}">${label}</button>`;
        });
        pillsHtml += `</div>`;

        container.innerHTML = pillsHtml;

        const track = document.getElementById('month-pills-scroll-track');

        // 1. 支持鼠标按住左右拖拽滚动
        if (track) {
            let isDown = false;
            let startX = 0;
            let scrollStart = 0;
            let isDragging = false;

            track.addEventListener('mousedown', (e) => {
                isDown = true;
                isDragging = false;
                startX = e.pageX - track.offsetLeft;
                scrollStart = track.scrollLeft;
                track.classList.add('dragging');
            });

            window.addEventListener('mouseup', () => {
                if (isDown) {
                    isDown = false;
                    track.classList.remove('dragging');
                    setTimeout(() => { isDragging = false; }, 50);
                }
            });

            track.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - track.offsetLeft;
                const walk = (x - startX) * 1.5;
                if (Math.abs(walk) > 4) isDragging = true;
                track.scrollLeft = scrollStart - walk;
            });
        }

        // 2. 绑定点击事件与双向智能居中平滑滚动联动
        container.querySelectorAll('.month-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                const trackEl = document.getElementById('month-pills-scroll-track');
                container.querySelectorAll('.month-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                state.monthFilter = pill.getAttribute('data-month');
                if (state.preferences) state.preferences.monthFilter = state.monthFilter;
                saveWorkspaces();
                renderTimeline();

                // 双向平滑滚动：点击“全部”向右回滚至最左端；点击具体月份平滑居中
                if (trackEl) {
                    if (pill.getAttribute('data-month') === 'all') {
                        trackEl.scrollTo({ left: 0, behavior: 'smooth' });
                    } else if (pill.parentElement === trackEl) {
                        pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }
                }
            });
        });
    }

    function getFilteredDates() {
        const dateKeys = Object.keys(state.schedule).sort();
        const todayStr = getTodayDateStr();

        return dateKeys.filter(dateKey => {
            const plan = state.schedule[dateKey];
            if (!plan) return false;

            // 0. 过去日期过滤 (如果未勾选显示过去日期，则只显示今天及之后的日期)
            if (!state.preferences?.showPastDays) {
                const hasFuture = dateKeys.some(d => d >= todayStr);
                if (hasFuture && dateKey < todayStr) {
                    return false;
                }
            }

            // 1. 月份过滤
            if (state.monthFilter !== 'all') {
                if (!dateKey.startsWith(state.monthFilter)) return false;
            }

            // 2. 学习日/休息日过滤
            if (state.dayTypeFilter === 'study' && plan.isRest) return false;
            if (state.dayTypeFilter === 'rest' && !plan.isRest) return false;

            // 3. 学科过滤
            if (state.subjectFilter !== 'all') {
                if (plan.isRest) return false;
                const mSub = plan.morning?.subject || '';
                const aSub = plan.afternoon?.subject || '';
                const eSub = plan.evening?.subject || '';
                if (mSub !== state.subjectFilter && aSub !== state.subjectFilter && eSub !== state.subjectFilter) {
                    return false;
                }
            }

            // 4. 关键词搜索
            if (state.searchKeyword) {
                const kw = state.searchKeyword.toLowerCase();
                const mText = (plan.morning?.text || '').toLowerCase();
                const aText = (plan.afternoon?.text || '').toLowerCase();
                const eText = (plan.evening?.text || '').toLowerCase();
                const nText = (plan.note || '').toLowerCase();
                const dText = dateKey.toLowerCase();
                if (!mText.includes(kw) && !aText.includes(kw) && !eText.includes(kw) && !nText.includes(kw) && !dText.includes(kw)) {
                    return false;
                }
            }

            return true;
        });
    }

    function renderTimeline() {
        updateTimelineMonthBanner();

        const container = document.getElementById('timeline-container');
        if (!container) return;

        const filteredDates = getFilteredDates();

        if (filteredDates.length === 0) {
            container.innerHTML = `
                <div class="day-card" style="padding: 30px; text-align: center; color: var(--text-muted);">
                    <div style="font-size: 28px; margin-bottom: 6px;">🔍</div>
                    <p style="font-size: 13px;">未找到匹配的日程安排</p>
                    <button class="btn btn-xs btn-ghost mt-2" onclick="window.clearTimelineFilters()">清除所有筛选条件</button>
                </div>
            `;
            return;
        }

        if (state.viewMode === 'table') {
            renderTimelineTable(container, filteredDates);
        } else if (state.viewMode === 'week') {
            renderTimelineWeek(container, filteredDates);
        } else {
            renderTimelineMonth(container, filteredDates);
        }
    }

    function updateTimelineMonthBanner() {
        const banner = document.getElementById('timeline-month-banner');
        if (!banner) return;

        // 1. 点「全部」时，完全不显示
        if (state.monthFilter === 'all') {
            banner.style.display = 'none';
            banner.innerHTML = '';
            return;
        }

        // 2. 点具体月份时（如8月/9月/10月/11月/12月），动态展示该月里程碑
        const milestoneIndex = (state.milestones || []).findIndex(m => m.month === state.monthFilter);
        const milestone = milestoneIndex >= 0 ? state.milestones[milestoneIndex] : null;

        banner.style.display = 'flex';

        if (milestone) {
            const goalsList = milestone.goals || [];
            const singleGoalsHtml = goalsList.map(g => `
                <span class="milestone-banner-goal-pill" title="${escapeHtml(g)}">
                    <strong>◆</strong> ${escapeHtml(g)}
                </span>
            `).join('');

            // 复制两份以实现完全无缝的向左循环平滑滚动
            const marqueeTrackHtml = singleGoalsHtml + singleGoalsHtml;

            banner.innerHTML = `
                <div class="milestone-banner-left">
                    <span class="milestone-banner-title">🎯 ${escapeHtml(milestone.title)}</span>
                    <span class="badge badge-primary">${escapeHtml(milestone.phase)}</span>
                </div>
                <div class="milestone-banner-goals-container" title="鼠标悬停可暂停滚动">
                    <div class="milestone-banner-goals-track">
                        ${marqueeTrackHtml}
                    </div>
                </div>
                <div class="milestone-banner-actions">
                    <button class="btn btn-xs btn-outline" onclick="window.openEditMilestoneModal(${milestoneIndex})" title="编辑本月战略目标">
                        <i class="fa-solid fa-pen-to-square"></i> 编辑本月目标
                    </button>
                    <button class="btn btn-xs btn-ghost" onclick="window.goToMilestonesTab()" title="切换至月度里程碑全景看板">
                        <span>查看全部</span> <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            `;
        } else {
            const monthNum = state.monthFilter.split('-')[1] || state.monthFilter;
            banner.innerHTML = `
                <div class="milestone-banner-left">
                    <span class="milestone-banner-title"><i class="fa-solid fa-bullseye"></i> ${monthNum}月 战略里程碑</span>
                    <span class="badge badge-outline">待设定</span>
                </div>
                <div class="milestone-banner-goals" style="color: var(--text-muted); font-size: 11.5px;">
                    该月份尚未创建战略目标，点击右侧按钮立即添加！
                </div>
                <div class="milestone-banner-actions">
                    <button class="btn btn-xs btn-primary" onclick="window.openCreateMilestoneForMonth('${state.monthFilter}')">
                        <i class="fa-solid fa-plus"></i> 添加本月里程碑
                    </button>
                </div>
            `;
        }
    }

    window.goToMilestonesTab = function () {
        switchTab('tab-milestones');
    };

    window.openCreateMilestoneForMonth = function (monthStr) {
        state.editingMilestoneMonth = -1;
        document.getElementById('milestone-modal-title').textContent = `新建 ${monthStr} 月度战略里程碑`;
        document.getElementById('milestone-input-month').value = monthStr;
        document.getElementById('milestone-input-title').value = `${parseInt(monthStr.split('-')[1], 10)}月：`;
        document.getElementById('milestone-input-phase').value = '强化攻坚期';
        document.getElementById('milestone-input-goals').value = '';
        document.getElementById('btn-delete-milestone').style.display = 'none';

        const isReadOnly = isCurrentWorkspaceReadOnly();
        const banner = document.getElementById('milestone-readonly-banner');
        if (banner) banner.style.display = isReadOnly ? 'flex' : 'none';

        const saveBtn = document.getElementById('btn-save-milestone');
        if (saveBtn) {
            saveBtn.disabled = isReadOnly;
            saveBtn.style.opacity = isReadOnly ? '0.5' : '';
            saveBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }

        ['milestone-input-month', 'milestone-input-title', 'milestone-input-phase', 'milestone-input-goals'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = isReadOnly;
                el.style.opacity = isReadOnly ? '0.6' : '';
            }
        });

        openModal('modal-edit-milestone');
    };

    // --- 视图 1: 极简紧凑表格视图 (Table View) ---
    function renderTimelineTable(container, filteredDates) {
        const todayStr = getTodayDateStr();
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

        const rowsHtml = filteredDates.map(dateKey => {
            const plan = state.schedule[dateKey];
            const dateObj = new Date(dateKey + "T00:00:00");
            const weekdayStr = weekdays[dateObj.getDay()];
            const isSunday = (dateObj.getDay() === 0);
            const isToday = (dateKey === todayStr);
            const isOverflow = (dateKey > state.examDate);

            const monthNum = dateObj.getMonth() + 1;
            const dayNum = dateObj.getDate();
            const displayDate = `${monthNum}.${dayNum}`;

            const rowClasses = [];
            if (isToday) rowClasses.push('is-today');
            if (plan.isRest) rowClasses.push('is-rest');
            if (isOverflow) rowClasses.push('is-overflow');

            // 超出 12.20 的超期占位行（不可直接编辑，需在前面提前消除）
            if (isOverflow) {
                return `
                    <tr class="${rowClasses.join(' ')}" id="card-${dateKey}">
                        <td class="td-date-cell">
                            <div class="table-date-wrap">
                                <div>
                                    <span class="table-date-main" style="color: var(--color-danger); font-weight:700;">${displayDate}</span>
                                    <span class="table-date-sub is-weekend">${weekdayStr}</span>
                                    <span class="badge badge-overflow" style="margin-top:2px;"><i class="fa-solid fa-triangle-exclamation"></i> 考后占位</span>
                                </div>
                            </div>
                        </td>
                        <td class="td-slot-cell" style="cursor:not-allowed;" onclick="showToast('超期占位不可直接编辑，请在前面日期执行「提前」消除此占位', 'warning')" title="考后超期占位，不可直接编辑">
                            <div class="table-slot-content">
                                <span class="badge ${getSubjectBadgeClass(plan.morning?.subject)}">${getSubjectLabelShort(plan.morning?.subject)}</span>
                                <span class="table-slot-text ${!plan.morning?.text ? 'empty' : ''}">${escapeHtml(plan.morning?.text || '无')}</span>
                            </div>
                        </td>
                        <td class="td-slot-cell" style="cursor:not-allowed;" onclick="showToast('超期占位不可直接编辑，请在前面日期执行「提前」消除此占位', 'warning')" title="考后超期占位，不可直接编辑">
                            <div class="table-slot-content">
                                <span class="badge ${getSubjectBadgeClass(plan.afternoon?.subject)}">${getSubjectLabelShort(plan.afternoon?.subject)}</span>
                                <span class="table-slot-text ${!plan.afternoon?.text ? 'empty' : ''}">${escapeHtml(plan.afternoon?.text || '无')}</span>
                            </div>
                        </td>
                        <td class="td-slot-cell" style="cursor:not-allowed;" onclick="showToast('超期占位不可直接编辑，请在前面日期执行「提前」消除此占位', 'warning')" title="考后超期占位，不可直接编辑">
                            <div class="table-slot-content">
                                <span class="badge ${getSubjectBadgeClass(plan.evening?.subject)}">${getSubjectLabelShort(plan.evening?.subject)}</span>
                                <span class="table-slot-text ${!plan.evening?.text ? 'empty' : ''}">${escapeHtml(plan.evening?.text || '无')}</span>
                            </div>
                        </td>
                        <td class="td-action-cell">
                            <button class="btn btn-xs btn-ghost btn-locked" onclick="showToast('超期占位不可直接编辑，请在前面日期执行「提前」消除此占位', 'warning')" title="超期占位不可直接编辑"><i class="fa-solid fa-lock"></i> 占位锁定</button>
                        </td>
                    </tr>
                `;
            }

            if (plan.isRest) {
                return `
                    <tr class="${rowClasses.join(' ')}" id="card-${dateKey}">
                        <td class="td-date-cell">
                            <div class="table-date-wrap">
                                <div>
                                    <span class="table-date-main">${displayDate}</span>
                                    <span class="table-date-sub ${isSunday ? 'is-weekend' : ''}">${weekdayStr}</span>
                                    ${isToday ? '<span class="day-today-tag">今日</span>' : ''}
                                </div>
                                <button class="btn-rest-toggle active-rest" onclick="window.toggleDayRest('${dateKey}')" title="点击设为学习日">
                                    <i class="fa-solid fa-mug-hot"></i> 休息
                                </button>
                            </div>
                        </td>
                        <td colspan="3">
                            <div class="table-rest-notice">
                                ${plan.note ? `<span class="day-note-text"><i class="fa-solid fa-thumbtack"></i> ${escapeHtml(plan.note)}</span>` : ''}
                            </div>
                        </td>
                        <td class="td-action-cell">
                            <button class="btn btn-xs btn-outline" onclick="window.openEditModal('${dateKey}', 'morning')" title="打开编辑菜单"><i class="fa-solid fa-pen-to-square"></i> 编辑</button>
                            <button class="btn btn-xs btn-ghost" onclick="window.openShiftModalFrom('${dateKey}')" title="顺延此日后"><i class="fa-solid fa-bolt"></i> 顺延</button>
                        </td>
                    </tr>
                `;
            }

            const morningOff = plan.morning?.off || (state.preferences?.activeSlots && !state.preferences.activeSlots.includes('morning'));
            const afternoonOff = plan.afternoon?.off || (state.preferences?.activeSlots && !state.preferences.activeSlots.includes('afternoon'));
            const eveningOff = plan.evening?.off || (state.preferences?.activeSlots && !state.preferences.activeSlots.includes('evening'));

            return `
                <tr class="${rowClasses.join(' ')}" id="card-${dateKey}">
                    <td class="td-date-cell">
                        <div class="table-date-wrap">
                            <div>
                                <span class="table-date-main">${displayDate}</span>
                                <span class="table-date-sub ${isSunday ? 'is-weekend' : ''}">${weekdayStr}</span>
                                ${isToday ? '<span class="day-today-tag">今日</span>' : ''}
                            </div>
                            <button class="btn-rest-toggle" onclick="window.toggleDayRest('${dateKey}')" title="点击设为休息日">
                                <i class="fa-solid fa-book-open"></i> 学习
                            </button>
                        </div>
                    </td>

                    <!-- 上午 -->
                    <td class="td-slot-cell" onclick="window.openEditModal('${dateKey}', 'morning')" title="点击打开编辑菜单">
                        <div class="table-slot-content">
                            <span class="badge ${getSubjectBadgeClass(plan.morning?.subject)}">
                                ${getSubjectLabelShort(plan.morning?.subject)}
                            </span>
                            <span class="table-slot-text ${!plan.morning?.text ? 'empty' : ''}">
                                ${escapeHtml(plan.morning?.text || (morningOff ? '（未启用此时段）' : '点击编辑上午计划...'))}
                            </span>
                        </div>
                    </td>

                    <!-- 下午 -->
                    <td class="td-slot-cell" onclick="window.openEditModal('${dateKey}', 'afternoon')" title="点击打开编辑菜单">
                        <div class="table-slot-content">
                            <span class="badge ${getSubjectBadgeClass(plan.afternoon?.subject)}">
                                ${getSubjectLabelShort(plan.afternoon?.subject)}
                            </span>
                            <span class="table-slot-text ${!plan.afternoon?.text ? 'empty' : ''}">
                                ${escapeHtml(plan.afternoon?.text || (afternoonOff ? '（未启用此时段）' : '点击编辑下午计划...'))}
                            </span>
                        </div>
                    </td>

                    <!-- 晚上 -->
                    <td class="td-slot-cell" onclick="window.openEditModal('${dateKey}', 'evening')" title="点击打开编辑菜单">
                        <div class="table-slot-content">
                            <span class="badge ${getSubjectBadgeClass(plan.evening?.subject)}">
                                ${getSubjectLabelShort(plan.evening?.subject)}
                            </span>
                            <span class="table-slot-text ${!plan.evening?.text ? 'empty' : ''}">
                                ${escapeHtml(plan.evening?.text || (eveningOff ? '（未启用此时段）' : '点击编辑晚上计划...'))}
                            </span>
                        </div>
                    </td>

                    <!-- 操作 -->
                    <td class="td-action-cell">
                        <button class="btn btn-xs btn-outline" onclick="window.openEditModal('${dateKey}', 'morning')" title="打开编辑菜单"><i class="fa-solid fa-pen-to-square"></i> 编辑</button>
                        <button class="btn btn-xs btn-ghost" onclick="window.openShiftModalFrom('${dateKey}')" title="顺延此日后"><i class="fa-solid fa-bolt"></i> 顺延</button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="table-view-container">
                <table class="plan-table">
                    <thead>
                        <tr>
                            <th style="width: 140px;"><i class="fa-regular fa-calendar" style="margin-right:3px;"></i> 日期 / 状态</th>
                            <th><i class="fa-regular fa-sun" style="color:#f59e0b; margin-right:3px;"></i> 上午</th>
                            <th><i class="fa-solid fa-sun" style="color:#ea580c; margin-right:3px;"></i> 下午</th>
                            <th><i class="fa-solid fa-moon" style="color:#6366f1; margin-right:3px;"></i> 晚上</th>
                            <th style="width: 110px;"><i class="fa-solid fa-sliders" style="margin-right:3px;"></i> 操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }

    // --- 视图 2: 周历大网格视图 (Week Calendar Grid) ---
    function renderTimelineWeek(container, filteredDates) {
        const todayStr = getTodayDateStr();
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

        const weeks = [];
        let currentWeek = [];

        filteredDates.forEach(dateKey => {
            const dateObj = new Date(dateKey + "T00:00:00");
            const dayOfWeek = dateObj.getDay();

            currentWeek.push(dateKey);
            if (dayOfWeek === 0 || currentWeek.length >= 7) {
                weeks.push([...currentWeek]);
                currentWeek = [];
            }
        });
        if (currentWeek.length > 0) {
            weeks.push(currentWeek);
        }

        const weeksHtml = weeks.map((weekDates, wIdx) => {
            const firstDate = weekDates[0];
            const lastDate = weekDates[weekDates.length - 1];

            const daysHtml = weekDates.map(dateKey => {
                const plan = state.schedule[dateKey];
                const dateObj = new Date(dateKey + "T00:00:00");
                const weekdayStr = weekdays[dateObj.getDay()];
                const isSunday = (dateObj.getDay() === 0);
                const isToday = (dateKey === todayStr);
                const isOverflow = (dateKey > state.examDate);

                const monthNum = dateObj.getMonth() + 1;
                const dayNum = dateObj.getDate();
                const displayDate = `${monthNum}.${dayNum}`;

                const cellClasses = ['week-day-cell'];
                if (isToday) cellClasses.push('is-today');
                if (plan.isRest) cellClasses.push('is-rest');
                if (isOverflow) cellClasses.push('is-overflow');

                if (isOverflow) {
                    return `
                        <div class="${cellClasses.join(' ')}" id="card-${dateKey}">
                            <div class="week-day-header">
                                <div>
                                    <span class="week-day-title" style="color: var(--color-danger); font-weight:700;">${displayDate}</span>
                                    <span class="is-weekend">${weekdayStr}</span>
                                    <span class="badge badge-overflow" style="font-size:9px;"><i class="fa-solid fa-triangle-exclamation"></i> 占位</span>
                                </div>
                            </div>
                            <div class="week-day-slots" style="cursor:not-allowed;" onclick="showToast('超期占位不可直接编辑，请在前面日期执行「提前」消除此占位', 'warning')">
                                <div class="week-mini-slot">
                                    <span class="tag-dot dot-math" style="margin-top:4px;"></span>
                                    <span>${escapeHtml(plan.morning?.text || '无')}</span>
                                </div>
                                <div class="week-mini-slot">
                                    <span class="tag-dot dot-math-video" style="margin-top:4px;"></span>
                                    <span>${escapeHtml(plan.afternoon?.text || '无')}</span>
                                </div>
                                <div class="week-mini-slot">
                                    <span class="tag-dot dot-major" style="margin-top:4px;"></span>
                                    <span>${escapeHtml(plan.evening?.text || '无')}</span>
                                </div>
                            </div>
                            <div style="font-size:10px; color:var(--color-danger); margin-top:2px;"><i class="fa-solid fa-lock"></i> 考后超期占位</div>
                        </div>
                    `;
                }

                return `
                    <div class="${cellClasses.join(' ')}" id="card-${dateKey}">
                        <div class="week-day-header">
                            <div>
                                <span class="week-day-title">${displayDate}</span>
                                <span class="${isSunday ? 'is-weekend' : ''}">${weekdayStr}</span>
                                ${isToday ? '<span class="day-today-tag">今</span>' : ''}
                            </div>
                            <button class="btn-rest-toggle ${plan.isRest ? 'active-rest' : ''}" 
                                    style="padding: 1px 6px; font-size: 10px;"
                                    onclick="window.toggleDayRest('${dateKey}')" title="切换休息/学习">
                                ${plan.isRest ? '<i class="fa-solid fa-mug-hot"></i>' : '<i class="fa-solid fa-book-open"></i>'}
                            </button>
                        </div>

                        ${plan.isRest ? `
                            <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:11px; gap:4px;">
                                <i class="fa-solid fa-mug-hot"></i> 休息日
                            </div>
                        ` : `
                            <div class="week-day-slots">
                                <div class="week-mini-slot" onclick="window.openEditModal('${dateKey}', 'morning')" title="点击编辑上午计划">
                                    <span class="tag-dot dot-math" style="margin-top:4px;"></span>
                                    <span>${escapeHtml(plan.morning?.text || '上午计划...')}</span>
                                </div>
                                <div class="week-mini-slot" onclick="window.openEditModal('${dateKey}', 'afternoon')" title="点击编辑下午计划">
                                    <span class="tag-dot dot-math-video" style="margin-top:4px;"></span>
                                    <span>${escapeHtml(plan.afternoon?.text || '下午计划...')}</span>
                                </div>
                                <div class="week-mini-slot" onclick="window.openEditModal('${dateKey}', 'evening')" title="点击编辑晚上计划">
                                    <span class="tag-dot dot-major" style="margin-top:4px;"></span>
                                    <span>${escapeHtml(plan.evening?.text || '晚上计划...')}</span>
                                </div>
                            </div>
                        `}

                        ${plan.note ? `<div style="font-size:10px; color:var(--color-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><i class="fa-solid fa-thumbtack"></i> ${escapeHtml(plan.note)}</div>` : ''}
                    </div>
                `;
            }).join('');

            return `
                <div class="week-group">
                    <div class="week-header">
                        <span><i class="fa-solid fa-calendar-week" style="margin-right:4px;"></i> 第 ${wIdx + 1} 规划周 (${firstDate.substring(5)} ~ ${lastDate.substring(5)})</span>
                        <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">共 ${weekDates.length} 天</span>
                    </div>
                    <div class="week-grid-7">
                        ${daysHtml}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="week-view-container">${weeksHtml}</div>`;
    }

    // --- 视图 3: 紧凑月度日历视图 (Compact Month Calendar Grid - 一星期一行方格) ---
    function renderTimelineMonth(container, filteredDates) {
        const todayStr = getTodayDateStr();

        // 1. 按月份分组 (YYYY-MM)
        const monthGroups = {};
        filteredDates.forEach(dateKey => {
            const mPrefix = dateKey.substring(0, 7);
            if (!monthGroups[mPrefix]) monthGroups[mPrefix] = [];
            monthGroups[mPrefix].push(dateKey);
        });

        const monthKeys = Object.keys(monthGroups).sort();

        const monthBlocksHtml = monthKeys.map(mKey => {
            const dateList = monthGroups[mKey];
            const [yearStr, mNumStr] = mKey.split('-');
            const mNum = parseInt(mNumStr, 10);

            // 第一天的星期偏移 (以周一为第一列: 0=周一, 1=周二, ..., 6=周日)
            const firstDateObj = new Date(dateList[0] + "T00:00:00");
            const firstDayOfWeek = firstDateObj.getDay(); // 0 is Sun, 1 is Mon...
            const emptyPrefixCount = (firstDayOfWeek + 6) % 7;

            let emptyCellsHtml = '';
            for (let i = 0; i < emptyPrefixCount; i++) {
                emptyCellsHtml += `<div class="month-day-cell is-empty"></div>`;
            }

            const daysCellsHtml = dateList.map(dateKey => {
                const plan = state.schedule[dateKey] || {};
                const dateObj = new Date(dateKey + "T00:00:00");
                const dayNum = dateObj.getDate();
                const isSunday = (dateObj.getDay() === 0);
                const isToday = (dateKey === todayStr);
                const isOverflow = (dateKey > state.examDate);

                const cellClasses = ['month-day-cell'];
                if (isToday) cellClasses.push('is-today');
                if (plan.isRest) cellClasses.push('is-rest');
                if (isOverflow) cellClasses.push('is-overflow');

                // 溢出占位处理
                if (isOverflow) {
                    return `
                        <div class="${cellClasses.join(' ')}" id="card-${dateKey}" onclick="showToast('超期占位不可直接编辑，请在前面日期执行「提前」消除此占位', 'warning')">
                            <div class="month-day-header">
                                <span class="month-day-number" style="color:var(--color-danger); font-weight:700;">${mNum}.${dayNum}</span>
                                <span class="badge badge-overflow" style="font-size:8.5px;"><i class="fa-solid fa-triangle-exclamation"></i> 占位</span>
                            </div>
                            <div class="month-day-slots">
                                <div class="month-slot-row"><span class="month-slot-text">${escapeHtml(plan.morning?.text || '无')}</span></div>
                                <div class="month-slot-row"><span class="month-slot-text">${escapeHtml(plan.afternoon?.text || '无')}</span></div>
                                <div class="month-slot-row"><span class="month-slot-text">${escapeHtml(plan.evening?.text || '无')}</span></div>
                            </div>
                            <div class="month-day-footer" style="color:var(--color-danger);"><i class="fa-solid fa-lock"></i> 占位锁定</div>
                        </div>
                    `;
                }

                if (plan.isRest) {
                    return `
                        <div class="${cellClasses.join(' ')}" id="card-${dateKey}">
                            <div class="month-day-header">
                                <span class="month-day-number ${isSunday ? 'is-weekend' : ''}">${mNum}.${dayNum}</span>
                                <button class="btn-rest-toggle active-rest" style="padding:0 4px; font-size:9px; height:18px;" onclick="event.stopPropagation(); window.toggleDayRest('${dateKey}')" title="点击切换为学习日"><i class="fa-solid fa-mug-hot"></i> 休息</button>
                            </div>
                            <div class="month-rest-block" onclick="window.openEditModal('${dateKey}', 'morning')">
                                <span><i class="fa-solid fa-mug-hot"></i> 例行休息日</span>
                            </div>
                            <div class="month-day-footer">
                                ${plan.note ? `<span style="color:var(--color-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><i class="fa-solid fa-thumbtack"></i> ${escapeHtml(plan.note)}</span>` : '<span style="color:var(--text-muted);">劳逸结合</span>'}
                                <button class="btn btn-xs btn-ghost" style="padding:0 3px; font-size:9.5px;" onclick="event.stopPropagation(); window.openEditModal('${dateKey}', 'morning')"><i class="fa-solid fa-pen-to-square"></i></button>
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="${cellClasses.join(' ')}" id="card-${dateKey}">
                        <div class="month-day-header">
                            <span class="month-day-number ${isSunday ? 'is-weekend' : ''}">
                                ${mNum}.${dayNum}
                                ${isToday ? '<span class="day-today-tag">今</span>' : ''}
                            </span>
                            <button class="btn btn-xs btn-ghost" style="padding:0 3px; font-size:10px; height:18px;" onclick="event.stopPropagation(); window.openEditModal('${dateKey}', 'morning')" title="打开全天/时段编辑"><i class="fa-solid fa-pen-to-square"></i></button>
                        </div>
                        <div class="month-day-slots">
                            <!-- 上午 -->
                            <div class="month-slot-row ${!plan.morning?.text ? 'empty' : ''}" onclick="window.openEditModal('${dateKey}', 'morning')" title="上午：${escapeHtml(plan.morning?.text || '未安排')}">
                                <span class="month-slot-tag ${getSubjectBadgeClass(plan.morning?.subject)}">${getSubjectLabelShort(plan.morning?.subject)}</span>
                                <span class="month-slot-text">${escapeHtml(plan.morning?.text || '点击安排上午...')}</span>
                            </div>
                            <!-- 下午 -->
                            <div class="month-slot-row ${!plan.afternoon?.text ? 'empty' : ''}" onclick="window.openEditModal('${dateKey}', 'afternoon')" title="下午：${escapeHtml(plan.afternoon?.text || '未安排')}">
                                <span class="month-slot-tag ${getSubjectBadgeClass(plan.afternoon?.subject)}">${getSubjectLabelShort(plan.afternoon?.subject)}</span>
                                <span class="month-slot-text">${escapeHtml(plan.afternoon?.text || '点击安排下午...')}</span>
                            </div>
                            <!-- 晚上 -->
                            <div class="month-slot-row ${!plan.evening?.text ? 'empty' : ''}" onclick="window.openEditModal('${dateKey}', 'evening')" title="晚上：${escapeHtml(plan.evening?.text || '未安排')}">
                                <span class="month-slot-tag ${getSubjectBadgeClass(plan.evening?.subject)}">${getSubjectLabelShort(plan.evening?.subject)}</span>
                                <span class="month-slot-text">${escapeHtml(plan.evening?.text || '点击安排晚上...')}</span>
                            </div>
                        </div>
                        <div class="month-day-footer">
                            ${plan.note ? `<span style="color:var(--color-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(plan.note)}"><i class="fa-solid fa-thumbtack"></i> ${escapeHtml(plan.note)}</span>` : `<span style="color:var(--text-muted);">${dateList.indexOf(dateKey) + 1}天</span>`}
                            <button class="btn-rest-toggle" style="padding:0 2px; font-size:9px; border:none; background:transparent;" onclick="event.stopPropagation(); window.toggleDayRest('${dateKey}')" title="设为休息日"><i class="fa-solid fa-mug-hot"></i></button>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="month-calendar-block">
                    <div class="month-calendar-header">
                        <div class="month-calendar-title">
                            <span><i class="fa-solid fa-calendar-days" style="margin-right:4px;"></i> ${yearStr}年 ${mNum}月 日历全景</span>
                        </div>
                        <span class="month-calendar-meta">本月共 ${dateList.length} 天规划</span>
                    </div>

                    <div class="month-weekdays-header">
                        <span class="month-weekday-label">一</span>
                        <span class="month-weekday-label">二</span>
                        <span class="month-weekday-label">三</span>
                        <span class="month-weekday-label">四</span>
                        <span class="month-weekday-label">五</span>
                        <span class="month-weekday-label">六</span>
                        <span class="month-weekday-label is-weekend">日</span>
                    </div>

                    <div class="month-grid-7">
                        ${emptyCellsHtml}
                        ${daysCellsHtml}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="month-view-container">${monthBlocksHtml}</div>`;
    }

    // ==========================================================================
    // 2. 宏观阶段 & 学科看板视图 (含 SVG 环形图与仪表盘)
    // ==========================================================================

    function renderAnalyticsDashboard() {
        if (!state.macroMonthFilter) state.macroMonthFilter = 'all';
        if (!state.donutMode) state.donutMode = 'subject';

        const stats = computeAutomatedMacroStats(state.macroMonthFilter);

        // 1. 动态生成宏观月度筛选胶囊 (Macro Month Filter Pills)
        const monthFilterContainer = document.getElementById('macro-month-filters');
        if (monthFilterContainer) {
            const allDates = Object.keys(state.schedule).sort();
            const monthsSet = new Set();
            allDates.forEach(d => {
                if (d <= state.examDate) monthsSet.add(d.substring(0, 7));
            });
            const monthsList = Array.from(monthsSet).sort();

            const monthPillsHtml = [
                `<button type="button" class="month-pill ${state.macroMonthFilter === 'all' ? 'active' : ''}" onclick="window.setMacroMonthFilter('all')">全周期总览</button>`
            ].concat(monthsList.map(mStr => {
                const parts = mStr.split('-');
                const label = `${parseInt(parts[1], 10)}月`;
                return `<button type="button" class="month-pill ${state.macroMonthFilter === mStr ? 'active' : ''}" onclick="window.setMacroMonthFilter('${mStr}')">${label}</button>`;
            })).join('');

            monthFilterContainer.innerHTML = monthPillsHtml;
        }

        // 2. 模式切换按钮状态 (Subject vs Module Mode)
        const btnSub = document.getElementById('btn-mode-subject');
        const btnMod = document.getElementById('btn-mode-module');
        if (btnSub && btnMod) {
            btnSub.classList.toggle('active', state.donutMode === 'subject');
            btnMod.classList.toggle('active', state.donutMode === 'module');
        }

        // 3. 中心数字与标签
        const totalPctEl = document.getElementById('donut-total-pct');
        if (totalPctEl) totalPctEl.textContent = `${stats.totalPct}%`;

        const centerTitleEl = document.getElementById('donut-center-title');
        if (centerTitleEl) {
            if (state.macroMonthFilter === 'all') {
                centerTitleEl.textContent = state.donutMode === 'subject' ? '全周期完成度' : '板块综合进度';
            } else {
                const p = state.macroMonthFilter.split('-');
                centerTitleEl.textContent = `${parseInt(p[1], 10)}月完成度`;
            }
        }

        // 4. Donut Rings & Legend rendering based on state.donutMode
        const C = 389.56; // 2 * PI * 62
        const effectiveTotalPct = (stats.totalPct || 0) / 100;
        const legendContainer = document.getElementById('donut-legend');
        const segmentsGroup = document.getElementById('donut-segments-group');

        function resolveSubjectColorHex(colorKey, fallbackKey = 'primary') {
            const map = {
                blue: '#3b82f6',
                green: '#10b981',
                purple: '#8b5cf6',
                amber: '#fbbf24',
                rose: '#f43f5e',
                cyan: '#06b6d4',
                orange: '#f97316',
                slate: '#94a3b8',
                primary: '#3b82f6',
                math: '#fbbf24',
                major: '#3b82f6',
                major2: '#8b5cf6',
                english: '#06b6d4',
                politics: '#f43f5e'
            };
            if (colorKey && map[colorKey]) return map[colorKey];
            if (fallbackKey && map[fallbackKey]) return map[fallbackKey];
            if (colorKey && (colorKey.startsWith('#') || colorKey.startsWith('rgb'))) return colorKey;
            return map.primary;
        }

        if (state.donutMode === 'subject') {
            // === 模式 1: 按学科 (By Subject) ===
            const subKeys = Object.keys(stats.subjects);
            if (legendContainer) {
                legendContainer.innerHTML = subKeys.map(k => {
                    const sub = stats.subjects[k];
                    const dotColor = resolveSubjectColorHex(sub.color, k);
                    return `
                        <div class="legend-item">
                            <span class="legend-dot dot-${sub.color || 'primary'}" style="background: ${dotColor};"></span>
                            <span class="legend-text" title="${escapeHtml(sub.name)}">${escapeHtml(sub.name)}</span>
                            <strong>${sub.completionPct}%</strong>
                        </div>
                    `;
                }).join('');
            }

            if (segmentsGroup) {
                let accumulatedOffset = 0;
                segmentsGroup.innerHTML = subKeys.map(k => {
                    const sub = stats.subjects[k];
                    if (!sub) return '';
                    let segLen = 0;
                    if (stats.totalAll > 0) {
                        const weight = sub.totalTasks / stats.totalAll;
                        const subCompletedWeight = stats.completedAll > 0 ? (sub.completedTasks / stats.completedAll) : weight;
                        segLen = C * effectiveTotalPct * subCompletedWeight;
                    }
                    const strokeColor = resolveSubjectColorHex(sub.color, k);
                    const circleHtml = `
                        <circle class="donut-segment segment-${k}" cx="80" cy="80" r="62" fill="transparent" stroke-width="14"
                                stroke="${strokeColor}"
                                style="stroke: ${strokeColor}; stroke-dasharray: ${segLen.toFixed(2)} ${(C - segLen).toFixed(2)}; stroke-dashoffset: ${(-accumulatedOffset).toFixed(2)};">
                        </circle>
                    `;
                    accumulatedOffset += segLen;
                    return circleHtml;
                }).join('');
            }
        } else {
            // === 模式 2: 按重点板块/题库细分 (By Module) ===
            const allModules = [];
            const modulePalette = [
                '#fbbf24', '#8b5cf6', '#06b6d4', '#10b981', '#f43f5e', '#3b82f6',
                '#f97316', '#a855f7', '#14b8a6', '#84cc16', '#ec4899', '#6366f1'
            ];

            let colorIdx = 0;
            Object.keys(stats.subjects).forEach(k => {
                const sub = stats.subjects[k];
                (sub.modules || []).forEach(m => {
                    allModules.push({
                        ...m,
                        subjectName: sub.name,
                        color: modulePalette[colorIdx % modulePalette.length]
                    });
                    colorIdx++;
                });
            });

            // Sort modules by total scheduled sessions descending
            allModules.sort((a, b) => b.total - a.total);

            if (legendContainer) {
                if (allModules.length === 0) {
                    legendContainer.innerHTML = '<span style="color:var(--text-muted); font-size:11px; grid-column:span 2; text-align:center;">当前周期暂无排期板块</span>';
                } else {
                    legendContainer.innerHTML = allModules.slice(0, 6).map(m => {
                        return `
                            <div class="legend-item" title="${escapeHtml(m.name)} (已学${m.completed}/${m.total}课时)">
                                <span class="legend-dot" style="background: ${m.color};"></span>
                                <div class="legend-text-container">
                                    <span class="legend-text">${escapeHtml(m.name)}</span>
                                </div>
                                <strong class="legend-pct">${m.progressPct}%</strong>
                            </div>
                        `;
                    }).join('');
                }
            }

            if (segmentsGroup) {
                let accumulatedOffset = 0;
                segmentsGroup.innerHTML = allModules.map(m => {
                    let segLen = 0;
                    if (stats.totalAll > 0) {
                        const weight = m.total / stats.totalAll;
                        const modCompletedWeight = stats.completedAll > 0 ? (m.completed / stats.completedAll) : weight;
                        segLen = C * effectiveTotalPct * modCompletedWeight;
                    }
                    const circleHtml = `
                        <circle class="donut-segment" cx="80" cy="80" r="62" fill="transparent" stroke-width="14"
                                stroke="${m.color}"
                                style="stroke: ${m.color}; stroke-dasharray: ${segLen.toFixed(2)} ${(C - segLen).toFixed(2)}; stroke-dashoffset: ${(-accumulatedOffset).toFixed(2)};">
                        </circle>
                    `;
                    accumulatedOffset += segLen;
                    return circleHtml;
                }).join('');
            }
        }

        // 5. KPI 动态卡片更新 (适配当前选定周期)
        const periodPrefix = state.macroMonthFilter === 'all' ? '全周期' : `${parseInt(state.macroMonthFilter.split('-')[1], 10)}月`;

        const kpiTotal = document.getElementById('kpi-total-tasks');
        if (kpiTotal) kpiTotal.textContent = `${stats.totalAll} 课时`;

        const kpiCompleted = document.getElementById('kpi-completed-tasks');
        if (kpiCompleted) kpiCompleted.textContent = `${periodPrefix}已完成 ${stats.completedAll} (${stats.totalPct}%)`;

        const kpiStudyDays = document.getElementById('kpi-study-days');
        if (kpiStudyDays) kpiStudyDays.textContent = `${stats.studiedDaysCount} 天`;

        const kpiRestDays = document.getElementById('kpi-rest-days');
        if (kpiRestDays) kpiRestDays.textContent = `包含 ${stats.restDaysCount} 天例行休息`;

        const kpiExamCountdown = document.getElementById('kpi-exam-countdown');
        const kpiExamDate = document.getElementById('kpi-exam-date');
        if (kpiExamCountdown && state.examDate) {
            const todayStr = getTodayDateStr();
            const now = new Date(todayStr + "T00:00:00");
            const examTarget = new Date(state.examDate + "T00:00:00");
            const diffExam = Math.max(0, Math.ceil((examTarget - now) / (1000 * 60 * 60 * 24)));
            kpiExamCountdown.textContent = `${diffExam} 天`;
            if (kpiExamDate) kpiExamDate.textContent = `初试目标 ${state.examDate}`;
        }

        const activeList = getActiveUpcomingModules();
        const kpiCurrentPhase = document.getElementById('kpi-current-phase');
        const kpiPhaseDates = document.getElementById('kpi-phase-dates');
        if (activeList.length > 0) {
            const topMod = activeList[0];
            if (kpiCurrentPhase) kpiCurrentPhase.textContent = topMod.name;
            if (kpiPhaseDates) {
                const sStr = topMod.startDate.substring(5).replace('-', '.');
                const tStr = topMod.targetDate.substring(5).replace('-', '.');
                kpiPhaseDates.textContent = `${sStr} ~ ${tStr} (剩 ${topMod.diffDays} 天)`;
            }
        } else {
            if (kpiCurrentPhase) kpiCurrentPhase.textContent = '全部收官！';
            if (kpiPhaseDates) kpiPhaseDates.textContent = '已圆满完成全阶段排期';
        }
    }

    window.setMacroMonthFilter = function (monthStr) {
        state.macroMonthFilter = monthStr;
        renderAnalyticsDashboard();
        renderMacroSubjects();
    };

    window.setDonutChartMode = function (modeStr) {
        state.donutMode = modeStr;
        renderAnalyticsDashboard();
    };

    function renderMacroSubjects() {
        const container = document.getElementById('macro-subjects-container');
        if (!container) return;

        const stats = computeAutomatedMacroStats(state.macroMonthFilter);
        const subKeys = Object.keys(stats.subjects);

        if (subKeys.length === 0) {
            container.innerHTML = '<div style="padding:30px; text-align:center; color:var(--text-muted);">暂无学科数据</div>';
            return;
        }

        const html = subKeys.map(key => {
            const sub = stats.subjects[key];
            const modules = sub.modules || [];

            const modulesHtml = modules.length === 0 ? `
                <div style="padding:15px; text-align:center; color:var(--text-muted); font-size:12px;">
                    当前周期内暂无【${escapeHtml(sub.name)}】排期任务
                </div>
            ` : modules.map(mod => {
                const startStr = mod.startDate.substring(5).replace('-', '.');
                const targetStr = mod.targetDate.substring(5).replace('-', '.');

                let statusBadgeHtml = '';
                if (mod.status === 'finished') {
                    statusBadgeHtml = `<span class="badge badge-emerald"><i class="fa-solid fa-circle-check"></i> 已收官</span>`;
                } else if (mod.status === 'in_progress') {
                    statusBadgeHtml = `<span class="badge badge-amber"><i class="fa-solid fa-fire"></i> 剩 ${mod.diffDays} 天</span>`;
                } else {
                    statusBadgeHtml = `<span class="badge badge-outline"><i class="fa-solid fa-hourglass-start"></i> ${startStr} 开启</span>`;
                }

                const progressColorClass = `progress-fill-${sub.color || 'primary'}`;

                return `
                    <div class="macro-module-card">
                        <div class="macro-module-header">
                            <span class="macro-module-title" title="${escapeHtml(mod.name)}">${escapeHtml(mod.name)}</span>
                            <div class="macro-module-status-group">
                                ${statusBadgeHtml}
                                <button class="btn-macro-jump" onclick="window.jumpToDate('${mod.startDate}')" title="在日历中跳转至 ${mod.startDate}">
                                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                </button>
                            </div>
                        </div>

                        <div class="macro-module-subline">
                            <span class="macro-module-dates"><i class="fa-solid fa-calendar-days"></i> ${startStr} ~ ${targetStr}</span>
                            <span class="macro-module-count">已学 <strong>${mod.completed}</strong> / ${mod.total} 课时 (<strong>${mod.progressPct}%</strong>)</span>
                        </div>

                        <div class="progress-track">
                            <div class="progress-fill ${progressColorClass}" style="width: ${mod.progressPct}%;"></div>
                        </div>
                    </div>
                `;
            }).join('');

            const iconHtml = sub.icon ? `<i class="${sub.icon}"></i>` : '<i class="fa-solid fa-book"></i>';
            const dateSpanStr = (sub.firstDate && sub.lastDate) ? `${sub.firstDate.substring(5).replace('-', '.')} ~ ${sub.lastDate.substring(5).replace('-', '.')}` : '暂无排期';

            return `
                <div class="macro-subject-card card-${key}">
                    <div class="macro-subject-header">
                        <div class="macro-subject-title">
                            <span class="macro-subject-icon">${iconHtml}</span>
                            <div>
                                <h3>${escapeHtml(sub.name)}</h3>
                                <span style="font-size:11px; color:var(--text-muted);">${dateSpanStr} · 覆盖 ${sub.daysCount} 天 · 共 ${sub.totalTasks} 课时</span>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span class="badge badge-${sub.color || 'primary'}">${sub.completionPct}% 完成</span>
                        </div>
                    </div>
                    <div class="macro-modules-container">
                        ${modulesHtml}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    // ==========================================================================
    // 3. 月度里程碑视图 (Editable Milestones)
    // ==========================================================================

    function renderMilestones() {
        const container = document.getElementById('milestones-container');
        if (!container) return;

        const html = state.milestones.map((item, idx) => {
            const goalsHtml = item.goals.map(goal => `
                <li class="milestone-goal-item">
                    <span class="goal-bullet">◆</span>
                    <span>${escapeHtml(goal)}</span>
                </li>
            `).join('');

            return `
                <div class="milestone-card">
                    <div class="milestone-card-header">
                        <div>
                            <h3 class="milestone-month-title">${escapeHtml(item.title)}</h3>
                            <span class="milestone-phase-badge">${escapeHtml(item.phase)}</span>
                        </div>
                        <button class="btn btn-xs btn-outline" onclick="window.openEditMilestoneModal(${idx})">
                            <i class="fa-solid fa-pen-to-square"></i> 编辑目标
                        </button>
                    </div>
                    <ul class="milestone-goals-list">
                        ${goalsHtml}
                    </ul>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    window.openEditMilestoneModal = function (index) {
        const item = state.milestones[index];
        if (!item) return;

        state.editingMilestoneMonth = index;
        document.getElementById('milestone-modal-title').textContent = `编辑月度战略里程碑 (${item.month})`;
        document.getElementById('milestone-input-month').value = item.month;
        document.getElementById('milestone-input-title').value = item.title;
        document.getElementById('milestone-input-phase').value = item.phase;
        document.getElementById('milestone-input-goals').value = item.goals.join('\n');
        document.getElementById('btn-delete-milestone').style.display = 'inline-flex';

        const isReadOnly = isCurrentWorkspaceReadOnly();
        const banner = document.getElementById('milestone-readonly-banner');
        if (banner) banner.style.display = isReadOnly ? 'flex' : 'none';

        const saveBtn = document.getElementById('btn-save-milestone');
        const delBtn = document.getElementById('btn-delete-milestone');
        if (saveBtn) {
            saveBtn.disabled = isReadOnly;
            saveBtn.style.opacity = isReadOnly ? '0.5' : '';
            saveBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }
        if (delBtn) {
            delBtn.disabled = isReadOnly;
            delBtn.style.opacity = isReadOnly ? '0.5' : '';
            delBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }

        ['milestone-input-month', 'milestone-input-title', 'milestone-input-phase', 'milestone-input-goals'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = isReadOnly;
                el.style.opacity = isReadOnly ? '0.6' : '';
            }
        });

        openModal('modal-edit-milestone');
    };

    window.openCreateMilestoneModal = function () {
        state.editingMilestoneMonth = -1; // New
        document.getElementById('milestone-modal-title').textContent = '新建月度战略里程碑';
        document.getElementById('milestone-input-month').value = '2026-08';
        document.getElementById('milestone-input-title').value = '';
        document.getElementById('milestone-input-phase').value = '强化突破期';
        document.getElementById('milestone-input-goals').value = '';
        document.getElementById('btn-delete-milestone').style.display = 'none';

        const isReadOnly = isCurrentWorkspaceReadOnly();
        const banner = document.getElementById('milestone-readonly-banner');
        if (banner) banner.style.display = isReadOnly ? 'flex' : 'none';

        const saveBtn = document.getElementById('btn-save-milestone');
        if (saveBtn) {
            saveBtn.disabled = isReadOnly;
            saveBtn.style.opacity = isReadOnly ? '0.5' : '';
            saveBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }

        ['milestone-input-month', 'milestone-input-title', 'milestone-input-phase', 'milestone-input-goals'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = isReadOnly;
                el.style.opacity = isReadOnly ? '0.6' : '';
            }
        });

        openModal('modal-edit-milestone');
    };

    function saveMilestoneData() {
        if (checkReadOnlyAndWarn()) return;
        const month = document.getElementById('milestone-input-month').value.trim();
        const title = document.getElementById('milestone-input-title').value.trim();
        const phase = document.getElementById('milestone-input-phase').value.trim();
        const rawGoals = document.getElementById('milestone-input-goals').value;
        const goals = rawGoals.split('\n').map(g => g.trim()).filter(g => g.length > 0);

        if (!title) {
            showToast("请输入里程碑标题！", "error");
            return;
        }

        const snapshot = takeWorkspaceSnapshot();

        const newMilestone = {
            month: month || '2026-08',
            title: title,
            phase: phase || '强化攻坚期',
            color: 'primary',
            goals: goals
        };

        if (state.editingMilestoneMonth >= 0) {
            state.milestones[state.editingMilestoneMonth] = newMilestone;
            showToast("月度战略里程碑已更新！", "success", { undoSnapshot: snapshot });
        } else {
            state.milestones.push(newMilestone);
            showToast("已新建月度战略里程碑！", "success", { undoSnapshot: snapshot });
        }

        saveData();
        closeModal('modal-edit-milestone');
        renderMilestones();
        updateTimelineMonthBanner();
    }

    function deleteMilestoneData() {
        if (checkReadOnlyAndWarn()) return;
        if (state.editingMilestoneMonth >= 0) {
            if (confirm("确定要删除该月度里程碑吗？")) {
                const snapshot = takeWorkspaceSnapshot();
                state.milestones.splice(state.editingMilestoneMonth, 1);
                saveData();
                closeModal('modal-edit-milestone');
                renderMilestones();
                updateTimelineMonthBanner();
                showToast("已删除该月度里程碑", "info", { undoSnapshot: snapshot });
            }
        }
    }

    function initMilestoneEditorEvents() {
        document.getElementById('btn-create-milestone')?.addEventListener('click', window.openCreateMilestoneModal);
        document.getElementById('btn-close-milestone-edit')?.addEventListener('click', () => closeModal('modal-edit-milestone'));
        document.getElementById('btn-cancel-milestone-edit')?.addEventListener('click', () => closeModal('modal-edit-milestone'));
        document.getElementById('btn-save-milestone')?.addEventListener('click', saveMilestoneData);
        document.getElementById('btn-delete-milestone')?.addEventListener('click', deleteMilestoneData);
    }

    // ==========================================================================
    // 4. TAB 4: 题库与预设库管理中心 (Preset Hub & Submodule CRUD)
    // ==========================================================================

    function getPresetHubTaxonomy() {
        if (!state.taxonomy || Object.keys(state.taxonomy).length === 0) {
            state.taxonomy = JSON.parse(JSON.stringify(window.TAXONOMY_TREE));
        }
        return state.taxonomy;
    }

    function getPresetArray(subject, submodule, questionType) {
        const taxonomy = getPresetHubTaxonomy();
        const curSub = taxonomy[subject];
        if (!curSub) return [];

        let modObj = curSub.submodules ? curSub.submodules[submodule] : null;
        if (!modObj && curSub.types) {
            modObj = curSub.types.practice?.submodules?.[submodule] || curSub.types.lecture?.submodules?.[submodule];
        }
        if (!modObj) return [];
        if (modObj.hasQuestionType) {
            if (!modObj.questionTypes) modObj.questionTypes = {};
            if (!modObj.questionTypes[questionType]) modObj.questionTypes[questionType] = { presets: [] };
            return modObj.questionTypes[questionType].presets || [];
        } else {
            if (!modObj.presets) modObj.presets = [];
            return modObj.presets;
        }
    }

    function setPresetArray(subject, submodule, questionType, newArray) {
        if (checkReadOnlyAndWarn()) return;
        const taxonomy = getPresetHubTaxonomy();
        const curSub = taxonomy[subject];
        if (!curSub) return;

        let modObj = curSub.submodules ? curSub.submodules[submodule] : null;
        if (!modObj && curSub.types) {
            modObj = curSub.types.practice?.submodules?.[submodule] || curSub.types.lecture?.submodules?.[submodule];
        }
        if (!modObj) return;
        if (modObj.hasQuestionType) {
            if (!modObj.questionTypes) modObj.questionTypes = {};
            if (!modObj.questionTypes[questionType]) modObj.questionTypes[questionType] = { presets: [] };
            modObj.questionTypes[questionType].presets = newArray;
        } else {
            modObj.presets = newArray;
        }
        saveData();
    }

    function renderPresetHub() {
        const isReadOnly = isCurrentWorkspaceReadOnly();

        const btnManage = document.getElementById('btn-open-manage-subjects');
        if (btnManage) {
            btnManage.disabled = false;
            btnManage.style.opacity = '';
            btnManage.style.cursor = 'pointer';
        }

        const btnAddMod = document.getElementById('btn-hub-add-submodule');
        if (btnAddMod) {
            btnAddMod.disabled = false;
            btnAddMod.style.opacity = '';
            btnAddMod.style.cursor = 'pointer';
        }

        const inpNew = document.getElementById('hub-input-new-preset');
        const btnAddItem = document.getElementById('btn-hub-add-item');
        if (inpNew) {
            inpNew.disabled = isReadOnly;
            inpNew.placeholder = isReadOnly ? '样板间示范规划区已锁定，考点预设仅供查阅' : '输入新考点/章节名称，例如：函数极限计算技巧专题';
        }
        if (btnAddItem) {
            btnAddItem.disabled = isReadOnly;
            btnAddItem.style.opacity = isReadOnly ? '0.5' : '';
            btnAddItem.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }

        const ta = document.getElementById('hub-batch-textarea');
        const btnSaveBatch = document.getElementById('btn-hub-save-batch');
        if (ta) ta.disabled = isReadOnly;
        if (btnSaveBatch) {
            btnSaveBatch.disabled = isReadOnly;
            btnSaveBatch.style.opacity = isReadOnly ? '0.5' : '';
            btnSaveBatch.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }

        const taxonomy = getPresetHubTaxonomy();
        const taxKeys = Object.keys(taxonomy);
        if (!taxKeys.includes(state.hubState.subject)) {
            state.hubState.subject = taxKeys[0] || 'math';
        }
        const curSubjectKey = state.hubState.subject;
        const curSubject = taxonomy[curSubjectKey];
        if (!curSubject) return;

        // 1. 学科导航动态渲染
        const hubNav = document.getElementById('hub-subject-nav');
        if (hubNav) {
            hubNav.innerHTML = taxKeys.map(k => {
                const sub = taxonomy[k];
                const isActive = (k === curSubjectKey);
                const iconClass = sub.icon || (k === 'math' ? 'fa-solid fa-calculator' : k.startsWith('major') ? 'fa-solid fa-tower-broadcast' : k === 'english' ? 'fa-solid fa-language' : 'fa-solid fa-landmark');
                return `<button type="button" class="hub-sub-btn ${isActive ? 'active' : ''}" data-subject="${k}" onclick="window.hubSelectSubject('${k}')"><i class="${iconClass}"></i> ${escapeHtml(sub.name)}</button>`;
            }).join('');
        }

        // 2. 左栏：板块 / 题库列表渲染（全学科统一直接读取 curSubject.submodules）
        let submodulesObj = curSubject.submodules || {};
        if (Object.keys(submodulesObj).length === 0 && curSubject.types) {
            submodulesObj = Object.assign({}, curSubject.types.practice?.submodules || {}, curSubject.types.lecture?.submodules || {});
            curSubject.submodules = submodulesObj;
            delete curSubject.types;
        }

        const subKeys = Object.keys(submodulesObj);
        if (!subKeys.includes(state.hubState.submodule)) {
            state.hubState.submodule = subKeys[0] || '';
        }

        const listContainer = document.getElementById('hub-submodule-list-container');
        if (listContainer) {
            if (subKeys.length === 0) {
                listContainer.innerHTML = '<div style="padding:15px; color:var(--text-muted); font-size:11.5px; text-align:center;">暂无板块，请点击右上角新增</div>';
            } else {
                listContainer.innerHTML = subKeys.map(k => {
                    const mod = submodulesObj[k];
                    const isActive = (k === state.hubState.submodule);
                    const actionsHtml = isReadOnly ? '' : `
                        <div class="submodule-item-actions">
                            <button type="button" class="btn-item-ctrl" onclick="event.stopPropagation(); window.hubOpenEditSubmoduleModal('${k}')" title="重命名板块"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button type="button" class="btn-item-ctrl btn-item-delete" onclick="event.stopPropagation(); window.hubDeleteSubmodule('${k}')" title="删除板块"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    `;
                    return `
                        <div class="submodule-item-card ${isActive ? 'active' : ''}" onclick="window.hubSelectSubmodule('${k}')">
                            <span class="submodule-item-title">${escapeHtml(mod.name)}</span>
                            ${actionsHtml}
                        </div>
                    `;
                }).join('');
            }
        }

        // 3. 右栏：章节考点预设渲染
        const curModObj = submodulesObj[state.hubState.submodule];
        const rightTitle = document.getElementById('hub-current-mod-title');
        const rightMeta = document.getElementById('hub-current-mod-meta');
        const qtypeGroup = document.getElementById('hub-qtype-group');

        if (curModObj) {
            if (rightTitle) rightTitle.textContent = curModObj.name;
            const is660 = (curModObj.hasQuestionType);

            if (is660) {
                if (qtypeGroup) qtypeGroup.style.display = 'block';
                document.querySelectorAll('#hub-qtype-chips .cascade-chip').forEach(chip => {
                    if (chip.getAttribute('data-value') === state.hubState.questionType) chip.classList.add('active');
                    else chip.classList.remove('active');
                });
            } else {
                if (qtypeGroup) qtypeGroup.style.display = 'none';
            }

            const presets = getPresetArray(curSubjectKey, state.hubState.submodule, state.hubState.questionType);
            if (rightMeta) rightMeta.textContent = `共包含 ${presets.length} 项考点章节`;

            renderHubPresetItems(presets);
        } else {
            if (rightTitle) rightTitle.textContent = '未选择板块';
            if (rightMeta) rightMeta.textContent = '请在左侧选择或新建板块';
            renderHubPresetItems([]);
        }
    }

    function renderHubPresetItems(list) {
        const container = document.getElementById('hub-preset-items-container');
        if (!container) return;

        if (list.length === 0) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px;">该板块暂无考点预设</div>';
            return;
        }

        const isReadOnly = isCurrentWorkspaceReadOnly();

        container.innerHTML = list.map((item, idx) => {
            const actionsHtml = isReadOnly ? '' : `
                <div class="preset-item-actions">
                    <button type="button" class="btn-item-ctrl" onclick="window.hubEditPresetItem(${idx})" title="重命名/编辑"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button type="button" class="btn-item-ctrl" onclick="window.hubMovePresetItem(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''} title="上移"><i class="fa-solid fa-arrow-up"></i></button>
                    <button type="button" class="btn-item-ctrl" onclick="window.hubMovePresetItem(${idx}, 1)" ${idx === list.length - 1 ? 'disabled style="opacity:0.3;"' : ''} title="下移"><i class="fa-solid fa-arrow-down"></i></button>
                    <button type="button" class="btn-item-ctrl btn-item-delete" onclick="window.hubDeletePresetItem(${idx})" title="删除考点"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            return `
                <div class="preset-item-row" data-index="${idx}">
                    <span class="preset-item-index">${idx + 1}.</span>
                    <span class="preset-item-text">${escapeHtml(item)}</span>
                    ${actionsHtml}
                </div>
            `;
        }).join('');

        if (state.hubState.viewMode === 'hub-batch') {
            const ta = document.getElementById('hub-batch-textarea');
            if (ta) ta.value = list.join('\n');
        }
    }

    window.hubSelectSubject = function (subjectKey) {
        state.hubState.subject = subjectKey;
        renderPresetHub();
    };

    // ==========================================================================
    // 学科定制与管理 (Subject Customization & Management)
    // ==========================================================================

    function openManageSubjectsModal() {
        const isReadOnly = isCurrentWorkspaceReadOnly();
        const banner = document.getElementById('manage-subjects-readonly-banner');
        if (banner) banner.style.display = isReadOnly ? 'flex' : 'none';

        const saveBtn = document.getElementById('btn-save-manage-subjects');
        const addMajorBtn = document.getElementById('btn-add-major-subject');
        if (saveBtn) {
            saveBtn.disabled = isReadOnly;
            saveBtn.style.opacity = isReadOnly ? '0.5' : '';
            saveBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }
        if (addMajorBtn) {
            addMajorBtn.disabled = isReadOnly;
            addMajorBtn.style.opacity = isReadOnly ? '0.5' : '';
            addMajorBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }

        state.tempSubjectsConfig = JSON.parse(JSON.stringify(state.subjects || (state.workspace && state.workspace.subjects) || {}));
        renderManageSubjectsList();
        openModal('modal-manage-subjects');
    }
    window.openManageSubjectsModal = openManageSubjectsModal;

    function renderManageSubjectsList() {
        const listContainer = document.getElementById('manage-subjects-list');
        if (!listContainer) return;

        const isReadOnly = isCurrentWorkspaceReadOnly();
        const subKeys = Object.keys(state.tempSubjectsConfig);
        listContainer.innerHTML = subKeys.map(k => {
            const sub = state.tempSubjectsConfig[k];
            const isCore = ['math', 'english', 'politics'].includes(k);
            const isMajor1 = (k === 'major');
            const icon = sub.icon || (k === 'math' ? 'fa-solid fa-calculator' : k === 'english' ? 'fa-solid fa-language' : k === 'politics' ? 'fa-solid fa-landmark' : 'fa-solid fa-tower-broadcast');

            let shortcutsHtml = '';
            if (!isReadOnly) {
                if (k === 'math') {
                    shortcutsHtml = `
                        <div class="manage-preset-shortcuts">
                            <button type="button" class="btn btn-xs btn-outline" onclick="window.setManageSubVal('${k}', '数学一')">数一</button>
                            <button type="button" class="btn btn-xs btn-outline" onclick="window.setManageSubVal('${k}', '数学二')">数二</button>
                            <button type="button" class="btn btn-xs btn-outline" onclick="window.setManageSubVal('${k}', '数学三')">数三</button>
                        </div>
                    `;
                } else if (k === 'english') {
                    shortcutsHtml = `
                        <div class="manage-preset-shortcuts">
                            <button type="button" class="btn btn-xs btn-outline" onclick="window.setManageSubVal('${k}', '英语一')">英一</button>
                            <button type="button" class="btn btn-xs btn-outline" onclick="window.setManageSubVal('${k}', '英语二')">英二</button>
                        </div>
                    `;
                }
            }

            const deleteBtnHtml = (!isCore && !isMajor1 && !isReadOnly) ? `
                <button type="button" class="btn btn-xs btn-ghost" style="color:var(--color-danger);" onclick="window.removeMajorSubject('${k}')" title="删除此学科">
                    <i class="fa-solid fa-trash-can"></i> 删除
                </button>
            ` : '';

            let typeLabel = '专业课';
            if (k === 'math') typeLabel = '数学统考';
            else if (k === 'english') typeLabel = '英语统考';
            else if (k === 'politics') typeLabel = '政治统考';
            else if (isMajor1) typeLabel = '专业课一';
            else typeLabel = `自命题专业课 (${k})`;

            const disabledAttr = isReadOnly ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : '';

            return `
                <div class="manage-subject-row" data-key="${k}">
                    <div class="manage-sub-icon"><i class="${icon}"></i></div>
                    <div class="manage-sub-info">
                        <div class="manage-sub-header-line">
                            <span class="manage-sub-type">${typeLabel}</span>
                            ${deleteBtnHtml}
                        </div>
                        <div class="manage-sub-input-row">
                            <input type="text" class="form-input form-input-sm manage-sub-input" data-key="${k}" value="${escapeHtml(sub.name)}" maxlength="20" placeholder="学科名称" ${disabledAttr}>
                            ${shortcutsHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (!isReadOnly) {
            listContainer.querySelectorAll('.manage-sub-input').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    const k = e.target.getAttribute('data-key');
                    if (state.tempSubjectsConfig[k]) {
                        state.tempSubjectsConfig[k].name = e.target.value;
                    }
                });
            });
        }
    }

    window.setManageSubVal = function (key, val) {
        if (checkReadOnlyAndWarn()) return;
        if (state.tempSubjectsConfig[key]) {
            state.tempSubjectsConfig[key].name = val;
            renderManageSubjectsList();
        }
    };

    window.addMajorSubjectInModal = function () {
        if (checkReadOnlyAndWarn()) return;
        const currentKeys = Object.keys(state.tempSubjectsConfig);
        const majorKeys = currentKeys.filter(k => k.startsWith('major'));
        if (majorKeys.length >= 4) {
            showToast("专业课最多支持添加 4 门！", "warning");
            return;
        }

        const nextNum = majorKeys.length + 1;
        const cnNums = ['二', '三', '四'];
        const cnNum = cnNums[nextNum - 2] || nextNum;
        const newKey = `major${nextNum}`;

        const palette = ['blue', 'green', 'purple', 'amber', 'rose', 'cyan', 'orange', 'slate'];
        const usedColors = currentKeys.map(k => state.tempSubjectsConfig[k].color).filter(Boolean);
        const freeColors = palette.filter(c => !usedColors.includes(c));
        const color = freeColors.length > 0 ? freeColors[0] : palette[Math.floor(Math.random() * palette.length)];

        state.tempSubjectsConfig[newKey] = {
            id: newKey,
            name: `专业课${cnNum}`,
            color: color,
            icon: 'fa-solid fa-tower-broadcast'
        };

        renderManageSubjectsList();
        showToast(`已添加【专业课${cnNum}】，请修改具体名称！`, "info");
    };

    window.removeMajorSubject = function (key) {
        if (checkReadOnlyAndWarn()) return;
        if (['math', 'major', 'english', 'politics'].includes(key)) {
            showToast("基础主干学科不可删除！", "warning");
            return;
        }
        delete state.tempSubjectsConfig[key];
        renderManageSubjectsList();
    };

    function saveManageSubjectsFromModal() {
        if (checkReadOnlyAndWarn()) return;
        const inputs = document.querySelectorAll('#manage-subjects-list .manage-sub-input');
        let hasEmpty = false;
        inputs.forEach(inp => {
            if (!inp.value.trim()) {
                inp.classList.add('has-error');
                hasEmpty = true;
            } else {
                inp.classList.remove('has-error');
            }
        });

        if (hasEmpty) {
            showToast("学科名称不能为空！", "error");
            return;
        }

        const snapshot = takeWorkspaceSnapshot();
        state.subjects = JSON.parse(JSON.stringify(state.tempSubjectsConfig));
        if (state.workspace) {
            state.workspace.subjects = state.subjects;
        }

        const taxonomy = getPresetHubTaxonomy();
        Object.keys(taxonomy).forEach(taxKey => {
            if (!state.subjects[taxKey]) {
                delete taxonomy[taxKey];
            }
        });
        Object.keys(state.subjects).forEach(subKey => {
            const sub = state.subjects[subKey];
            if (taxonomy[subKey]) {
                taxonomy[subKey].name = sub.name;
            } else {
                taxonomy[subKey] = {
                    id: subKey,
                    name: sub.name,
                    icon: sub.icon || 'fa-solid fa-microchip',
                    badgeClass: 'badge-cyan',
                    submodules: {
                        [`${subKey}_sub1`]: {
                            id: `${subKey}_sub1`,
                            name: `${sub.name}核心考点`,
                            presets: [`${sub.name}基础考点 01`, `${sub.name}重点大题 02`]
                        }
                    }
                };
            }
        });

        saveData();
        closeModal('modal-manage-subjects');
        renderAll();
        showToast("✓ 考研学科配置已成功更新并生效！", "success", { undoSnapshot: snapshot });
    }

    window.hubSelectSubmodule = function (submoduleKey) {
        state.hubState.submodule = submoduleKey;
        renderPresetHub();
    };

    window.hubEditPresetItem = function (index) {
        if (checkReadOnlyAndWarn()) return;
        const list = getPresetArray(state.hubState.subject, state.hubState.submodule, state.hubState.questionType);
        const oldText = list[index] || '';
        const newText = prompt(`编辑第 ${index + 1} 项考点章节名称：`, oldText);
        if (newText !== null && newText.trim() && newText.trim() !== oldText) {
            const snapshot = takeWorkspaceSnapshot();
            checkScheduleImpact(oldText, newText.trim(), (action) => {
                list[index] = newText.trim();
                setPresetArray(state.hubState.subject, state.hubState.submodule, state.hubState.questionType, list);
                renderPresetHub();
                renderTimeline();
                showToast("考点名称已修改！", "success", { undoSnapshot: snapshot });
            });
        }
    };

    window.hubDeletePresetItem = function (index) {
        if (checkReadOnlyAndWarn()) return;
        const list = getPresetArray(state.hubState.subject, state.hubState.submodule, state.hubState.questionType);
        const oldText = list[index] || '';
        const snapshot = takeWorkspaceSnapshot();
        checkScheduleImpact(oldText, '', (action) => {
            list.splice(index, 1);
            setPresetArray(state.hubState.subject, state.hubState.submodule, state.hubState.questionType, list);
            renderPresetHub();
            renderTimeline();
            showToast(`已删除考点【${oldText}】`, "info", { undoSnapshot: snapshot });
        });
    };

    window.hubMovePresetItem = function (index, delta) {
        if (checkReadOnlyAndWarn()) return;
        const list = getPresetArray(state.hubState.subject, state.hubState.submodule, state.hubState.questionType);
        const targetIndex = index + delta;
        if (targetIndex < 0 || targetIndex >= list.length) return;

        const temp = list[index];
        list[index] = list[targetIndex];
        list[targetIndex] = temp;

        setPresetArray(state.hubState.subject, state.hubState.submodule, state.hubState.questionType, list);
        renderPresetHub();
    };

    window.hubAddPresetItem = function () {
        if (checkReadOnlyAndWarn()) return;
        const input = document.getElementById('hub-input-new-preset');
        const text = input.value.trim();
        if (!text) {
            showToast("请输入考点名称！", "error");
            return;
        }

        const snapshot = takeWorkspaceSnapshot();
        const list = getPresetArray(state.hubState.subject, state.hubState.submodule, state.hubState.questionType);
        list.push(text);
        setPresetArray(state.hubState.subject, state.hubState.submodule, state.hubState.questionType, list);

        input.value = '';
        renderPresetHub();
        showToast(`已成功添加考点【${text}】！`, "success", { undoSnapshot: snapshot });
    };

    window.hubSaveBatch = function () {
        if (checkReadOnlyAndWarn()) return;
        const raw = document.getElementById('hub-batch-textarea').value;
        const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        const snapshot = takeWorkspaceSnapshot();
        setPresetArray(state.hubState.subject, state.hubState.submodule, state.hubState.questionType, lines);
        renderPresetHub();
        showToast(`已批量保存 ${lines.length} 条考点！`, "success", { undoSnapshot: snapshot });
        setHubViewMode('hub-list');
    };

    function setHubViewMode(mode) {
        state.hubState.viewMode = mode;
        document.querySelectorAll('#hub-view-tabs .edit-mode-tab').forEach(tab => {
            if (tab.getAttribute('data-tab') === mode) tab.classList.add('active');
            else tab.classList.remove('active');
        });

        if (mode === 'hub-list') {
            document.getElementById('hub-view-list-pane').style.display = 'block';
            document.getElementById('hub-view-batch-pane').style.display = 'none';
        } else {
            document.getElementById('hub-view-list-pane').style.display = 'none';
            document.getElementById('hub-view-batch-pane').style.display = 'block';
            const list = getPresetArray(state.hubState.subject, state.hubState.submodule, state.hubState.questionType);
            document.getElementById('hub-batch-textarea').value = list.join('\n');
        }
    }

    // --- Submodule CRUD ---
    window.hubOpenCreateSubmoduleModal = function () {
        state.editingSubmoduleKey = null; // New
        const isReadOnly = isCurrentWorkspaceReadOnly();
        const banner = document.getElementById('submodule-readonly-banner');
        if (banner) banner.style.display = isReadOnly ? 'flex' : 'none';
        const nameInput = document.getElementById('submodule-input-name');
        const qtypeInput = document.getElementById('submodule-input-has-qtype');
        const saveBtn = document.getElementById('btn-save-submodule');
        if (nameInput) {
            nameInput.value = '';
            nameInput.disabled = isReadOnly;
        }
        if (qtypeInput) {
            qtypeInput.checked = false;
            qtypeInput.disabled = isReadOnly;
        }
        if (saveBtn) {
            saveBtn.disabled = isReadOnly;
            saveBtn.style.opacity = isReadOnly ? '0.5' : '';
            saveBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }
        document.getElementById('submodule-modal-title').textContent = '新建板块 / 题库';
        openModal('modal-edit-submodule');
    };

    window.hubOpenEditSubmoduleModal = function (submoduleKey) {
        state.editingSubmoduleKey = submoduleKey;
        const taxonomy = getPresetHubTaxonomy();
        const curSubjectKey = state.hubState.subject;
        const curSub = taxonomy[curSubjectKey];
        let modObj = curSub?.submodules?.[submoduleKey];
        if (!modObj && curSub?.types) {
            modObj = curSub.types.practice?.submodules?.[submoduleKey] || curSub.types.lecture?.submodules?.[submoduleKey];
        }

        if (!modObj) return;

        const isReadOnly = isCurrentWorkspaceReadOnly();
        const banner = document.getElementById('submodule-readonly-banner');
        if (banner) banner.style.display = isReadOnly ? 'flex' : 'none';
        const nameInput = document.getElementById('submodule-input-name');
        const qtypeInput = document.getElementById('submodule-input-has-qtype');
        const saveBtn = document.getElementById('btn-save-submodule');
        if (nameInput) {
            nameInput.value = modObj.name;
            nameInput.disabled = isReadOnly;
        }
        if (qtypeInput) {
            qtypeInput.checked = !!modObj.hasQuestionType;
            qtypeInput.disabled = isReadOnly;
        }
        if (saveBtn) {
            saveBtn.disabled = isReadOnly;
            saveBtn.style.opacity = isReadOnly ? '0.5' : '';
            saveBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }

        document.getElementById('submodule-modal-title').textContent = `编辑板块 (${modObj.name})`;
        openModal('modal-edit-submodule');
    };

    function saveSubmoduleData() {
        if (checkReadOnlyAndWarn()) return;
        const name = document.getElementById('submodule-input-name').value.trim();
        const hasQType = document.getElementById('submodule-input-has-qtype').checked;

        if (!name) {
            showToast("请输入板块名称！", "error");
            return;
        }

        const snapshot = takeWorkspaceSnapshot();
        const taxonomy = getPresetHubTaxonomy();
        const curSubjectKey = state.hubState.subject;
        if (!taxonomy[curSubjectKey]) taxonomy[curSubjectKey] = { submodules: {} };
        if (!taxonomy[curSubjectKey].submodules) taxonomy[curSubjectKey].submodules = {};
        const targetSubmodules = taxonomy[curSubjectKey].submodules;

        if (state.editingSubmoduleKey) {
            // Edit
            const oldMod = targetSubmodules[state.editingSubmoduleKey];
            const oldName = oldMod ? oldMod.name : '';

            checkScheduleImpact(oldName, name, (action) => {
                if (oldMod) {
                    oldMod.name = name;
                    oldMod.hasQuestionType = hasQType;
                }
                saveData();
                closeModal('modal-edit-submodule');
                renderPresetHub();
                renderTimeline();
                showToast(`已更新板块【${name}】！`, "success", { undoSnapshot: snapshot });
            });
        } else {
            // Create
            const newKey = `sub_${Date.now()}`;
            targetSubmodules[newKey] = {
                id: newKey,
                name: name,
                hasQuestionType: hasQType,
                presets: hasQType ? undefined : ["基础章节考点 01", "核心计算大题 02"],
                questionTypes: hasQType ? {
                    choice: { id: "choice", name: "选择题", presets: ["选择题考点 01"] },
                    blank: { id: "blank", name: "填空题", presets: ["填空题考点 01"] }
                } : undefined
            };
            state.hubState.submodule = newKey;
            saveData();
            closeModal('modal-edit-submodule');
            renderPresetHub();
            showToast(`已新建板块【${name}】！`, "success", { undoSnapshot: snapshot });
        }
    }

    window.hubDeleteSubmodule = function (submoduleKey) {
        const taxonomy = getPresetHubTaxonomy();
        const curSubjectKey = state.hubState.subject;
        const targetSubmodules = taxonomy[curSubjectKey]?.submodules;

        if (!targetSubmodules || !targetSubmodules[submoduleKey]) return;
        const modName = targetSubmodules[submoduleKey].name;

        const snapshot = takeWorkspaceSnapshot();
        checkScheduleImpact(modName, '', (action) => {
            delete targetSubmodules[submoduleKey];
            const remainingKeys = Object.keys(targetSubmodules);
            state.hubState.submodule = remainingKeys[0] || '';
            saveData();
            renderPresetHub();
            renderTimeline();
            showToast(`已删除板块【${modName}】`, "info", { undoSnapshot: snapshot });
        });
    };

    function initPresetHubEvents() {
        // 学科选择
        document.querySelectorAll('#hub-subject-nav .hub-sub-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.hubState.subject = btn.getAttribute('data-subject');
                renderPresetHub();
            });
        });

        // 660 题型
        document.querySelectorAll('#hub-qtype-chips .cascade-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                state.hubState.questionType = chip.getAttribute('data-value');
                renderPresetHub();
            });
        });

        // 视图模式切换
        document.querySelectorAll('#hub-view-tabs .edit-mode-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                setHubViewMode(tab.getAttribute('data-tab'));
            });
        });

        // 添加考点
        document.getElementById('btn-hub-add-item')?.addEventListener('click', window.hubAddPresetItem);
        document.getElementById('hub-input-new-preset')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.hubAddPresetItem();
            }
        });

        // 批量保存
        document.getElementById('btn-hub-save-batch')?.addEventListener('click', window.hubSaveBatch);

        // 新建板块按钮与弹窗
        document.getElementById('btn-hub-add-submodule')?.addEventListener('click', window.hubOpenCreateSubmoduleModal);
        document.getElementById('btn-close-submodule-edit')?.addEventListener('click', () => closeModal('modal-edit-submodule'));
        document.getElementById('btn-cancel-submodule-edit')?.addEventListener('click', () => closeModal('modal-edit-submodule'));
        document.getElementById('btn-save-submodule')?.addEventListener('click', saveSubmoduleData);
    }

    // ==========================================================================
    // 5. 计划关联变动影响检测与智能同步 (Cascade Schedule Sync)
    // ==========================================================================

    function checkScheduleImpact(oldKeyword, newKeyword, onExecute) {
        if (!oldKeyword) {
            onExecute('keep');
            return;
        }

        const kw = oldKeyword.trim();
        const matches = [];

        Object.keys(state.schedule).forEach(dateKey => {
            const plan = state.schedule[dateKey];
            if (plan.isRest) return;

            ['morning', 'afternoon', 'evening'].forEach(slot => {
                const text = plan[slot]?.text || '';
                if (text.includes(kw)) {
                    const slotName = slot === 'morning' ? '上午' : (slot === 'afternoon' ? '下午' : '晚上');
                    matches.push({ dateKey, slot, slotName, text });
                }
            });
        });

        if (matches.length === 0) {
            onExecute('keep');
            return;
        }

        // 弹窗提示用户
        state.pendingCascadeAction = {
            oldKeyword: kw,
            newKeyword: newKeyword ? newKeyword.trim() : '',
            matches: matches,
            onExecute: onExecute
        };

        const impactTitle = document.getElementById('cascade-impact-title');
        if (impactTitle) impactTitle.textContent = `共检测到 ${matches.length} 个已排期日程包含【${kw}】：`;

        const impactList = document.getElementById('cascade-impact-list');
        if (impactList) {
            impactList.innerHTML = matches.slice(0, 8).map(m => `
                <li>📅 <strong>${m.dateKey}</strong> · ${m.slotName}：${escapeHtml(m.text)}</li>
            `).join('') + (matches.length > 8 ? `<li>... 另有 ${matches.length - 8} 个日程</li>` : '');
        }

        openModal('modal-cascade-sync');
    }

    function initCascadeSyncEvents() {
        document.getElementById('btn-close-cascade-sync')?.addEventListener('click', () => closeModal('modal-cascade-sync'));

        document.getElementById('btn-sync-action-update')?.addEventListener('click', () => {
            if (!state.pendingCascadeAction) return;
            const { oldKeyword, newKeyword, matches, onExecute } = state.pendingCascadeAction;

            if (newKeyword) {
                matches.forEach(m => {
                    if (state.schedule[m.dateKey] && state.schedule[m.dateKey][m.slot]) {
                        state.schedule[m.dateKey][m.slot].text = state.schedule[m.dateKey][m.slot].text.replace(new RegExp(escapeRegExp(oldKeyword), 'g'), newKeyword);
                    }
                });
                saveData();
                showToast(`已同步更新 ${matches.length} 个已排期日程！`, "success");
            }

            closeModal('modal-cascade-sync');
            onExecute('update');
            state.pendingCascadeAction = null;
        });

        document.getElementById('btn-sync-action-clear')?.addEventListener('click', () => {
            if (!state.pendingCascadeAction) return;
            const { matches, onExecute } = state.pendingCascadeAction;

            matches.forEach(m => {
                if (state.schedule[m.dateKey] && state.schedule[m.dateKey][m.slot]) {
                    state.schedule[m.dateKey][m.slot].text = '';
                }
            });
            saveData();
            showToast(`已清空 ${matches.length} 个受影响日程的任务！`, "info");

            closeModal('modal-cascade-sync');
            onExecute('clear');
            state.pendingCascadeAction = null;
        });

        document.getElementById('btn-sync-action-keep')?.addEventListener('click', () => {
            if (!state.pendingCascadeAction) return;
            const { onExecute } = state.pendingCascadeAction;
            closeModal('modal-cascade-sync');
            onExecute('keep');
            state.pendingCascadeAction = null;
        });

        document.getElementById('btn-sync-action-cancel')?.addEventListener('click', () => {
            closeModal('modal-cascade-sync');
            state.pendingCascadeAction = null;
            showToast("已取消本次修改");
        });
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ==========================================================================
    // 滚动条交互行为：滚动时平滑呈现，静止 800ms 内自动淡出隐藏
    // ==========================================================================
    let scrollFadeTimer = null;
    function initScrollbarBehavior() {
        const handleScroll = (el) => {
            if (el && el.classList) {
                el.classList.add('is-scrolling');
            }
            document.body.classList.add('is-scrolling');

            if (scrollFadeTimer) clearTimeout(scrollFadeTimer);
            scrollFadeTimer = setTimeout(() => {
                document.querySelectorAll('.is-scrolling').forEach(node => {
                    node.classList.remove('is-scrolling');
                });
                document.body.classList.remove('is-scrolling');
            }, 800);
        };

        const mainContainer = document.querySelector('.main-layout');
        if (mainContainer) {
            mainContainer.addEventListener('scroll', () => handleScroll(mainContainer), { passive: true });
        }

        document.addEventListener('scroll', (e) => {
            handleScroll(e.target);
        }, { capture: true, passive: true });
    }

    // ==========================================================================
    // 6. 统一编辑菜单与日程交互 (Smart Reverse Match & Multi-Slot Tab Switcher)
    // ==========================================================================

    // 智能反向匹配文本到分类知识库
    function matchTextToTaxonomy(text, subjectHint) {
        if (!text) return null;
        const taxonomy = state.taxonomy || window.TAXONOMY_TREE || {};
        const cleanText = text.trim();

        // 1. 题库分类树精确及预设匹配
        for (const subKey of Object.keys(taxonomy)) {
            const subObj = taxonomy[subKey];
            if (!subObj) continue;

            const submods = subObj.submodules || {};
            for (const modKey of Object.keys(submods)) {
                const modObj = submods[modKey];
                if (modObj.hasQuestionType) {
                    for (const qKey of Object.keys(modObj.questionTypes || {})) {
                        const qObj = modObj.questionTypes[qKey];
                        for (const p of (qObj.presets || [])) {
                            if (cleanText === p || cleanText.includes(p) || p.includes(cleanText)) {
                                return { subject: subKey, submodule: modKey, questionType: qKey, preset: p };
                            }
                        }
                    }
                } else {
                    for (const p of (modObj.presets || [])) {
                        if (cleanText === p || cleanText.includes(p) || p.includes(cleanText)) {
                            return { subject: subKey, submodule: modKey, questionType: 'choice', preset: p };
                        }
                    }
                }
            }
        }

        // 2. 关键词与特征智能模糊匹配 (例如：张宇级数、方浩概率、通信原理等)
        if (cleanText.includes('张宇级数') || cleanText.includes('级数0') || cleanText.includes('级数1')) {
            return { subject: 'math', submodule: 'zhangyu_series', questionType: 'choice', preset: cleanText };
        }
        if (cleanText.includes('张宇多元') || cleanText.includes('多元积分预备') || cleanText.includes('多元积分0') || cleanText.includes('多元积分')) {
            return { subject: 'math', submodule: 'zhangyu_multivar', questionType: 'choice', preset: cleanText };
        }
        if (cleanText.includes('方浩') || cleanText.includes('概率基础')) {
            return { subject: 'math', submodule: 'fanghao_prob', questionType: 'choice', preset: cleanText };
        }
        if (cleanText.includes('线代') && (cleanText.includes('视频') || cleanText.includes('消化') || cleanText.includes('强化'))) {
            return { subject: 'math', submodule: 'linear_algebra', questionType: 'choice', preset: cleanText };
        }
        if (cleanText.includes('660')) {
            const isBlank = cleanText.includes('填空');
            return { subject: 'math', submodule: 'm660', questionType: isBlank ? 'blank' : 'choice', preset: '' };
        }
        if (cleanText.includes('880')) {
            return { subject: 'math', submodule: 'm880', questionType: 'choice', preset: '' };
        }
        if (cleanText.includes('1000')) {
            return { subject: 'math', submodule: 'm1000', questionType: 'choice', preset: '' };
        }
        if (cleanText.includes('通原') || cleanText.includes('通信原理')) {
            return { subject: 'major', submodule: 'comm_basic_course', questionType: 'choice', preset: '' };
        }
        if (cleanText.includes('英语') || cleanText.includes('真题阅读')) {
            return { subject: 'english', submodule: 'eng_reading_past', questionType: 'choice', preset: '' };
        }
        if (cleanText.includes('政治') || cleanText.includes('肖秀荣') || cleanText.includes('肖四') || cleanText.includes('肖八')) {
            return { subject: 'politics', submodule: 'pol_xiao_4_recite', questionType: 'choice', preset: '' };
        }

        return null;
    }

    // 将指定日期的某个时段加载到弹窗选择器中
    function loadSlotIntoPicker(dateKey, slot) {
        state.pickerTarget.date = dateKey || "2026-08-17";
        state.pickerTarget.slot = slot || "morning";

        document.getElementById('picker-target-date-display').textContent = state.pickerTarget.date;

        // 高亮对应的时段 Tab 按钮
        document.querySelectorAll('#picker-slot-tabs .slot-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-slot') === state.pickerTarget.slot) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 获取当前时段的任务数据
        const currentPlan = state.schedule[dateKey];
        const currentSlotData = currentPlan ? currentPlan[state.pickerTarget.slot] : null;
        const currentText = (currentSlotData?.text || '').trim();
        const currentSub = currentSlotData?.subject;

        document.getElementById('picker-final-text').value = currentText;

        // 尝试智能识别
        const matched = matchTextToTaxonomy(currentText, currentSub);

        if (matched) {
            setEditMode('mode-preset');
            applyPickerStateFull(matched.subject, matched.submodule, matched.questionType, matched.preset, currentText);
        } else {
            // 根据时段与现有学科智能匹配默认学科
            let targetSub = (currentSub && currentSub !== 'pending' && state.subjects?.[currentSub]) ? currentSub : null;
            if (!targetSub) {
                if (state.pickerTarget.slot === 'evening' && state.subjects?.major) targetSub = 'major';
                else if (state.subjects?.math) targetSub = 'math';
                else targetSub = Object.keys(state.subjects || {})[0] || 'math';
            }

            const taxonomy = state.taxonomy || window.TAXONOMY_TREE || {};
            const curSubTax = taxonomy[targetSub];
            let hasAnyPresets = false;
            let firstSubmod = '';

            const submods = curSubTax?.submodules || {};
            const modKeys = Object.keys(submods);
            if (modKeys.length > 0) {
                hasAnyPresets = true;
                firstSubmod = modKeys[0];
            }
            applyPickerStateFull(targetSub, firstSubmod, 'choice', null, currentText);

            if (!hasAnyPresets && !currentText) {
                setEditMode('mode-custom');
            } else {
                setEditMode('mode-preset');
            }
        }
    }

    function applyPickerStateFull(subjectId, submoduleId, qTypeId, presetVal, customText) {
        state.pickerState.subject = subjectId;
        state.pickerState.questionType = qTypeId || 'choice';

        // 1. 设置学科 Chip
        document.querySelectorAll('#picker-subject-chips .cascade-chip').forEach(chip => {
            if (chip.getAttribute('data-value') === subjectId) chip.classList.add('active');
            else chip.classList.remove('active');
        });

        document.getElementById('custom-input-subject').value = subjectId;

        // 2. 更新 Submodules 下拉（全学科统一读取 curSub.submodules）
        const subSelect = document.getElementById('picker-submodule-select');
        subSelect.innerHTML = '';

        const taxonomy = state.taxonomy || window.TAXONOMY_TREE || {};
        const curSub = taxonomy[state.pickerState.subject];
        let submodulesObj = curSub?.submodules || {};
        if (Object.keys(submodulesObj).length === 0 && curSub?.types) {
            submodulesObj = Object.assign({}, curSub.types.practice?.submodules || {}, curSub.types.lecture?.submodules || {});
        }

        const modKeys = Object.keys(submodulesObj || {});
        modKeys.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = submodulesObj[k].name;
            subSelect.appendChild(opt);
        });

        if (submoduleId && submodulesObj[submoduleId]) {
            state.pickerState.submodule = submoduleId;
            subSelect.value = submoduleId;
        } else {
            state.pickerState.submodule = modKeys[0] || '';
            subSelect.value = state.pickerState.submodule;
        }

        // 3. 题型选择器（660专属）
        const qGroup = document.getElementById('group-question-type');
        const curModObj = submodulesObj[state.pickerState.submodule];

        const hasQType = !!curModObj?.hasQuestionType;
        if (hasQType) {
            if (qGroup) qGroup.style.display = 'block';
            document.querySelectorAll('#picker-qtype-chips .cascade-chip').forEach(chip => {
                if (chip.getAttribute('data-value') === state.pickerState.questionType) chip.classList.add('active');
                else chip.classList.remove('active');
            });
        } else {
            if (qGroup) qGroup.style.display = 'none';
        }

        // 4. 预设章节下拉
        const presetSelect = document.getElementById('picker-preset-select');
        presetSelect.innerHTML = '';

        const presetsList = getPresetArray(state.pickerState.subject, state.pickerState.submodule, state.pickerState.questionType);
        presetsList.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            presetSelect.appendChild(opt);
        });

        if (presetVal && presetsList.includes(presetVal)) {
            state.pickerState.preset = presetVal;
            presetSelect.value = presetVal;
        } else {
            state.pickerState.preset = presetsList[0] || '';
            presetSelect.value = state.pickerState.preset;
        }

        // 5. 计划文本框
        if (customText !== undefined && customText !== null) {
            document.getElementById('picker-final-text').value = customText;
        } else {
            updatePickerFinalText();
        }
    }

    window.openEditModal = function (dateKey, slot) {
        state.pickerTarget.date = dateKey || "2026-08-17";
        state.pickerTarget.slot = slot || "morning";
        loadSlotIntoPicker(state.pickerTarget.date, state.pickerTarget.slot);

        const isReadOnly = isCurrentWorkspaceReadOnly();
        const banner = document.getElementById('picker-readonly-banner');
        if (banner) banner.style.display = isReadOnly ? 'flex' : 'none';

        const applyBtn = document.getElementById('btn-apply-picker');
        const clearBtn = document.getElementById('btn-clear-slot');
        const customInput = document.getElementById('picker-custom-text');
        const finalInput = document.getElementById('picker-final-text');
        const presetSelect = document.getElementById('picker-preset-select');
        const subSelect = document.getElementById('picker-submodule-select');

        if (applyBtn) {
            applyBtn.disabled = isReadOnly;
            applyBtn.style.opacity = isReadOnly ? '0.5' : '';
            applyBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }
        if (clearBtn) {
            clearBtn.disabled = isReadOnly;
            clearBtn.style.opacity = isReadOnly ? '0.5' : '';
            clearBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }
        if (customInput) {
            customInput.disabled = isReadOnly;
            customInput.style.opacity = isReadOnly ? '0.6' : '';
        }
        if (finalInput) {
            finalInput.disabled = isReadOnly;
            finalInput.style.opacity = isReadOnly ? '0.6' : '';
        }
        if (presetSelect) presetSelect.disabled = isReadOnly;
        if (subSelect) subSelect.disabled = isReadOnly;

        openModal('modal-cascading-picker');
    };

    function setEditMode(mode) {
        state.editMode = mode;
        document.querySelectorAll('#edit-mode-tabs .edit-mode-tab').forEach(tab => {
            if (tab.getAttribute('data-tab') === mode) tab.classList.add('active');
            else tab.classList.remove('active');
        });

        if (mode === 'mode-preset') {
            document.getElementById('section-picker-preset').style.display = 'block';
            document.getElementById('section-picker-custom').style.display = 'none';
        } else {
            document.getElementById('section-picker-preset').style.display = 'none';
            document.getElementById('section-picker-custom').style.display = 'block';
        }
    }

    function setPickerSubject(subjectId) {
        applyPickerStateFull(subjectId, null, 'choice', null, null);
    }
    window.setPickerSubject = setPickerSubject;

    function setPickerQuestionType(qType) {
        applyPickerStateFull(state.pickerState.subject, state.pickerState.submodule, qType, null, null);
    }

    function updatePickerFinalText() {
        const sub = state.pickerState.subject;
        const modKey = state.pickerState.submodule;
        const qType = state.pickerState.questionType;
        const preset = document.getElementById('picker-preset-select').value || state.pickerState.preset;

        let formatted = preset;

        if (sub === 'math') {
            if (modKey === 'm660') {
                const qTypeLabel = qType === 'choice' ? '选择题' : '填空题';
                formatted = `660 ${qTypeLabel}${preset}`;
            } else if (modKey === 'm1000') {
                formatted = `1000题强化篇 · ${preset}`;
            } else if (modKey === 'm880') {
                formatted = `880题 · ${preset}`;
            } else if (modKey === 'past_paper_1') {
                formatted = `数学真题一轮 · ${preset}`;
            } else if (modKey === 'paper_sets') {
                formatted = `数学模拟套卷 · ${preset}`;
            } else if (modKey === 'past_paper_2') {
                formatted = `数学真题二轮 · ${preset}`;
            } else {
                const taxonomy = state.taxonomy || window.TAXONOMY_TREE || {};
                const modName = taxonomy.math?.submodules?.[modKey]?.name;
                if (modName && !preset.startsWith(modName)) formatted = `${modName} · ${preset}`;
                else formatted = preset;
            }
        } else {
            const taxonomy = state.taxonomy || window.TAXONOMY_TREE || {};
            const modName = taxonomy[sub]?.submodules?.[modKey]?.name || (state.subjects?.[sub]?.name || '学科');
            if (preset.startsWith(modName)) formatted = preset;
            else formatted = `${modName} · ${preset}`;
        }

        document.getElementById('picker-final-text').value = formatted;
    }

    function confirmPickerApply() {
        if (checkReadOnlyAndWarn()) return;
        const finalText = document.getElementById('picker-final-text').value.trim();
        const targetDate = state.pickerTarget.date;
        const targetSlot = state.pickerTarget.slot;

        let subject = state.pickerState.subject;
        if (state.editMode === 'mode-custom') {
            subject = document.getElementById('custom-input-subject').value;
        }

        if (!state.schedule[targetDate]) {
            showToast("无效的目标日期！", "error");
            return;
        }

        const snapshot = takeWorkspaceSnapshot();

        if (state.schedule[targetDate].isRest) {
            state.schedule[targetDate].isRest = false;
        }

        if (!state.schedule[targetDate][targetSlot]) {
            state.schedule[targetDate][targetSlot] = { text: '', subject: subject };
        }

        state.schedule[targetDate][targetSlot].text = finalText;
        state.schedule[targetDate][targetSlot].subject = subject;

        saveData();
        closeModal('modal-cascading-picker');
        renderTimeline();
        showToast(`已成功更新 ${targetDate} 的【${targetSlot === 'morning' ? '上午' : (targetSlot === 'afternoon' ? '下午' : '晚上')}】计划！`, "success", { undoSnapshot: snapshot });
    }

    function initEditModalEvents() {
        // 时段快速切换 Tabs
        document.querySelectorAll('#picker-slot-tabs .slot-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.slot-tab-btn');
                if (!targetBtn) return;
                const newSlot = targetBtn.getAttribute('data-slot');
                if (newSlot && newSlot !== state.pickerTarget.slot) {
                    loadSlotIntoPicker(state.pickerTarget.date, newSlot);
                }
            });
        });

        document.querySelectorAll('#edit-mode-tabs .edit-mode-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                setEditMode(tab.getAttribute('data-tab'));
            });
        });

        document.querySelectorAll('#picker-subject-chips .cascade-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                setPickerSubject(chip.getAttribute('data-value'));
            });
        });

        document.getElementById('picker-submodule-select')?.addEventListener('change', (e) => {
            applyPickerStateFull(state.pickerState.subject, e.target.value, state.pickerState.questionType, null, null);
        });

        document.querySelectorAll('#picker-qtype-chips .cascade-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                setPickerQuestionType(chip.getAttribute('data-value'));
            });
        });

        document.getElementById('picker-preset-select')?.addEventListener('change', (e) => {
            state.pickerState.preset = e.target.value;
            updatePickerFinalText();
        });

        document.getElementById('btn-close-picker')?.addEventListener('click', () => closeModal('modal-cascading-picker'));
        document.getElementById('btn-cancel-picker')?.addEventListener('click', () => closeModal('modal-cascading-picker'));
        document.getElementById('btn-confirm-picker')?.addEventListener('click', confirmPickerApply);

        // 快速跳转至预设库 Tab
        document.getElementById('btn-quick-manage-presets')?.addEventListener('click', () => {
            closeModal('modal-cascading-picker');
            switchTab('tab-presets');
            state.hubState.subject = state.pickerState.subject;
            state.hubState.submodule = state.pickerState.submodule;
            state.hubState.questionType = state.pickerState.questionType;
            renderPresetHub();
        });
    }

    function switchTab(tabId) {
        if (!tabId) return;
        state.currentTab = tabId;
        state.activeTab = tabId;

        document.querySelectorAll('.tab-btn').forEach(b => {
            if (b.getAttribute('data-tab') === tabId) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        document.querySelectorAll('.tab-content').forEach(c => {
            if (c.id === tabId) {
                c.classList.add('active');
                c.style.display = 'block';
            } else {
                c.classList.remove('active');
                c.style.display = 'none';
            }
        });

        if (tabId === 'tab-timeline') {
            renderTimeline();
        } else if (tabId === 'tab-subjects') {
            renderAnalyticsDashboard();
            renderMacroSubjects();
        } else if (tabId === 'tab-milestones') {
            renderMilestones();
        } else if (tabId === 'tab-presets') {
            renderPresetHub();
        }
    }

    // ==========================================================================
    // 7. 核心日常操作与宏观调整
    // ==========================================================================

    // ==========================================================================
    // 7. 核心日常操作与宏观调整 (Rest-to-Study, Smart Shift, Advance, Overflow)
    // ==========================================================================

    function getNextDateKey(dateStr) {
        const d = new Date(dateStr + "T00:00:00");
        d.setDate(d.getDate() + 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    window.scrollToDate = function (dateKey) {
        const monthPrefix = dateKey.substring(0, 7);
        if (state.monthFilter !== 'all' && state.monthFilter !== monthPrefix) {
            state.monthFilter = 'all';
            document.querySelectorAll('#month-filters .month-pill').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.month === 'all');
            });
            renderTimeline();
        }

        setTimeout(() => {
            const targetEl = document.getElementById(`card-${dateKey}`) || document.getElementById(`row-${dateKey}`);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetEl.classList.add('highlight-target-date');
                setTimeout(() => targetEl.classList.remove('highlight-target-date'), 2000);
            }
        }, 80);
    };

    function hasSubsequentTasks(fromDate) {
        const allKeys = Object.keys(state.schedule).sort();
        for (const k of allKeys) {
            if (k > fromDate) {
                const plan = state.schedule[k];
                if (!plan) continue;
                if (plan.morning?.text || plan.afternoon?.text || plan.evening?.text) {
                    return true;
                }
            }
        }
        return false;
    }

    function hasDayTasks(dateKey) {
        const plan = state.schedule[dateKey];
        if (!plan) return false;
        return !!(plan.morning?.text || plan.afternoon?.text || plan.evening?.text);
    }

    // 休息日 / 学习日切换 (支持保持空白与自动提前选择，以及学习日转休息日顺延)
    window.toggleDayRest = function (dateKey) {
        if (checkReadOnlyAndWarn()) return;
        if (!state.schedule[dateKey]) return;
        const currentIsRest = state.schedule[dateKey].isRest;

        if (!currentIsRest) {
            // 学习日 -> 休息日
            const hasTodayTask = hasDayTasks(dateKey);
            const hasLaterTask = hasSubsequentTasks(dateKey);

            if (!hasTodayTask && !hasLaterTask) {
                // 没有任务，直接切换为休息日
                const snapshot = takeWorkspaceSnapshot();
                state.schedule[dateKey].isRest = true;
                state.schedule[dateKey].note = '例行休息日';
                saveData();
                renderAll();
                updateBadgeCounts();
                showToast(`已将 ${dateKey} 切换为【休息日】`, 'info', { undoSnapshot: snapshot });
            } else {
                // 有任务：弹出学习日转休息日询问弹窗（询问是否顺延）
                state.pendingStudyToRestDate = dateKey;
                const displayEl = document.getElementById('s2r-target-date-display');
                if (displayEl) displayEl.textContent = dateKey;

                const shiftRadio = document.querySelector('input[name="s2r-choice"][value="shift"]');
                if (shiftRadio) shiftRadio.checked = true;

                const scopeGroup = document.getElementById('s2r-scope-group');
                if (scopeGroup) scopeGroup.style.display = 'block';

                const allScopeRadio = document.querySelector('input[name="s2r-scope"][value="all"]');
                if (allScopeRadio) allScopeRadio.checked = true;

                openModal('modal-study-to-rest');
            }
        } else {
            // 休息日 -> 学习日
            if (!hasSubsequentTasks(dateKey)) {
                // 后面没有任务：直接改为空白学习日，无需弹窗！
                const snapshot = takeWorkspaceSnapshot();
                state.schedule[dateKey].isRest = false;
                state.schedule[dateKey].morning = { text: '', subject: 'math' };
                state.schedule[dateKey].afternoon = { text: '', subject: 'math' };
                state.schedule[dateKey].evening = { text: '', subject: 'major' };
                state.schedule[dateKey].note = '';
                saveData();
                renderAll();
                updateBadgeCounts();
                showToast(`已将 ${dateKey} 开启为空白学习日！`, "success", { undoSnapshot: snapshot });
            } else {
                // 后面有任务：唤起选择弹窗 (保持空白 vs 自动提前)
                state.pendingRestToStudyDate = dateKey;
                const displayEl = document.getElementById('r2s-target-date-display');
                if (displayEl) displayEl.textContent = dateKey;

                const blankRadio = document.querySelector('input[name="r2s-choice"][value="blank"]');
                if (blankRadio) blankRadio.checked = true;

                const scopeGroup = document.getElementById('r2s-scope-group');
                if (scopeGroup) scopeGroup.style.display = 'none';

                const allScopeRadio = document.querySelector('input[name="r2s-scope"][value="all"]');
                if (allScopeRadio) allScopeRadio.checked = true;

                openModal('modal-rest-to-study');
            }
        }
    };

    function confirmStudyToRest() {
        const dateKey = state.pendingStudyToRestDate;
        if (!dateKey || !state.schedule[dateKey]) {
            closeModal('modal-study-to-rest');
            return;
        }

        const snapshot = takeWorkspaceSnapshot();
        const choice = document.querySelector('input[name="s2r-choice"]:checked')?.value || 'shift';
        const scope = document.querySelector('input[name="s2r-scope"]:checked')?.value || 'all';

        if (choice === 'shift') {
            // 1. 获取包含 dateKey 在内的所有后续学习日序列
            let allDates = Object.keys(state.schedule).sort();
            let studyDates = allDates.filter(d => d >= dateKey && !state.schedule[d].isRest);

            // 需要在末尾新增 1 个学习日来容纳顺延的任务
            let requiredStudyCount = studyDates.length + 1;
            let lastDateKey = allDates[allDates.length - 1];

            while (studyDates.length < requiredStudyCount) {
                lastDateKey = getNextDateKey(lastDateKey);
                const nextD = new Date(lastDateKey + "T00:00:00");
                const isSunday = (nextD.getDay() === 0);

                if (isSunday) {
                    state.schedule[lastDateKey] = {
                        isRest: true,
                        morning: { text: '', subject: 'math' },
                        afternoon: { text: '', subject: 'math' },
                        evening: { text: '', subject: 'major' },
                        note: '例行休息日'
                    };
                } else {
                    state.schedule[lastDateKey] = {
                        isRest: false,
                        morning: { text: '', subject: 'math' },
                        afternoon: { text: '', subject: 'math' },
                        evening: { text: '', subject: 'major' },
                        note: ''
                    };
                    studyDates.push(lastDateKey);
                }
            }

            // 2. 备份原学习日序列
            const originalContents = studyDates.map(d => ({
                morning: JSON.parse(JSON.stringify(state.schedule[d].morning || { text: '', subject: 'math' })),
                afternoon: JSON.parse(JSON.stringify(state.schedule[d].afternoon || { text: '', subject: 'math' })),
                evening: JSON.parse(JSON.stringify(state.schedule[d].evening || { text: '', subject: 'major' }))
            }));

            // 3. 从后往前赋值到 i + 1
            for (let i = originalContents.length - 1; i >= 0; i--) {
                const targetIndex = i + 1;
                if (targetIndex < studyDates.length) {
                    const targetKey = studyDates[targetIndex];
                    const src = originalContents[i];
                    if (scope === 'all' || scope === 'morning') {
                        state.schedule[targetKey].morning = src.morning;
                    }
                    if (scope === 'all' || scope === 'afternoon') {
                        state.schedule[targetKey].afternoon = src.afternoon;
                    }
                    if (scope === 'all' || scope === 'evening') {
                        state.schedule[targetKey].evening = src.evening;
                    }
                }
            }

            // 4. 将当前日期设为休息日
            state.schedule[dateKey].isRest = true;
            if (scope === 'all' || scope === 'morning') state.schedule[dateKey].morning = { text: '', subject: 'math' };
            if (scope === 'all' || scope === 'afternoon') state.schedule[dateKey].afternoon = { text: '', subject: 'math' };
            if (scope === 'all' || scope === 'evening') state.schedule[dateKey].evening = { text: '', subject: 'major' };
            state.schedule[dateKey].note = '临时调整休息日';

            cleanEmptyOverflowDates();
            saveData();
            closeModal('modal-study-to-rest');
            renderAll();
            showToast(`已将 ${dateKey} 设为休息日，并将原计划及后续排期自动向后顺延 1 天！`, "success", { undoSnapshot: snapshot });
        } else {
            // 直接设为休息日
            state.schedule[dateKey].isRest = true;
            state.schedule[dateKey].note = '例行休息日';
            saveData();
            closeModal('modal-study-to-rest');
            renderAll();
            showToast(`已将 ${dateKey} 切换为【休息日】`, "info", { undoSnapshot: snapshot });
        }
    }

    function confirmRestToStudy() {
        const dateKey = state.pendingRestToStudyDate;
        if (!dateKey || !state.schedule[dateKey]) {
            closeModal('modal-rest-to-study');
            return;
        }

        const snapshot = takeWorkspaceSnapshot();
        const choice = document.querySelector('input[name="r2s-choice"]:checked')?.value || 'blank';
        const scope = document.querySelector('input[name="r2s-scope"]:checked')?.value || 'all';

        state.schedule[dateKey].isRest = false;

        if (choice === 'blank') {
            state.schedule[dateKey].morning = { text: '', subject: 'math' };
            state.schedule[dateKey].afternoon = { text: '', subject: 'math' };
            state.schedule[dateKey].evening = { text: '', subject: 'major' };
            state.schedule[dateKey].note = '';
            saveData();
            closeModal('modal-rest-to-study');
            renderAll();
            showToast(`已将 ${dateKey} 开启为空白学习日，请自由安排任务！`, "success", { undoSnapshot: snapshot });
        } else if (choice === 'forward') {
            shiftForwardFromDate(dateKey, scope);
            closeModal('modal-rest-to-study');
            renderAll();
            showToast(`已将 ${dateKey} 开启为学习日，并将后续任务自动向前提前 1 天！`, "success", { undoSnapshot: snapshot });
        }
    }

    // 向前提前任务算法 (Shift Forward)
    function shiftForwardFromDate(fromDate, scope) {
        const allKeys = Object.keys(state.schedule).sort();
        const targetKeys = allKeys.filter(k => k >= fromDate);
        const studyDates = targetKeys.filter(k => !state.schedule[k].isRest);

        if (studyDates.length < 2) {
            cleanEmptyOverflowDates();
            saveData();
            return;
        }

        for (let i = 0; i < studyDates.length - 1; i++) {
            const curr = studyDates[i];
            const next = studyDates[i + 1];

            if (scope === 'all' || scope === 'morning') {
                state.schedule[curr].morning = JSON.parse(JSON.stringify(state.schedule[next].morning || { text: '', subject: 'math' }));
            }
            if (scope === 'all' || scope === 'afternoon') {
                state.schedule[curr].afternoon = JSON.parse(JSON.stringify(state.schedule[next].afternoon || { text: '', subject: 'math' }));
            }
            if (scope === 'all' || scope === 'evening') {
                state.schedule[curr].evening = JSON.parse(JSON.stringify(state.schedule[next].evening || { text: '', subject: 'major' }));
            }
        }

        // 清空最后一个学习日的相应时段
        const lastKey = studyDates[studyDates.length - 1];
        if (scope === 'all' || scope === 'morning') {
            state.schedule[lastKey].morning = { text: '', subject: 'math' };
        }
        if (scope === 'all' || scope === 'afternoon') {
            state.schedule[lastKey].afternoon = { text: '', subject: 'math' };
        }
        if (scope === 'all' || scope === 'evening') {
            state.schedule[lastKey].evening = { text: '', subject: 'major' };
        }

        cleanEmptyOverflowDates();
        saveData();
    }

    window.editDayNote = function (dateKey) {
        if (!state.schedule[dateKey]) return;
        const currentNote = state.schedule[dateKey].note || '';
        const newNote = prompt(`编辑 ${dateKey} 的重点目标/备注：`, currentNote);
        if (newNote !== null) {
            const snapshot = takeWorkspaceSnapshot();
            state.schedule[dateKey].note = newNote.trim();
            saveData();
            renderTimeline();
            showToast("备注已更新！", "success", { undoSnapshot: snapshot });
        }
    };

    window.changeMacroProgress = function (subjectKey, phaseIndex, moduleIndex, delta) {
        const sub = state.subjects[subjectKey];
        if (!sub || !sub.phases[phaseIndex]?.modules[moduleIndex]) return;

        const snapshot = takeWorkspaceSnapshot();
        const mod = sub.phases[phaseIndex].modules[moduleIndex];
        const newCompleted = Math.max(0, Math.min(mod.total, mod.completed + delta));
        mod.completed = newCompleted;

        saveData();
        renderMacroSubjects();
        renderAnalyticsDashboard();
        updateCountdowns();
        showToast(`${mod.name} 进度已更新为 ${newCompleted} ${mod.unit}`, "info", { undoSnapshot: snapshot });
    };

    // 智能顺延排期算法 (Smart Shift Backward - 深度支持全天/单时段与12.20超期占位)
    window.openShiftModalFrom = function (fromDate) {
        if (checkReadOnlyAndWarn()) return;
        const fromDateInput = document.getElementById('shift-from-date');
        if (fromDateInput) {
            fromDateInput.value = fromDate || "2026-08-20";
        }
        updateShiftPreview();
        openModal('modal-shift');
    };

    function updateShiftPreview() {
        const fromDate = document.getElementById('shift-from-date').value;
        const days = parseInt(document.getElementById('shift-days-count').value, 10) || 1;
        const scope = document.querySelector('input[name="shift-scope"]:checked')?.value || 'all';
        const skipRest = document.getElementById('shift-skip-rest').checked;
        const previewEl = document.getElementById('shift-preview-text');

        if (!previewEl || !fromDate) return;

        const dateKeys = Object.keys(state.schedule).sort();
        const fromIndex = dateKeys.indexOf(fromDate);
        if (fromIndex === -1) {
            previewEl.textContent = "无效的起始日期";
            return;
        }

        const scopeLabel = scope === 'all' ? '全天所有时段' : (scope === 'morning' ? '仅上午' : (scope === 'afternoon' ? '仅下午' : '仅晚上'));
        let warningText = '';
        const studyDatesAfter = dateKeys.filter(d => d >= fromDate && !state.schedule[d].isRest);
        if (studyDatesAfter.length > 0) {
            warningText = `，超出 12.20 初试范围的任务将自动生成 <strong>红色超期占位</strong> 提醒。`;
        }

        if (skipRest) {
            previewEl.innerHTML = `从 <strong>${fromDate}</strong> 开始，【<strong>${scopeLabel}</strong>】的任务内容将依次向后顺延 <strong>${days} 个学习日</strong>（跳过休息日）${warningText}`;
        } else {
            previewEl.innerHTML = `从 <strong>${fromDate}</strong> 开始，【<strong>${scopeLabel}</strong>】的任务内容将依次顺延 <strong>${days} 个自然日</strong>${warningText}`;
        }
    }

    function executeSmartShift() {
        if (checkReadOnlyAndWarn()) return;
        const fromDate = document.getElementById('shift-from-date').value;
        const days = parseInt(document.getElementById('shift-days-count').value, 10) || 1;
        const scope = document.querySelector('input[name="shift-scope"]:checked')?.value || 'all';
        const skipRest = document.getElementById('shift-skip-rest').checked;

        if (!fromDate || !state.schedule[fromDate]) {
            showToast("起始日期不在规划范围内！", "error");
            return;
        }

        const snapshot = takeWorkspaceSnapshot();

        // 1. 获取从 fromDate 起的所有学习日序列
        let allDates = Object.keys(state.schedule).sort();
        let studyDates = allDates.filter(d => d >= fromDate && !state.schedule[d].isRest);

        // 2. 动态生成后续日期（包括12.21+超期占位），直到容纳顺延后的全部学习日
        let requiredStudyCount = studyDates.length + days;
        let lastDateKey = allDates[allDates.length - 1];

        while (studyDates.length < requiredStudyCount) {
            lastDateKey = getNextDateKey(lastDateKey);
            const nextD = new Date(lastDateKey + "T00:00:00");
            const isSunday = (nextD.getDay() === 0);

            if (skipRest && isSunday) {
                state.schedule[lastDateKey] = {
                    isRest: true,
                    morning: { text: '', subject: 'math' },
                    afternoon: { text: '', subject: 'math' },
                    evening: { text: '', subject: 'major' },
                    note: '例行休息日'
                };
            } else {
                state.schedule[lastDateKey] = {
                    isRest: false,
                    morning: { text: '', subject: 'math' },
                    afternoon: { text: '', subject: 'math' },
                    evening: { text: '', subject: 'major' },
                    note: ''
                };
                studyDates.push(lastDateKey);
            }
        }

        // 3. 备份原学习日序列的对应时段内容
        const originalStudyContents = studyDates.map(d => ({
            morning: JSON.parse(JSON.stringify(state.schedule[d].morning || { text: '', subject: 'math' })),
            afternoon: JSON.parse(JSON.stringify(state.schedule[d].afternoon || { text: '', subject: 'math' })),
            evening: JSON.parse(JSON.stringify(state.schedule[d].evening || { text: '', subject: 'major' }))
        }));

        // 4. 自后向前按目标索引 targetIndex = i + days 赋值
        for (let i = originalStudyContents.length - 1; i >= 0; i--) {
            const targetIndex = i + days;
            if (targetIndex < studyDates.length) {
                const targetKey = studyDates[targetIndex];
                const srcData = originalStudyContents[i];

                if (scope === 'all' || scope === 'morning') {
                    state.schedule[targetKey].morning = srcData.morning;
                }
                if (scope === 'all' || scope === 'afternoon') {
                    state.schedule[targetKey].afternoon = srcData.afternoon;
                }
                if (scope === 'all' || scope === 'evening') {
                    state.schedule[targetKey].evening = srcData.evening;
                }
            }
        }

        // 5. 将起始顺延的前 days 个学习日的对应时段留空
        for (let i = 0; i < Math.min(days, studyDates.length); i++) {
            const clearKey = studyDates[i];
            if (scope === 'all' || scope === 'morning') {
                state.schedule[clearKey].morning = { text: '', subject: 'math' };
            }
            if (scope === 'all' || scope === 'afternoon') {
                state.schedule[clearKey].afternoon = { text: '', subject: 'math' };
            }
            if (scope === 'all' || scope === 'evening') {
                state.schedule[clearKey].evening = { text: '', subject: 'major' };
            }
        }

        cleanEmptyOverflowDates();
        saveData();
        closeModal('modal-shift');
        renderAll();

        const overflowList = getOverflowDates();
        if (overflowList.length > 0) {
            showToast(`已顺延 ${days} 天！注意：当前有 ${overflowList.length} 天任务顺延超出 12.20 初试范围`, "warning", { undoSnapshot: snapshot });
        } else {
            showToast(`已成功将 ${fromDate} 起的日程顺延 ${days} 天！`, "success", { undoSnapshot: snapshot });
        }
    }

    function quickFixOverflow() {
        const overflowList = getOverflowDates();
        if (overflowList.length === 0) {
            showToast("当前未超出 12.20 初试范围！", "info");
            return;
        }
        const snapshot = takeWorkspaceSnapshot();
        shiftForwardFromDate("2026-08-16", "all");
        renderAll();
        showToast("已自动向前压缩排期 1 天！", "success", { undoSnapshot: snapshot });
    }

    // 规律排期向导
    window.applyHabitPreset = function (type) {
        if (type === 'eng_reading') {
            document.getElementById('batch-start-date').value = "2026-09-01";
            document.getElementById('batch-end-date').value = "2026-10-31";
            document.getElementById('batch-interval').value = "2";
            document.querySelector('input[name="batch-slot"][value="afternoon"]').checked = true;
            document.getElementById('batch-subject').value = "english";
            document.getElementById('batch-text').value = "英语真题阅读 · 2011-2015年真题阅读单篇精读 (每2-3天1篇)";
        } else if (type === 'eng_obj') {
            document.getElementById('batch-start-date').value = "2026-11-01";
            document.getElementById('batch-end-date').value = "2026-12-15";
            document.getElementById('batch-interval').value = "7";
            document.querySelector('input[name="batch-slot"][value="afternoon"]').checked = true;
            document.getElementById('batch-subject').value = "english";
            document.getElementById('batch-text').value = "英语真题客观题 · 真题客观题全真计时模考 (完形+阅读4篇+新题型，限时80分钟)";
        } else if (type === 'eng_writing') {
            document.getElementById('batch-start-date').value = "2026-11-01";
            document.getElementById('batch-end-date').value = "2026-12-15";
            document.getElementById('batch-interval').value = "2";
            document.querySelector('input[name="batch-slot"][value="afternoon"]').checked = true;
            document.getElementById('batch-subject').value = "english";
            document.getElementById('batch-text').value = "英语作文练习 · 历年真题作文限时手写仿写 (每2-3天1篇)";
        } else if (type === 'comm_night') {
            document.getElementById('batch-start-date').value = "2026-08-17";
            document.getElementById('batch-end-date').value = "2026-09-15";
            document.getElementById('batch-interval').value = "1";
            document.querySelector('input[name="batch-slot"][value="evening"]').checked = true;
            document.getElementById('batch-subject').value = "major";
            document.getElementById('batch-text').value = "通原基础课 · 专业课通信原理至少看3-4个视频";
        }
        showToast("已载入专属规律模板参数！");
    };

    function executeBatchFill() {
        if (checkReadOnlyAndWarn()) return;
        const startDate = document.getElementById('batch-start-date').value;
        const endDate = document.getElementById('batch-end-date').value;
        const interval = parseInt(document.getElementById('batch-interval').value, 10) || 1;
        const slot = document.querySelector('input[name="batch-slot"]:checked')?.value || 'afternoon';
        const subject = document.getElementById('batch-subject').value;
        const text = document.getElementById('batch-text').value.trim();
        const skipRest = document.getElementById('batch-skip-rest').checked;

        if (!startDate || !endDate || startDate > endDate) {
            showToast("请选择有效的起止日期范围！", "error");
            return;
        }
        if (!text) {
            showToast("请输入计划内容！", "error");
            return;
        }

        const snapshot = takeWorkspaceSnapshot();
        const dateKeys = Object.keys(state.schedule).sort();
        let stepCount = 0;
        let filledCount = 0;

        dateKeys.forEach(dateKey => {
            if (dateKey >= startDate && dateKey <= endDate) {
                if (skipRest && state.schedule[dateKey].isRest) {
                    return;
                }
                if (stepCount % interval === 0) {
                    if (!state.schedule[dateKey][slot]) {
                        state.schedule[dateKey][slot] = { text: '', subject: subject };
                    }
                    state.schedule[dateKey][slot].text = text;
                    state.schedule[dateKey][slot].subject = subject;
                    filledCount++;
                }
                stepCount++;
            }
        });

        saveData();
        closeModal('modal-batch-fill');
        renderTimeline();
        showToast(`已成功规律填充 ${filledCount} 天的【${slot === 'morning' ? '上午' : (slot === 'afternoon' ? '下午' : '晚上')}】计划！`, "success", { undoSnapshot: snapshot });
    }

    // ==========================================================================
    // 辅助工具与快捷跳转
    // ==========================================================================

    window.clearTimelineFilters = function () {
        state.monthFilter = 'all';
        state.searchKeyword = '';
        state.dayTypeFilter = 'all';
        state.subjectFilter = 'all';

        document.querySelectorAll('.month-pill').forEach(p => p.classList.remove('active'));
        document.querySelector('.month-pill[data-month="all"]')?.classList.add('active');

        const searchInput = document.getElementById('input-timeline-search');
        if (searchInput) searchInput.value = '';

        const dayFilter = document.getElementById('select-day-filter');
        if (dayFilter) dayFilter.value = 'all';

        const subFilter = document.getElementById('select-subject-filter');
        if (subFilter) subFilter.value = 'all';

        renderTimeline();
    };

    function jumpToDate(dateStr) {
        switchTab('tab-timeline');

        state.monthFilter = 'all';
        document.querySelectorAll('#month-filters .month-pill').forEach(p => p.classList.remove('active'));
        document.querySelector('#month-filters .month-pill[data-month="all"]')?.classList.add('active');
        renderTimeline();

        setTimeout(() => {
            const card = document.getElementById(`card-${dateStr}`) || document.getElementById(`row-${dateStr}`) || document.querySelector(`[data-date="${dateStr}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.style.transition = 'box-shadow 0.3s ease, background 0.3s ease';
                card.style.boxShadow = '0 0 0 3px var(--color-primary)';
                setTimeout(() => {
                    card.style.boxShadow = '';
                }, 1800);
            } else {
                showToast(`已切换至每日日程规划并定位至 ${dateStr}`);
            }
        }, 120);
    }
    window.jumpToDate = jumpToDate;
    window.scrollToDate = jumpToDate;

    function getTodayDateStr() {
        if (state.workspace && state.workspace.isSample && state.workspace.simulatedToday) {
            return state.workspace.simulatedToday;
        }
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function getSubjectLabel(subjectId, defaultLabel) {
        if (state.subjects && state.subjects[subjectId]) {
            return state.subjects[subjectId].name;
        }
        if (subjectId === 'math') return '数学一';
        if (subjectId === 'major') return '通信原理';
        if (subjectId === 'english') return '英语一';
        if (subjectId === 'politics') return '思想政治理论';
        return defaultLabel || '考研';
    }

    function getSubjectLabelShort(subjectId) {
        if (!subjectId || subjectId === 'pending' || subjectId === 'none' || subjectId === '') return '待定';
        let name = '';
        if (state.subjects && state.subjects[subjectId]) {
            name = (state.subjects[subjectId].name || '').trim();
        }

        // 1. 检查数字考研科目代号 (如 408, 802, 854, 912, 801, 820, 830, 431, 396 等)
        const codeMatch = name.match(/\b([1-9]\d{2})\b/);
        if (codeMatch) return codeMatch[1];
        if (name.toUpperCase().includes('DSP')) return 'DSP';
        if (name.toUpperCase().includes('408')) return '408';

        // 2. 常见经典考研科目标准规范简称
        if (name.includes('信号与系统') || name === '信号与系统') return '信号';
        if (name.includes('数字信号处理') || name === '数字信号处理') return 'DSP';
        if (name.includes('通信原理') || name === '通信原理' || name.includes('通原')) return '通原';
        if (name.includes('自动控制原理') || name.includes('自控')) return '自控';
        if (name.includes('数据结构')) return '数构';
        if (name.includes('计算机网络') || name.includes('计网')) return '计网';
        if (name.includes('操作系统')) return '系统';
        if (name.includes('计算机组成原理') || name.includes('计组')) return '计组';
        if (name.includes('机械原理')) return '机原';
        if (name.includes('机械设计')) return '机设';
        if (name.includes('材料力学')) return '材力';
        if (name.includes('理论力学')) return '理力';
        if (name.includes('微观经济学') || name.includes('微经')) return '微经';
        if (name.includes('宏观经济学') || name.includes('宏经')) return '宏经';
        if (name.includes('金融学') || name.includes('金融')) return '金融';

        if (subjectId === 'math' || name.includes('数学')) {
            if (name.includes('二') || name.includes('2')) return '数二';
            if (name.includes('三') || name.includes('3')) return '数三';
            return '数一';
        }
        if (subjectId === 'english' || name.includes('英语')) {
            if (name.includes('二') || name.includes('2')) return '英二';
            return '英一';
        }
        if (subjectId === 'politics' || name.includes('政治')) {
            return '政治';
        }

        // 3. 通用自定义学科：如果是 2-3 个字直接呈现，如果超过 3 个字取前 2 个字
        if (name) {
            return name.length <= 3 ? name : name.substring(0, 2);
        }

        // 4. 任意专业课兜底回退
        if (subjectId === 'major') return '专一';
        if (subjectId === 'major2') return '专二';
        if (subjectId === 'major3') return '专三';
        if (subjectId === 'major4') return '专四';
        return '学科';
    }

    function getSubjectBadgeClass(subjectId) {
        if (!subjectId || subjectId === 'pending' || subjectId === 'none' || subjectId === '') return 'badge-outline';
        if (state.subjects && state.subjects[subjectId] && state.subjects[subjectId].color) {
            return `badge-${state.subjects[subjectId].color}`;
        }
        return 'badge-indigo';
    }

    function syncSubjectDropdowns() {
        const subjects = state.subjects || (state.workspace && state.workspace.subjects) || {};
        const subKeys = Object.keys(subjects);

        // 1. 顶栏筛选下拉 select-subject-filter
        const selectFilter = document.getElementById('select-subject-filter');
        if (selectFilter) {
            const curVal = selectFilter.value;
            selectFilter.innerHTML = '<option value="all">全部学科</option>' + subKeys.map(k => {
                return `<option value="${k}">${escapeHtml(subjects[k].name)}</option>`;
            }).join('');
            if (subKeys.includes(curVal) || curVal === 'all') selectFilter.value = curVal;
            else selectFilter.value = 'all';
        }

        // 2. 自定义模式下拉 custom-input-subject
        const customSelect = document.getElementById('custom-input-subject');
        if (customSelect) {
            customSelect.innerHTML = subKeys.map(k => {
                return `<option value="${k}">${escapeHtml(subjects[k].name)}</option>`;
            }).join('');
        }

        // 3. 规律排期下拉 batch-subject
        const batchSelect = document.getElementById('batch-subject');
        if (batchSelect) {
            batchSelect.innerHTML = subKeys.map(k => {
                return `<option value="${k}">${escapeHtml(subjects[k].name)}</option>`;
            }).join('');
        }

        // 4. 时段编辑学科 Chips #picker-subject-chips
        const pickerChips = document.getElementById('picker-subject-chips');
        if (pickerChips) {
            pickerChips.innerHTML = subKeys.map(k => {
                const sub = subjects[k];
                const isActive = (k === state.pickerState.subject);
                const iconClass = sub.icon || (k === 'math' ? 'fa-solid fa-calculator' : k.startsWith('major') ? 'fa-solid fa-tower-broadcast' : k === 'english' ? 'fa-solid fa-language' : 'fa-solid fa-landmark');
                return `<button type="button" class="cascade-chip ${isActive ? 'active' : ''}" data-value="${k}" onclick="window.setPickerSubject('${k}')"><i class="${iconClass}"></i> ${escapeHtml(sub.name)}</button>`;
            }).join('');
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // ==========================================================================
    // 弹窗状态管理与未保存修改拦截 (Modal Lifecycle, Scroll Lock & Dirty Checking)
    // ==========================================================================

    function getModalFormSnapshot(modal) {
        if (!modal) return '';
        const data = [];
        modal.querySelectorAll('input, textarea, select').forEach(el => {
            if (el.type === 'file' || el.readOnly || el.disabled) return;
            if (el.type === 'checkbox' || el.type === 'radio') {
                data.push({ id: el.id, name: el.name, val: el.checked });
            } else {
                data.push({ id: el.id, name: el.name, val: el.value });
            }
        });
        return JSON.stringify(data);
    }

    function isModalDirty(modal) {
        if (!modal || !modal.__initialFormState) return false;
        const current = getModalFormSnapshot(modal);
        return current !== modal.__initialFormState;
    }

    function triggerModalShake(modal) {
        const card = modal?.querySelector('.modal-card');
        if (!card) return;
        card.classList.remove('shake');
        void card.offsetWidth; // 触发重绘
        card.classList.add('shake');
        setTimeout(() => {
            card.classList.remove('shake');
        }, 450);
        showToast("⚠️ 内容已修改且尚未保存！再次操作或按取消放弃更改", "warning");
    }

    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
            // 延迟记录初始表单状态快照
            setTimeout(() => {
                modal.__initialFormState = getModalFormSnapshot(modal);
                modal.__dismissAttempts = 0;
            }, 60);
        }
    }

    function requestCloseModal(id, force = false) {
        const modal = document.getElementById(id);
        if (!modal || !modal.classList.contains('active')) return;

        // 如果内容被修改且非强制关闭：
        if (!force && isModalDirty(modal)) {
            if (!modal.__dismissAttempts) {
                modal.__dismissAttempts = 1;
                triggerModalShake(modal);
                return; // 首次退出尝试拦截并抖动警告
            }
        }

        closeModal(id);
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            modal.__initialFormState = null;
            modal.__dismissAttempts = 0;
            // 如果已无打开的弹窗，解除背景滚动锁定
            if (document.querySelectorAll('.modal-overlay.active').length === 0) {
                document.body.classList.remove('modal-open');
            }
        }
    }

    function showToast(message, type = 'info', options = {}) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        let undoSnapshot = null;
        if (typeof options === 'string') {
            undoSnapshot = options;
        } else if (options && options.undoSnapshot) {
            undoSnapshot = options.undoSnapshot;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let iconHtml = '<i class="fa-solid fa-circle-info toast-icon"></i>';
        if (type === 'success') iconHtml = '<i class="fa-solid fa-circle-check toast-icon"></i>';
        else if (type === 'warning') iconHtml = '<i class="fa-solid fa-triangle-exclamation toast-icon"></i>';
        else if (type === 'error') iconHtml = '<i class="fa-solid fa-circle-xmark toast-icon"></i>';

        let undoHtml = '';
        if (undoSnapshot) {
            undoHtml = `
                <button class="toast-undo-btn" type="button" title="撤回此次修改">
                    <i class="fa-solid fa-rotate-left"></i>
                    <span>撤回 (<span class="toast-countdown">5</span>s)</span>
                </button>
            `;
        }

        toast.innerHTML = `
            <div class="toast-content">
                ${iconHtml}
                <span class="toast-text">${escapeHtml(message)}</span>
            </div>
            <div class="toast-actions-wrap">
                ${undoHtml}
                <button class="toast-close-btn" type="button" title="关闭">✕</button>
            </div>
        `;

        container.appendChild(toast);

        let countdown = 5;
        let countdownTimer = null;
        let autoDismissTimer = null;

        const dismissToast = () => {
            if (countdownTimer) clearInterval(countdownTimer);
            if (autoDismissTimer) clearTimeout(autoDismissTimer);
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px) scale(0.97)';
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 200);
        };

        const closeBtn = toast.querySelector('.toast-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dismissToast();
            });
        }

        const undoBtn = toast.querySelector('.toast-undo-btn');
        if (undoBtn) {
            const countEl = toast.querySelector('.toast-countdown');
            countdownTimer = setInterval(() => {
                countdown--;
                if (countEl) countEl.textContent = countdown;
                if (countdown <= 0) {
                    dismissToast();
                }
            }, 1000);

            undoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dismissToast();
                restoreWorkspaceSnapshot(undoSnapshot);
            });
        } else {
            autoDismissTimer = setTimeout(() => {
                dismissToast();
            }, type === 'error' || type === 'warning' ? 3200 : 2500);
        }
    }

    // ==========================================================================
    // 目标分数管理系统 (Target Scores Architecture)
    // ==========================================================================

    function getSubjectAbbreviation(subKey, subjectObj, allSubjects) {
        const rawName = (subjectObj?.name || '').trim();

        if (subKey === 'math') {
            if (rawName.includes('一') || rawName.includes('1')) return '数一';
            if (rawName.includes('二') || rawName.includes('2')) return '数二';
            if (rawName.includes('三') || rawName.includes('3')) return '数三';
            if (rawName.includes('396')) return '396';
            if (rawName.includes('高数') || rawName.includes('高等数学')) return '高数';
            return '数学';
        }

        if (subKey === 'english') {
            if (rawName.includes('一') || rawName.includes('1') || rawName.includes('201')) return '英一';
            if (rawName.includes('二') || rawName.includes('2') || rawName.includes('204')) return '英二';
            if (rawName.includes('日') || rawName.includes('203')) return '日语';
            if (rawName.includes('俄') || rawName.includes('202')) return '俄语';
            if (rawName.includes('德')) return '德语';
            if (rawName.includes('法')) return '法语';
            return '英语';
        }

        if (subKey === 'politics') {
            return '政治';
        }

        // 专业课处理 (major, major2, major3, major4)
        if (subKey.startsWith('major')) {
            const majorKeys = Object.keys(allSubjects || {}).filter(k => k.startsWith('major'));
            const isSingleMajor = majorKeys.length <= 1;
            const majorIndex = majorKeys.indexOf(subKey);
            const defaultGeneric = isSingleMajor ? '专业' : (['专一', '专二', '专三', '专四'][majorIndex] || '专业');

            if (!rawName) return defaultGeneric;

            // 1. 纯三位数字或经典代码 (如 408, 854, 912, 801, 802, 820, 830, 833, 851, 888 等)
            const codeMatch = rawName.match(/\b([1-9]\d{2})\b/);
            if (codeMatch) return codeMatch[1];

            // 2. 专业课高频学科词库匹配表
            const aliasMap = [
                { pattern: /408|计算机学科专业基础|网络综合/i, alias: '408' },
                { pattern: /信号与系统|信号与线性系统|信号分析/i, alias: '信号' },
                { pattern: /数字信号处理|离散信号处理|DSP/i, alias: 'DSP' },
                { pattern: /通信原理|通信系统/i, alias: '通原' },
                { pattern: /数据结构/i, alias: '数构' },
                { pattern: /操作系统/i, alias: '系统' },
                { pattern: /计算机网络/i, alias: '计网' },
                { pattern: /计算机组成原理|计组/i, alias: '计组' },
                { pattern: /自动控制原理|现代控制理论|控制工程|控制理论/i, alias: '自控' },
                { pattern: /模拟电子技术|模拟电路|模电/i, alias: '模电' },
                { pattern: /数字电子技术|数字电路|数电|数字逻辑/i, alias: '数电' },
                { pattern: /电路原理|电路分析|电路基础/i, alias: '电路' },
                { pattern: /微机原理|微型计算机|单片机/i, alias: '微机' },
                { pattern: /电磁场与电磁波|电磁场|电磁学/i, alias: '电磁场' },
                { pattern: /半导体物理|半导体器件|集成电路/i, alias: '半导体' },
                { pattern: /光学工程|物理光学|应用光学/i, alias: '光工' },
                { pattern: /光电信息|光电子/i, alias: '光电' },

                { pattern: /机械原理/i, alias: '机原' },
                { pattern: /机械设计/i, alias: '机设' },
                { pattern: /材料力学/i, alias: '材力' },
                { pattern: /理论力学/i, alias: '理力' },
                { pattern: /流体力学/i, alias: '流力' },
                { pattern: /结构力学/i, alias: '结力' },
                { pattern: /工程力学/i, alias: '工力' },
                { pattern: /机械制造|机械工程/i, alias: '机械' },
                { pattern: /建筑快题|快题设计|快题/i, alias: '快题' },
                { pattern: /建筑学基础|建筑历史/i, alias: '建学' },
                { pattern: /城乡规划/i, alias: '城规' },
                { pattern: /风景园林/i, alias: '园林' },

                { pattern: /微观经济学|微经/i, alias: '微经' },
                { pattern: /宏观经济学|宏经/i, alias: '宏经' },
                { pattern: /西方经济学|经济学原理|西经/i, alias: '西经' },
                { pattern: /计量经济学/i, alias: '计经' },
                { pattern: /金融学综合|431|金融学/i, alias: '金融' },
                { pattern: /应用统计|432|统计学/i, alias: '统计' },
                { pattern: /国际商务|434/i, alias: '国商' },
                { pattern: /税务|433/i, alias: '税务' },
                { pattern: /保险|435/i, alias: '保险' },
                { pattern: /资产评估|436/i, alias: '资评' },
                { pattern: /管理学原理|管理学基础|企业管理|管理学/i, alias: '管理' },
                { pattern: /运筹学/i, alias: '运筹' },
                { pattern: /财务管理|财管/i, alias: '财管' },
                { pattern: /中级财务会计|会计综合|会计学|会计/i, alias: '会计' },
                { pattern: /法硕联考|法硕/i, alias: '法硕' },
                { pattern: /民法学|民法/i, alias: '民法' },
                { pattern: /刑法学|刑法/i, alias: '刑法' },
                { pattern: /法学综合|法理学/i, alias: '法学' },

                { pattern: /西医综合|306/i, alias: '西综' },
                { pattern: /中医综合|307/i, alias: '中综' },
                { pattern: /心理学专业综合|普通心理学|312|347|心理学/i, alias: '心理' },
                { pattern: /教育学专业综合|教育综合|311|333|教育学/i, alias: '教育' },
                { pattern: /生物化学|生化/i, alias: '生化' },
                { pattern: /分子生物学|分生/i, alias: '分生' },
                { pattern: /细胞生物学|细生/i, alias: '细生' },
                { pattern: /遗传学/i, alias: '遗传' },
                { pattern: /生理学/i, alias: '生理' },
                { pattern: /病理学/i, alias: '病理' },
                { pattern: /药理学/i, alias: '药理' },
                { pattern: /药学综合|349|710/i, alias: '药综' },
                { pattern: /中药学/i, alias: '中药' },
                { pattern: /物理化学|物化/i, alias: '物化' },
                { pattern: /无机化学|无机/i, alias: '无机' },
                { pattern: /有机化学|有机/i, alias: '有机' },
                { pattern: /分析化学/i, alias: '分化' },
                { pattern: /新闻与传播|新传|440|334/i, alias: '新传' },
                { pattern: /社会工作|社会学|337|437/i, alias: '社工' },
                { pattern: /翻译硕士|翻硕|MTI|357|448/i, alias: '翻硕' },
                { pattern: /现代汉语|现汉/i, alias: '现汉' },
                { pattern: /古代汉语|古汉/i, alias: '古汉' },
                { pattern: /汉硕|汉语基础|354|445/i, alias: '汉教' },
                { pattern: /艺术概论|艺术学理论|艺术基础/i, alias: '艺术' },
                { pattern: /设计概论|设计学/i, alias: '设计' }
            ];

            for (const item of aliasMap) {
                if (item.pattern.test(rawName)) {
                    return item.alias;
                }
            }

            // 3. 用户填写的名称很短时直接显示原名
            if (rawName.length <= 3 && !rawName.includes('专业课') && !rawName.includes('科目')) {
                return rawName;
            }

            // 4. 兜底策略
            return defaultGeneric;
        }

        return rawName.slice(0, 3);
    }

    function renderFooterTargetScore() {
        const btn = document.getElementById('btn-status-target-score');
        if (!btn) return;

        const targetScores = state.workspace?.targetScores;
        const showInFooter = targetScores && targetScores.showInFooter !== false;

        if (!targetScores || !targetScores.total || !showInFooter) {
            btn.innerHTML = `<span class="target-score-empty"><i class="fa-solid fa-pen"></i> 添加目标分数...</span>`;
            btn.title = "点击设定考研目标分数";
            return;
        }

        const total = targetScores.total || 0;
        const subScores = targetScores.subjects || {};
        const subjects = state.workspace?.subjects || {};
        const parts = [];

        parts.push(`目标: <strong class="score-num">${total}</strong>分`);

        // 1. 数学
        if (subScores.math !== undefined && subScores.math !== null && subScores.math !== '') {
            const mathObj = subjects.math;
            const mathAbbrev = mathObj ? getSubjectAbbreviation('math', mathObj, subjects) : '数一';
            parts.push(`${escapeHtml(mathAbbrev)} <strong class="score-num">${subScores.math}</strong>`);
        }

        // 2. 专业（无论用户填几个专业课，底栏统一固定只显示「专业」两个字）
        if (subScores.major !== undefined && subScores.major !== null && subScores.major !== '') {
            parts.push(`专业 <strong class="score-num">${subScores.major}</strong>`);
        }

        // 3. 英语
        if (subScores.english !== undefined && subScores.english !== null && subScores.english !== '') {
            const engObj = subjects.english;
            const engAbbrev = engObj ? getSubjectAbbreviation('english', engObj, subjects) : '英一';
            parts.push(`${escapeHtml(engAbbrev)} <strong class="score-num">${subScores.english}</strong>`);
        }

        // 4. 政治
        if (subScores.politics !== undefined && subScores.politics !== null && subScores.politics !== '') {
            parts.push(`政治 <strong class="score-num">${subScores.politics}</strong>`);
        }

        const scoreHtml = parts.join('<span class="score-sep"> · </span>');

        btn.innerHTML = `
            <span class="target-score-filled">
                <i class="fa-solid fa-bullseye" style="color:var(--color-primary); font-size:11px;"></i>
                <span class="target-score-text">${scoreHtml}</span>
            </span>
        `;
        btn.title = `考研目标分数设定，点击修改目标分数`;
    }

    function openTargetScoreModal() {
        const grid = document.getElementById('target-score-inputs-grid');
        const totalEl = document.getElementById('target-score-total-val');
        const chkFooter = document.getElementById('chk-show-target-score-footer');
        if (!grid) return;

        const subjects = state.workspace?.subjects || {};
        const currentTargetScores = state.workspace?.targetScores || {};
        const currentSubScores = currentTargetScores.subjects || {};

        grid.innerHTML = '';

        // 固定 4 门科目：数学（满分150）、专业（满分150）、英语（满分100）、政治（满分100）
        const mathName = subjects.math?.name || '数学一';
        const engName = subjects.english?.name || '英语一';

        const fixedSubjects = [
            { key: 'math', name: mathName, is150: true, maxScore: 150, placeholder: '如：120' },
            { key: 'major', name: '专业课', is150: true, maxScore: 150, placeholder: '如：115' },
            { key: 'english', name: engName, is150: false, maxScore: 100, placeholder: '如：75' },
            { key: 'politics', name: '思想政治理论', is150: false, maxScore: 100, placeholder: '如：70' }
        ];

        fixedSubjects.forEach(sub => {
            const currentVal = currentSubScores[sub.key] !== undefined ? currentSubScores[sub.key] : '';
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label class="form-label" style="font-size:11.5px; display:flex; justify-content:space-between;">
                    <span>${escapeHtml(sub.name)}：</span>
                    <span style="color:var(--text-muted); font-size:10.5px;">满分 ${sub.maxScore}</span>
                </label>
                <input type="text" inputmode="numeric" class="form-input form-input-target-score" data-subject-key="${sub.key}" data-subject-name="${escapeHtml(sub.name)}" data-max-score="${sub.maxScore}" placeholder="${sub.placeholder}" value="${currentVal}" maxlength="3">
            `;
            grid.appendChild(div);
        });

        function updateTotal() {
            let sum = 0;
            grid.querySelectorAll('.form-input-target-score').forEach(input => {
                const raw = input.value.trim();
                input.classList.remove('has-error');
                if (!raw) return;
                if (!/^\d+$/.test(raw)) {
                    input.classList.add('has-error');
                    return;
                }
                const val = parseInt(raw, 10);
                const max = parseInt(input.getAttribute('data-max-score'), 10) || 150;
                if (val < 0 || val > max) {
                    input.classList.add('has-error');
                    return;
                }
                sum += val;
            });
            if (totalEl) totalEl.textContent = sum;
        }

        grid.querySelectorAll('.form-input-target-score').forEach(input => {
            input.addEventListener('input', updateTotal);
        });

        updateTotal();

        if (chkFooter) {
            chkFooter.checked = currentTargetScores.showInFooter !== false;
            chkFooter.disabled = isCurrentWorkspaceReadOnly();
        }

        const isReadOnly = isCurrentWorkspaceReadOnly();
        const banner = document.getElementById('target-score-readonly-banner');
        if (banner) banner.style.display = isReadOnly ? 'flex' : 'none';

        const saveBtn = document.getElementById('btn-save-target-score');
        const clearBtn = document.getElementById('btn-clear-target-score');
        if (saveBtn) {
            saveBtn.disabled = isReadOnly;
            saveBtn.style.opacity = isReadOnly ? '0.5' : '';
            saveBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }
        if (clearBtn) {
            clearBtn.disabled = isReadOnly;
            clearBtn.style.opacity = isReadOnly ? '0.5' : '';
            clearBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }

        grid.querySelectorAll('.form-input-target-score').forEach(input => {
            input.disabled = isReadOnly;
            input.style.opacity = isReadOnly ? '0.6' : '';
        });

        openModal('modal-target-score');
    }

    function saveTargetScoreFromModal() {
        if (checkReadOnlyAndWarn()) return;
        const grid = document.getElementById('target-score-inputs-grid');
        const chkFooter = document.getElementById('chk-show-target-score-footer');
        if (!grid || !state.workspace) return;

        const subScores = {};
        let total = 0;
        let hasError = false;

        grid.querySelectorAll('.form-input-target-score').forEach(input => {
            const raw = input.value.trim();
            input.classList.remove('has-error');
            if (!raw) return;

            const maxScore = parseInt(input.getAttribute('data-max-score'), 10) || 150;
            const subKey = input.getAttribute('data-subject-key');
            const subName = input.getAttribute('data-subject-name') || '科目';

            if (!/^\d+$/.test(raw)) {
                input.classList.add('has-error');
                input.focus();
                showToast(`【${subName}】目标分数只能填写正整数！`, "error");
                hasError = true;
                return;
            }

            const val = parseInt(raw, 10);
            if (val < 0 || val > maxScore) {
                input.classList.add('has-error');
                input.focus();
                showToast(`【${subName}】目标分数不能超过满分 ${maxScore} 分！`, "error");
                hasError = true;
                return;
            }

            subScores[subKey] = val;
            total += val;
        });

        if (hasError) return;

        const showInFooter = chkFooter ? chkFooter.checked : true;

        if (total > 0) {
            state.workspace.targetScores = {
                total: total,
                showInFooter: showInFooter,
                subjects: subScores,
                updatedAt: new Date().toISOString()
            };
        } else {
            state.workspace.targetScores = null;
        }

        saveWorkspaces();
        syncStateWithActiveWorkspace();
        closeModal('modal-target-score');
        renderFooterTargetScore();
        showToast("🎯 考研目标分数已成功保存！", "success");
    }

    function clearTargetScoreFromModal() {
        if (!state.workspace) return;
        state.workspace.targetScores = null;
        saveWorkspaces();
        syncStateWithActiveWorkspace();
        closeModal('modal-target-score');
        renderFooterTargetScore();
        showToast("已清空考研目标分数设定", "info");
    }

    // ==========================================================================
    // 全屏沉浸式多步考研规划初始化向导 (Full-Screen Onboarding State Machine)
    // ==========================================================================

    const onboardingState = {
        isFirstTime: false,
        stepIndex: 0,
        steps: [],
        selectedTheme: 'system',
        restConfig: { mode: 'weekly', days: [0], interval: 6 },
        activeSlots: ['morning', 'afternoon', 'evening'],
        targetScores: null,
        extraMajors: []
    };

    function getUniqueWorkspaceName(baseName) {
        let finalName = baseName;
        let counter = 2;
        const existingNames = Object.values(state.workspaces || {}).map(w => w.name);
        while (existingNames.includes(finalName)) {
            finalName = `${baseName} (${counter})`;
            counter++;
        }
        return finalName;
    }

    function getRealTodayDateStr() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function getCurrentRealWorldExamDefaults() {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1; // 1-12
        const currentDay = today.getDate();

        // 当年在 12 月 25 日之后（当年初试已结束），默认考研为次年 12 月初试
        let examYear = currentYear;
        if (currentMonth === 12 && currentDay > 25) {
            examYear = currentYear + 1;
        }

        // 考研届数：如 2026 年 12 月初试 -> 27 届；2027 年 12 月初试 -> 28 届
        const targetYear = (examYear + 1) % 100;
        const defaultExamDate = `${examYear}-12-20`;
        const todayStr = getRealTodayDateStr();

        return {
            currentYear,
            examYear,
            targetYear,
            defaultExamDate,
            todayStr
        };
    }

    function syncOnboardingDatesForYear(targetYear) {
        const yNum = parseInt(targetYear, 10) || 27;
        const examYear = 2000 + yNum - 1;
        const earliestStartYear = examYear - 1; // 考研那一年的前一年
        const minStartDate = `${earliestStartYear}-01-01`;
        const maxStartDate = `${examYear}-12-19`;
        const defaultExamDate = `${examYear}-12-20`;

        const sDate = document.getElementById('onb-start-date');
        const eDate = document.getElementById('onb-exam-date');
        const sHint = document.getElementById('hint-onb-start-date');
        const eHint = document.getElementById('hint-onb-exam-date');

        if (sDate) {
            sDate.min = minStartDate;
            sDate.max = maxStartDate;

            const realTodayStr = getRealTodayDateStr();
            // 规划起始日期：默认用户当前创建当天的真实系统日期（如 2026-08-16），绝不使用样板间的模拟旧日期
            if (realTodayStr && realTodayStr >= minStartDate && realTodayStr <= maxStartDate) {
                sDate.value = realTodayStr;
            } else {
                sDate.value = `${examYear}-01-01`;
            }
        }

        if (eDate) {
            eDate.min = `${examYear}-01-01`;
            eDate.max = `${examYear}-12-31`;
            eDate.value = defaultExamDate;
        }

        if (sHint) {
            sHint.textContent = `支持提前至初试前一年（${earliestStartYear}年1月1日后）开始准备`;
        }
        if (eHint) {
            eHint.textContent = `考研初试通常在 ${examYear} 年 12 月倒数第一或第二个周末`;
        }
    }

    function renderOnbAdditionalMajors() {
        const container = document.getElementById('onb-additional-majors');
        const addBtn = document.getElementById('btn-add-onb-major-field');
        if (!container) return;
        container.innerHTML = '';

        if (!onboardingState.extraMajors) onboardingState.extraMajors = [];

        const currentCount = 1 + onboardingState.extraMajors.length;
        if (addBtn) {
            addBtn.style.display = (currentCount >= 4) ? 'none' : 'inline-flex';
        }

        const cnNums = ['二', '三', '四'];
        const placeholders = ['如：数字电路 / 数据结构', '如：计算机网络 / 控制工程', '如：操作系统 / 电路分析'];

        onboardingState.extraMajors.forEach((m, idx) => {
            const row = document.createElement('div');
            row.className = 'onb-major-row';
            row.innerHTML = `
                <div class="form-group" style="margin: 0; flex: 1;">
                    <label class="form-label" style="font-size: 11.5px;">专业课${cnNums[idx]}名称：<span style="color:var(--color-danger);">*</span></label>
                    <input type="text" class="form-input onb-extra-major-input" data-index="${idx}" placeholder="${placeholders[idx] || '如：专业课名称'}" value="${escapeHtml(m)}" maxlength="20">
                </div>
                <button type="button" class="btn-remove-onb-major" data-index="${idx}" title="删除此专业课">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            container.appendChild(row);
        });

        container.querySelectorAll('.onb-extra-major-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'), 10);
                onboardingState.extraMajors[idx] = e.target.value;
                e.target.classList.remove('has-error');
            });
        });

        container.querySelectorAll('.btn-remove-onb-major').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const btnEl = e.target.closest('.btn-remove-onb-major');
                const idx = parseInt(btnEl.getAttribute('data-index'), 10);
                onboardingState.extraMajors.splice(idx, 1);
                renderOnbAdditionalMajors();
            });
        });
    }

    function openOnboardingWizard(isFirstTime = false) {
        // 若当前无任何规划区，强制为首次引导
        if (Object.keys(state.workspaces || {}).length === 0) {
            isFirstTime = true;
        }

        onboardingState.isFirstTime = !!isFirstTime;
        onboardingState.stepIndex = 0;
        onboardingState.selectedTheme = 'system'; // 默认跟随系统（中间卡片）
        onboardingState.restConfig = { mode: 'weekly', days: [0], interval: 6 };
        onboardingState.targetScores = null;
        onboardingState.extraMajors = [];

        if (isFirstTime) {
            onboardingState.steps = ['welcome', 'theme', 'basic', 'dates', 'rest-days', 'subjects', 'target-scores', 'celebrate'];
        } else {
            // 已有规划区新建：也保留外观风格设定步骤
            onboardingState.steps = ['theme', 'basic', 'dates', 'rest-days', 'subjects', 'target-scores', 'celebrate'];
        }

        const defaults = getCurrentRealWorldExamDefaults();
        const defaultYear = defaults.targetYear;

        const uInput = document.getElementById('onb-user-name');
        const wsInput = document.getElementById('onb-ws-name');
        const ySelect = document.getElementById('onb-target-year');
        const mathSelect = document.getElementById('onb-subject-math');
        const engSelect = document.getElementById('onb-subject-english');
        const maj1Input = document.getElementById('onb-subject-major1');
        const exitBtn = document.getElementById('btn-exit-onboarding');

        // 动态根据当前自然年生成目标届数下拉列表，默认选中当年考研届数（如 2026年 -> 27届；2027年 -> 28届）
        if (ySelect) {
            ySelect.innerHTML = '';
            for (let offset = -1; offset <= 3; offset++) {
                const ey = defaults.examYear + offset;
                const ty = (ey + 1) % 100;
                const opt = document.createElement('option');
                opt.value = String(ty);
                opt.textContent = `${ty} 届 (${ey} 年 12 月初试)`;
                if (ty === defaultYear) opt.selected = true;
                ySelect.appendChild(opt);
            }
        }

        // 默认清空昵称与规划区全称，不预置任何名字，提示用户必填输入
        if (uInput) {
            uInput.value = '';
            clearOnbInputError(uInput, document.getElementById('hint-onb-user-name'), '此称呼将用于规划区标题与问候语');
        }
        if (wsInput) {
            wsInput.value = '';
            clearOnbInputError(wsInput, document.getElementById('hint-onb-ws-name'), '规划区名称不能与已有规划区重复');
        }

        // 联动初试年份与起始日：起始日默认当天，初试默认当年 12 月 20 日
        syncOnboardingDatesForYear(defaultYear);

        // 初始化休息日交互与下拉列表
        const intervalSelect = document.getElementById('onb-rest-interval-select');
        if (intervalSelect) {
            intervalSelect.innerHTML = '';
            for (let i = 1; i <= 30; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = i === 6 ? `每隔 6 天休息 1 天（推荐：每学习6天休1天）` : `每隔 ${i} 天休息 1 天`;
                if (i === 6) opt.selected = true;
                intervalSelect.appendChild(opt);
            }
            intervalSelect.onchange = (e) => {
                onboardingState.restConfig.interval = parseInt(e.target.value, 10) || 6;
                const intervalHint = document.getElementById('onb-interval-hint');
                if (intervalHint) {
                    intervalHint.textContent = `💡 系统将从规划起始日起，每学习 ${e.target.value} 天后自动安排 1 天例行休息`;
                }
            };
        }

        // 绑定休息模式卡片
        document.querySelectorAll('.onb-rest-mode-card').forEach(card => {
            card.onclick = () => {
                const mode = card.getAttribute('data-rest-mode') || 'weekly';
                onboardingState.restConfig.mode = mode;
                document.querySelectorAll('.onb-rest-mode-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                const panelWeekly = document.getElementById('onb-rest-panel-weekly');
                const panelInterval = document.getElementById('onb-rest-panel-interval');
                const panelNone = document.getElementById('onb-rest-panel-none');

                if (panelWeekly) panelWeekly.style.display = (mode === 'weekly') ? 'block' : 'none';
                if (panelInterval) panelInterval.style.display = (mode === 'interval') ? 'block' : 'none';
                if (panelNone) panelNone.style.display = (mode === 'none') ? 'block' : 'none';
            };
        });

        // 绑定每周各天框子点击事件
        function updateWeeklyHint() {
            const hintEl = document.getElementById('onb-weekly-hint');
            if (!hintEl) return;
            const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            const selectedDays = onboardingState.restConfig.days || [];
            if (selectedDays.length === 0) {
                hintEl.textContent = '⚠️ 当前未选择任何休息日，请至少勾选 1 天或切换为“不休息”模式';
                hintEl.style.color = 'var(--color-danger)';
            } else {
                const namesStr = selectedDays.slice().sort().map(d => dayNames[d]).join('、');
                hintEl.textContent = `💡 已设定：每${namesStr}例行休息，其余日子为学习日`;
                hintEl.style.color = 'var(--color-primary)';
            }
        }

        document.querySelectorAll('.onb-weekday-box').forEach(box => {
            box.onclick = () => {
                const dayNum = parseInt(box.getAttribute('data-day'), 10);
                const idx = onboardingState.restConfig.days.indexOf(dayNum);
                if (idx > -1) {
                    onboardingState.restConfig.days.splice(idx, 1);
                    box.classList.remove('selected');
                } else {
                    onboardingState.restConfig.days.push(dayNum);
                    box.classList.add('selected');
                }
                updateWeeklyHint();
            };
        });

        // 默认重置为 weekly 与周日选中
        document.querySelectorAll('.onb-rest-mode-card').forEach(c => {
            c.classList.toggle('selected', c.getAttribute('data-rest-mode') === 'weekly');
        });
        document.querySelectorAll('.onb-weekday-box').forEach(b => {
            b.classList.toggle('selected', b.getAttribute('data-day') === '0');
        });
        const pWeekly = document.getElementById('onb-rest-panel-weekly');
        const pInterval = document.getElementById('onb-rest-panel-interval');
        const pNone = document.getElementById('onb-rest-panel-none');
        if (pWeekly) pWeekly.style.display = 'block';
        if (pInterval) pInterval.style.display = 'none';
        if (pNone) pNone.style.display = 'none';
        updateWeeklyHint();

        // 初始化每日学习时段选择 (上午/下午/晚上，默认全选)
        onboardingState.activeSlots = ['morning', 'afternoon', 'evening'];
        ['morning', 'afternoon', 'evening'].forEach(slot => {
            const chk = document.getElementById(`onb-chk-slot-${slot}`);
            if (chk) chk.checked = true;
            const card = document.querySelector(`.onb-slot-checkbox-card[data-slot="${slot}"]`);
            if (card) card.classList.add('selected');
        });

        document.querySelectorAll('.onb-slot-checkbox-card').forEach(card => {
            card.onclick = (e) => {
                e.preventDefault();
                const slot = card.getAttribute('data-slot');
                const chk = document.getElementById(`onb-chk-slot-${slot}`);
                if (!chk) return;
                
                chk.checked = !chk.checked;
                card.classList.toggle('selected', chk.checked);

                const checked = [];
                if (document.getElementById('onb-chk-slot-morning')?.checked) checked.push('morning');
                if (document.getElementById('onb-chk-slot-afternoon')?.checked) checked.push('afternoon');
                if (document.getElementById('onb-chk-slot-evening')?.checked) checked.push('evening');
                onboardingState.activeSlots = checked;
            };
        });

        if (mathSelect) mathSelect.value = 'math1';
        if (engSelect) engSelect.value = 'english1';
        if (maj1Input) {
            maj1Input.value = ''; // 默认为空，靠灰色占位符提示
            maj1Input.classList.remove('has-error');
            maj1Input.oninput = () => {
                maj1Input.classList.remove('has-error');
            };
        }

        renderOnbAdditionalMajors();

        const addMajorBtn = document.getElementById('btn-add-onb-major-field');
        if (addMajorBtn) {
            addMajorBtn.onclick = () => {
                if (onboardingState.extraMajors.length < 3) {
                    onboardingState.extraMajors.push('');
                    renderOnbAdditionalMajors();
                }
            };
        }

        // 联动用户称呼与规划区全称
        uInput?.addEventListener('input', () => {
            clearOnbInputError(uInput, document.getElementById('hint-onb-user-name'), '此称呼将用于规划区标题与问候语');
            const u = uInput.value.trim();
            const y = ySelect ? ySelect.value : '27';
            if (wsInput) {
                if (u) {
                    const rawName = `${u}的${y}考研规划`;
                    wsInput.value = onboardingState.isFirstTime ? rawName : getUniqueWorkspaceName(rawName);
                } else {
                    wsInput.value = '';
                }
                clearOnbInputError(wsInput, document.getElementById('hint-onb-ws-name'), '规划区名称不能与已有规划区重复');
            }
        });
        wsInput?.addEventListener('input', () => {
            clearOnbInputError(wsInput, document.getElementById('hint-onb-ws-name'), '规划区名称不能与已有规划区重复');
        });

        const sDate = document.getElementById('onb-start-date');
        const eDate = document.getElementById('onb-exam-date');
        sDate?.addEventListener('input', () => {
            const y = ySelect ? ySelect.value : '27';
            const ey = 2000 + parseInt(y, 10) - 1;
            clearOnbInputError(sDate, document.getElementById('hint-onb-start-date'), `支持提前至初试前一年（${ey - 1}年1月1日后）开始准备`);
        });
        eDate?.addEventListener('input', () => {
            const y = ySelect ? ySelect.value : '27';
            const ey = 2000 + parseInt(y, 10) - 1;
            clearOnbInputError(eDate, document.getElementById('hint-onb-exam-date'), `考研初试通常在 ${ey} 年 12 月倒数第一或第二个周末`);
        });

        ySelect?.addEventListener('change', () => {
            const u = uInput?.value.trim();
            const y = ySelect.value;
            if (wsInput && u) {
                const rawName = `${u}的${y}考研规划`;
                wsInput.value = onboardingState.isFirstTime ? rawName : getUniqueWorkspaceName(rawName);
                clearOnbInputError(wsInput, document.getElementById('hint-onb-ws-name'), '规划区名称不能与已有规划区重复');
            }
            syncOnboardingDatesForYear(y);
        });

        function updateDarkDepthVisibility(choice) {
            const depthContainer = document.getElementById('onb-dark-depth-container');
            if (!depthContainer) return;
            if (choice === 'dark' || choice === 'system') {
                depthContainer.style.display = 'block';
            } else {
                depthContainer.style.display = 'none';
            }
        }

        // 外观卡片点击实时切换并预览主题
        document.querySelectorAll('.onb-theme-card').forEach(card => {
            card.onclick = () => {
                const choice = card.getAttribute('data-theme-choice') || 'system';
                document.querySelectorAll('.onb-theme-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                onboardingState.selectedTheme = choice;
                setTheme(choice);
                updateDarkDepthVisibility(choice);
                saveWorkspaces();
            };
        });

        // 默认高亮当前主题卡片
        const currentTheme = state.themeChoice || 'system';
        onboardingState.selectedTheme = currentTheme;
        document.querySelectorAll('.onb-theme-card').forEach(card => {
            card.classList.toggle('selected', card.getAttribute('data-theme-choice') === currentTheme);
        });
        updateDarkDepthVisibility(currentTheme);

        // 主题色色块点击
        const currentAccent = state.accentColor || 'blue';
        document.querySelectorAll('.onb-accent-swatch').forEach(swatch => {
            const colorVal = swatch.getAttribute('data-accent-val') || 'blue';
            swatch.classList.toggle('selected', colorVal === currentAccent);
            swatch.onclick = () => {
                setAccentColor(colorVal);
                saveWorkspaces();
            };
        });

        // 纯黑/暗色深度卡片点击
        const currentDarkStyle = state.darkStyle || 'classic';
        document.querySelectorAll('.onb-dark-depth-card').forEach(card => {
            const depthVal = card.getAttribute('data-depth') || 'classic';
            card.classList.toggle('selected', depthVal === currentDarkStyle);
            card.onclick = () => {
                setDarkStyle(depthVal);
                saveWorkspaces();
            };
        });

        if (exitBtn) {
            exitBtn.style.display = isFirstTime ? 'none' : 'inline-flex';
        }

        const overlay = document.getElementById('onboarding-fullscreen-overlay');
        if (overlay) {
            overlay.classList.remove('fade-out');
            overlay.style.display = 'flex';
            document.body.classList.add('modal-open');
        }

        renderOnboardingStep();
    }

    function closeOnboardingWizard() {
        const overlay = document.getElementById('onboarding-fullscreen-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.classList.remove('fade-out');
                document.body.classList.remove('modal-open');
            }, 300);
        }
    }

    function clearOnbInputError(input, hint, defaultHintText = '') {
        if (input) input.classList.remove('has-error');
        if (hint) {
            hint.classList.remove('has-error');
            if (defaultHintText) hint.textContent = defaultHintText;
        }
    }

    function setOnbInputError(input, hint, errorMsg) {
        if (input) {
            input.classList.remove('has-error');
            void input.offsetWidth;
            input.classList.add('has-error');
            input.focus();
        }
        if (hint) {
            hint.classList.add('has-error');
            hint.textContent = errorMsg;
        }
    }

    function renderOnboardingStep() {
        const stepKey = onboardingState.steps[onboardingState.stepIndex];
        const totalSteps = onboardingState.steps.length;
        const totalConfigSteps = onboardingState.isFirstTime ? (totalSteps - 2) : (totalSteps - 1);

        document.querySelectorAll('.onboarding-step-pane').forEach(p => p.classList.remove('active'));
        const activePane = document.getElementById(`onboarding-pane-${stepKey}`);
        if (activePane) activePane.classList.add('active');

        if (stepKey === 'target-scores') {
            renderOnboardingTargetScoresGrid();
        }

        const bottomBar = document.getElementById('onboarding-bottom-bar');
        const prevBtn = document.getElementById('btn-onb-prev');
        const skipBtn = document.getElementById('btn-onb-skip');
        const nextBtn = document.getElementById('btn-onb-next');
        const nextText = document.getElementById('btn-onb-next-text');
        const nextIcon = document.getElementById('btn-onb-next-icon');
        const stepInd = document.getElementById('onb-step-indicator');
        const progFill = document.getElementById('onb-progress-fill');

        if (stepKey === 'celebrate') {
            if (bottomBar) bottomBar.style.display = 'none';
            executeOnboardingFinalize();
            return;
        } else {
            if (bottomBar) bottomBar.style.display = 'flex';
        }

        if (prevBtn) {
            prevBtn.style.display = (onboardingState.stepIndex > 0) ? 'inline-flex' : 'none';
        }

        // 打开样板规划区按钮（仅在向导第 1 步时显示，后续步骤隐藏）
        const sampleBtn = document.getElementById('btn-onb-open-sample');
        if (sampleBtn) {
            sampleBtn.style.display = (onboardingState.stepIndex === 0) ? 'inline-flex' : 'none';
        }

        // 跳过按钮 (仅在 theme 和 target-scores 步显示)
        if (skipBtn) {
            skipBtn.style.display = (stepKey === 'theme' || stepKey === 'target-scores') ? 'inline-flex' : 'none';
        }

        // 下一步按钮文案
        if (nextText && nextIcon) {
            if (stepKey === 'welcome') {
                nextText.textContent = '开始配置';
                nextIcon.className = 'fa-solid fa-chevron-right';
            } else if (stepKey === 'target-scores') {
                nextText.textContent = '完成配置并开启';
                nextIcon.className = 'fa-solid fa-rocket';
            } else {
                nextText.textContent = '下一步';
                nextIcon.className = 'fa-solid fa-chevron-right';
            }
        }

        // 步骤指示与进度条 (第 x / 5 步)
        if (stepInd) {
            if (stepKey === 'welcome') {
                stepInd.textContent = '欢迎使用';
            } else {
                const configStepIndex = onboardingState.isFirstTime ? onboardingState.stepIndex : (onboardingState.stepIndex + 1);
                stepInd.textContent = `第 ${configStepIndex} / ${totalConfigSteps} 步`;
            }
        }

        if (progFill) {
            const percent = ((onboardingState.stepIndex + 1) / totalSteps) * 100;
            progFill.style.width = `${Math.min(100, Math.max(16, percent))}%`;
        }
    }

    function renderOnboardingTargetScoresGrid() {
        const grid = document.getElementById('onb-target-scores-grid');
        const totalEl = document.getElementById('onb-target-total-display');
        if (!grid) return;

        grid.innerHTML = '';

        const mathType = document.getElementById('onb-subject-math')?.value || 'math1';
        const mathName = mathType === 'math2' ? '数学二' : mathType === 'math3' ? '数学三' : mathType === 'none' ? null : '数学一';
        const engName = document.getElementById('onb-subject-english')?.selectedOptions[0]?.text?.split(' ')[0] || '英语一';

        // 固定 4 门科目：数学（满分150）、专业课（无论填写几个专业课统一为一张试卷“专业课”，满分150）、英语（满分100）、思想政治理论（满分100）
        const subjectsList = [];
        if (mathName) subjectsList.push({ key: 'math', name: mathName, is150: true, maxScore: 150, placeholder: '如：120' });
        subjectsList.push({ key: 'major', name: '专业课', is150: true, maxScore: 150, placeholder: '如：115' });
        subjectsList.push({ key: 'english', name: engName, is150: false, maxScore: 100, placeholder: '如：75' });
        subjectsList.push({ key: 'politics', name: '思想政治理论', is150: false, maxScore: 100, placeholder: '如：70' });

        subjectsList.forEach(sub => {
            const fullScore = sub.maxScore;
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label class="form-label" style="font-size:11.5px; display:flex; justify-content:space-between;">
                    <span>${escapeHtml(sub.name)}：</span>
                    <span style="color:var(--text-muted); font-size:10.5px;">满分 ${fullScore}</span>
                </label>
                <input type="text" inputmode="numeric" class="form-input onb-target-score-input" data-subject-key="${sub.key}" data-subject-name="${escapeHtml(sub.name)}" data-max-score="${fullScore}" placeholder="${sub.placeholder}" value="" maxlength="3">
            `;
            grid.appendChild(div);
        });

        function updateOnbTotal() {
            let sum = 0;
            grid.querySelectorAll('.onb-target-score-input').forEach(inp => {
                const raw = inp.value.trim();
                inp.classList.remove('has-error');
                if (!raw) return;
                if (!/^\d+$/.test(raw)) {
                    inp.classList.add('has-error');
                    return;
                }
                const num = parseInt(raw, 10);
                const max = parseInt(inp.getAttribute('data-max-score'), 10) || 150;
                if (num < 0 || num > max) {
                    inp.classList.add('has-error');
                    return;
                }
                sum += num;
            });
            if (totalEl) totalEl.textContent = sum;
        }

        grid.querySelectorAll('.onb-target-score-input').forEach(inp => inp.addEventListener('input', updateOnbTotal));
        updateOnbTotal();
    }

    function handleOnboardingNext() {
        const stepKey = onboardingState.steps[onboardingState.stepIndex];

        // 校验 Step: 基础信息 (带严格重名阻断检测)
        if (stepKey === 'basic') {
            const uInput = document.getElementById('onb-user-name');
            const uHint = document.getElementById('hint-onb-user-name');
            const wsInput = document.getElementById('onb-ws-name');
            const wsHint = document.getElementById('hint-onb-ws-name');

            clearOnbInputError(uInput, uHint, '此称呼将用于规划区标题与问候语');
            clearOnbInputError(wsInput, wsHint, '规划区名称不能与已有规划区重复');

            const userName = uInput?.value?.trim();
            if (!userName) {
                setOnbInputError(uInput, uHint, '此处为必填项，请输入你的称呼或昵称！');
                uInput?.focus();
                return;
            }

            let wsName = wsInput?.value?.trim();
            if (!wsName) {
                const ySelect = document.getElementById('onb-target-year');
                const y = ySelect ? ySelect.value : '27';
                const rawName = `${userName}的${y}考研规划`;
                wsName = onboardingState.isFirstTime ? rawName : getUniqueWorkspaceName(rawName);
                if (wsInput) wsInput.value = wsName;
            }

            // 规划区名称查重阻断
            if (!onboardingState.isFirstTime) {
                const existingWsNames = Object.values(state.workspaces || {}).map(w => w.name);
                if (existingWsNames.includes(wsName)) {
                    setOnbInputError(wsInput, wsHint, `规划区名称【${wsName}】已存在，请换一个名称！`);
                    wsInput?.focus();
                    return;
                }
            }
        }

        // 校验 Step: 日期范围
        if (stepKey === 'dates') {
            const sDate = document.getElementById('onb-start-date');
            const sHint = document.getElementById('hint-onb-start-date');
            const eDate = document.getElementById('onb-exam-date');
            const eHint = document.getElementById('hint-onb-exam-date');
            const targetYear = parseInt(document.getElementById('onb-target-year')?.value, 10) || 27;
            const examYear = 2000 + targetYear - 1;
            const earliestStartYear = examYear - 1;
            const minStartDate = `${earliestStartYear}-01-01`;

            clearOnbInputError(sDate, sHint, `支持提前至初试前一年（${earliestStartYear}年1月1日后）开始准备`);
            clearOnbInputError(eDate, eHint, `考研初试通常在 ${examYear} 年 12 月倒数第一或第二个周末`);

            const sVal = validateDateString(sDate?.value, "规划起始日期");
            if (!sVal.valid) {
                setOnbInputError(sDate, sHint, sVal.message);
                return;
            }
            const eVal = validateDateString(eDate?.value, "考研初试日期");
            if (!eVal.valid) {
                setOnbInputError(eDate, eHint, eVal.message);
                return;
            }

            // 严格约束：考研起始日期最多只能在考研那一年的前一年
            if (sVal.formatted < minStartDate) {
                setOnbInputError(sDate, sHint, `规划起始日期最多只能提前至考研初试的前一年（${earliestStartYear}年1月1日后）！`);
                return;
            }

            if (sVal.formatted >= eVal.formatted) {
                setOnbInputError(sDate, sHint, "规划起始日期必须早于考研初试日期！");
                return;
            }
        }

        // 校验 Step: 备考休息日与时段 (不可跳过)
        if (stepKey === 'rest-days') {
            if (onboardingState.restConfig.mode === 'weekly') {
                if (!onboardingState.restConfig.days || onboardingState.restConfig.days.length === 0) {
                    showToast('请至少选择 1 天作为每周休息日，或选择“不休息”模式！', 'error');
                    const hintEl = document.getElementById('onb-weekly-hint');
                    if (hintEl) {
                        hintEl.textContent = '⚠️ 请至少选择 1 天作为每周休息日，或切换为“不休息”模式';
                        hintEl.style.color = 'var(--color-danger)';
                    }
                    return;
                }
            }

            if (!onboardingState.activeSlots || onboardingState.activeSlots.length === 0) {
                showToast('请至少勾选 1 个每日计划学习时段（上午/下午/晚上）！', 'error');
                return;
            }
        }

        // 校验 Step: 考研科目 (专业课一及添加的专业课必填)
        if (stepKey === 'subjects') {
            const maj1Input = document.getElementById('onb-subject-major1');
            const maj1Val = maj1Input ? maj1Input.value.trim() : '';
            if (!maj1Val) {
                if (maj1Input) {
                    maj1Input.classList.remove('has-error');
                    void maj1Input.offsetWidth;
                    maj1Input.classList.add('has-error');
                    maj1Input.focus();
                }
                showToast('请填写专业课一的名称！', 'error');
                return;
            } else {
                if (maj1Input) maj1Input.classList.remove('has-error');
            }

            let extraError = false;
            const extraInputs = document.querySelectorAll('.onb-extra-major-input');
            const cnNums = ['二', '三', '四'];
            for (let idx = 0; idx < extraInputs.length; idx++) {
                const inp = extraInputs[idx];
                if (!inp.value.trim()) {
                    inp.classList.remove('has-error');
                    void inp.offsetWidth;
                    inp.classList.add('has-error');
                    inp.focus();
                    showToast(`请填写专业课${cnNums[idx] || (idx + 2)}的名称！`, 'error');
                    extraError = true;
                    break;
                } else {
                    inp.classList.remove('has-error');
                }
            }
            if (extraError) return;
        }

        // 收集 Step: 目标分数 (严格纯数字与满分校验)
        if (stepKey === 'target-scores') {
            const subScores = {};
            let total = 0;
            let hasError = false;

            document.querySelectorAll('.onb-target-score-input').forEach(inp => {
                const raw = inp.value.trim();
                inp.classList.remove('has-error');
                if (!raw) return;

                const maxScore = parseInt(inp.getAttribute('data-max-score'), 10) || 150;
                const subKey = inp.getAttribute('data-subject-key');
                const subName = inp.getAttribute('data-subject-name') || '科目';

                if (!/^\d+$/.test(raw)) {
                    inp.classList.add('has-error');
                    inp.focus();
                    showToast(`【${subName}】目标分数只能填写正整数！`, "error");
                    hasError = true;
                    return;
                }

                const num = parseInt(raw, 10);
                if (num < 0 || num > maxScore) {
                    inp.classList.add('has-error');
                    inp.focus();
                    showToast(`【${subName}】目标分数不能超过满分 ${maxScore} 分！`, "error");
                    hasError = true;
                    return;
                }

                subScores[subKey] = num;
                total += num;
            });

            if (hasError) return;

            const chkFooter = document.getElementById('onb-chk-show-footer');
            if (total > 0) {
                onboardingState.targetScores = {
                    total: total,
                    showInFooter: chkFooter ? chkFooter.checked : true,
                    subjects: subScores
                };
            } else {
                onboardingState.targetScores = null;
            }
        }

        // 推进到下一步
        if (onboardingState.stepIndex < onboardingState.steps.length - 1) {
            onboardingState.stepIndex++;
            renderOnboardingStep();
        }
    }

    function handleOnboardingSkip() {
        const stepKey = onboardingState.steps[onboardingState.stepIndex];
        if (stepKey === 'theme') {
            onboardingState.selectedTheme = 'system';
            setTheme('system');
            saveWorkspaces();
        }
        if (stepKey === 'target-scores') {
            onboardingState.targetScores = null; // 跳过目标分数
        }
        if (onboardingState.stepIndex < onboardingState.steps.length - 1) {
            onboardingState.stepIndex++;
            renderOnboardingStep();
        }
    }

    function handleOnboardingPrev() {
        if (onboardingState.stepIndex > 0) {
            onboardingState.stepIndex--;
            renderOnboardingStep();
        }
    }

    function executeOnboardingFinalize() {
        const userName = document.getElementById('onb-user-name')?.value.trim() || '考研人';
        const targetYear = parseInt(document.getElementById('onb-target-year')?.value, 10) || 27;
        const examYear = 2000 + targetYear - 1;
        const finalWsName = document.getElementById('onb-ws-name')?.value.trim() || `${userName}的${targetYear}考研规划`;
        const startDate = document.getElementById('onb-start-date')?.value || getRealTodayDateStr();
        const examDate = document.getElementById('onb-exam-date')?.value || `${examYear}-12-20`;
        const mathType = document.getElementById('onb-subject-math')?.value || 'math1';
        const englishType = document.getElementById('onb-subject-english')?.value || 'english1';
        
        const maj1Name = document.getElementById('onb-subject-major1')?.value.trim() || '专业课一';
        const cnNums = ['二', '三', '四'];
        const extraMajors = (onboardingState.extraMajors || []).map((m, i) => m.trim() || `专业课${cnNums[i]}`);
        const majorSubjects = [maj1Name, ...extraMajors];

        const chosenTheme = onboardingState.selectedTheme || 'system';
        const slotsToUse = (onboardingState.activeSlots && onboardingState.activeSlots.length > 0) ? onboardingState.activeSlots : ['morning', 'afternoon', 'evening'];

        const newWs = window.createDefaultWorkspaceSkeleton({
            name: finalWsName,
            userName: userName,
            targetYear: targetYear,
            startDate: startDate,
            examDate: examDate,
            templateType: 'blank', // 全面默认纯净空白骨架
            mathType: mathType,
            englishType: englishType,
            majorSubjects: majorSubjects,
            theme: chosenTheme,
            restConfig: onboardingState.restConfig,
            activeSlots: slotsToUse
        });

        if (!newWs.preferences) newWs.preferences = {};
        newWs.preferences.theme = chosenTheme;
        newWs.preferences.accentColor = state.accentColor || 'blue';
        newWs.preferences.darkStyle = state.darkStyle || 'classic';
        newWs.preferences.activeSlots = slotsToUse;

        // 注入目标分数
        if (onboardingState.targetScores) {
            newWs.targetScores = onboardingState.targetScores;
        }

        if (onboardingState.isFirstTime || Object.keys(state.workspaces || {}).length === 0) {
            state.workspaces = { [newWs.id]: newWs };
        } else {
            state.workspaces[newWs.id] = newWs;
        }

        state.activeWorkspaceId = newWs.id;
        state.monthFilter = 'all';
        saveWorkspaces();
        syncStateWithActiveWorkspace();
        setTheme(chosenTheme);
        renderAll(); // 立即渲染底层DOM，彻底防止倒计时淡出时闪烁空白页

        // 1.2s 庆祝动画后淡出退出向导
        setTimeout(() => {
            const overlay = document.getElementById('onboarding-fullscreen-overlay');
            if (overlay) {
                overlay.classList.add('fade-out');
                setTimeout(() => {
                    overlay.style.display = 'none';
                    overlay.classList.remove('fade-out');
                    document.body.classList.remove('modal-open');
                    renderAll();
                    showToast(`🎉 欢迎来到【${newWs.name}】！备考之旅现已正式启航`, "success");
                }, 450);
            }
        }, 1200);
    }

    function syncSettingsDatesForYear(targetYear) {
        const yNum = parseInt(targetYear, 10) || 27;
        const examYear = 2000 + yNum - 1;
        const earliestStartYear = examYear - 1;
        const minStartDate = `${earliestStartYear}-01-01`;
        const maxStartDate = `${examYear}-12-19`;

        const sInput = document.getElementById('settings-start-date');
        const eInput = document.getElementById('settings-exam-date');
        const sHint = document.getElementById('settings-start-hint');
        const eHint = document.getElementById('settings-exam-hint');

        if (sInput) {
            sInput.min = minStartDate;
            sInput.max = maxStartDate;
        }
        if (eInput) {
            eInput.min = `${examYear}-01-01`;
            eInput.max = `${examYear}-12-31`;
        }
        if (sHint) {
            sHint.textContent = `支持提前至初试前一年（${earliestStartYear}年1月1日后）开始准备`;
        }
        if (eHint) {
            eHint.textContent = `考研初试通常在 ${examYear} 年 12 月倒数第一或第二个周末`;
        }
    }

    function openWorkspaceSettingsModal() {
        closeWorkspaceDropdown();
        const ws = state.workspace;
        if (!ws) return;

        const targetYear = ws.targetYear || 27;
        document.getElementById('settings-user-name').value = ws.userName || 'FEEFEENOON';
        document.getElementById('settings-workspace-name').value = ws.name || '';
        document.getElementById('settings-target-year').value = String(targetYear);
        document.getElementById('settings-start-date').value = ws.startDate || '2026-08-16';
        document.getElementById('settings-exam-date').value = ws.examDate || '2026-12-20';
        document.getElementById('settings-default-view').value = ws.preferences?.viewMode || 'table';
        document.getElementById('settings-show-past-days').checked = !!ws.preferences?.showPastDays;

        syncSettingsDatesForYear(targetYear);

        // AI 接入配置回填
        const ai = ws.aiConfig || {};
        if (document.getElementById('settings-ai-provider')) {
            document.getElementById('settings-ai-provider').value = ai.provider || 'openai';
            document.getElementById('settings-ai-base-url').value = ai.baseUrl || '';
            document.getElementById('settings-ai-api-key').value = ai.apiKey || '';
            document.getElementById('settings-ai-model').value = ai.model || '';
        }

        // 回填外观偏好
        const wsTheme = ws.preferences?.theme || 'system';
        const wsAccent = ws.preferences?.accentColor || 'blue';
        const wsDarkStyle = ws.preferences?.darkStyle || 'classic';

        document.querySelectorAll('#settings-theme-segmented .theme-seg-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme-choice') === wsTheme);
            btn.onclick = () => {
                const choice = btn.getAttribute('data-theme-choice') || 'system';
                setTheme(choice);
                saveWorkspaces();
                document.querySelectorAll('#settings-theme-segmented .theme-seg-btn').forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-theme-choice') === choice);
                });
                const depthCont = document.getElementById('settings-dark-depth-container');
                if (depthCont) depthCont.style.display = (choice === 'dark' || choice === 'system') ? 'block' : 'none';
            };
        });

        const depthContainer = document.getElementById('settings-dark-depth-container');
        if (depthContainer) depthContainer.style.display = (wsTheme === 'dark' || wsTheme === 'system') ? 'block' : 'none';

        document.querySelectorAll('#settings-accent-swatches-grid .onb-accent-swatch').forEach(swatch => {
            const val = swatch.getAttribute('data-accent-val') || 'blue';
            swatch.classList.toggle('selected', val === wsAccent);
            swatch.onclick = () => {
                setAccentColor(val);
                saveWorkspaces();
                document.querySelectorAll('#settings-accent-swatches-grid .onb-accent-swatch').forEach(s => {
                    s.classList.toggle('selected', s.getAttribute('data-accent-val') === val);
                });
            };
        });

        document.querySelectorAll('#settings-dark-depth-container .onb-dark-depth-card').forEach(card => {
            const val = card.getAttribute('data-depth') || 'classic';
            card.classList.toggle('selected', val === wsDarkStyle);
            card.onclick = () => {
                setDarkStyle(val);
                saveWorkspaces();
                document.querySelectorAll('#settings-dark-depth-container .onb-dark-depth-card').forEach(c => {
                    c.classList.toggle('selected', c.getAttribute('data-depth') === val);
                });
            };
        });

        const keepRadio = document.querySelector('input[name="settings-shift-strategy"][value="keep"]');
        if (keepRadio) keepRadio.checked = true;

        const isReadOnly = isCurrentWorkspaceReadOnly();
        const banner = document.getElementById('settings-readonly-banner');
        if (banner) banner.style.display = isReadOnly ? 'flex' : 'none';

        const saveBtn = document.getElementById('btn-save-workspace-settings');
        const clearBtn = document.getElementById('btn-clear-schedule');
        const delBtn = document.getElementById('btn-delete-current-workspace');
        if (saveBtn) {
            saveBtn.disabled = isReadOnly;
            saveBtn.style.opacity = isReadOnly ? '0.5' : '';
            saveBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }
        if (clearBtn) {
            clearBtn.disabled = isReadOnly;
            clearBtn.style.opacity = isReadOnly ? '0.5' : '';
            clearBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }
        if (delBtn) {
            delBtn.disabled = isReadOnly;
            delBtn.style.opacity = isReadOnly ? '0.5' : '';
            delBtn.style.cursor = isReadOnly ? 'not-allowed' : 'pointer';
        }

        ['settings-user-name', 'settings-workspace-name', 'settings-target-year', 'settings-start-date', 'settings-exam-date', 'settings-ai-provider', 'settings-ai-base-url', 'settings-ai-api-key', 'settings-ai-model'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = isReadOnly;
                el.style.opacity = isReadOnly ? '0.6' : '';
            }
        });

        switchSettingsPane('pane-basic');
        openModal('modal-workspace-settings');
    }

    function switchSettingsPane(paneId) {
        document.querySelectorAll('.settings-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-pane') === paneId);
        });
        document.querySelectorAll('.settings-section-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === paneId);
        });
    }
    window.openWorkspaceSettingsModal = openWorkspaceSettingsModal;
    window.switchSettingsPane = switchSettingsPane;

    function saveWorkspaceSettings() {
        if (checkReadOnlyAndWarn()) return;
        const ws = state.workspace;
        if (!ws) return;

        const newUserName = document.getElementById('settings-user-name').value.trim() || '考研人';
        const newWsName = document.getElementById('settings-workspace-name').value.trim() || `${newUserName}的${ws.targetYear}考研规划`;
        const newTargetYear = parseInt(document.getElementById('settings-target-year').value, 10) || ws.targetYear;

        // 规划区重名校验
        const isDuplicateName = Object.values(state.workspaces || {}).some(w => w.id !== ws.id && w.name === newWsName);
        if (isDuplicateName) {
            showToast(`⚠️ 已存在名为【${newWsName}】的规划区，请换一个名称以防混淆！`, "error");
            const wsNameInput = document.getElementById('settings-workspace-name');
            if (wsNameInput) {
                wsNameInput.classList.add('input-error');
                wsNameInput.focus();
            }
            return;
        }

        const startInput = document.getElementById('settings-start-date');
        const startHint = document.getElementById('settings-start-hint');
        const examInput = document.getElementById('settings-exam-date');
        const examHint = document.getElementById('settings-exam-hint');

        const examYear = 2000 + newTargetYear - 1;
        const earliestStartYear = examYear - 1;
        const minStartDate = `${earliestStartYear}-01-01`;

        clearDateInputError(startInput, startHint, `支持提前至初试前一年（${earliestStartYear}年1月1日后）开始准备`);
        clearDateInputError(examInput, examHint, `考研初试通常在 ${examYear} 年 12 月倒数第一或第二个周末`);

        if (startInput?.validity?.badInput || !startInput?.value) {
            setDateInputError(startInput, startHint, "输入的规划起始日期不合法（如9月最多只有30天）！");
            return;
        }
        if (examInput?.validity?.badInput || !examInput?.value) {
            setDateInputError(examInput, examHint, "输入的考研初试日期不合法，请检查后重新输入！");
            return;
        }

        const startVal = validateDateString(startInput.value, "规划起始日期");
        if (!startVal.valid) {
            setDateInputError(startInput, startHint, startVal.message);
            return;
        }
        const examVal = validateDateString(examInput.value, "考研初试日期");
        if (!examVal.valid) {
            setDateInputError(examInput, examHint, examVal.message);
            return;
        }

        const newStartDate = startVal.formatted;
        const newExamDate = examVal.formatted;

        if (newStartDate < minStartDate) {
            setDateInputError(startInput, startHint, `规划起始日期最多只能提前至考研初试的前一年（${earliestStartYear}年1月1日后）！`);
            return;
        }

        if (newStartDate >= newExamDate) {
            setDateInputError(startInput, startHint, "规划起始日期必须早于考研初试日期！");
            return;
        }

        const newDefaultView = document.getElementById('settings-default-view').value;
        const newShowPast = document.getElementById('settings-show-past-days').checked;
        const strategy = document.querySelector('input[name="settings-shift-strategy"]:checked')?.value || 'keep';

        const snapshot = takeWorkspaceSnapshot();
        const yearChanged = (newTargetYear !== ws.targetYear);
        const datesChanged = (newStartDate !== ws.startDate || newExamDate !== ws.examDate);

        ws.userName = newUserName;
        ws.name = newWsName;
        ws.targetYear = newTargetYear;
        if (!ws.preferences) ws.preferences = {};
        ws.preferences.viewMode = newDefaultView;
        ws.preferences.showPastDays = newShowPast;
        state.viewMode = newDefaultView;

        if (yearChanged) {
            const oldExamYear = ws.examYear || (2000 + ws.targetYear - 1);
            const newExamYear = 2000 + newTargetYear - 1;
            const diffYears = newExamYear - oldExamYear;
            ws.examYear = newExamYear;

            // 重新映射所有已排期日期的公历年份
            const remappedSchedule = {};
            Object.keys(ws.schedule).forEach(oldDateKey => {
                const parts = oldDateKey.split('-');
                const newYear = parseInt(parts[0], 10) + diffYears;
                const newDateKey = `${newYear}-${parts[1]}-${parts[2]}`;
                remappedSchedule[newDateKey] = ws.schedule[oldDateKey];
            });
            ws.schedule = remappedSchedule;

            // 重新映射月度里程碑中的年份
            if (Array.isArray(ws.milestones)) {
                ws.milestones.forEach(m => {
                    if (m.month) {
                        const mParts = m.month.split('-');
                        m.month = `${parseInt(mParts[0], 10) + diffYears}-${mParts[1]}`;
                    }
                });
            }
        }

        if (datesChanged) {
            if (strategy === 'reset') {
                ws.schedule = window.generateFullScheduleSkeleton(newStartDate, newExamDate, 'blank');
            } else if (strategy === 'shift') {
                const oldStartObj = new Date(ws.startDate + "T00:00:00");
                const newStartObj = new Date(newStartDate + "T00:00:00");
                const dayDiff = Math.round((newStartObj - oldStartObj) / (1000 * 60 * 60 * 24));

                const freshSkeleton = window.generateFullScheduleSkeleton(newStartDate, newExamDate, 'blank');
                Object.keys(ws.schedule).forEach(oldKey => {
                    const oldPlan = ws.schedule[oldKey];
                    if (oldPlan && (oldPlan.morning?.text || oldPlan.afternoon?.text || oldPlan.evening?.text || oldPlan.note)) {
                        const oldDate = new Date(oldKey + "T00:00:00");
                        oldDate.setDate(oldDate.getDate() + dayDiff);
                        const y = oldDate.getFullYear();
                        const m = String(oldDate.getMonth() + 1).padStart(2, '0');
                        const d = String(oldDate.getDate()).padStart(2, '0');
                        const targetKey = `${y}-${m}-${d}`;
                        if (freshSkeleton[targetKey]) {
                            freshSkeleton[targetKey].morning = oldPlan.morning;
                            freshSkeleton[targetKey].afternoon = oldPlan.afternoon;
                            freshSkeleton[targetKey].evening = oldPlan.evening;
                            freshSkeleton[targetKey].note = oldPlan.note;
                            freshSkeleton[targetKey].isRest = oldPlan.isRest;
                        }
                    }
                });
                ws.schedule = freshSkeleton;
            } else {
                // keep: 保留新范围内的原有排期，增补新日期
                const freshSkeleton = window.generateFullScheduleSkeleton(newStartDate, newExamDate, 'blank');
                Object.keys(freshSkeleton).forEach(k => {
                    if (ws.schedule[k]) {
                        freshSkeleton[k] = ws.schedule[k];
                    }
                });
                ws.schedule = freshSkeleton;
            }

            ws.startDate = newStartDate;
            ws.examDate = newExamDate;
            ws.endDate = newExamDate;
        }

        // 保存 AI 接入配置
        if (document.getElementById('settings-ai-provider')) {
            ws.aiConfig = {
                provider: document.getElementById('settings-ai-provider').value || 'openai',
                baseUrl: (document.getElementById('settings-ai-base-url').value || '').trim(),
                apiKey: (document.getElementById('settings-ai-api-key').value || '').trim(),
                model: (document.getElementById('settings-ai-model').value || '').trim()
            };
        }

        // 保存并同步当前状态
        saveWorkspaces();
        syncStateWithActiveWorkspace();
        state.monthFilter = 'all'; // 重置月份过滤器，防止停留在已被移除的月份
        if (state.preferences) state.preferences.monthFilter = 'all';
        saveWorkspaces();

        closeModal('modal-workspace-settings');
        renderAll();
        showToast("✓ 规划区设置已保存并生效！", "success", { undoSnapshot: snapshot });
    }

    function clearWorkspaceSchedule() {
        if (checkReadOnlyAndWarn()) return;
        if (!confirm("确认清空当前规划区的所有日程安排吗？此操作可通过撤回还原。")) return;
        const snapshot = takeWorkspaceSnapshot();
        state.schedule = window.generateFullScheduleSkeleton(state.startDate, state.examDate, 'blank');
        saveWorkspaces();
        closeModal('modal-workspace-settings');
        renderAll();
        showToast("已清空当前规划区的所有日程任务！", "warning", { undoSnapshot: snapshot });
    }

    function deleteCurrentWorkspace() {
        const wsIds = Object.keys(state.workspaces || {});
        if (wsIds.length === 0) return;

        const currentId = state.activeWorkspaceId;
        const currentWs = state.workspace;

        // 如果是样板规划区，名义删除即隐藏
        if (currentWs?.isSample || currentId === 'ws_sample_26') {
            if (!confirm(`确认关闭并移除样板规划区【${currentWs.name}】吗？\n\n（样板间数据将保留，随时可在新建规划区或初始页重新打开）`)) return;
            state.sampleHidden = true;
            delete state.workspaces[currentId];
            const remaining = Object.keys(state.workspaces);
            if (remaining.length > 0) {
                state.activeWorkspaceId = remaining[0];
            } else {
                state.activeWorkspaceId = null;
                state.workspace = null;
                state.schedule = {};
                state.subjects = {};
                state.taskPool = [];
                state.milestones = [];
            }
            saveWorkspaces();
            syncStateWithActiveWorkspace();
            closeModal('modal-workspace-settings');
            renderAll();
            showToast("样板规划区已关闭。随时点击新建或初始页可重新打开。", "info");
            return;
        }

        if (wsIds.length === 1) {
            if (!confirm(`⚠️ 警告：当前【${state.workspace?.name || '规划区'}】是唯一的考研规划区。\n\n删除后将移入回收站（7天内可随时恢复）并进入空白欢迎主页，确定要继续删除吗？`)) {
                return;
            }
            if (!state.trashWorkspaces) state.trashWorkspaces = {};
            state.trashWorkspaces[currentId] = {
                workspace: state.workspaces[currentId],
                deletedAt: new Date().toISOString()
            };
            state.workspaces = {};
            state.activeWorkspaceId = null;
            state.workspace = null;
            state.schedule = {};
            state.subjects = {};
            state.taskPool = [];
            state.milestones = [];
            saveWorkspaces();
            closeModal('modal-workspace-settings');
            renderAll();
            showToast("已将规划区移至回收站（7天内可随时恢复）", "info");
            return;
        }

        if (!confirm(`确认删除规划区【${state.workspace.name}】吗？\n\n已删除规划区将在回收站保留 7 天，期间可随时恢复。`)) return;

        if (!state.trashWorkspaces) state.trashWorkspaces = {};
        state.trashWorkspaces[currentId] = {
            workspace: state.workspaces[currentId],
            deletedAt: new Date().toISOString()
        };
        delete state.workspaces[currentId];
        state.activeWorkspaceId = Object.keys(state.workspaces)[0];

        saveWorkspaces();
        syncStateWithActiveWorkspace();
        closeModal('modal-workspace-settings');
        renderAll();
        showToast("已将规划区移至回收站（7天内可随时恢复）", "info");
    }

    // ==========================================================================
    // 事件监听初始化
    // ==========================================================================

    function initEventListeners() {
        // AI Key 显隐切换
        document.getElementById('btn-toggle-apikey-visibility')?.addEventListener('click', () => {
            const input = document.getElementById('settings-ai-api-key');
            const icon = document.getElementById('icon-toggle-apikey');
            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fa-regular fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fa-regular fa-eye';
                }
            }
        });

        // Tab 切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                if (targetTab === 'tab-timeline' && state.activeTab === 'tab-timeline') {
                    // 如果已经在每日日程规划页面，再次点击自动平滑滚动回最上方
                    const mainLayout = document.querySelector('.main-layout');
                    if (mainLayout) mainLayout.scrollTo({ top: 0, behavior: 'smooth' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                switchTab(targetTab);
                if (targetTab === 'tab-presets') renderPresetHub();
                if (targetTab === 'tab-subjects') renderAnalyticsDashboard();
            });
        });

        // 视图模式切换 (Table / Week / Month)
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode');
                setViewMode(mode, true);
            });
        });

        // 主题切换 (三态分段器)
        document.querySelectorAll('#theme-segmented-control .theme-seg-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const choice = btn.getAttribute('data-theme-choice');
                if (choice) {
                    setTheme(choice);
                    saveWorkspaces();
                    const textMap = { light: '已切换为保持浅色', system: '已切换为跟随系统', dark: '已切换为保持深色' };
                    showToast(textMap[choice] || '外观样式已更新');
                }
            });
        });

        // 打印排版视图
        document.getElementById('btn-print-view')?.addEventListener('click', () => {
            window.print();
        });

        // 规划区下拉与顶部三线菜单
        document.getElementById('btn-workspace-selector')?.addEventListener('click', (e) => {
            toggleWorkspaceDropdown(e);
        });

        document.getElementById('btn-titlebar-menu')?.addEventListener('click', (e) => {
            toggleTitlebarMenu(e);
        });

        document.getElementById('btn-top-settings')?.addEventListener('click', () => {
            closeTitlebarMenu();
            openWorkspaceSettingsModal();
        });

        document.getElementById('btn-open-workspace-settings')?.addEventListener('click', () => {
            closeWorkspaceDropdown();
            openWorkspaceSettingsModal();
        });

        document.getElementById('btn-new-workspace')?.addEventListener('click', () => {
            closeWorkspaceDropdown();
            openOnboardingWizard(false);
        });

        document.getElementById('btn-import-new-workspace')?.addEventListener('click', () => {
            closeWorkspaceDropdown();
            document.getElementById('input-import-new-ws-file')?.click();
        });

        // 统一在点击菜单项后收起菜单
        document.querySelectorAll('.menu-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                closeTitlebarMenu();
            });
        });

        // 点击页面其他位置关闭下拉
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#brand-workspace-wrapper')) {
                closeWorkspaceDropdown();
            }
            if (!e.target.closest('#titlebar-menu-wrapper')) {
                closeTitlebarMenu();
            }
        });

        // ==========================================================================
        // 全局弹窗退出调度中心 (左键点击背景、右键任意位置、ESC、X号退出)
        // ==========================================================================

        // 1. 左键点击遮罩背景退出弹窗 (仅限点击背景，点击窗口卡片内部不退出)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('modal-overlay') && e.target.classList.contains('active')) {
                requestCloseModal(e.target.id);
            }
        });

        // 2. 右键任意位置退出当前打开的弹窗 (窗口内外均可)
        document.addEventListener('contextmenu', (e) => {
            const activeModal = document.querySelector('.modal-overlay.active');
            if (activeModal) {
                e.preventDefault(); // 阻止浏览器原生右键菜单
                requestCloseModal(activeModal.id);
            }
        });

        // 3. ESC 键快捷退出当前打开的弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal-overlay.active');
                if (activeModal) {
                    requestCloseModal(activeModal.id);
                }
            }
        });

        // 4. 所有 X 号关闭按钮接入 requestCloseModal (带未保存修改检测与抖动)
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) {
                    requestCloseModal(modal.id);
                }
            });
        });

        // 历史过去日期复选框
        document.getElementById('chk-show-past-days')?.addEventListener('change', (e) => {
            if (!state.preferences) state.preferences = {};
            state.preferences.showPastDays = e.target.checked;
            saveWorkspaces();
            renderTimeline();
            showToast(e.target.checked ? '已开启显示过去历史日期' : '已折叠隐藏过去的日期');
        });

        // 检查更新按钮
        document.getElementById('btn-check-app-update')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-check-app-update');
            if (!btn) return;
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 检查中...';
            btn.disabled = true;

            try {
                if (window.electronAPI && window.electronAPI.checkForUpdates) {
                    const updateInfo = await window.electronAPI.checkForUpdates();
                    if (updateInfo && updateInfo.hasUpdate) {
                        showToast(`🚀 发现新版本 v${updateInfo.latestVersion}！已在右上角显示下载按钮`, 'info');
                    } else {
                        showToast('当前已是最新版本 KaoyanFlow v1.0.0！', 'success');
                    }
                } else {
                    showToast('当前已是最新版本 KaoyanFlow v1.0.0！', 'success');
                }
            } catch (err) {
                showToast('检查更新完成，当前已是最新版本', 'info');
            } finally {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        });

        // 搜索输入
        document.getElementById('input-timeline-search')?.addEventListener('input', (e) => {
            state.searchKeyword = e.target.value.trim();
            renderTimeline();
        });

        // 下拉筛选
        document.getElementById('select-day-filter')?.addEventListener('change', (e) => {
            state.dayTypeFilter = e.target.value;
            renderTimeline();
        });

        document.getElementById('select-subject-filter')?.addEventListener('change', (e) => {
            state.subjectFilter = e.target.value;
            renderTimeline();
        });

        // 休息日切换学习日选择弹窗
        document.getElementById('btn-close-rest-to-study')?.addEventListener('click', () => closeModal('modal-rest-to-study'));
        document.getElementById('btn-cancel-rest-to-study')?.addEventListener('click', () => closeModal('modal-rest-to-study'));
        document.getElementById('btn-confirm-rest-to-study')?.addEventListener('click', confirmRestToStudy);

        document.querySelectorAll('input[name="r2s-choice"]').forEach(r => {
            r.addEventListener('change', (e) => {
                const scopeGroup = document.getElementById('r2s-scope-group');
                if (scopeGroup) {
                    scopeGroup.style.display = (e.target.value === 'forward') ? 'block' : 'none';
                }
            });
        });

        // 学习日切换休息日选择弹窗
        document.getElementById('btn-close-study-to-rest')?.addEventListener('click', () => closeModal('modal-study-to-rest'));
        document.getElementById('btn-cancel-study-to-rest')?.addEventListener('click', () => closeModal('modal-study-to-rest'));
        document.getElementById('btn-confirm-study-to-rest')?.addEventListener('click', confirmStudyToRest);

        document.querySelectorAll('input[name="s2r-choice"]').forEach(r => {
            r.addEventListener('change', (e) => {
                const scopeGroup = document.getElementById('s2r-scope-group');
                if (scopeGroup) {
                    scopeGroup.style.display = (e.target.value === 'shift') ? 'block' : 'none';
                }
            });
        });

        // 溢出警告一键向前排期
        document.getElementById('btn-quick-fix-overflow')?.addEventListener('click', quickFixOverflow);

        // 顺延弹窗
        document.getElementById('btn-smart-shift')?.addEventListener('click', () => {
            window.openShiftModalFrom(state.startDate || "2026-08-16");
        });
        document.getElementById('btn-close-shift')?.addEventListener('click', () => closeModal('modal-shift'));
        document.getElementById('btn-cancel-shift')?.addEventListener('click', () => closeModal('modal-shift'));
        document.getElementById('btn-confirm-shift')?.addEventListener('click', executeSmartShift);

        document.getElementById('shift-from-date')?.addEventListener('change', updateShiftPreview);
        document.getElementById('shift-skip-rest')?.addEventListener('change', updateShiftPreview);
        document.querySelectorAll('input[name="shift-scope"]').forEach(r => {
            r.addEventListener('change', updateShiftPreview);
        });
        document.getElementById('btn-shift-dec')?.addEventListener('click', () => {
            const el = document.getElementById('shift-days-count');
            el.value = Math.max(1, (parseInt(el.value, 10) || 1) - 1);
            updateShiftPreview();
        });
        document.getElementById('btn-shift-inc')?.addEventListener('click', () => {
            const el = document.getElementById('shift-days-count');
            el.value = Math.min(14, (parseInt(el.value, 10) || 1) + 1);
            updateShiftPreview();
        });

        // 批量规律排期向导弹窗
        document.getElementById('btn-batch-fill')?.addEventListener('click', () => {
            // Update min and max on inputs
            const sInput = document.getElementById('batch-start-date');
            const eInput = document.getElementById('batch-end-date');
            if (sInput && eInput) {
                sInput.min = state.startDate;
                sInput.max = state.examDate;
                sInput.value = state.startDate;
                eInput.min = state.startDate;
                eInput.max = state.examDate;
                eInput.value = state.examDate;
            }
            openModal('modal-batch-fill');
        });
        document.getElementById('btn-close-batch')?.addEventListener('click', () => closeModal('modal-batch-fill'));
        document.getElementById('btn-cancel-batch')?.addEventListener('click', () => closeModal('modal-batch-fill'));
        document.getElementById('btn-confirm-batch')?.addEventListener('click', executeBatchFill);

        // 底部目标分数与模态窗交互
        document.getElementById('btn-status-target-score')?.addEventListener('click', openTargetScoreModal);
        document.getElementById('btn-close-target-score')?.addEventListener('click', () => closeModal('modal-target-score'));
        document.getElementById('btn-cancel-target-score')?.addEventListener('click', () => closeModal('modal-target-score'));
        document.getElementById('btn-save-target-score')?.addEventListener('click', saveTargetScoreFromModal);
        document.getElementById('btn-clear-target-score')?.addEventListener('click', clearTargetScoreFromModal);

        // 全屏沉浸式分步向导交互
        document.getElementById('btn-exit-onboarding')?.addEventListener('click', closeOnboardingWizard);
        document.getElementById('btn-onb-next')?.addEventListener('click', handleOnboardingNext);
        document.getElementById('btn-onb-prev')?.addEventListener('click', handleOnboardingPrev);
        document.getElementById('btn-onb-skip')?.addEventListener('click', handleOnboardingSkip);

        // 学科管理模态窗
        document.getElementById('btn-open-manage-subjects')?.addEventListener('click', openManageSubjectsModal);
        document.getElementById('btn-close-manage-subjects')?.addEventListener('click', () => closeModal('modal-manage-subjects'));
        document.getElementById('btn-cancel-manage-subjects')?.addEventListener('click', () => closeModal('modal-manage-subjects'));
        document.getElementById('btn-save-manage-subjects')?.addEventListener('click', saveManageSubjectsFromModal);
        document.getElementById('btn-add-major-subject')?.addEventListener('click', () => {
            if (typeof window.addMajorSubjectInModal === 'function') window.addMajorSubjectInModal();
        });

        // 规划区全局设置面板弹窗
        document.getElementById('btn-close-settings')?.addEventListener('click', () => closeModal('modal-workspace-settings'));
        document.getElementById('btn-cancel-settings')?.addEventListener('click', () => closeModal('modal-workspace-settings'));
        document.getElementById('btn-save-settings')?.addEventListener('click', saveWorkspaceSettings);
        document.getElementById('btn-save-workspace-settings')?.addEventListener('click', saveWorkspaceSettings);
        document.getElementById('btn-clear-schedule')?.addEventListener('click', clearWorkspaceSchedule);
        document.getElementById('btn-delete-current-workspace')?.addEventListener('click', deleteCurrentWorkspace);
        document.getElementById('btn-settings-clear-schedule')?.addEventListener('click', clearWorkspaceSchedule);
        document.getElementById('btn-settings-delete-workspace')?.addEventListener('click', deleteCurrentWorkspace);
        document.getElementById('settings-target-year')?.addEventListener('change', (e) => {
            const tYear = parseInt(e.target.value, 10) || 27;
            syncSettingsDatesForYear(tYear);
            const exYear = 2000 + tYear - 1;
            const earliestStartYear = exYear - 1;
            const sInput = document.getElementById('settings-start-date');
            const eInput = document.getElementById('settings-exam-date');
            if (sInput) {
                if (!sInput.value || sInput.value < `${earliestStartYear}-01-01`) {
                    sInput.value = `${earliestStartYear}-08-16`;
                }
            }
            if (eInput) {
                eInput.value = `${exYear}-12-20`;
            }
        });

        document.querySelectorAll('.settings-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const paneId = btn.getAttribute('data-pane');
                switchSettingsPane(paneId);
            });
        });

        document.getElementById('btn-settings-export-json')?.addEventListener('click', () => {
            const jsonStr = JSON.stringify(state.workspace, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${state.workspace.name}_${getTodayDateStr()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("本规划区备份已下载！", "success");
        });

        document.getElementById('btn-settings-import-json')?.addEventListener('click', () => {
            closeModal('modal-workspace-settings');
            document.getElementById('btn-import-json')?.click();
        });

        // 导出/备份弹窗
        document.getElementById('btn-export-json')?.addEventListener('click', () => {
            document.getElementById('export-section').style.display = 'block';
            document.getElementById('import-section').style.display = 'none';
            document.getElementById('btn-confirm-import').style.display = 'none';
            document.getElementById('backup-modal-title').textContent = '备份复习规划数据';

            const jsonStr = JSON.stringify({
                activeWorkspaceId: state.activeWorkspaceId,
                workspaces: state.workspaces,
                exportedAt: new Date().toISOString()
            }, null, 2);

            document.getElementById('export-json-text').value = jsonStr;
            openModal('modal-backup');
        });

        document.getElementById('btn-download-json-file')?.addEventListener('click', () => {
            const jsonStr = document.getElementById('export-json-text').value;
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kaoyan_planner_all_workspaces_${getTodayDateStr()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("完整备份文件已下载！", "success");
        });

        // 导入弹窗
        document.getElementById('btn-import-json')?.addEventListener('click', () => {
            document.getElementById('export-section').style.display = 'none';
            document.getElementById('import-section').style.display = 'block';
            document.getElementById('btn-confirm-import').style.display = 'inline-flex';
            document.getElementById('backup-modal-title').textContent = '恢复复习规划数据';
            document.getElementById('import-json-text').value = '';
            openModal('modal-backup');
        });

        document.getElementById('btn-browse-file')?.addEventListener('click', () => {
            document.getElementById('input-import-file').click();
        });

        document.getElementById('input-import-file')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('import-json-text').value = event.target.result;
                    showToast("已成功读取 JSON 文件！");
                };
                reader.readAsText(file);
            }
        });

        // 确认覆盖导入当前规划区
        document.getElementById('btn-confirm-import')?.addEventListener('click', () => {
            const raw = document.getElementById('import-json-text').value.trim();
            if (!raw) {
                showToast("请粘贴或选择 JSON 备份文件！", "error");
                return;
            }

            // 弹出强警示二次确认
            const ok = confirm("⚠️ 覆盖警告：\n\n导入其他数据将彻底覆盖当前规划区的所有日程安排、学科架构与题库预设！\n\n确定要继续覆盖当前规划区吗？\n（若需保留现有规划区，请取消并选择「导入规划数据作为新规划区」）");
            if (!ok) return;

            try {
                const parsed = JSON.parse(raw);
                if (parsed.workspaces) {
                    // Full workspace backup
                    state.workspaces = parsed.workspaces;
                    state.activeWorkspaceId = parsed.activeWorkspaceId || Object.keys(parsed.workspaces)[0];
                } else if (parsed.schedule) {
                    // Single workspace backup
                    if (state.workspace) {
                        state.workspace.schedule = parsed.schedule;
                        if (parsed.subjects) state.workspace.subjects = parsed.subjects;
                        if (parsed.taskPool) state.workspace.taskPool = parsed.taskPool;
                        if (parsed.milestones) state.workspace.milestones = parsed.milestones;
                        if (parsed.taxonomy) state.workspace.taxonomy = parsed.taxonomy;
                    }
                } else {
                    throw new Error("缺少有效数据字段");
                }
                saveWorkspaces();
                syncStateWithActiveWorkspace();
                closeModal('modal-backup');
                renderAll();
                showToast("🎉 数据已成功恢复并覆盖！", "success");
            } catch (err) {
                showToast("JSON 格式错误或不完整，请核对后重试！", "error");
            }
        });

        document.getElementById('btn-close-backup')?.addEventListener('click', () => closeModal('modal-backup'));
        document.getElementById('btn-cancel-backup')?.addEventListener('click', () => closeModal('modal-backup'));

        // ==========================================================================
        // 导入规划数据作为新规划区 (Import as New Workspace Workflow)
        // ==========================================================================
        let pendingImportNewWsData = null;

        document.getElementById('input-import-new-ws-file')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const raw = event.target.result;
                    const parsed = JSON.parse(raw);
                    let targetWs = null;

                    if (parsed.workspaces && typeof parsed.workspaces === 'object') {
                        // 完整多规划区备份：取 activeWorkspaceId 或首个规划区
                        const wsKeys = Object.keys(parsed.workspaces);
                        if (wsKeys.length > 0) {
                            const activeKey = (parsed.activeWorkspaceId && parsed.workspaces[parsed.activeWorkspaceId]) ? parsed.activeWorkspaceId : wsKeys[0];
                            targetWs = JSON.parse(JSON.stringify(parsed.workspaces[activeKey]));
                        }
                    } else if (parsed.schedule && typeof parsed.schedule === 'object') {
                        // 单规划区备份
                        targetWs = JSON.parse(JSON.stringify(parsed));
                    }

                    if (!targetWs || !targetWs.schedule) {
                        showToast("未能从文件中解析出有效的考研日程数据！", "error");
                        return;
                    }

                    pendingImportNewWsData = targetWs;

                    // 计算数据概览
                    const scheduleDays = Object.keys(targetWs.schedule || {}).length;
                    const subjectsCount = Object.keys(targetWs.subjects || {}).length;
                    const milestonesCount = (targetWs.milestones || []).length;
                    const startDate = targetWs.startDate || '2026-08-16';
                    const examDate = targetWs.examDate || '2026-12-20';

                    // 自动生成不重名的建议名称
                    let suggestedName = targetWs.name || '导入的考研规划区';
                    const existingNames = Object.values(state.workspaces).map(w => (w.name || '').trim());
                    if (existingNames.includes(suggestedName)) {
                        suggestedName = `${suggestedName} (导入)`;
                        let counter = 2;
                        while (existingNames.includes(suggestedName)) {
                            suggestedName = `${targetWs.name || '导入的考研规划区'} (导入${counter})`;
                            counter++;
                        }
                    }

                    // 预填充导入弹窗
                    const nameInput = document.getElementById('input-import-new-ws-name');
                    const userInput = document.getElementById('input-import-new-ws-user');
                    const startInput = document.getElementById('input-import-new-ws-start');
                    const examInput = document.getElementById('input-import-new-ws-exam');
                    const detailsBox = document.getElementById('import-new-ws-details');

                    if (nameInput) nameInput.value = suggestedName;
                    if (userInput) userInput.value = targetWs.userName || '考研人';
                    if (startInput) startInput.value = startDate;
                    if (examInput) examInput.value = examDate;
                    if (detailsBox) {
                        detailsBox.innerHTML = `📅 包含 <strong>${scheduleDays} 天</strong>备考日程，<strong>${subjectsCount} 门</strong>学科架构，<strong>${milestonesCount} 个</strong>战略里程碑`;
                    }

                    openModal('modal-import-new-workspace');
                } catch (err) {
                    console.error('[Import as New Workspace] 解析失败:', err);
                    showToast("JSON 文件解析失败，请检查文件格式是否有效！", "error");
                } finally {
                    e.target.value = '';
                }
            };
            reader.readAsText(file);
        });

        // 确认创建并切换新导入的规划区
        document.getElementById('btn-confirm-import-new-ws')?.addEventListener('click', () => {
            const nameInput = document.getElementById('input-import-new-ws-name');
            const userInput = document.getElementById('input-import-new-ws-user');
            const rawName = nameInput ? nameInput.value.trim() : '';
            const rawUser = userInput ? userInput.value.trim() : '';

            if (!rawName) {
                showToast("规划区名称不能为空，请输入规划区名称！", "error");
                nameInput?.focus();
                return;
            }

            // 严格校验是否与现有规划区重名
            const isDuplicate = Object.values(state.workspaces).some(w => (w.name || '').trim().toLowerCase() === rawName.toLowerCase());
            if (isDuplicate) {
                alert(`⚠️ 规划区名称【${rawName}】已存在！\n\n为了避免混淆，请更换一个不同的规划区名称。`);
                nameInput?.focus();
                nameInput?.select();
                return;
            }

            if (!pendingImportNewWsData) {
                showToast("数据丢失，请重新选择备份文件导入！", "error");
                return;
            }

            // 生成全新的独立规划区实例
            const newWsId = `ws_${Date.now()}`;
            const newWorkspace = {
                ...pendingImportNewWsData,
                id: newWsId,
                name: rawName,
                userName: rawUser || '考研人',
                updatedAt: new Date().toISOString()
            };

            // 注册并切换至新规划区
            state.workspaces[newWsId] = newWorkspace;
            state.activeWorkspaceId = newWsId;

            saveWorkspaces();
            syncStateWithActiveWorkspace();
            closeModal('modal-import-new-workspace');
            renderAll();

            showToast(`🎉 已成功创建并切换至新规划区【${rawName}】！`, "success");
            pendingImportNewWsData = null;
        });

        document.getElementById('btn-close-import-new-ws')?.addEventListener('click', () => closeModal('modal-import-new-workspace'));
        document.getElementById('btn-cancel-import-new-ws')?.addEventListener('click', () => closeModal('modal-import-new-workspace'));

        // 绑定日期输入重置错误状态事件
        const sInOnb = document.getElementById('onboarding-start-date');
        const sHintOnb = document.getElementById('onboarding-start-hint');
        sInOnb?.addEventListener('input', () => clearDateInputError(sInOnb, sHintOnb, '支持提前至前一年开始准备'));

        const eInOnb = document.getElementById('onboarding-exam-date');
        const eHintOnb = document.getElementById('onboarding-exam-hint');
        eInOnb?.addEventListener('input', () => clearDateInputError(eInOnb, eHintOnb, '教育部公布具体日期后可在设置中更改'));

        const sInSet = document.getElementById('settings-start-date');
        const sHintSet = document.getElementById('settings-start-hint');
        sInSet?.addEventListener('input', () => clearDateInputError(sInSet, sHintSet, '修改起始日将按所选策略重新安排排期'));

        const eInSet = document.getElementById('settings-exam-date');
        const eHintSet = document.getElementById('settings-exam-hint');
        eInSet?.addEventListener('input', () => clearDateInputError(eInSet, eHintSet, '考研初试通常在 12 月倒数第一或第二个周末'));

        // 开始创建我的第一个规划区（空白主页点击）
        document.getElementById('btn-create-first-workspace')?.addEventListener('click', () => {
            openOnboardingWizard(true);
        });

        // 打开样板规划区（空白主页点击 & 向导底栏点击）
        document.getElementById('btn-open-sample-workspace')?.addEventListener('click', () => {
            openSampleWorkspace();
        });
        document.getElementById('btn-onb-open-sample')?.addEventListener('click', () => {
            openSampleWorkspace();
        });

        // 回收站弹窗交互
        document.getElementById('btn-open-trash-bin')?.addEventListener('click', () => {
            openTrashBinModal();
        });
        document.getElementById('btn-close-trash-bin')?.addEventListener('click', () => {
            closeModal('modal-trash-bin');
        });
        document.getElementById('btn-close-trash-bin-footer')?.addEventListener('click', () => {
            closeModal('modal-trash-bin');
        });
        document.getElementById('btn-clear-trash-bin')?.addEventListener('click', () => {
            clearAllTrash();
        });

        // ESC 关闭弹窗
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
                closeWorkspaceDropdown();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

})();
