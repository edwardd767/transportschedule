'use client';

import { useEffect, useRef } from 'react';
import 'quill/dist/quill.snow.css';

const TOOLBAR = [
  [{ size: ['small', false, 'large', 'huge'] }],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  ['bold', 'italic', 'underline', 'strike', 'blockquote'],
  [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
  [{ align: '' }, { align: 'center' }, { align: 'right' }, { align: 'justify' }],
  ['link', 'image'],
  ['clean'],
];

type QuillInstance = {
  root: HTMLElement;
  clipboard: { dangerouslyPasteHTML: (html: string) => void };
  on: (event: string, handler: () => void) => void;
};

export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let instance: QuillInstance | null = null;
    let cancelled = false;
    void import('quill').then(({ default: Quill }) => {
      if (cancelled) return;
      instance = new Quill(element, { theme: 'snow', placeholder, modules: { toolbar: TOOLBAR } }) as unknown as QuillInstance;
      instance.clipboard.dangerouslyPasteHTML(value || '');
      instance.on('text-change', () => changeRef.current(instance?.root.innerHTML ?? ''));
    });
    return () => {
      cancelled = true;
    };
    // Initialise once per mount; the parent remounts this editor when the clause changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="hotelx-quill" ref={host} />;
}
