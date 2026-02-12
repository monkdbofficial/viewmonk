#!/bin/sh

# Define variables
VENV_DIR="monk_env"
REQUIREMENTS_FILE="requirements.txt"
LOG_FILE="setup_log.txt"

# Function to log messages
log() {
    printf "%s - %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1" | tee -a "$LOG_FILE"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect OS type
OS_TYPE=$(uname -s)

# Check for Docker Engine and PostgreSQL (psql)
log "Checking for Docker Engine and PostgreSQL client..."
if ! command_exists docker; then
    log "Error: Docker is not installed. Please install Docker and retry."
    exit 1
fi
if ! command_exists psql; then
    log "Error: PostgreSQL client (psql) is not installed. Please install it and retry."
    exit 1
fi
log "Docker Engine and PostgreSQL client found. Proceeding with setup."

# Create a virtual environment
log "Creating a virtual environment..."
if python3 -m venv "$VENV_DIR"; then
    log "Virtual environment '$VENV_DIR' created successfully."
else
    log "Failed to create virtual environment '$VENV_DIR'. Exiting."
    exit 1
fi

# Activate the virtual environment
. "$VENV_DIR/bin/activate"

# Install the requirements
log "Installing the requirements from '$REQUIREMENTS_FILE'..."
if pip install -r "$REQUIREMENTS_FILE"; then
    log "Requirements installation is done."
else
    log "Failed to install requirements. Exiting."
    deactivate
    exit 1
fi

# Function to run a Python script with logging
run_script() {
    script_path="$1"
    log "Now working with $(basename "$script_path")..."
    if python3 "$script_path"; then
        log "$(basename "$script_path") is done."
    else
        log "Error occurred while running $(basename "$script_path"). Exiting."
        deactivate
        exit 1
    fi
}

# Working with blob
run_script "documentation/blob/create_table.py"
run_script "documentation/blob/blob.py"

# Working with document store
run_script "documentation/document_json/doc_json.py"

# Working with full text search
run_script "documentation/FTS/fts.py"

# Working with geospatial
run_script "documentation/geospatial/geo.py"
run_script "documentation/geospatial/other_shapes.py"

# Working with timeseries
run_script "documentation/timeseries/timeseries.py"

# Working with vector
run_script "documentation/vector/vector_ops.py"

# Deactivate the virtual environment after completion
log "All tasks completed successfully. Deactivating the virtual environment."
deactivate

log "Script execution finished. Check '$LOG_FILE' for details."
