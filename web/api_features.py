import json
import shlex
import subprocess
from flask import Blueprint, jsonify, request

features_bp = Blueprint("features", __name__)

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
