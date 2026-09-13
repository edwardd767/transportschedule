'use client';

import { useEffect } from 'react';

function clickMainNav(label: string) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.main-nav > button'));
  const target = buttons.find((button) => button.textContent?.trim().toLowerCase() === label.toLowerCase());
  target?.click();
}

export function HotelXBreadcrumbNavigation() {
  useEffect(() => {
    const navigate = (breadcrumb: HTMLElement) => {
      const text = (breadcrumb.textContent ?? '').replace(/\s+/g, ' ').trim();

      if (/hotel settings/i.test(text) && !/^hotel settings$/i.test(text)) {
        clickMainNav('Hotel Settings');
        return;
      }

      if (/front desk/i.test(text) && !/^front desk$/i.test(text)) {
        clickMainNav('Front Desk');
        return;
      }

      if (/check in/i.test(text) && text.includes('...')) {
        clickMainNav('Front Desk');
        return;
      }

      if (/booking/i.test(text) && !/^booking$/i.test(text)) {
        clickMainNav('Booking');
        return;
      }

      if (/transport/i.test(text) && !/^transport$/i.test(text)) {
        clickMainNav('Front Desk');
      }
    };

    const onClick = (event: MouseEvent) => {
      const breadcrumb = (event.target as HTMLElement | null)?.closest<HTMLElement>('.breadcrumb');
      if (!breadcrumb || breadcrumb.dataset.clickable !== 'true') return;
      navigate(breadcrumb);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const breadcrumb = (event.target as HTMLElement | null)?.closest<HTMLElement>('.breadcrumb');
      if (!breadcrumb || breadcrumb.dataset.clickable !== 'true') return;
      event.preventDefault();
      navigate(breadcrumb);
    };

    const prepare = () => {
      document.querySelectorAll<HTMLElement>('.breadcrumb').forEach((breadcrumb) => {
        const text = (breadcrumb.textContent ?? '').replace(/\s+/g, ' ').trim();
        const hasParent = /[›>]/.test(text) || text.includes('...') || /hotel settings .+/i.test(text);
        if (hasParent) {
          breadcrumb.dataset.clickable = 'true';
          breadcrumb.tabIndex = 0;
          breadcrumb.style.cursor = 'pointer';
          breadcrumb.setAttribute('role', 'button');
          breadcrumb.setAttribute('aria-label', `Go back from ${text}`);
        } else {
          delete breadcrumb.dataset.clickable;
          breadcrumb.removeAttribute('tabindex');
          breadcrumb.removeAttribute('role');
          breadcrumb.removeAttribute('aria-label');
          breadcrumb.style.cursor = '';
        }
      });
    };

    prepare();
    const observer = new MutationObserver(prepare);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return null;
}
