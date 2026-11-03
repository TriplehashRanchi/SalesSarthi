'use client'
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import MemberReport from "@/components/team/MemberReport";

export default function TeamKpiMember() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user && user.role !== "Manager") router.replace("/user-dashboard");
  }, [user, router]);
  if (!user || user.role !== "Manager") return null;

  return <MemberReport id={id} backHref="/team-kpi" />;
}
