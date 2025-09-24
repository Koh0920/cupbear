import { NextResponse } from 'next/server';

export type ProblemDetail = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
};

export function problemJson(problem: ProblemDetail, init?: { headers?: HeadersInit }): NextResponse {
  const response = NextResponse.json(problem, {
    status: problem.status,
    headers: {
      'content-type': 'application/problem+json',
      ...(init?.headers ?? {}),
    },
  });
  return response;
}

export function validationProblem(detail: string, status = 400): ProblemDetail {
  return {
    type: 'https://docs.cupbear.example/problems/validation-error',
    title: 'Validation error',
    status,
    detail,
  };
}

export function rateLimitProblem(detail: string, status = 429): ProblemDetail {
  return {
    type: 'https://docs.cupbear.example/problems/rate-limit',
    title: 'Too Many Requests',
    status,
    detail,
  };
}

export function upstreamProblem(detail: string, status = 503): ProblemDetail {
  return {
    type: 'https://docs.cupbear.example/problems/upstream-error',
    title: 'Upstream service unavailable',
    status,
    detail,
  };
}

export function serverProblem(detail: string, status = 500): ProblemDetail {
  return {
    type: 'https://docs.cupbear.example/problems/server-error',
    title: 'Internal Server Error',
    status,
    detail,
  };
}
