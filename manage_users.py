import sqlite3
import sys
import getpass
from werkzeug.security import generate_password_hash

DB = "/opt/mediagrabber/users.db"

def list_users():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    users = conn.execute("SELECT id, username, role, email, display_name FROM users").fetchall()
    conn.close()
    if not users:
        print("No users found in database.")
        return
    print(f"{'ID':<4} {'Username':<20} {'Role':<10} {'Display Name':<20} {'Email'}")
    print("-" * 75)
    for u in users:
        print(f"{u['id']:<4} {u['username']:<20} {u['role']:<10} {u['display_name'] or '':<20} {u['email'] or ''}")

def add_user(username, role="user"):
    password = getpass.getpass(f"Password for {username}: ")
    conn = sqlite3.connect(DB)
    try:
        conn.execute("INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)",
                     (username, generate_password_hash(password), username, role))
        conn.commit()
        print(f"✅ User '{username}' added as '{role}'.")
    except sqlite3.IntegrityError:
        print(f"❌ User '{username}' already exists.")
    finally:
        conn.close()

def reset_password(username):
    password = getpass.getpass(f"New password for {username}: ")
    conn = sqlite3.connect(DB)
    cur = conn.execute("UPDATE users SET password_hash = ? WHERE username = ?", (generate_password_hash(password), username))
    conn.commit()
    conn.close()
    if cur.rowcount > 0:
        print(f"✅ Password reset for '{username}'.")
    else:
        print(f"❌ User '{username}' not found.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: manage_users.py [list|add|reset] [username] [role]")
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "list":
        list_users()
    elif cmd == "add" and len(sys.argv) > 2:
        role = sys.argv[3] if len(sys.argv) > 3 else "user"
        add_user(sys.argv[2], role)
    elif cmd == "reset" and len(sys.argv) > 2:
        reset_password(sys.argv[2])
    else:
        print("Invalid command.")
