"use client";

import { useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function InsightsPlatformToggle({
  value,
}: {
  value: "mercari" | "vinted";
}) {
  const router = useRouter();

  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        router.replace(next === "vinted" ? "/insights?platform=vinted" : "/insights");
      }}
    >
      <TabsList>
        <TabsTrigger value="mercari">Mercari</TabsTrigger>
        <TabsTrigger value="vinted">Vinted</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
