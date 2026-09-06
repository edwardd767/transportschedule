from pathlib import Path

path = Path('scripts/test-transport-worker.mjs')
text = path.read_text()
old = "  if (/^CREATE (?:TABLE|INDEX|OR REPLACE FUNCTION)/.test(sql)) return [];\n"
new = "  if (/^(?:CREATE (?:TABLE|INDEX|OR REPLACE FUNCTION)|ALTER TABLE)/.test(sql)) return [];\n"
if old not in text:
    raise SystemExit('Expected worker-test SQL matcher not found')
path.write_text(text.replace(old, new, 1))
