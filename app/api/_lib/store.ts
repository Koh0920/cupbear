import net from 'node:net';

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  setex(key: string, ttlSeconds: number, value: string): Promise<'OK'>;
  incr(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<number>;
}

class MemoryStore implements KeyValueStore {
  private store = new Map<string, { value: string; expiresAt: number }>();
  private counters = new Map<string, { count: number; expiresAt: number }>();

  private isExpired(expiresAt: number): boolean {
    return expiresAt !== Infinity && Date.now() >= expiresAt;
  }

  async get(key: string): Promise<string | null> {
    const record = this.store.get(key);
    if (!record) return null;
    if (this.isExpired(record.expiresAt)) {
      this.store.delete(key);
      return null;
    }
    return record.value;
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<'OK'> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const record = this.counters.get(key);
    if (!record || this.isExpired(record.expiresAt)) {
      const counter = { count: 1, expiresAt: Infinity };
      this.counters.set(key, counter);
      return counter.count;
    }
    record.count += 1;
    return record.count;
  }

  async ttl(key: string): Promise<number> {
    const record = this.counters.get(key) ?? this.store.get(key);
    if (!record) return -2;
    if (this.isExpired(record.expiresAt)) {
      this.counters.delete(key);
      this.store.delete(key);
      return -2;
    }
    if (record.expiresAt === Infinity) return -1;
    return Math.ceil((record.expiresAt - Date.now()) / 1000);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    const record = this.counters.get(key);
    if (!record) return 0;
    record.expiresAt = Date.now() + ttlSeconds * 1000;
    this.counters.set(key, record);
    return 1;
  }
}

class RedisStore implements KeyValueStore {
  private client: RedisClient;

  constructor(url: string) {
    this.client = new RedisClient(url);
  }

  async get(key: string): Promise<string | null> {
    const result = await this.client.sendCommand(['GET', key]);
    return result === null ? null : String(result);
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<'OK'> {
    await this.client.sendCommand(['SETEX', key, String(ttlSeconds), value]);
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const result = await this.client.sendCommand(['INCR', key]);
    return Number(result);
  }

  async ttl(key: string): Promise<number> {
    const result = await this.client.sendCommand(['TTL', key]);
    return Number(result);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    const result = await this.client.sendCommand(['EXPIRE', key, String(ttlSeconds)]);
    return Number(result);
  }
}

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

class RedisClient {
  private socket: net.Socket | null = null;
  private buffer = Buffer.alloc(0);
  private queue: PendingRequest[] = [];
  private connectPromise: Promise<void> | null = null;
  private readonly hostname: string;
  private readonly port: number;
  private readonly password?: string;
  private readonly db?: number;

