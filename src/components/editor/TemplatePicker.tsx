"use client";

import { useRef, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { useEditorSession } from "./EditorSession";

export default function TemplatePicker({ portfolioId, value, onSaved, onBusy }: {
  portfolioId: string; value: string; onSaved: (key: string) => void; onBusy: (busy: boolean) => void;
}) {
  const { exporting } = useEditorSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const change = async (key: string) => {
    if (busy || exporting || key === value) return;
    setBusy(true); onBusy(true); setMessage("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
      const { data, error } = await supabase.from("portfolios").update({ template_key: key })
        .eq("id", portfolioId).eq("user_id", user.id).select("id, template_key").single();
      if (error) throw error;
      if (!data) throw new Error("ไม่สามารถบันทึกเทมเพลตได้");
      if (mounted.current) { onSaved(data.template_key); setMessage("บันทึกเทมเพลตแล้ว"); }
    } catch (error) {
      if (mounted.current) setMessage(errorMessage(error) || "บันทึกเทมเพลตไม่สำเร็จ");
    } finally {
      if (mounted.current) { setBusy(false); onBusy(false); }
    }
  };
  return <div className="flex flex-wrap items-center gap-2 text-xs">
    <label htmlFor="portfolio-template" className="font-semibold text-slate-700">เทมเพลต</label>
    <select id="portfolio-template" value={value} disabled={busy || exporting} onChange={event => void change(event.target.value)} className="min-h-11 max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:text-sm">
      <option value="classic">Classic</option>
      <option value="modern">Modern University · ฟ้า–น้ำเงิน–ขาว</option>
      <option value="minimal">Gallery Editorial · ภาพใหญ่–ตัวอักษรเด่น</option>
      {!["classic", "modern", "minimal"].includes(value) && <option value={value}>รูปแบบเดิม</option>}
    </select>
    <span role="status" className="text-slate-600">{busy ? "กำลังบันทึกเทมเพลต…" : message}</span>
  </div>;
}
