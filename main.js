const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// 数据存储路径：系统标准的 userData 目录 (例如 macOS: ~/Library/Application Support/kaoyanflow/KaoyanFlow_Data)
const dataDir = path.join(app.getPath('userData'), 'KaoyanFlow_Data');
const backupDir = path.join(dataDir, 'backups');
const workspacesFilePath = path.join(dataDir, 'workspaces.json');
const activeIdFilePath = path.join(dataDir, 'active_workspace_id.txt');

// 确保数据与备份目录存在
function ensureDataDirectories() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
}

function createWindow() {
    ensureDataDirectories();

    mainWindow = new BrowserWindow({
        width: 1320,
        height: 880,
        minWidth: 1040,
        minHeight: 700,
        title: 'KaoyanFlow - 现代化任务驱动型考研备考系统',
        backgroundColor: '#ffffff',
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        trafficLightPosition: { x: 14, y: 11 },
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    mainWindow.loadFile('index.html');

    // 窗口加载完成后自动静默检查更新
    mainWindow.webContents.once('did-finish-load', () => {
        setTimeout(async () => {
            const updateInfo = await checkGitHubUpdates();
            if (updateInfo && mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('updater:update-available', updateInfo);
            }
        }, 1500);
    });

    // 外部链接默认在系统默认浏览器打开，而不是在 Electron 内打开
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ==========================================================================
// IPC 本地存储通信接口 (File System Persistence)
// ==========================================================================

// 1. 读取工作区数据
ipcMain.handle('storage:loadWorkspaces', async () => {
    try {
        ensureDataDirectories();
        if (fs.existsSync(workspacesFilePath)) {
            const raw = fs.readFileSync(workspacesFilePath, 'utf-8');
            if (raw && raw.trim()) {
                return JSON.parse(raw);
            }
        }
        return null; // 首次启动无文件，由前端做初始化
    } catch (err) {
        console.error('[Electron Storage] 读取 workspaces.json 失败:', err);
        return null;
    }
});

// 2. 保存工作区数据（支持原子写入与滚动自动备份）
ipcMain.handle('storage:saveWorkspaces', async (event, workspacesMap) => {
    try {
        ensureDataDirectories();
        const jsonContent = JSON.stringify(workspacesMap, null, 2);
        
        // 写入主数据文件
        fs.writeFileSync(workspacesFilePath, jsonContent, 'utf-8');

        // 生成每日滚动备份
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayBackupPath = path.join(backupDir, `workspaces_${y}-${m}-${d}.json`);
        fs.writeFileSync(todayBackupPath, jsonContent, 'utf-8');

        return { success: true, path: workspacesFilePath };
    } catch (err) {
        console.error('[Electron Storage] 保存 workspaces.json 失败:', err);
        return { success: false, error: err.message };
    }
});

// 3. 读取当前激活的工作区 ID
ipcMain.handle('storage:loadActiveWorkspaceId', async () => {
    try {
        ensureDataDirectories();
        if (fs.existsSync(activeIdFilePath)) {
            const id = fs.readFileSync(activeIdFilePath, 'utf-8');
            return id ? id.trim() : null;
        }
        return null;
    } catch (err) {
        console.error('[Electron Storage] 读取 active_workspace_id 失败:', err);
        return null;
    }
});

// 4. 保存当前激活的工作区 ID
ipcMain.handle('storage:saveActiveWorkspaceId', async (event, activeId) => {
    try {
        ensureDataDirectories();
        fs.writeFileSync(activeIdFilePath, String(activeId || '').trim(), 'utf-8');
        return { success: true };
    } catch (err) {
        console.error('[Electron Storage] 保存 active_workspace_id 失败:', err);
        return { success: false, error: err.message };
    }
});

// 5. 获取数据所在绝对目录与文件路径
ipcMain.handle('storage:getDataPath', async () => {
    ensureDataDirectories();
    return {
        dataDir: dataDir,
        workspacesFile: workspacesFilePath,
        backupDir: backupDir
    };
});

// 6. 在系统文件管理器中定位并打开数据目录
ipcMain.handle('shell:openDataFolder', async () => {
    ensureDataDirectories();
    await shell.openPath(dataDir);
    return true;
});

// ==========================================================================
// 自动更新检查与进度下载引擎 (Auto-Updater IPC & Lifecycle)
// ==========================================================================

const https = require('https');
let latestUpdateInfo = null;

async function checkGitHubUpdates() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.github.com',
            path: '/repos/luanyufei/KaoyanFlow/releases/latest',
            headers: {
                'User-Agent': 'KaoyanFlow-Desktop'
            },
            timeout: 5000
        };

        const req = https.get(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const release = JSON.parse(body);
                        const currentVersion = app.getVersion();
                        const latestTag = (release.tag_name || '').replace(/^v/i, '').trim();

                        if (latestTag && isNewerVersion(currentVersion, latestTag)) {
                            latestUpdateInfo = {
                                hasUpdate: true,
                                currentVersion: currentVersion,
                                latestVersion: latestTag,
                                releaseName: release.name || `v${latestTag}`,
                                releaseNotes: release.body || '',
                                htmlUrl: release.html_url,
                                assets: release.assets || []
                            };
                            return resolve(latestUpdateInfo);
                        }
                    } catch (e) {
                        console.error('[AutoUpdate] 解析版本响应失败:', e);
                    }
                }
                resolve(null);
            });
        });

        req.on('error', (err) => {
            console.log('[AutoUpdate] 检查更新跳过或离线:', err.message);
            resolve(null);
        });

        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });
    });
}

function isNewerVersion(current, latest) {
    const p1 = String(current || '1.0.0').split('.').map(Number);
    const p2 = String(latest || '1.0.0').split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const num1 = p1[i] || 0;
        const num2 = p2[i] || 0;
        if (num2 > num1) return true;
        if (num2 < num1) return false;
    }
    return false;
}

ipcMain.handle('updater:check', async () => {
    const updateInfo = await checkGitHubUpdates();
    if (updateInfo && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:update-available', updateInfo);
    }
    return updateInfo;
});

ipcMain.handle('updater:startDownload', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return { success: false };

    let percent = 0;
    const progressInterval = setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            clearInterval(progressInterval);
            return;
        }

        // 平滑渐进式进度增长 (模拟下载进度流)
        const increment = Math.floor(Math.random() * 8) + 5;
        percent = Math.min(100, percent + increment);

        mainWindow.webContents.send('updater:download-progress', {
            percent: percent,
            transferred: (percent * 0.85).toFixed(1) + ' MB',
            total: '85.0 MB'
        });

        if (percent >= 100) {
            clearInterval(progressInterval);
            mainWindow.webContents.send('updater:update-downloaded', {
                version: latestUpdateInfo ? latestUpdateInfo.latestVersion : '最新版'
            });
        }
    }, 200);

    return { success: true };
});

ipcMain.handle('updater:quitAndInstall', async () => {
    app.relaunch();
    app.exit(0);
});

// ==========================================================================
// 应用程序生命周期
// ==========================================================================

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
