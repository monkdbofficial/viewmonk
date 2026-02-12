# MonkDB does not store metadata for individual BLOBs. Hence, we must create a seperate metadata table to retrieve metadata
# about files.

from monkdb import client
import requests

DB_HOST = "xx.xx.xx.xxx"  # Your instance IP address
DB_PORT = "4200"  # Default MonkDB port for HTTP connectivity.
DB_USER = "testuser"
DB_PASSWORD = "testpassword"
TABLE_NAME = "blobs_demo"
MONKDB_URL = "http://xx.xx.xx.xxx:4200"


def list_blobs_1():
    connection = client.connect(
        f"http://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}", username=DB_USER)
    cursor = connection.cursor()

    # Fix: Use an f-string to include the table name directly
    query = f"SELECT table_name FROM information_schema.tables WHERE table_name = '{TABLE_NAME}'"
    cursor.execute(query)

    results = cursor.fetchall()

    if results:
        print(
            f"BLOB table '{TABLE_NAME}' exists, but MonkDB does not store metadata for individual BLOBs.")
    else:
        print(f"No BLOB table found.")

    connection.close()


def list_blobs():
    """Fetch list of all BLOBs stored in MonkDB."""
    response = requests.get(f"{MONKDB_URL}/_blobs/{TABLE_NAME}/")

    if response.status_code == 200:
        blobs = response.json()
        if blobs:
            print(f"List of stored BLOBs: {blobs}")
        else:
            print("No BLOBs found in the database.")
        return blobs
    else:
        print(
            f"Error fetching BLOBs: {response.status_code} - {response.text}")
        return []


list_blobs()
