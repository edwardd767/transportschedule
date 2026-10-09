// Minimal SMTP client for Cloudflare Workers: no Node net/tls is available, so
// this speaks the protocol directly over cloudflare:sockets with implicit TLS
// (secureTransport "on", port 465) or STARTTLS (port 587), and sends a
// multipart/mixed message with base64 attachments.

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
};

export type SmtpAttachment = { filename: string; contentBase64: string };

export type SmtpMessage = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: SmtpAttachment[];
};

type SocketLike = {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  close: () => Promise<void>;
  startTls?: () => SocketLike;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

class LineReader {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private buffer = '';
  constructor(socket: SocketLike) {
    this.reader = socket.readable.getReader();
  }
  async readLine(): Promise<string> {
    for (;;) {
      const index = this.buffer.indexOf('\r\n');
      if (index >= 0) {
        const line = this.buffer.slice(0, index);
        this.buffer = this.buffer.slice(index + 2);
        return line;
      }
      const { value, done } = await this.reader.read();
      if (done) {
        const rest = this.buffer;
        this.buffer = '';
        return rest;
      }
      this.buffer += decoder.decode(value, { stream: true });
    }
  }
  async readReply(): Promise<{ code: number; text: string }> {
    let code = 0;
    const lines: string[] = [];
    for (;;) {
      const line = await this.readLine();
      if (!line) {
        if (code) break;
        continue;
      }
      lines.push(line);
      const match = /^(\d{3})([ -]?)/.exec(line);
      if (!match) {
        if (code) break;
        continue;
      }
      code = Number(match[1]);
      if (match[2] !== '-') break;
    }
    return { code, text: lines.join(' ') };
  }
}

const utf8Base64 = (value: string) => {
  const bytes = encoder.encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const wrappedBase64 = (value: string) => value.replace(/(.{76})/g, '$1\r\n');
const encodeHeader = (value: string) =>
  /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${utf8Base64(value)}?=`;

const buildMime = (message: SmtpMessage) => {
  const boundary = `hotelx-${crypto.randomUUID()}`;
  const parts: string[] = [];
  parts.push(`From: ${message.from}`);
  parts.push(`To: ${message.to.join(', ')}`);
  parts.push(`Subject: ${encodeHeader(message.subject)}`);
  parts.push(`Date: ${new Date().toUTCString()}`);
  parts.push(`Message-ID: <${crypto.randomUUID()}@hotelx.local>`);
  parts.push('MIME-Version: 1.0');
  parts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  parts.push('');
  parts.push(`--${boundary}`);
  parts.push('Content-Type: text/html; charset=UTF-8');
  parts.push('Content-Transfer-Encoding: base64');
  parts.push('');
  parts.push(wrappedBase64(utf8Base64(message.html)));
  for (const attachment of message.attachments ?? []) {
    parts.push(`--${boundary}`);
    parts.push(`Content-Type: application/pdf; name="${attachment.filename}"`);
    parts.push('Content-Transfer-Encoding: base64');
    parts.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
    parts.push('');
    parts.push(wrappedBase64(attachment.contentBase64.replace(/\s+/g, '')));
  }
  parts.push(`--${boundary}--`);
  return parts.join('\r\n');
};

export async function sendSmtpMessage(
  config: SmtpConfig,
  message: SmtpMessage,
): Promise<{ accepted: string }> {
  const { connect } = await import('cloudflare:sockets');
  let socket = connect(
    { hostname: config.host, port: config.port },
    { secureTransport: config.secure ? 'on' : 'starttls' } as Parameters<typeof connect>[1],
  ) as unknown as SocketLike;
  let reader = new LineReader(socket);
  const write = async (data: string) => {
    const writer = socket.writable.getWriter();
    await writer.write(encoder.encode(data));
    writer.releaseLock();
  };
  const expect = async (allowed: number[], step: string) => {
    const reply = await reader.readReply();
    if (!allowed.includes(reply.code))
      throw new Error(`SMTP ${step} failed: ${reply.text}`);
    return reply;
  };
  await expect([220], 'greeting');
  await write('EHLO hotelx.local\r\n');
  await expect([250], 'EHLO');
  if (!config.secure) {
    await write('STARTTLS\r\n');
    await expect([220], 'STARTTLS');
    if (typeof socket.startTls !== 'function')
      throw new Error('STARTTLS is not supported on this connection.');
    socket = socket.startTls();
    reader = new LineReader(socket);
    await write('EHLO hotelx.local\r\n');
    await expect([250], 'EHLO after STARTTLS');
  }
  await write('AUTH LOGIN\r\n');
  await expect([334], 'AUTH LOGIN');
  await write(`${btoa(config.user)}\r\n`);
  await expect([334], 'AUTH username');
  await write(`${btoa(config.password)}\r\n`);
  await expect([235, 503], 'AUTH password');
  await write(`MAIL FROM:<${message.from}>\r\n`);
  await expect([250], 'MAIL FROM');
  for (const recipient of message.to) {
    await write(`RCPT TO:<${recipient}>\r\n`);
    await expect([250, 251], 'RCPT TO');
  }
  await write('DATA\r\n');
  await expect([354], 'DATA');
  await write(`${buildMime(message)}\r\n.\r\n`);
  await expect([250], 'message body');
  await write('QUIT\r\n');
  await socket.close().catch(() => {});
  return { accepted: message.to.join(', ') };
}
