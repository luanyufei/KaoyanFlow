!macro preInit
  nsExec::Exec `taskkill /F /IM KaoyanFlow.exe /T`
  nsExec::Exec `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process -Name KaoyanFlow -ErrorAction SilentlyContinue | Stop-Process -Force"`
!macroend

!macro customInit
  nsExec::Exec `taskkill /F /IM KaoyanFlow.exe /T`
  nsExec::Exec `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process -Name KaoyanFlow -ErrorAction SilentlyContinue | Stop-Process -Force"`
!macroend

!macro customCheckAppRunning
  nsExec::Exec `taskkill /F /IM KaoyanFlow.exe /T`
  nsExec::Exec `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process -Name KaoyanFlow -ErrorAction SilentlyContinue | Stop-Process -Force"`
!macroend

!macro customUnInit
  nsExec::Exec `taskkill /F /IM KaoyanFlow.exe /T`
  nsExec::Exec `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process -Name KaoyanFlow -ErrorAction SilentlyContinue | Stop-Process -Force"`
!macroend

!macro customInstall
  nsExec::Exec `taskkill /F /IM KaoyanFlow.exe /T`
  nsExec::Exec `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process -Name KaoyanFlow -ErrorAction SilentlyContinue | Stop-Process -Force"`
!macroend
