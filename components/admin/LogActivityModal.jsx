"use client";

import { getAuth } from "firebase/auth";
import { useState } from "react";

export default function LogActivityModal({ open, setOpen, agentId, refresh }) {
  if (!open) return null;

  const [form, setForm] = useState({
    activity_date: new Date().toISOString().slice(0, 10),
    leads: 0,
    meetings: 0,
    sales: 0,
  });

  const submit = async () => {
    const auth = getAuth();
    const token = await auth.currentUser.getIdToken();

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...form,
        agent_id: agentId,
      }),
    });

    refresh();
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-[400px]">
        <h2 className="text-xl font-semibold mb-4">Log Activity</h2>

        <input
          type="date"
          className="border p-2 w-full rounded mb-2"
          value={form.activity_date}
          onChange={(e) =>
            setForm({ ...form, activity_date: e.target.value })
          }
        />

        <input
          type="number"
          className="border p-2 w-full rounded mb-2"
          placeholder="Leads"
          onChange={(e) => setForm({ ...form, leads: +e.target.value })}
        />

        <input
          type="number"
          className="border p-2 w-full rounded mb-2"
          placeholder="Meetings"
          onChange={(e) => setForm({ ...form, meetings: +e.target.value })}
        />

        <input
          type="number"
          className="border p-2 w-full rounded mb-4"
          placeholder="Sales"
          onChange={(e) => setForm({ ...form, sales: +e.target.value })}
        />

        <button
          onClick={submit}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          Save
        </button>
      </div>
    </div>
  );
}
