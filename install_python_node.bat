@echo off
setlocal

:: Variables for installer URLs and installation paths
set PYTHON_VERSION=3.10.0
set NODE_VERSION=18.16.0
set PYTHON_INSTALLER=python-%PYTHON_VERSION%-amd64.exe
set NODE_INSTALLER=node-v%NODE_VERSION%-x64.msi

set PYTHON_URL=https://www.python.org/ftp/python/%PYTHON_VERSION%/%PYTHON_INSTALLER%
set NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/%NODE_INSTALLER%

:: Set download directory (temporary)
set DOWNLOAD_DIR=%TEMP%\installers
if not exist "%DOWNLOAD_DIR%" mkdir "%DOWNLOAD_DIR%"

:: Download Python 3.10.0 installer
echo Downloading Python %PYTHON_VERSION%...
powershell -Command "Invoke-WebRequest -Uri %PYTHON_URL% -OutFile %DOWNLOAD_DIR%\%PYTHON_INSTALLER%" || (
    echo Failed to download Python installer!
    exit /b 1
)

:: Install Python 3.10.0 silently (with Add to PATH option)
echo Installing Python %PYTHON_VERSION%...
"%DOWNLOAD_DIR%\%PYTHON_INSTALLER%" /quiet InstallAllUsers=1 PrependPath=1 || (
    echo Failed to install Python!
    exit /b 1
)

:: Verify Python installation
python --version
if %errorlevel% neq 0 (
    echo Python installation failed or Python is not in the PATH!
    exit /b 1
)

:: Download Node.js installer
echo Downloading Node.js %NODE_VERSION%...
powershell -Command "Invoke-WebRequest -Uri %NODE_URL% -OutFile %DOWNLOAD_DIR%\%NODE_INSTALLER%" || (
    echo Failed to download Node.js installer!
    exit /b 1
)

:: Install Node.js silently
echo Installing Node.js %NODE_VERSION%...
msiexec /i "%DOWNLOAD_DIR%\%NODE_INSTALLER%" /quiet ADDLOCAL=ALL || (
    echo Failed to install Node.js!
    exit /b 1
)

:: Verify Node.js installation
node --version
if %errorlevel% neq 0 (
    echo Node.js installation failed or Node.js is not in the PATH!
    exit /b 1
)

:: Cleanup downloaded installers
echo Cleaning up...
rd /s /q "%DOWNLOAD_DIR%"

echo Installation completed successfully!
endlocal
pause
