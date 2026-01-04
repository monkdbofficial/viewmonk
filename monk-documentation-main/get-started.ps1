# Define variables
$VENV_DIR = "monk_env"
$REQUIREMENTS_FILE = "requirements.txt"
$LOG_FILE = "setup_log.txt"

# Function to log messages
function Log {
    param (
        [string]$message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $message" | Out-File -Append -FilePath $LOG_FILE
    Write-Host $message
}

# Start script execution
Log "Starting script execution..."

# Check if Docker and PostgreSQL (psql) are installed
Log "Checking for Docker and PostgreSQL client..."
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Log "Error: Docker is not installed. Please install Docker and retry."
    exit 1
}
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Log "Error: PostgreSQL client (psql) is not installed. Please install it and retry."
    exit 1
}
Log "Docker Engine and PostgreSQL client found. Proceeding with setup."

# Create a virtual environment
Log "Creating a virtual environment..."
python -m venv $VENV_DIR

if ($LASTEXITCODE -ne 0) {
    Log "Failed to create virtual environment '$VENV_DIR'. Exiting."
    exit 1
} else {
    Log "Virtual environment '$VENV_DIR' created successfully."
}

# Activate the virtual environment
& "$VENV_DIR\Scripts\Activate.ps1"

# Install the requirements
Log "Installing the requirements from '$REQUIREMENTS_FILE'..."
pip install -r $REQUIREMENTS_FILE

if ($LASTEXITCODE -ne 0) {
    Log "Failed to install requirements. Exiting."
    deactivate
    exit 1
} else {
    Log "Requirements installation is done."
}

# Function to run a Python script with logging
function Run-Script {
    param (
        [string]$scriptPath
    )
    Log "Now working with $(Split-Path $scriptPath -Leaf)..."
    
    python $scriptPath

    if ($LASTEXITCODE -ne 0) {
        Log "Error occurred while running $(Split-Path $scriptPath -Leaf). Exiting."
        deactivate
        exit 1
    } else {
        Log "$(Split-Path $scriptPath -Leaf) is done."
    }
}

# Working with blob
Run-Script "documentation\blob\create_table.py"
Run-Script "documentation\blob\blob.py"

# Working with document store
Run-Script "documentation\document_json\doc_json.py"

# Working with full text search
Run-Script "documentation\FTS\fts.py"

# Working with geospatial
Run-Script "documentation\geospatial\geo.py"
Run-Script "documentation\geospatial\other_shapes.py"

# Working with timeseries
Run-Script "documentation\timeseries\timeseries.py"

# Working with vector
Run-Script "documentation\vector\vector_ops.py"

# Deactivate the virtual environment after completion
Log "All tasks completed successfully. Deactivating the virtual environment."
deactivate

Log "Script execution finished. Check '$LOG_FILE' for details."