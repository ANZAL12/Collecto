import { getAllServerCredentials } from "@/lib/server-credentials";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return Response.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const cleanUser = String(username).trim().toLowerCase();
    const cleanPass = String(password).trim();

    const allCreds = getAllServerCredentials();

    // Check direct username match
    let match = allCreds[cleanUser];

    // Check by name match
    if (!match) {
      match = allCreds[`name_${cleanUser}`];
    }

    // Iterate through entries if needed
    if (!match) {
      for (const key of Object.keys(allCreds)) {
        const entry = allCreds[key];
        if (
          entry &&
          (entry.username.toLowerCase() === cleanUser ||
            entry.name.toLowerCase() === cleanUser)
        ) {
          match = entry;
          break;
        }
      }
    }

    if (match && match.password === cleanPass) {
      return Response.json({
        success: true,
        session: {
          id: `user-${cleanUser}`,
          name: match.name,
          email: `${match.username}@collecto.app`,
          role: match.role || "executive",
        },
      });
    }

    return Response.json(
      {
        success: false,
        error: "Invalid username or password. Please check your credentials.",
      },
      { status: 401 }
    );
  } catch (err: any) {
    console.error("Auth API error:", err);
    return Response.json(
      { success: false, error: "Server error during authentication" },
      { status: 500 }
    );
  }
}
