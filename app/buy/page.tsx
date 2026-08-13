import { AppHeader } from "@/components/app-header";
import { RestockGuide } from "@/components/restock-guide";
import { suggestRestock } from "@/lib/ai-restock";
import { requireAppUser } from "@/lib/auth";
import { getDashboard } from "@/lib/db/queries";
import { buildRestockGuide, restockTripNote } from "@/lib/restock";

export default async function BuyPage() {
  await requireAppUser();
  const { items } = await getDashboard();
  const rules = buildRestockGuide(items);
  const smart = await suggestRestock(rules);

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Buy / Skip</h1>
        </div>
        <RestockGuide
          rows={smart.rows}
          note={smart.note ?? restockTripNote(smart.rows)}
        />
      </main>
    </div>
  );
}
