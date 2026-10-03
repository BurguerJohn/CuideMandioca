"""Run the real art exporter into an isolated directory and compare its outputs."""

import base64
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import traceback

from PIL import Image, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[2]
VALIDATION = Path(__file__).resolve().parent
PROFILE = Path(tempfile.mkdtemp(prefix=f'art-regeneration-{os.getpid()}-', dir=VALIDATION))
REPORT = {'pid': os.getpid(), 'profile': str(PROFILE), 'pillow': pillow_version, 'outputs': {}, 'failures': []}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def bundle(path):
    source = path.read_text(encoding='utf-8')
    marker = 'globalThis.FESTA_SPRITES = '
    start = source.index(marker) + len(marker)
    return json.loads(source[start:source.rfind(';')])


def metadata(value):
    if isinstance(value, str) and value.startswith('data:image/png;base64,'):
        return '<png>'
    if isinstance(value, dict):
        return {key: metadata(entry) for key, entry in value.items()}
    if isinstance(value, list):
        return [metadata(entry) for entry in value]
    return value


def pixels(url):
    raw = base64.b64decode(url.split(',', 1)[1])
    with Image.open(io.BytesIO(raw)) as image:
        image = image.convert('RGBA')
        return image.size, hashlib.sha256(image.tobytes()).hexdigest()


def icon_pixels(path):
    with Image.open(path) as image:
        if path.suffix == '.ico':
            return {str(size): hashlib.sha256(image.ico.getimage(size).convert('RGBA').tobytes()).hexdigest()
                    for size in sorted(image.info['sizes'])}
        return {str(image.size): hashlib.sha256(image.convert('RGBA').tobytes()).hexdigest()}


try:
    for directory in ['src', 'desktop']:
        (PROFILE / directory).mkdir()
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(ROOT / 'art'))
    spec = importlib.util.spec_from_file_location('audit_exportar', ROOT / 'art' / 'exportar.py')
    exporter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(exporter)
    exporter.ROOT = PROFILE
    exporter.BUNDLE = PROFILE / 'src' / 'festa-sprites.js'
    exporter.SHEET = PROFILE / 'assets' / 'festa' / 'folha.png'
    before = {str(path.relative_to(ROOT)): digest(path) for path in
              [ROOT / 'src' / 'festa-sprites.js', ROOT / 'desktop' / 'tray.png', ROOT / 'desktop' / 'icon.ico']}
    print(f'profile={PROFILE}', flush=True)
    exporter.main()
    current = bundle(ROOT / 'src' / 'festa-sprites.js')
    rebuilt = bundle(exporter.BUNDLE)
    REPORT['metadataEqual'] = metadata(current) == metadata(rebuilt)
    if not REPORT['metadataEqual']:
        REPORT['failures'].append('sprite metadata differs')
    for group in ['images', 'icons']:
        first, second = current[group], rebuilt[group]
        changed, encoding_only = [], []
        if set(first) != set(second):
            REPORT['failures'].append(group + ' IDs differ')
        for key in first.keys() & second.keys():
            a = first[key] if group == 'images' else first[key]['src']
            b = second[key] if group == 'images' else second[key]['src']
            if a != b:
                if pixels(a) == pixels(b):
                    encoding_only.append(key)
                else:
                    changed.append(key)
        REPORT[group] = {'current': len(first), 'rebuilt': len(second), 'changedPixels': changed,
                         'encodingOnly': encoding_only}
        if changed:
            REPORT['failures'].append(group + ' pixels differ')
    for relative in ['src/festa-sprites.js', 'desktop/tray.png', 'desktop/icon.ico']:
        original, regenerated = ROOT / relative, PROFILE / relative
        same_bytes = original.read_bytes() == regenerated.read_bytes()
        same_pixels = icon_pixels(original) == icon_pixels(regenerated) if relative.startswith('desktop/') else not REPORT['failures']
        REPORT['outputs'][relative] = {'currentBytes': original.stat().st_size, 'rebuiltBytes': regenerated.stat().st_size,
                                      'bytesEqual': same_bytes, 'contentEqual': same_pixels}
        if not same_pixels:
            REPORT['failures'].append(relative + ' content differs')
    REPORT['sourceUnchanged'] = all(digest(ROOT / relative) == old_hash for relative, old_hash in before.items())
    if not REPORT['sourceUnchanged']:
        REPORT['failures'].append('the source outputs changed during the audit')
except Exception as error:
    REPORT['error'] = repr(error)
    REPORT['traceback'] = traceback.format_exc()
    REPORT['failures'].append('export failed')
finally:
    (VALIDATION / 'art-regeneration-verification.json').write_text(json.dumps(REPORT, indent=2) + '\n', encoding='utf-8')

print(json.dumps(REPORT, ensure_ascii=False), flush=True)
sys.exit(1 if REPORT['failures'] else 0)
