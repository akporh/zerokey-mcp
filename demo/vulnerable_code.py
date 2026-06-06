"""Sample Python file with intentional vulnerabilities — used in the ZeroKey demo.

Ask Claude: "Scan this code for vulnerabilities."
"""

import os
import sqlite3

# Hard-coded credential (Bandit B105 / B106)
API_SECRET = "super_secret_key_12345"
DB_PASSWORD = "admin123"


def get_user(username):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # SQL injection (Bandit B608)
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchone()


def read_config(path):
    # Subprocess call with shell=True (Bandit B602)
    os.system("cat " + path)


def process_data(data):
    # Bare except swallows all errors (Pyflakes / style)
    try:
        result = int(data)
        return result * 2
    except:
        pass


undefined_variable  # Pyflakes: undefined name
