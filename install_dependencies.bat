@echo off
setlocal

REM Common installation paths for Python and Node.js
set PYTHON_COMMON_PATHS=C:\Python310;C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python310
set NODE_COMMON_PATHS=C:\Program Files\nodejs;C:\Users\%USERNAME%\AppData\Local\Programs\nodejs

REM Function to find Python executable
:find_python
    for %%p in (%PYTHON_COMMON_PATHS%) do (
        if exist "%%p\python.exe" (
            set PYTHON_EXEC=%%p\python.exe
            goto found_python
        )
    )
    goto python_not_found

:found_python
    echo Python found at: %PYTHON_EXEC%
    goto find_node

:python_not_found
    echo Python not found in common directories. Please ensure Python is installed and try again.
    exit /b 1

REM Function to find Node.js executable
:find_node
    for %%n in (%NODE_COMMON_PATHS%) do (
        if exist "%%n\node.exe" (
            set NODE_EXEC=%%n\node.exe
            goto found_node
        )
    )
    goto node_not_found

:found_node
    echo Node.js found at: %NODE_EXEC%
    goto install_dependencies

:node_not_found
    echo Node.js not found in common directories. Please ensure Node.js is installed and try again.
    exit /b 1

REM Install dependencies
:install_dependencies
    REM Install Python dependencies using pip
    echo Installing Python dependencies...
    "%PYTHON_EXEC%" -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo Failed to install Python dependencies.
        exit /b 1
    )

    REM Install Node.js dependencies using npm or yarn
    if exist package-lock.json (
        echo Installing Node.js dependencies with npm...
        "%NODE_EXEC%" npm install
    ) else if exist yarn.lock (
        echo Installing Node.js dependencies with yarn...
        "%NODE_EXEC%" yarn install
    ) else (
        echo No package-lock.json or yarn.lock found. Skipping Node.js dependency installation.
    )

    echo All dependencies installed successfully!
    exit /b 0
