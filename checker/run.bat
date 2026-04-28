@echo off
setlocal

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed
    pause
    exit /b 1
  )
)

if not exist dist (
  echo Building...
  call npm run build
  if errorlevel 1 (
    echo Build failed
    pause
    exit /b 1
  )
)

node --no-warnings dist/index.js
if errorlevel 1 (
  echo Execution failed with error
  pause
)
