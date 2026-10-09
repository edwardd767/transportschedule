'use client';

// Request/response bus for client-side report PDFs. The settings screen asks
// for reports; the main page renders them off-screen (where the booking data
// lives) and resolves with base64 PDF payloads for the night audit email.

export type ReportPdf = { filename: string; contentBase64: string };

export type ReportPdfRequest = {
  reports: string[];
  resolve: (pdfs: ReportPdf[]) => void;
  reject: (error: unknown) => void;
};

type Listener = (request: ReportPdfRequest) => void;

const listeners = new Set<Listener>();

export function onReportPdfRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestReportPdfs(reports: string[]): Promise<ReportPdf[]> {
  return new Promise<ReportPdf[]>((resolve, reject) => {
    if (!listeners.size) {
      reject(new Error('Report capture is not available on this screen.'));
      return;
    }
    for (const listener of listeners) listener({ reports, resolve, reject });
  });
}
