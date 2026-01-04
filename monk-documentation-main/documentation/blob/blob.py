from fastapi import FastAPI, File, UploadFile, HTTPException
import hashlib
import requests
import shutil
import configparser
import os

app = FastAPI()

# Determine the absolute path of the config.ini file
# Get the directory of the current script
current_directory = os.path.dirname(os.path.realpath(__file__))
# Construct absolute path
config_file_path = os.path.join(current_directory, "..", "config.ini")

# Load configuration from config.ini file
config = configparser.ConfigParser()
config.read(config_file_path, encoding="utf-8")

# MonkDB Connection Details from config file
DB_HOST = config['database']['DB_HOST']
DB_PORT = config['database']['DB_PORT']
TABLE_NAME = config['database']['BLOB_TABLE_NAME']
UPLOAD_DIR = config['database']['UPLOAD_DIR']

# MonkDB Configuration
MONKDB_URL = f"http://{DB_HOST}:{DB_PORT}"

# Dictionary to store filename → SHA-1 mapping (Temporary, replace with DB if needed)
file_sha1_mapping = {}

# Ensure the temporary directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_sha1(file_path):
    """Compute SHA-1 hash of the file."""
    sha1 = hashlib.sha1()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha1.update(chunk)
    return sha1.hexdigest()


@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    """Handle multipart file upload and store it in MonkDB."""
    temp_path = os.path.join(UPLOAD_DIR, file.filename)

    # Save file temporarily
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Compute SHA-1 hash
    sha1sum = get_sha1(temp_path)

    # Upload file to MonkDB
    with open(temp_path, "rb") as f:
        response = requests.put(
            f"{MONKDB_URL}/_blobs/{TABLE_NAME}/{sha1sum}", data=f)

    # Cleanup temporary file
    os.remove(temp_path)

    if response.status_code == 201:
        file_sha1_mapping[file.filename] = sha1sum  # Store mapping
        return {"message": "File uploaded successfully", "filename": file.filename, "sha1": sha1sum}
    else:
        raise HTTPException(
            status_code=response.status_code, detail=response.text)


@app.get("/download/{filename}")
async def download_file(filename: str):
    """Retrieve a BLOB using the filename."""
    sha1sum = file_sha1_mapping.get(filename)

    if not sha1sum:
        raise HTTPException(status_code=404, detail="File not found.")

    response = requests.get(f"{MONKDB_URL}/_blobs/{TABLE_NAME}/{sha1sum}")

    if response.status_code == 200:
        temp_path = os.path.join(UPLOAD_DIR, filename)
        with open(temp_path, "wb") as f:
            f.write(response.content)
        return {"message": "File retrieved", "filename": filename, "sha1": sha1sum, "file_path": temp_path}
    else:
        raise HTTPException(
            status_code=response.status_code, detail=response.text)


@app.delete("/delete/{filename}")
async def delete_file(filename: str):
    """Delete a BLOB using the filename."""
    sha1sum = file_sha1_mapping.pop(filename, None)

    if not sha1sum:
        raise HTTPException(status_code=404, detail="File not found.")

    response = requests.delete(f"{MONKDB_URL}/_blobs/{TABLE_NAME}/{sha1sum}")

    if response.status_code == 204:
        return {"message": "BLOB deleted successfully", "filename": filename, "sha1": sha1sum}
    else:
        raise HTTPException(
            status_code=response.status_code, detail=response.text)


@app.get("/list_files/")
async def list_uploaded_files():
    """List all uploaded files and their SHA-1 hashes."""
    return {"files": file_sha1_mapping}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
