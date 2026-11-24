from __future__ import annotations
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException, UploadFile
from app.core.config import STORAGE_DIR, MAX_UPLOAD_BYTES

ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP'}
Image.MAX_IMAGE_PIXELS = 30_000_000

async def store_review_image(file: UploadFile) -> tuple[str, int]:
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if not raw:
        raise HTTPException(400, 'Empty image file.')
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, 'Image exceeds the 8 MB upload limit.')
    try:
        with Image.open(BytesIO(raw)) as img:
            if img.format not in ALLOWED_FORMATS:
                raise HTTPException(415, 'Only JPG, PNG and WebP images are supported.')
            img = ImageOps.exif_transpose(img).convert('RGB')
            img.thumbnail((1600, 1600))
            out = BytesIO()
            img.save(out, format='WEBP', quality=82, method=6)
    except (UnidentifiedImageError, Image.DecompressionBombError) as exc:
        raise HTTPException(415, 'The uploaded file is not a valid image.') from exc
    filename = f'{uuid4().hex}.webp'
    destination = STORAGE_DIR / 'reviews' / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(out.getvalue())
    return filename, destination.stat().st_size

def delete_stored_image(storage_key: str) -> None:
    path = (STORAGE_DIR / 'reviews' / Path(storage_key).name).resolve()
    root = (STORAGE_DIR / 'reviews').resolve()
    if path.parent == root and path.exists():
        path.unlink()
