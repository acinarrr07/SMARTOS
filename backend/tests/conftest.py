import os, tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix='smg-tests-'))
os.environ['SMG_STORAGE_DIR'] = str(_tmp / 'storage')
os.environ['SMG_DATABASE_URL'] = f"sqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ['SMG_COOKIE_SECURE'] = 'false'

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
