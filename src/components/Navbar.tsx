import { getCurrentUser, hasAdminRole } from "@/lib/session";
import { supabaseConfigured } from "@/lib/supabase/server";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const user = await getCurrentUser();
  const loginPath = supabaseConfigured() ? "/auth/login" : "/login";
  return (
    <NavbarClient
      currentUser={
        user ? { firstName: user.firstName, lastName: user.lastName } : null
      }
      showAdmin={hasAdminRole(user?.profile)}
      loginPath={loginPath}
    />
  );
}
