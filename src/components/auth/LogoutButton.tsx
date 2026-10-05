"use client";

import { useRouter } from "next/navigation";
import { FaSignOutAlt } from "react-icons/fa";

import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase =
      createClient();

    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
    >
      <FaSignOutAlt />

      ออกจากระบบ
    </button>
  );
}