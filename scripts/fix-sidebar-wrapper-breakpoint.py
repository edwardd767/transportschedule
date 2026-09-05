from pathlib import Path

path = Path('components/ui/sidebar.tsx')
text = path.read_text(encoding='utf-8')
old = 'className="group peer hidden text-sidebar-foreground md:block"'
new = 'className="group peer hidden text-sidebar-foreground sm:block"'
if old not in text and new not in text:
    raise SystemExit('Sidebar desktop wrapper breakpoint not found')
text = text.replace(old, new)
path.write_text(text, encoding='utf-8')
print('Sidebar wrapper now remains visible from 640px upward.')
