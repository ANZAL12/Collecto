import { getAllServerCredentials, setServerUserCredentials } from "@/lib/server-credentials";

export async function GET() {
  try {
    const creds = getAllServerCredentials();
    return Response.json({ success: true, credentials: creds });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, name, role } = body || {};

    if (!name) {
      return Response.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const cleanUser =
      username?.trim() ||
      name
        .toLowerCase()
        .trim()
        .split(/\s+/)[0]
        .replace(/[^a-z0-9]/g, "");
    const cleanPass = password?.trim() || "123";

    setServerUserCredentials(cleanUser, cleanPass, name, role || "executive");

    return Response.json({
      success: true,
      credentials: {
        username: cleanUser,
        password: cleanPass,
        name,
        role: role || "executive",
      },
    });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
