export type SessionState = {
  session_id: string;
  state: "pending" | "connecting" | "viewing" | "finished" | "failed";
  reason: string | null;
  embed_url: string;
  created_at: string;
  updated_at: string;
  safe_copy?: {
    bucket: string;
    key: string;
    etag: string;
    checksum: { algorithm: string; value: string };
    expires_at?: string;
  };
};

type SessionUpdates = Partial<Omit<SessionState, "session_id" | "created_at">>;

class SessionStore {
  private sessions = new Map<string, SessionState>();

  create(sessionId: string, embedUrl: string): SessionState {
    const now = new Date().toISOString();
    const record: SessionState = {
      session_id: sessionId,
      state: "pending",
      reason: null,
      embed_url: embedUrl,
      created_at: now,
      updated_at: now,
    };
    this.sessions.set(sessionId, record);
    return record;
  }

  update(sessionId: string, updates: SessionUpdates): SessionState | null {
    const existing = this.sessions.get(sessionId);
    if (!existing) {
      return null;
    }
    const updated: SessionState = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  get(sessionId: string): SessionState | null {
    return this.sessions.get(sessionId) ?? null;
  }
}

const sessionStore = new SessionStore();
export default sessionStore;
