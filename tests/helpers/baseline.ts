// Synthetic model of the supplied 2026-10-15 metadata. Not a production schema dump.
// Only columns relevant to reset/security/foundation tests are modeled.
import { PGlite } from "@electric-sql/pglite";
export const A = "00000000-0000-0000-0000-000000000001";
export const B = "00000000-0000-0000-0000-000000000002";
export const PA = "10000000-0000-0000-0000-000000000001";
export const PB = "10000000-0000-0000-0000-000000000002";
export const LA = "20000000-0000-0000-0000-000000000001";
export const LB = "20000000-0000-0000-0000-000000000002";
export const sections = [["activity", "activities"], ["certificate", "certificates"], ["education", "educations"]] as const;
export async function baseline() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth,public TO anon,authenticated;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
    CREATE TABLE public.users(id uuid PRIMARY KEY REFERENCES auth.users(id),email text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE public.portfolios(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES public.users(id),title text,theme_color text,template_key text NOT NULL DEFAULT 'classic',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamp DEFAULT now());
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
    CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
      INSERT INTO public.users(id,email) VALUES(NEW.id,NEW.email) ON CONFLICT(id) DO UPDATE SET email=excluded.email; RETURN NEW; END $$;
    CREATE TRIGGER on_auth_user_created AFTER INSERT OR UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
    CREATE FUNCTION public.touch_portfolio_updated_at() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
      IF TG_OP='DELETE' THEN UPDATE public.portfolios SET updated_at=now() WHERE id=OLD.portfolio_id;
      ELSE UPDATE public.portfolios SET updated_at=now() WHERE id=NEW.portfolio_id;
        IF TG_OP='UPDATE' AND OLD.portfolio_id IS DISTINCT FROM NEW.portfolio_id THEN UPDATE public.portfolios SET updated_at=now() WHERE id=OLD.portfolio_id; END IF;
      END IF; RETURN NULL; END $$;
    CREATE TRIGGER set_portfolios_updated_at BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    INSERT INTO auth.users VALUES('${A}','a@example.invalid'),('${B}','b@example.invalid');
    INSERT INTO public.portfolios(id,user_id) VALUES('${PA}','${A}'),('${PB}','${B}');
    CREATE TABLE public.user_tags(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,name text NOT NULL);
    CREATE UNIQUE INDEX user_tags_unique_name ON public.user_tags(user_id,lower(name));
  `);
  for (const table of ["covers", "prefaces", "profiles", "activities", "certificates", "educations"]) {
    await db.exec(`CREATE TABLE public.${table}(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),portfolio_id uuid REFERENCES public.portfolios(id));
      ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    if (["covers", "prefaces", "profiles"].includes(table)) {
      await db.exec(`CREATE POLICY own_section ON public.${table} FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid())) WITH CHECK(EXISTS(SELECT 1 FROM public.portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid()));
        CREATE TRIGGER touch_portfolio_from_${table} AFTER INSERT OR UPDATE OR DELETE ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.touch_portfolio_updated_at();`);
    }
  }
  for (const [kind, plural] of sections) {
    await db.exec(`
      CREATE TABLE public.user_library_${plural}(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,title text NOT NULL DEFAULT 'Test',description text NOT NULL DEFAULT '',updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE public.portfolio_${plural}(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,${kind}_id uuid NOT NULL REFERENCES public.user_library_${plural}(id) ON DELETE CASCADE,sort_order integer NOT NULL DEFAULT 0,UNIQUE(portfolio_id,${kind}_id));
      CREATE TABLE public.user_library_${kind}_tags(${kind}_id uuid REFERENCES public.user_library_${plural}(id) ON DELETE CASCADE,tag_id uuid REFERENCES public.user_tags(id) ON DELETE CASCADE,PRIMARY KEY(${kind}_id,tag_id));
      INSERT INTO public.user_library_${plural}(id,user_id) VALUES('${LA}','${A}'),('${LB}','${B}');
      INSERT INTO public.portfolio_${plural}(portfolio_id,${kind}_id) VALUES('${PA}','${LA}'),('${PB}','${LB}');
      CREATE TRIGGER touch_portfolio_from_${plural} AFTER INSERT OR UPDATE OR DELETE ON public.portfolio_${plural} FOR EACH ROW EXECUTE FUNCTION public.touch_portfolio_updated_at();
      CREATE TRIGGER set_updated_at_${kind} BEFORE UPDATE ON public.user_library_${plural} FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
      ALTER TABLE public.user_library_${plural} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY own_library ON public.user_library_${plural} FOR ALL USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
      ALTER TABLE public.portfolio_${plural} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY baseline_relation ON public.portfolio_${plural} FOR ALL USING(EXISTS(SELECT 1 FROM public.portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid())) WITH CHECK(EXISTS(SELECT 1 FROM public.portfolios p WHERE p.id=portfolio_id AND p.user_id=auth.uid()));
    `);
    if (kind !== "education") {
      await db.exec(`CREATE TABLE public.user_library_${kind}_images(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),${kind}_id uuid NOT NULL REFERENCES public.user_library_${plural}(id) ON DELETE CASCADE,image_url text NOT NULL,sort_order integer NOT NULL DEFAULT 0);
        ALTER TABLE public.user_library_${kind}_images ENABLE ROW LEVEL SECURITY;
        CREATE POLICY read_images ON public.user_library_${kind}_images FOR SELECT USING(EXISTS(SELECT 1 FROM public.user_library_${plural} l WHERE l.id=${kind}_id AND l.user_id=auth.uid()));
        CREATE POLICY insert_images ON public.user_library_${kind}_images FOR INSERT WITH CHECK(EXISTS(SELECT 1 FROM public.user_library_${plural} l WHERE l.id=${kind}_id AND l.user_id=auth.uid()));
        CREATE POLICY delete_images ON public.user_library_${kind}_images FOR DELETE USING(EXISTS(SELECT 1 FROM public.user_library_${plural} l WHERE l.id=${kind}_id AND l.user_id=auth.uid()));`);
      if (kind === "certificate") await db.exec(`CREATE POLICY update_images ON public.user_library_certificate_images FOR UPDATE USING(EXISTS(SELECT 1 FROM public.user_library_certificates l WHERE l.id=certificate_id AND l.user_id=auth.uid())) WITH CHECK(EXISTS(SELECT 1 FROM public.user_library_certificates l WHERE l.id=certificate_id AND l.user_id=auth.uid()));`);
    }
  }
  await db.exec(`ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_portfolio ON public.portfolios FOR ALL USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated;
    INSERT INTO storage.objects(bucket_id,name) VALUES('portfolio-images','users/test/image.png');`);
  return db;
}
export async function asUser(db: PGlite, id: string) {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("SET ROLE authenticated");
}
