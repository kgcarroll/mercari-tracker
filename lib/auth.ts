import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function requireAppUser() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress?.toLowerCase() ??
    user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();

  if (allowed && email !== allowed) {
    redirect("/forbidden");
  }

  return { userId, email, user };
}
