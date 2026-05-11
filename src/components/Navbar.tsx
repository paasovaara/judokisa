import { getCurrentUser } from "@/lib/session";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const user = await getCurrentUser();
  return (
    <NavbarClient
      currentUser={
        user ? { firstName: user.firstName, lastName: user.lastName } : null
      }
    />
  );
}
