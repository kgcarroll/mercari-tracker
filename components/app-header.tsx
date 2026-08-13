"use client";

import { UserButton } from "@clerk/nextjs";

export function AppHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div>
          <p className="text-sm font-medium tracking-tight">Mercari Tracker</p>
          <p className="text-xs text-muted-foreground">Needoh resale P&amp;L</p>
        </div>
        <UserButton />
      </div>
    </header>
  );
}
