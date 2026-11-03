'use client'
import { useParams } from "next/navigation";
import MemberReport from "@/components/team/MemberReport";

export default function ViewUserDetail() {
  const { id } = useParams();
  return <MemberReport id={id} backHref="/view-user" />;
}
