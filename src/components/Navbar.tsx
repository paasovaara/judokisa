import { getCurrentUser } from "@/lib/session";
import { supabaseConfigured } from "@/lib/supabase/server";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const user = await getCurrentUser();
  // Route the login link at the real auth flow when Supabase is configured;
  // fall back to the dev mock /login picker otherwise.
  const loginPath = supabaseConfigured() ? "/auth/login" : "/login";
  return (
    <NavbarClient
      currentUser={
        user ? { firstName: user.firstName, lastName: user.lastName } : null
      }
      loginPath={loginPath}
    />
  );
}
