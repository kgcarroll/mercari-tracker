import { AppHeader } from "@/components/app-header";
import { TrackerApp } from "@/components/tracker-app";
import { requireAppUser } from "@/lib/auth";
import { listItems } from "@/lib/db/queries";

export default async function Home() {
  await requireAppUser();
  const items = await listItems();

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Net profit is realized profit minus unsold inventory at cost.
            Mercari fee is 10% of (sale + shipping). Sold profit is sale − fee − cost.
          </p>
        </div>
        <TrackerApp items={items} />
      </main>
    </div>
  );
}
