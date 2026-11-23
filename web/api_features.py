import json
import shlex
import subprocess
import os
import glob
from pathlib import Path
from flask import Blueprint, jsonify, request

features_bp = Blueprint('features', __name__)
BACKUP_DIR = Path("/opt/mediagrabber")

@features_bp.route("/api/utilities", methods=["GET"])
def list_utilities():
    try:
        with open("/opt/mediagrabber/config/utilities.json", "r") as f:
            return jsonify(json.load(f))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@features_bp.route("/api/utilities/run", methods=["POST"])
def run_utility():
    data = request.json or {}
    util_id = data.get("id")
    user_args = data.get("args", "")
    
    try:
        with open("/opt/mediagrabber/config/utilities.json", "r") as f:
            utils = json.load(f)
    except Exception:
        return jsonify({"error": "Failed to load config"}), 500

    target = next((u for u in utils if u["id"] == util_id), None)
    if not target:
        return jsonify({"error": "Utility not found"}), 404

    cmd_parts = shlex.split(target["cmd"])
    if target.get("args") and user_args:
        cmd_parts.extend(shlex.split(user_args))

    try:
        res = subprocess.run(cmd_parts, capture_output=True, text=True, timeout=30)
        return jsonify({"stdout": res.stdout, "stderr": res.stderr, "code": res.returncode})
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Command timed out"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@features_bp.route("/api/versions", methods=["GET"])
def list_versions():
    try:
        files = glob.glob(str(BACKUP_DIR / "*.tar.gz"))
        versions = []
        for f in files:
            stat = os.stat(f)
            versions.append({
                "filename": os.path.basename(f),
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "mtime": stat.st_mtime
            })
        # Sort newest first
        versions.sort(key=lambda x: x["mtime"], reverse=True)
        return jsonify(versions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@features_bp.route("/api/versions/restore", methods=["POST"])
def restore_version():
    data = request.json or {}
    filename = data.get("filename")
    
    if not filename or ".." in filename or not filename.endswith(".tar.gz"):
        return jsonify({"error": "Invalid filename"}), 400
        
    filepath = BACKUP_DIR / filename
    if not filepath.exists():
        return jsonify({"error": "File not found"}), 404

    # Create a backup of the CURRENT state before restoring
    current_backup = f"auto-backup_before_restore_{int(os.path.getmtime(filepath))}.tar.gz"
    try:
        subprocess.run(
            ["tar", "-czf", str(BACKUP_DIR / current_backup), "-C", str(BACKUP_DIR), "web/app.py", "web/static/features.js", "config/utilities.json"],
            check=True
        )
    except Exception as e:
        return jsonify({"error": f"Failed to create safety backup: {str(e)}"}), 500

    # We can't easily restart the service from within Flask and return a response.
    # So we extract the tar in the background using a detached process.
    # The frontend will just poll until it comes back online.
    try:
        # Extract the tar directly into /opt/mediagrabber
        subprocess.run(
            ["tar", "-xzf", str(filepath), "-C", str(BACKUP_DIR)],
            check=True
        )
        # Schedule a restart using systemctl in 2 seconds
        subprocess.Popen(
            ["bash", "-c", "sleep 2 && sudo systemctl restart mediagrabber"],
            start_new_session=True
        )
        return jsonify({"status": "success", "message": "Restored. Server restarting..."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
