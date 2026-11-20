from flask import Blueprint, request, jsonify, current_app
import os
import json
import subprocess
import shutil

editor_bp = Blueprint('editor', __name__, url_prefix='/editor')

def command_exists(cmd):
    return subprocess.call(["which", cmd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0

def get_ffprobe_metadata(file_path, tag):
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", f"format_tags={tag}",
             "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            capture_output=True, text=True, timeout=5
        )
        return result.stdout.strip()
    except:
        return ""

@editor_bp.route('/scan', methods=['POST'])
def scan_files():
    data = request.get_json()
    path = data.get("path")
    if not path or not os.path.isdir(path):
        return jsonify({"error": "Invalid directory"}), 400

    result = []
    for root, _, files in os.walk(path):
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in [".mp3", ".flac", ".m4a", ".mp4", ".webm", ".mkv", ".avi"]:
                file_path = os.path.join(root, f)
                info_file = os.path.splitext(file_path)[0] + ".info.json"
                if os.path.exists(info_file):
                    try:
                        with open(info_file, "r") as fp:
                            info = json.load(fp)
                        title = info.get("title", "")
                        artist = info.get("uploader", "")
                        album = info.get("album", "")
                        date = info.get("upload_date", "")
                        description = info.get("description", "")
                    except:
                        title = artist = album = date = description = ""
                else:
                    if command_exists("ffprobe"):
                        title = get_ffprobe_metadata(file_path, "title")
                        artist = get_ffprobe_metadata(file_path, "artist")
                        album = get_ffprobe_metadata(file_path, "album")
                        date = get_ffprobe_metadata(file_path, "date")
                        description = ""
                    else:
                        title = artist = album = date = description = ""
                if not title:
                    title = os.path.splitext(f)[0]
                result.append({
                    "file_path": file_path,
                    "info_file": info_file if os.path.exists(info_file) else None,
                    "title": title,
                    "artist": artist,
                    "album": album,
                    "date": date,
                    "description": description,
                    "extension": ext[1:],
                    "has_cover": os.path.exists(os.path.splitext(file_path)[0] + ".jpg") or os.path.exists(os.path.splitext(file_path)[0] + ".png")
                })
    return jsonify(result)

@editor_bp.route('/update', methods=['POST'])
def update_metadata():
    file_path = request.form.get("file_path")
    if not file_path or not os.path.exists(file_path):
        return jsonify({"error": "Invalid file path"}), 400

    title = request.form.get("title", "")
    artist = request.form.get("artist", "")
    album = request.form.get("album", "")
    date = request.form.get("date", "")
    description = request.form.get("description", "")

    info_file = os.path.splitext(file_path)[0] + ".info.json"
    if os.path.exists(info_file):
        try:
            with open(info_file, "r") as f:
                info = json.load(f)
        except:
            info = {}
        info["title"] = title
        info["uploader"] = artist
        info["album"] = album
        info["upload_date"] = date
        info["description"] = description
        with open(info_file, "w") as f:
            json.dump(info, f, indent=2)
    else:
        info = {
            "title": title,
            "uploader": artist,
            "album": album,
            "upload_date": date,
            "description": description
        }
        with open(info_file, "w") as f:
            json.dump(info, f, indent=2)

    cover_file = request.files.get("cover")
    if cover_file and cover_file.filename:
        base = os.path.splitext(file_path)[0]
        ext = os.path.splitext(cover_file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            return jsonify({"error": "Unsupported image format"}), 400
        cover_path = base + ext
        cover_file.save(cover_path)
        if file_path.lower().endswith((".mp3", ".flac", ".m4a")):
            if command_exists("ffmpeg"):
                try:
                    tmp_file = file_path + ".tmp"
                    subprocess.run(
                        ["ffmpeg", "-y", "-i", file_path, "-i", cover_path,
                         "-map", "0", "-map", "1", "-c", "copy",
                         "-c:v:1", "png", "-metadata:s:v:1", "title=Album cover",
                         tmp_file],
                        check=True, capture_output=True
                    )
                    shutil.move(tmp_file, file_path)
                except Exception as e:
                    print(f"Failed to embed cover: {e}")

    # Refresh library using callback if available
    if hasattr(current_app, 'refresh_library_callback'):
        current_app.refresh_library_callback(os.path.dirname(file_path))

    return jsonify({"status": "updated"})
