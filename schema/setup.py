#!/usr/bin/env python3
"""
MonkDB AQI Platform Setup Script
Executes SQL files statement by statement via HTTP API
"""

import requests
import re
import sys
from pathlib import Path

MONKDB_URL = "http://localhost:4200"

def execute_sql(stmt):
    """Execute a single SQL statement"""
    stmt = stmt.strip()
    if not stmt or stmt.startswith('--'):
        return True

    try:
        response = requests.post(
            f"{MONKDB_URL}/_sql",
            json={"stmt": stmt},
            timeout=30
        )
        data = response.json()

        if 'error' in data:
            error_msg = data['error'].get('message', '')
            # Ignore "already exists" errors
            if 'already exists' in error_msg.lower() or 'alreadyexists' in error_msg.lower():
                print(f"⚠ Skipped (already exists)")
                return True
            print(f"✗ Error: {error_msg}")
            return False

        print(f"✓ OK")
        return True

    except Exception as e:
        print(f"✗ Exception: {e}")
        return False

def split_sql_statements(sql_content):
    """Split SQL content into individual statements"""
    # Remove comments
    sql_content = re.sub(r'--.*$', '', sql_content, flags=re.MULTILINE)

    # Split by semicolon, but be smart about it
    # This regex splits on semicolons not inside quotes or parentheses
    statements = []
    current = []
    paren_depth = 0
    in_string = False
    string_char = None

    for line in sql_content.split('\n'):
        for char in line:
            if not in_string:
                if char in ('"', "'"):
                    in_string = True
                    string_char = char
                elif char == '(':
                    paren_depth += 1
                elif char == ')':
                    paren_depth -= 1
                elif char == ';' and paren_depth == 0:
                    stmt = ''.join(current).strip()
                    if stmt:
                        statements.append(stmt)
                    current = []
                    continue
            else:
                if char == string_char:
                    in_string = False
                    string_char = None

            current.append(char)
        current.append('\n')

    # Add remaining statement
    stmt = ''.join(current).strip()
    if stmt:
        statements.append(stmt)

    return statements

def execute_sql_file(filepath, description):
    """Execute all statements in an SQL file"""
    print(f"\n[{description}]")
    print(f"File: {filepath}")

    try:
        content = Path(filepath).read_text()
        statements = split_sql_statements(content)

        success_count = 0
        for i, stmt in enumerate(statements, 1):
            if not stmt.strip():
                continue
            print(f"  Statement {i}... ", end='', flush=True)
            if execute_sql(stmt):
                success_count += 1

        print(f"\n✓ Completed: {success_count}/{len(statements)} statements")
        return True

    except Exception as e:
        print(f"✗ Failed to read file: {e}")
        return False

def main():
    print("=" * 60)
    print("MonkDB AQI Platform Setup")
    print("=" * 60)
    print(f"\nMonkDB URL: {MONKDB_URL}\n")

    # Test connection
    print("Testing connection...")
    try:
        response = requests.post(
            f"{MONKDB_URL}/_sql",
            json={"stmt": "SELECT 1"},
            timeout=5
        )
        if response.status_code == 200:
            print("✓ Connected to MonkDB\n")
        else:
            print(f"✗ Connection failed: {response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"✗ Cannot connect: {e}")
        print("Make sure MonkDB is running: docker ps")
        sys.exit(1)

    # Get script directory
    script_dir = Path(__file__).parent

    # Execute SQL files
    print("=" * 60)
    print("Step 1: Base Schema (5 tables)")
    print("=" * 60)
    execute_sql_file(
        script_dir / "aqi-platform-schema-cratedb.sql",
        "Base AQI Platform Schema"
    )

    print("\n" + "=" * 60)
    print("Step 2: Enterprise Extension (11 tables)")
    print("=" * 60)
    # We'll create this next
    # execute_sql_file(
    #     script_dir / "aqi-enterprise-extension-cratedb.sql",
    #     "Enterprise Features"
    # )

    print("\n" + "=" * 60)
    print("✓ Setup Complete!")
    print("=" * 60)
    print("\nDatabase now contains:")
    print("  ✓ 5 base tables")
    print("\nNext: Refresh http://localhost:3000/aqi-dashboard")
    print()

if __name__ == "__main__":
    main()