  constructor(url: string) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'redis:') {
      throw new Error('SESSION_REDIS_URL must use redis:// scheme');
    }
    this.hostname = parsed.hostname || '127.0.0.1';
    this.port = parsed.port ? Number(parsed.port) : 6379;
    this.password = parsed.password || undefined;
    this.db = parsed.pathname && parsed.pathname !== '/' ? Number(parsed.pathname.slice(1)) : undefined;
  }

  async sendCommand(args: string[]): Promise<unknown> {
    await this.ensureConnection();
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.socket!.write(encodeCommand(args));
    });
  }

  private async ensureConnection(): Promise<void> {
    if (this.connectPromise) {
      return this.connectPromise;
    }
    this.connectPromise = new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.hostname, port: this.port });
      const onError = (error: Error) => {
        socket.removeListener('connect', onConnect);
        this.connectPromise = null;
        reject(error);
      };
      const onConnect = async () => {
        socket.removeListener('error', onError);
        this.attachSocket(socket);
        try {
          if (this.password) {
            await this.writeInternal(['AUTH', this.password]);
          }
          if (typeof this.db === 'number' && !Number.isNaN(this.db)) {
            await this.writeInternal(['SELECT', String(this.db)]);
          }
          resolve();
        } catch (error) {
          this.failPending(error instanceof Error ? error : new Error('Redis initialisation failed'));
          reject(error as Error);
        }
      };
      socket.once('error', onError);
      socket.once('connect', onConnect);
    });
    return this.connectPromise;
  }

  private attachSocket(socket: net.Socket) {
    this.socket = socket;
    socket.on('data', (chunk) => this.onData(chunk));
    socket.on('error', (error) => this.failPending(error));
    socket.on('close', () => this.failPending(new Error('Redis connection closed')));
  }

  private async writeInternal(args: string[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.socket!.write(encodeCommand(args));
    });
  }

  private onData(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.queue.length) {
      const result = this.parseReply();
      if (!result) {
        break;
      }
      const pending = this.queue.shift();
      if (!pending) break;
      if (result.type === 'error') {
        pending.reject(result.error);
      } else {
        pending.resolve(result.value);
      }
    }
  }

  private parseReply(): { type: 'value'; value: unknown } | { type: 'error'; error: Error } | null {
    if (this.buffer.length === 0) {
      return null;
    }
    const prefix = this.buffer[0];
    if (prefix === 43 /* + */) {
      const line = this.readLine(1);
      if (line == null) return null;
      return { type: 'value', value: line };
    }
    if (prefix === 45 /* - */) {
      const line = this.readLine(1);
      if (line == null) return null;
      return { type: 'error', error: new Error(line) };
    }
    if (prefix === 58 /* : */) {
      const line = this.readLine(1);
      if (line == null) return null;
      return { type: 'value', value: Number(line) };
    }
    if (prefix === 36 /* $ */) {
      const headerEnd = this.buffer.indexOf(13 /* \r */, 1);
      if (headerEnd === -1 || headerEnd + 1 >= this.buffer.length) {
        return null;
      }
      const length = Number(this.buffer.slice(1, headerEnd).toString('utf8'));
      if (Number.isNaN(length)) {
        return { type: 'error', error: new Error('Invalid bulk length') };
      }
      const dataStart = headerEnd + 2;
      if (length === -1) {
        this.buffer = this.buffer.slice(dataStart);
        return { type: 'value', value: null };
      }
      const dataEnd = dataStart + length;
      if (this.buffer.length < dataEnd + 2) {
        return null;
      }
      const value = this.buffer.slice(dataStart, dataEnd).toString('utf8');
      this.buffer = this.buffer.slice(dataEnd + 2);
      return { type: 'value', value };
    }
    throw new Error(`Unsupported RESP prefix: ${String.fromCharCode(prefix)}`);
  }

  private readLine(offset: number): string | null {
    const start = offset;
    const end = this.buffer.indexOf(13 /* \r */, start);
    if (end === -1 || end + 1 >= this.buffer.length) {
      return null;
    }
    const value = this.buffer.slice(start, end).toString('utf8');
    this.buffer = this.buffer.slice(end + 2);
    return value;
  }

  private failPending(error: Error) {
    while (this.queue.length) {
      const pending = this.queue.shift();
      pending?.reject(error);
    }
    this.socket?.destroy();
    this.socket = null;
    this.connectPromise = null;
    this.buffer = Buffer.alloc(0);
  }
}

function encodeCommand(args: string[]): Buffer {
  const parts = [`*${args.length}\r\n`];
  for (const arg of args) {
    const value = Buffer.from(String(arg));
    parts.push(`$${value.length}\r\n`);
    parts.push(value);
    parts.push('\r\n');
  }
  return Buffer.concat(parts.map((part) => (typeof part === 'string' ? Buffer.from(part) : part)));
}

const globalStore = globalThis as typeof globalThis & { __sessionStore?: KeyValueStore };

if (!globalStore.__sessionStore) {
  const redisUrl = process.env.SESSION_REDIS_URL;
  if (redisUrl) {
    globalStore.__sessionStore = new RedisStore(redisUrl);
  } else {
    globalStore.__sessionStore = new MemoryStore();
  }
}

export const store = globalStore.__sessionStore;
