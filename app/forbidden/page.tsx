"use client";

import { SignOutButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Not allowed</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This tracker is private. Sign in with the allowlisted email, or ask the owner
        to add yours.
      </p>
      <SignOutButton>
        <Button>Sign out</Button>
      </SignOutButton>
    </div>
  );
}
