from __future__ import annotations
import hashlib, re
from pathlib import Path
from uuid import uuid4
import fitz
from fastapi import HTTPException
from app.core.config import STORAGE_DIR

DAYS = {
    'pazartesi': 0, 'salı': 1, 'sali': 1, 'çarşamba': 2, 'carsamba': 2,
    'perşembe': 3, 'persembe': 3, 'cuma': 4
}

def parse_menu_pdf(filename: str, content: bytes) -> dict:
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(413, 'PDF exceeds the 15 MB limit.')
    if not content.startswith(b'%PDF'):
        raise HTTPException(415, 'Uploaded file is not a PDF.')
    digest = hashlib.sha256(content).hexdigest()
    safe_name = f'{uuid4().hex}.pdf'
    destination = STORAGE_DIR / 'menus' / safe_name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    try:
        with fitz.open(stream=content, filetype='pdf') as doc:
            text = '\n'.join(page.get_text('text') for page in doc)
    except Exception as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(422, 'PDF could not be read.') from exc
    if not text.strip():
        destination.unlink(missing_ok=True)
        raise HTTPException(422, 'No selectable text found. This appears to be a scanned PDF; OCR processing is not enabled in this deployment.')
    lines = [re.sub(r'\s+', ' ', line).strip(' •\t-') for line in text.splitlines()]
    grouped: dict[int, list[str]] = {i: [] for i in range(5)}
    current_day = None
    for line in lines:
        if not line or len(line) > 180:
            continue
        normalized = line.casefold()
        detected = next((idx for day, idx in DAYS.items() if re.search(rf'\b{re.escape(day)}\b', normalized)), None)
        if detected is not None:
            current_day = detected
            remainder = re.sub(r'(?i)pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma', '', line).strip(' :-–')
            if remainder and len(remainder) > 2:
                grouped[current_day].append(remainder)
            continue
        if current_day is not None and not re.search(r'haftalık|yemek menüsü|menü|menu|tarih|kalori', normalized):
            if len(line) >= 3:
                grouped[current_day].append(line)
    extracted = [
        {'day_index': idx, 'day': ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'][idx], 'items': items}
        for idx, items in grouped.items() if items
    ]
    return {'file_hash': digest, 'stored_filename': safe_name, 'source_filename': Path(filename).name, 'text': text, 'days': extracted, 'needs_review': True}
