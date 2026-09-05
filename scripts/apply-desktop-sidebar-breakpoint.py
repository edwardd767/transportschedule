from pathlib import Path

# Keep the HotelX desktop/sidebar layout active on narrower desktop browser windows.
# The reference PMS keeps its left navigation visible at 100% zoom even when the
# browser is roughly half-screen width, so mobile/off-canvas mode should only
# start below 640px.

mobile = Path('hooks/use-mobile.ts')
text = mobile.read_text(encoding='utf-8')
old = 'const MOBILE_BREAKPOINT = 768;'
new = 'const MOBILE_BREAKPOINT = 640;'
if old not in text and new not in text:
    raise SystemExit('Could not find MOBILE_BREAKPOINT in hooks/use-mobile.ts')
text = text.replace(old, new)
mobile.write_text(text, encoding='utf-8')

sidebar = Path('components/ui/sidebar.tsx')
text = sidebar.read_text(encoding='utf-8')
replacements = {
    "'group peer hidden text-sidebar-foreground md:block'": "'group peer hidden text-sidebar-foreground sm:block'",
    "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',\n          className,": "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',\n          className,",
    "data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex'": "data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] sm:flex'",
    "'bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2 relative flex w-full flex-1 flex-col'": "'bg-background sm:peer-data-[variant=inset]:m-2 sm:peer-data-[variant=inset]:ml-0 sm:peer-data-[variant=inset]:rounded-xl sm:peer-data-[variant=inset]:shadow-sm sm:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2 relative flex w-full flex-1 flex-col'",
}
for old_value, new_value in replacements.items():
    if old_value in text:
        text = text.replace(old_value, new_value)
sidebar.write_text(text, encoding='utf-8')

css = Path('app/globals.css')
text = css.read_text(encoding='utf-8')
# Standardize the app breakpoint so the same desktop layout is used everywhere.
text = text.replace('@media (min-width: 768px)', '@media (min-width: 640px)')
text = text.replace('@media (max-width: 767px)', '@media (max-width: 639px)')
css.write_text(text, encoding='utf-8')

print('Desktop sidebar breakpoint standardized to 640px.')
