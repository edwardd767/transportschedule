'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Mic, MoreVertical, Plus, Search, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import type { HotelUser } from '@/lib/transport-state';

function blankUser(): HotelUser {
  return {
    id: crypto.randomUUID(),
    name: '',
    loginName: '',
    email: '',
    password: '',
    mobile: '',
    superUser: false,
    collaborativeUser: false,
    active: true,
    updated: '',
  };
}

function PopupMenu({ items, onClose }: { items: { label: string; onClick: () => void; disabled?: boolean }[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [onClose]);
  return (
    <div className="rate-row-menu" ref={ref} role="menu">
      {items.map((item) => (
        <button key={item.label} type="button" role="menuitem" disabled={item.disabled} onClick={() => { onClose(); item.onClick(); }}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function SystemAdminUser({
  users,
  onChange,
  onBack,
}: {
  users: HotelUser[];
  onChange: (value: HotelUser[]) => void | Promise<void>;
  onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HotelUser | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<{ title: string; message: string; confirmLabel: string; action: () => void } | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => `${user.name} ${user.loginName} ${user.email} ${user.mobile}`.toLowerCase().includes(needle));
  }, [users, query]);

  const commit = async (next: HotelUser[]) => {
    setSaving(true);
    try {
      await onChange(next);
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.password.trim()) { setError('Enter a password.'); return; }
    if (draft.password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!draft.mobile.trim()) { setError('Enter a mobile number.'); return; }
    const login = draft.loginName.trim().toLowerCase();
    const duplicate = login !== '' && users.some((user) => user.id !== draft.id && user.loginName.trim().toLowerCase() === login);
    if (duplicate) { setError('That login name is already used.'); return; }
    setError('');
    const next = users.some((user) => user.id === draft.id)
      ? users.map((user) => (user.id === draft.id ? draft : user))
      : [...users, draft];
    await commit(next);
    setDraft(null);
  };

  if (draft) {
    const editing = users.some((user) => user.id === draft.id);
    return (
      <section className="master-page" aria-label="User">
        <div className="department-editor-head">
          <button type="button" className="master-back" onClick={() => { setDraft(null); setError(''); }}>
            <ArrowLeft size={18} /> Back
          </button>
          <strong>User</strong>
        </div>
        <div className="master-detail-card">
          <div className="system-user-form">
            <label className="hotel-setup-field" data-filled={draft.name ? 'true' : 'false'} data-full="true">
              <span className="label">Name</span>
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </label>
            <label className="hotel-setup-field" data-filled={draft.loginName ? 'true' : 'false'} data-full="true">
              <span className="label">Login name</span>
              <input value={draft.loginName} onChange={(event) => setDraft({ ...draft, loginName: event.target.value })} />
            </label>
            <label className="hotel-setup-field" data-filled={draft.email ? 'true' : 'false'} data-full="true">
              <span className="label">Email Address</span>
              <input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
            </label>
            <label className="hotel-setup-field" data-filled={draft.password ? 'true' : 'false'} data-full="true">
              <span className="label">Password *</span>
              <span className="system-user-secret">
                <input type={showPassword ? 'text' : 'password'} value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </span>
            </label>
            <label className="hotel-setup-field" data-filled={confirmPassword ? 'true' : 'false'} data-full="true">
              <span className="label">Confirm Password *</span>
              <span className="system-user-secret">
                <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                <button type="button" aria-label={showConfirm ? 'Hide password' : 'Show password'} onClick={() => setShowConfirm((value) => !value)}>
                  {showConfirm ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </span>
            </label>
            <label className="hotel-setup-field" data-filled="true" data-full="true">
              <span className="label">Mobile No. *</span>
              <span className="booking-phone-line"><b>🇲🇾</b><span>+60</span><input inputMode="tel" value={draft.mobile} onChange={(event) => setDraft({ ...draft, mobile: event.target.value })} /></span>
            </label>
            <div className="system-user-toggle-row">
              <span>Super User</span>
              <input type="checkbox" checked={draft.superUser} aria-label="Super User" onChange={(event) => setDraft({ ...draft, superUser: event.target.checked })} />
            </div>
            <div className="system-user-toggle-row">
              <span>Collaborative User</span>
              <input type="checkbox" checked={draft.collaborativeUser} aria-label="Collaborative User" onChange={(event) => setDraft({ ...draft, collaborativeUser: event.target.checked })} />
            </div>
            <div className="system-user-toggle-row">
              <span>Active</span>
              <input type="checkbox" checked={draft.active} aria-label="Active" onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
            </div>
          </div>
        </div>
        {error && <p className="master-error">{error}</p>}
        <div className="hotel-setup-footer">
          <button type="button" className="hotel-setup-save" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="master-page" aria-label="User">
      {searchOpen ? (
        <div className="rate-search-row">
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search here.." aria-label="Search User" />
          <button type="button" aria-label="Voice search"><Mic size={18} /></button>
          <button type="button" aria-label="Close search" onClick={() => { setQuery(''); setSearchOpen(false); }}><X size={18} /></button>
        </div>
      ) : (
        <div className="rate-list-heading">
          <strong>User Listing (<em>{filtered.length}</em>)</strong>
          <button type="button" className="rate-search-button" aria-label="Search User" onClick={() => setSearchOpen(true)}>
            <Search size={18} />
          </button>
        </div>
      )}

      <div className="rate-row-list">
        {filtered.map((user) => (
          <div className={`rate-list-row detailed${user.active ? '' : ' inactive'}`} key={user.id}>
            <div className="rate-row-copy">
              <strong>{user.name || user.loginName || '—'}</strong>
              <span>{user.email || user.loginName || '—'}</span>
            </div>
            <span className="system-user-flags">
              {user.superUser ? <em>Super User</em> : null}
              {user.collaborativeUser ? <em>Collaborative</em> : null}
              {!user.active ? <em className="is-blocked">Blocked</em> : null}
            </span>
            <div className="rate-row-actions">
              <button type="button" aria-label={`Options for ${user.name}`} onClick={() => setMenuId(menuId === user.id ? null : user.id)}><MoreVertical size={24} /></button>
              {menuId === user.id && (
                <PopupMenu
                  onClose={() => setMenuId(null)}
                  items={[
                    { label: 'Edit', onClick: () => { setError(''); setConfirmPassword(user.password); setDraft({ ...user }); } },
                    {
                      label: user.active ? 'Block' : 'Activate',
                      onClick: () => setConfirm({
                        title: `${user.active ? 'Block' : 'Activate'} ${user.name || user.loginName}`,
                        message: `Do you want to set ${user.name || user.loginName} to ${user.active ? 'inactive' : 'active'} ?`,
                        confirmLabel: user.active ? 'Block' : 'Activate',
                        action: () => { void commit(users.map((row) => (row.id === user.id ? { ...row, active: !row.active } : row))); },
                      }),
                    },
                    {
                      label: 'Delete',
                      onClick: () => setConfirm({
                        title: `Delete ${user.name || user.loginName}`,
                        message: `Do you want to delete ${user.name || user.loginName} ?`,
                        confirmLabel: 'Delete',
                        action: () => { void commit(users.filter((row) => row.id !== user.id)); },
                      }),
                    },
                  ]}
                />
              )}
            </div>
          </div>
        ))}
        {!filtered.length && <div className="booking-room-empty">No users yet.</div>}
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { const run = confirm.action; setConfirm(null); run(); }}
        />
      )}

      <button type="button" className="rate-floating-add" aria-label="Add user" onClick={() => { setError(''); setConfirmPassword(''); setShowPassword(false); setShowConfirm(false); setDraft(blankUser()); }}>
        <Plus size={28} />
      </button>
    </section>
  );
}
