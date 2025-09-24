export type ProblemDetail = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
};

export class AgentError extends Error {
  readonly status: number;
  readonly type: string;
  readonly detail?: string;

  constructor(message: string, options: { status?: number; type?: string; detail?: string } = {}) {
    super(message);
    this.name = "AgentError";
    this.status = options.status ?? 500;
    this.type = options.type ?? "about:blank";
    this.detail = options.detail;
  }

  toProblem(): ProblemDetail {
    return {
      type: this.type,
      title: this.message,
      status: this.status,
      ...(this.detail ? { detail: this.detail } : {}),
    };
  }
}

export function toProblem(err: unknown): ProblemDetail {
  if (err instanceof AgentError) {
    return err.toProblem();
  }

  const message = err instanceof Error ? err.message : "Unexpected error";

  return {
    type: "about:blank",
    title: message,
    status: 500,
  };
}
