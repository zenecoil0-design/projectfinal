import type { SupabaseClient } from "@supabase/supabase-js";
import { EditorFormIssue } from "./form-errors";

export async function saveSelection(
  supabase: SupabaseClient,
  portfolioId: string,
  section: "education" | "activity" | "certificate",
  ids: string[],
) {
  const { error } = await supabase.rpc("replace_portfolio_selection", {
    p_portfolio_id: portfolioId,
    p_section: section,
    p_item_ids: ids,
  });
  if (error?.code === "PGRST202") {
    throw new EditorFormIssue("selectionUnavailable");
  }
  if (error) throw error;
}
