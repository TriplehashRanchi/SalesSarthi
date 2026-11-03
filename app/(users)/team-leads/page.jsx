'use client'
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TeamLeads from "@/components/team/TeamLeads";

export default function TeamLeadsPage() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user && user.role !== "Manager") router.replace("/user-dashboard");
  }, [user, router]);
  if (!user || user.role !== "Manager") return null;

  return <TeamLeads />;
}
