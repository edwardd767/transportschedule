from pathlib import Path

p = Path('app/page.tsx')
s = p.read_text()

def once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    s = s.replace(old, new, 1)

once(
    "import { HotelSettingsMenu } from '@/components/hotel-settings-menu';\n",
    "import { HotelSettingsMenu } from '@/components/hotel-settings-menu';\nimport { HotelSettingsDetail } from '@/components/hotel-settings-detail';\n",
    'detail import',
)

once(
    "    | 'hotelsettings'\n    | 'location'\n    | 'roomtype'\n    | 'room'\n",
    "    | 'hotelsettings'\n    | 'hotelsetup'\n    | 'department'\n    | 'location'\n    | 'floorplan'\n    | 'roomtype'\n    | 'room'\n    | 'roomstatus'\n    | 'ratepolicy'\n",
    'view union',
)

once(
    "className={['setup', 'hotelsettings', 'location', 'roomtype', 'room'].includes(view) ? 'active' : ''}\n              aria-current={['setup', 'hotelsettings', 'location', 'roomtype', 'room'].includes(view) ? 'page' : undefined}",
    "className={['setup', 'hotelsettings', 'hotelsetup', 'department', 'location', 'floorplan', 'roomtype', 'room', 'roomstatus', 'ratepolicy'].includes(view) ? 'active' : ''}\n              aria-current={['setup', 'hotelsettings', 'hotelsetup', 'department', 'location', 'floorplan', 'roomtype', 'room', 'roomstatus', 'ratepolicy'].includes(view) ? 'page' : undefined}",
    'sidebar active settings',
)

old_breadcrumb = """            ) : view === 'hotelsettings' ? (\n              <span>Hotel Settings</span>\n            ) : ['location', 'roomtype', 'room'].includes(view) ? (\n              <>\n                Hotel Settings <ChevronRight size={14} />{' '}\n                {view === 'location' ? 'Location' : view === 'roomtype' ? 'Room Type' : 'Room'}\n              </>\n            ) : ("""
new_breadcrumb = """            ) : view === 'hotelsettings' ? (\n              <span>Hotel Settings</span>\n            ) : ['hotelsetup', 'department', 'location', 'floorplan', 'roomtype', 'room', 'roomstatus', 'ratepolicy'].includes(view) ? (\n              <>\n                Hotel Settings <ChevronRight size={14} />{' '}\n                {view === 'hotelsetup'\n                  ? 'Hotel Setup'\n                  : view === 'department'\n                    ? 'Department'\n                    : view === 'location'\n                      ? 'Location'\n                      : view === 'floorplan'\n                        ? 'Floor Plan'\n                        : view === 'roomtype'\n                          ? 'Room Type'\n                          : view === 'room'\n                            ? 'Room'\n                            : view === 'roomstatus'\n                              ? 'Room Status'\n                              : 'Rate Policy'}\n              </>\n            ) : ("""
once(old_breadcrumb, new_breadcrumb, 'settings breadcrumb')

old_menu = """            <HotelSettingsMenu\n              onOpenLocation={() => setView('location')}\n              onOpenRoomType={() => setView('roomtype')}\n              onOpenRoom={() => setView('room')}\n              onOpenTransportSetup={() => setView('setup')}\n            />"""
new_menu = """            <HotelSettingsMenu\n              onOpenHotelSetup={() => setView('hotelsetup')}\n              onOpenDepartment={() => setView('department')}\n              onOpenLocation={() => setView('location')}\n              onOpenFloorPlan={() => setView('floorplan')}\n              onOpenRoomType={() => setView('roomtype')}\n              onOpenRoom={() => setView('room')}\n              onOpenRoomStatus={() => setView('roomstatus')}\n              onOpenRatePolicy={() => setView('ratepolicy')}\n              onOpenTransportSetup={() => setView('setup')}\n            />"""
once(old_menu, new_menu, 'settings menu props')

old_master_branch = """        ) : ['location', 'roomtype', 'room'].includes(view) ? (\n          <div className=\"settings-scroll hotel-master-scroll\" key={view}>"""
new_master_branch = """        ) : ['hotelsetup', 'department', 'floorplan', 'roomstatus', 'ratepolicy'].includes(view) ? (\n          <div className=\"settings-scroll hotel-master-scroll\" key={view}>\n            <HotelSettingsDetail\n              kind={\n                view === 'hotelsetup'\n                  ? 'hotelSetup'\n                  : view === 'department'\n                    ? 'department'\n                    : view === 'floorplan'\n                      ? 'floorPlan'\n                      : view === 'roomstatus'\n                        ? 'roomStatus'\n                        : 'ratePolicy'\n              }\n              onBack={() => setView('hotelsettings')}\n            />\n          </div>\n        ) : ['location', 'roomtype', 'room'].includes(view) ? (\n          <div className=\"settings-scroll hotel-master-scroll\" key={view}>"""
once(old_master_branch, new_master_branch, 'detail render branch')

once(
    "              onBack={() => setView('schedule')}\n",
    "              onBack={() => setView('hotelsettings')}\n",
    'transport setup back target',
)

p.write_text(s)
print('Hotel Settings individual pages wired successfully.')
