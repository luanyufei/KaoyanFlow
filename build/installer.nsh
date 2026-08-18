# ==============================================================================
# KaoyanFlow Windows 安装与卸载全生命周期守护脚本 (NSIS Guard Script)
# ==============================================================================
# APP_GUID: 8a70fe13-bd97-5684-8d5d-4db04e749cd8
# INSTALL_REGISTRY_KEY: Software\8a70fe13-bd97-5684-8d5d-4db04e749cd8
# UNINSTALL_REGISTRY_KEY: Software\Microsoft\Windows\CurrentVersion\Uninstall\8a70fe13-bd97-5684-8d5d-4db04e749cd8

# 1. 安装初始化前阶段 (preInit)
# 在 NSIS 读取注册表之前，先主动清理旧版所有残留
!macro preInit
  # 强杀所有残留进程
  nsExec::Exec 'cmd.exe /c "taskkill /f /im KaoyanFlow.exe /t >nul 2>&1"'
  nsExec::Exec 'cmd.exe /c "taskkill /f /im kaoyanflow.exe /t >nul 2>&1"'

  # 清除旧版安装注册表（HKCU + HKLM，覆盖 per-user 与 per-machine 两种模式）
  DeleteRegKey HKCU "Software\8a70fe13-bd97-5684-8d5d-4db04e749cd8"
  DeleteRegKey HKLM "Software\8a70fe13-bd97-5684-8d5d-4db04e749cd8"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\8a70fe13-bd97-5684-8d5d-4db04e749cd8"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\8a70fe13-bd97-5684-8d5d-4db04e749cd8"

  # 删除旧版 per-user 安装目录残留（v1.0.0 使用 perMachine:false 时的路径）
  RMDir /r "$LOCALAPPDATA\Programs\kaoyanflow"
  RMDir /r "$LOCALAPPDATA\Programs\KaoyanFlow"
  RMDir /r "$LOCALAPPDATA\kaoyanflow"
  RMDir /r "$LOCALAPPDATA\KaoyanFlow"
!macroend

# 2. 安装向导初始化阶段 (customInit)
!macro customInit
  nsExec::Exec 'cmd.exe /c "taskkill /f /im KaoyanFlow.exe /t >nul 2>&1"'
  nsExec::Exec 'cmd.exe /c "taskkill /f /im kaoyanflow.exe /t >nul 2>&1"'
  nsExec::Exec 'cmd.exe /c "attrib -r -s -h \"$INSTDIR\*.*\" /s /d >nul 2>&1"'
!macroend

# 3. 覆写进程占用检查 (customCheckAppRunning)
# 彻底替代 NSIS 默认的弹窗逻辑，静默终止目标进程，绝不阻断安装
!macro customCheckAppRunning
  nsExec::Exec 'cmd.exe /c "taskkill /f /im KaoyanFlow.exe /t >nul 2>&1"'
  nsExec::Exec 'cmd.exe /c "taskkill /f /im kaoyanflow.exe /t >nul 2>&1"'
!macroend

# 4. 自定义安装阶段 (customInstall)
!macro customInstall
  nsExec::Exec 'cmd.exe /c "taskkill /f /im KaoyanFlow.exe /t >nul 2>&1"'
  nsExec::Exec 'cmd.exe /c "taskkill /f /im kaoyanflow.exe /t >nul 2>&1"'
  nsExec::Exec 'cmd.exe /c "attrib -r -s -h \"$INSTDIR\*.*\" /s /d >nul 2>&1"'
!macroend

# 5. 卸载初始化阶段 (customUnInit)
!macro customUnInit
  nsExec::Exec 'cmd.exe /c "taskkill /f /im KaoyanFlow.exe /t >nul 2>&1"'
  nsExec::Exec 'cmd.exe /c "taskkill /f /im kaoyanflow.exe /t >nul 2>&1"'
!macroend

# 6. 卸载执行阶段 (customUnInstall)
!macro customUnInstall
  nsExec::Exec 'cmd.exe /c "taskkill /f /im KaoyanFlow.exe /t >nul 2>&1"'
  nsExec::Exec 'cmd.exe /c "taskkill /f /im kaoyanflow.exe /t >nul 2>&1"'
!macroend
