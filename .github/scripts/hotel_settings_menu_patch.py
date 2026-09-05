from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


page = Path('app/page.tsx')
s = page.read_text()

s = replace_once(
    s,
    "import { TransportSetup } from '@/components/transport-setup';\n",
    "import { TransportSetup } from '@/components/transport-setup';\nimport { HotelSettingsMenu } from '@/components/hotel-settings-menu';\n",
    'Hotel Settings menu import',
)

s = replace_once(
    s,
    "    'schedule' | 'setup' | 'booking' | 'frontdesk' | 'reporting'\n",
    "    'schedule' | 'setup' | 'hotelsettings' | 'booking' | 'frontdesk' | 'reporting'\n",
    'view union',
)

old_nav = """            <button
              className={view === 'setup' ? 'active' : ''}
              aria-current={view === 'setup' ? 'page' : undefined}
              onClick={() => setView('setup')}
            >
              <Settings />
              Hotel Settings
            </button>
            {view === 'setup' && (
              <div className="subnav">
                <span>Transport Setup</span>
              </div>
            )}
"""
new_nav = """            <button
              className={view === 'setup' || view === 'hotelsettings' ? 'active' : ''}
              aria-current={view === 'setup' || view === 'hotelsettings' ? 'page' : undefined}
              onClick={() => setView('hotelsettings')}
            >
              <Settings />
              Hotel Settings
            </button>
            {view === 'setup' && (
              <div className="subnav">
                <button className="active" onClick={() => setView('setup')}>
                  Transport Setup
                </button>
              </div>
            )}
"""
s = replace_once(s, old_nav, new_nav, 'Hotel Settings sidebar navigation')

old_breadcrumb = """            ) : view === 'reporting' ? (
              <>
                Digital Reporting <ChevronRight size={14} /> Transport Listing
              </>
            ) : (
              <>
                {view === 'setup' ? 'Hotel Settings' : 'Transport'}{' '}
                <ChevronRight size={14} />{' '}
                {view === 'setup' ? 'Transport Setup' : 'Schedule'}
              </>
            )}
"""
new_breadcrumb = """            ) : view === 'reporting' ? (
              <>
                Digital Reporting <ChevronRight size={14} /> Transport Listing
              </>
            ) : view === 'hotelsettings' ? (
              <span>Hotel Settings</span>
            ) : (
              <>
                {view === 'setup' ? 'Hotel Settings' : 'Transport'}{' '}
                <ChevronRight size={14} />{' '}
                {view === 'setup' ? 'Transport Setup' : 'Schedule'}
              </>
            )}
"""
s = replace_once(s, old_breadcrumb, new_breadcrumb, 'Hotel Settings breadcrumb')

old_render = """        ) : view === 'setup' ? (
          <div className="settings-scroll" key="setup">
            <TransportSetup
"""
new_render = """        ) : view === 'hotelsettings' ? (
          <div className="settings-scroll hotel-settings-scroll" key="hotelsettings">
            <HotelSettingsMenu onOpenTransportSetup={() => setView('setup')} />
          </div>
        ) : view === 'setup' ? (
          <div className="settings-scroll" key="setup">
            <TransportSetup
"""
s = replace_once(s, old_render, new_render, 'Hotel Settings card page')

if "setView('hotelsettings')" not in s or '<HotelSettingsMenu' not in s:
    raise SystemExit('Hotel Settings menu wiring is incomplete')
page.write_text(s)


css = Path('app/globals.css')
c = css.read_text()
marker = '/* Hotel Settings menu cards */'
if marker not in c:
    c += r'''

/* Hotel Settings menu cards */
.hotel-settings-scroll {
  padding: 10px 7px 12px 5px;
}
.hotel-settings-menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.hotel-settings-card {
  width: 100%;
  min-height: 72px;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  border: 1px solid #e1e2e5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 6px #00000016;
  color: #1e1e1e;
  text-align: left;
  cursor: default;
}
.hotel-settings-card:hover {
  background: #fff;
}
.transport-settings-card {
  cursor: pointer;
}
.transport-settings-card:hover {
  border-color: #f2bd72;
  background: #fffaf3;
  box-shadow: 0 3px 9px #d981191f;
}
.hotel-settings-card-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: #517ba6;
  background: #edf4fa;
}
.hotel-settings-card:nth-child(2n) .hotel-settings-card-icon {
  color: #d77918;
  background: #fff1df;
}
.hotel-settings-card:nth-child(3n) .hotel-settings-card-icon {
  color: #e05442;
  background: #fff0ed;
}
.transport-settings-card .hotel-settings-card-icon {
  color: #d97900;
  background: #fff0dc;
}
.hotel-settings-card-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hotel-settings-card-copy strong {
  color: #111;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
}
.hotel-settings-card-copy > span {
  color: #242424;
  font-size: 14px;
  line-height: 1.3;
}
.hotel-settings-card-arrow {
  justify-self: end;
  color: #242424;
  stroke-width: 2;
}
@media (max-width: 720px) {
  .hotel-settings-scroll {
    padding: 8px 3px 10px;
  }
  .hotel-settings-card {
    min-height: 68px;
    grid-template-columns: 44px minmax(0, 1fr) 24px;
    padding: 10px 12px;
    gap: 9px;
  }
  .hotel-settings-card-icon {
    width: 38px;
    height: 38px;
  }
  .hotel-settings-card-copy strong {
    font-size: 14px;
  }
  .hotel-settings-card-copy > span {
    font-size: 12px;
  }
  .hotel-settings-card-arrow {
    width: 20px;
  }
}
'''
css.write_text(c)
