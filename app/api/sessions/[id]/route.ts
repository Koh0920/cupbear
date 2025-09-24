import { NextResponse, type NextRequest } from "next/server";

import sessionStore from "../../../lib/session-store";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

function problem(status: number, title: string) {
  return NextResponse.json(
    {
      type: "about:blank",
      title,
      status,
    },
    {
      status,
      headers: { "Content-Type": "application/problem+json" },
    },
  );
}

export async function GET(_request: NextRequest, context: Params) {
  const session = sessionStore.get(context.params.id);
  if (!session) {
    return problem(404, "Session not found");
  }

  return NextResponse.json(session);
}
