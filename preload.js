const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform,
    loadWorkspaces: () => ipcRenderer.invoke('storage:loadWorkspaces'),
    saveWorkspaces: (data) => ipcRenderer.invoke('storage:saveWorkspaces', data),
    loadActiveWorkspaceId: () => ipcRenderer.invoke('storage:loadActiveWorkspaceId'),
    saveActiveWorkspaceId: (id) => ipcRenderer.invoke('storage:saveActiveWorkspaceId', id),
    getDataPath: () => ipcRenderer.invoke('storage:getDataPath'),
    openDataFolder: () => ipcRenderer.invoke('shell:openDataFolder'),
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    updateTitleBarOverlay: (options) => ipcRenderer.invoke('window:updateTitleBarOverlay', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
    getAutoStart: () => ipcRenderer.invoke('system:getAutoStart'),
    setAutoStart: (enable) => ipcRenderer.invoke('system:setAutoStart', enable),
    
    // Auto Updater API
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    startDownloadUpdate: () => ipcRenderer.invoke('updater:startDownload'),
    quitAndInstallUpdate: () => ipcRenderer.invoke('updater:quitAndInstall'),
    onUpdateAvailable: (callback) => ipcRenderer.on('updater:update-available', (_event, info) => callback(info)),
    onDownloadProgress: (callback) => ipcRenderer.on('updater:download-progress', (_event, progress) => callback(progress)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('updater:update-downloaded', (_event, info) => callback(info))
});
