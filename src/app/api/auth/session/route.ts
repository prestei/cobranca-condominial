import { getSession } from "@/lib/auth/session";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return Response.json({ user: null });
  }
  return Response.json({ user });
}
