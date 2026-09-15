'use client';

import { useEffect } from 'react';

export function NumberInputGuard() {
  useEffect(() => {
    const onInput = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      if (!target || target.tagName !== 'INPUT' || target.type !== 'number') return;
      const cleaned = target.value.replace(/^0+(?=\d)/, '');
      if (cleaned !== target.value) target.value = cleaned;
    };
    document.addEventListener('input', onInput, true);
    return () => document.removeEventListener('input', onInput, true);
  }, []);
  return null;
}
