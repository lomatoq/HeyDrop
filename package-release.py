"""Package only browser runtime files. No source, tests, private state or node_modules."""
from pathlib import Path
import shutil
import zipfile
import json

root = Path(__file__).resolve().parent
stage = root / 'dist' / 'hey-drop-v17'
files = ['index.html', 'assets/ui/hey-drop.svg', 'assets/ui/postal-paper.svg', 'THIRD_PARTY_NOTICES.md', 'editor.html', 'editor.bundle.js', 'src/editor.css', 'scripts/data/CATALOGUE-PROVENANCE.md', 'src/catalogue-data.json']
stage.mkdir(parents=True, exist_ok=True)
archive = root / 'dist' / 'HeyDrop-V17-itch.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
    for name in files:
        source, target = root / name, stage / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        output.write(source, name)
with zipfile.ZipFile(archive) as output:
    assert output.testzip() is None
    assert set(output.namelist()) == set(files)
    assert output.read('index.html') == (root / 'index.html').read_bytes()
print(json.dumps({'archive': str(archive), 'bytes': archive.stat().st_size, 'files': files}))
