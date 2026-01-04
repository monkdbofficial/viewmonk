@echo off
setlocal

:: Define variables
set VENV_DIR=monk_env
set REQUIREMENTS_FILE=requirements.txt
set LOG_FILE=setup_log.txt

:: Function to log messages
call :log "Starting script execution..."

:: Check if Docker and PostgreSQL (psql) are installed
call :log "Checking for the presence Docker and PostgreSQL client..."
docker --version >nul 2>&1
if errorlevel 1 (
    call :log "Error: Docker is not installed. Please install Docker and retry."
    exit /b 1
)
psql --version >nul 2>&1
if errorlevel 1 (
    call :log "Error: PostgreSQL client (psql) is not installed. Please install it and retry."
    exit /b 1
)
call :log "Docker Engine and PostgreSQL client found. Proceeding with setup."

:: Create a virtual environment
call :log "Creating a virtual environment..."
python -m venv %VENV_DIR%
if errorlevel 1 (
    call :log "Failed to create virtual environment '%VENV_DIR%'. Exiting."
    exit /b 1
) else (
    call :log "Virtual environment '%VENV_DIR%' created successfully."
)

:: Activate the virtual environment
call %VENV_DIR%\Scripts\activate.bat

:: Install the requirements
call :log "Installing the requirements from '%REQUIREMENTS_FILE%'..."
pip install -r %REQUIREMENTS_FILE%
if errorlevel 1 (
    call :log "Failed to install requirements. Exiting."
    deactivate
    exit /b 1
) else (
    call :log "Requirements installation is done."
)

:: Function to run a Python script with logging
:run_script
set SCRIPT_PATH=%1
call :log "Now working with %SCRIPT_PATH%..."
python "%SCRIPT_PATH%"
if errorlevel 1 (
    call :log "Error occurred while running %SCRIPT_PATH%. Exiting."
    deactivate
    exit /b 1
) else (
    call :log "%SCRIPT_PATH% is done."
)
goto :eof

:: Working with blob
call :run_script "documentation\blob\create_table.py"
call :run_script "documentation\blob\blob.py"

:: Working with document store
call :run_script "documentation\document_json\doc_json.py"

:: Working with full text search
call :run_script "documentation\FTS\fts.py"

:: Working with geospatial
call :run_script "documentation\geospatial\geo.py"
call :run_script "documentation\geospatial\other_shapes.py"

:: Working with timeseries
call :run_script "documentation\timeseries\timeseries.py"

:: Working with vector
call :run_script "documentation\vector\vector_ops.py"

:: Deactivate the virtual environment after completion
call :log "All tasks completed successfully. Deactivating the virtual environment."
deactivate

call :log "Script execution finished. Check '%LOG_FILE%' for details."
exit /b

:log
echo %~1 >> %LOG_FILE%
echo %~1
goto :eof