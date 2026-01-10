import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";

// Admin emails allowlist
const ADMIN_EMAILS = [
  "dhurls99@gmail.com",
  "kaitlyn@refractionfestival.com",
  "jim@refractionfestival.com",
  "graham@refractionfestival.com",
  "lovegreg@gmail.com",
  "greg@refractionfestival.com",
];

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return apiError("Email is required", 400);
    }

    const isAdmin = ADMIN_EMAILS.includes(email);

    return apiSuccess({ isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return apiError("Failed to check admin status", 500);
  }
}
