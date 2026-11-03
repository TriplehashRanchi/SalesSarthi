'use client'
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TeamKpi from "@/components/team/TeamKpi";

export default function TeamKpiPage() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user && user.role !== "Manager") router.replace("/user-dashboard");
  }, [user, router]);
  if (!user || user.role !== "Manager") return null;

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold">Team KPI</h2>
      <p className="mb-4 text-sm text-gray-500">Calls, connects, talk time and follow-ups for your team.</p>
      <TeamKpi basePath="/team-kpi" />
    </div>
  );
}
