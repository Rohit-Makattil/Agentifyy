from fastapi import HTTPException
import zipfile
import io

def make_zip_from_files(files: dict):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        # Use the actual file names
        if "index.html" in files:
            z.writestr("index.html", files["index.html"])
        if "style.css" in files:
            z.writestr("style.css", files["style.css"])
        if "script.js" in files:
            z.writestr("script.js", files["script.js"])
    buf.seek(0)
    return buf