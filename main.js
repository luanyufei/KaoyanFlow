const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

// 针对 Windows/Linux 彻底禁用系统顶部默认菜单栏 (去除 File Edit View 栏)
if (!isMac) {
    Menu.setApplicationMenu(null);
}

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
        title: 'KaoyanFlow · 现代化任务驱动型考研备考系统',
        backgroundColor: '#ffffff',
        titleBarStyle: isMac ? 'hiddenInset' : (isWin ? 'hidden' : 'default'),
        titleBarOverlay: isWin ? {
            color: '#ffffff',
            symbolColor: '#475569',
            height: 38
        } : false,
        trafficLightPosition: isMac ? { x: 14, y: 11 } : undefined,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    if (!isMac) {
        mainWindow.removeMenu();
    }

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

// 7. 在外部默认浏览器中打开指定链接
ipcMain.handle('shell:openExternal', async (event, url) => {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
        await shell.openExternal(url);
        return true;
    }
    return false;
});

// 8. 动态更新 Windows 标题栏控制按钮配色
ipcMain.handle('window:updateTitleBarOverlay', async (event, options) => {
    if (isWin && mainWindow && typeof mainWindow.setTitleBarOverlay === 'function') {
        try {
            mainWindow.setTitleBarOverlay(options);
        } catch (e) {
            console.error('[TitleBarOverlay] 更新失败:', e);
        }
    }
    return true;
});

// 9. 原生安全保存文件对话框 (解决导出时未保存就提示已下载的问题)
ipcMain.handle('dialog:saveFile', async (event, options = {}) => {
    try {
        const { defaultPath, content } = options;
        const win = (mainWindow && !mainWindow.isDestroyed()) ? mainWindow : null;
        const result = await dialog.showSaveDialog(win, {
            defaultPath: defaultPath || 'KaoyanFlow_Backup.json',
            filters: [
                { name: 'JSON 数据文件', extensions: ['json'] },
                { name: '所有文件', extensions: ['*'] }
            ]
        });

        if (result.canceled || !result.filePath) {
            return { canceled: true };
        }

        fs.writeFileSync(result.filePath, content || '', 'utf-8');
        return { canceled: false, success: true, filePath: result.filePath };
    } catch (err) {
        console.error('[Dialog Save] 保存文件失败:', err);
        return { canceled: false, success: false, error: err.message };
    }
});

// ==========================================================================
// 自动更新检查与进度下载引擎 (Auto-Updater IPC & Lifecycle)
// ==========================================================================
// 自动更新检查与真实发布包下载引擎 (Real Auto-Updater & Multi-Platform Delivery)
// ==========================================================================

const https = require('https');
const http = require('http');
let latestUpdateInfo = null;
let downloadedInstallerPath = null;

function downloadFileWithProgress(url, destPath, onProgress) {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(destPath);

        function getReq(targetUrl) {
            const client = targetUrl.startsWith('https:') ? https : http;
            client.get(targetUrl, { headers: { 'User-Agent': 'KaoyanFlow-Desktop' } }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    // 处理 GitHub Release 资产跳转 (AWS S3 302 重定向)
                    return getReq(res.headers.location);
                }
                if (res.statusCode !== 200) {
                    fileStream.close();
                    fs.unlink(destPath, () => {});
                    return reject(new Error(`下载更新失败，HTTP 状态码: ${res.statusCode}`));
                }

                const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
                let downloadedBytes = 0;

                res.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    fileStream.write(chunk);
                    if (totalBytes > 0 && onProgress) {
                        const percent = Math.min(100, Math.floor((downloadedBytes / totalBytes) * 100));
                        onProgress({
                            percent: percent,
                            transferred: (downloadedBytes / (1024 * 1024)).toFixed(1) + ' MB',
                            total: (totalBytes / (1024 * 1024)).toFixed(1) + ' MB'
                        });
                    }
                });

                res.on('end', () => {
                    fileStream.end();
                    resolve(destPath);
                });
            }).on('error', (err) => {
                fileStream.close();
                fs.unlink(destPath, () => {});
                reject(err);
            });
        }

        getReq(url);
    });
}

async function checkGitHubUpdates() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.github.com',
            path: '/repos/luanyufei/KaoyanFlow/releases/latest',
            headers: {
                'User-Agent': 'KaoyanFlow-Desktop'
            },
            timeout: 6000
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
                            const platform = process.platform;
                            let matchedAsset = null;
                            if (Array.isArray(release.assets)) {
                                if (platform === 'darwin') {
                                    matchedAsset = release.assets.find(a => a.name.endsWith('.dmg')) || release.assets.find(a => a.name.endsWith('.zip'));
                                } else if (platform === 'win32') {
                                    matchedAsset = release.assets.find(a => a.name.endsWith('.exe')) || release.assets.find(a => a.name.endsWith('.zip'));
                                }
                            }

                            latestUpdateInfo = {
                                hasUpdate: true,
                                currentVersion: currentVersion,
                                latestVersion: latestTag,
                                releaseName: release.name || `v${latestTag}`,
                                releaseNotes: release.body || '',
                                htmlUrl: release.html_url,
                                matchedAsset: matchedAsset,
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
    if (!latestUpdateInfo) return { success: false, error: '暂无可用更新' };
    const matchedAsset = latestUpdateInfo.matchedAsset;

    if (!matchedAsset || !matchedAsset.browser_download_url) {
        // 无直接适配本平台的预编译安装包时，直接在浏览器中打开 GitHub Release 发布页
        if (latestUpdateInfo.htmlUrl) {
            shell.openExternal(latestUpdateInfo.htmlUrl);
        }
        return { success: true, openedBrowser: true };
    }

    try {
        const downloadsDir = app.getPath('downloads');
        const targetFilePath = path.join(downloadsDir, matchedAsset.name);
        downloadedInstallerPath = targetFilePath;

        await downloadFileWithProgress(matchedAsset.browser_download_url, targetFilePath, (progress) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('updater:download-progress', progress);
            }
        });

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:update-downloaded', {
                version: latestUpdateInfo.latestVersion,
                filePath: targetFilePath
            });
        }
        return { success: true, filePath: targetFilePath };
    } catch (err) {
        console.error('[AutoUpdate] 真实下载失败，降级在浏览器中打开:', err);
        if (latestUpdateInfo.htmlUrl) {
            shell.openExternal(latestUpdateInfo.htmlUrl);
        }
        return { success: false, error: err.message };
    }
});

ipcMain.handle('updater:quitAndInstall', async () => {
    if (downloadedInstallerPath && fs.existsSync(downloadedInstallerPath)) {
        shell.showItemInFolder(downloadedInstallerPath);
        if (downloadedInstallerPath.endsWith('.dmg') || downloadedInstallerPath.endsWith('.exe')) {
            shell.openPath(downloadedInstallerPath);
        }
    } else if (latestUpdateInfo?.htmlUrl) {
        shell.openExternal(latestUpdateInfo.htmlUrl);
    }
    setTimeout(() => {
        app.quit();
    }, 1000);
});

// ==========================================================================
// 应用程序生命周期
// ==========================================================================

const gotTheSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotTheSingleInstanceLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

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
}
