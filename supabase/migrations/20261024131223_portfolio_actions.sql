-- Prepared only. Requires foundation, cover names and visibility migrations.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.portfolio_section_visibility') IS NULL THEN RAISE EXCEPTION 'Visibility prerequisite missing'; END IF;
 IF (SELECT count(*) FROM pg_catalog.pg_constraint WHERE contype='f' AND confrelid='public.portfolios'::regclass AND confdeltype='c' AND conrelid IN ('public.covers'::regclass,'public.profiles'::regclass,'public.prefaces'::regclass,'public.activities'::regclass,'public.certificates'::regclass,'public.educations'::regclass,'public.portfolio_activities'::regclass,'public.portfolio_certificates'::regclass,'public.portfolio_educations'::regclass,'public.portfolio_section_visibility'::regclass))<>10 THEN RAISE EXCEPTION 'Cascade prerequisites missing'; END IF;
END $$;
CREATE TABLE public.portfolio_action_receipts (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL, action text NOT NULL CHECK(action IN ('duplicate','delete')),
 source_id uuid NOT NULL,title text NOT NULL,status text NOT NULL CHECK(status IN ('confirmed','rejected')),
 portfolio_id uuid,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,request_id),
 CHECK((status='confirmed')=(portfolio_id IS NOT NULL))
);
ALTER TABLE public.portfolio_action_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portfolio_action_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.portfolio_action_receipts TO authenticated;
CREATE POLICY own_receipts ON public.portfolio_action_receipts FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE FUNCTION public.perform_portfolio_action(p_request_id uuid,p_action text,p_source_id uuid,p_title text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); receipt public.portfolio_action_receipts%ROWTYPE; new_id uuid; snapshot jsonb; outcome text:='rejected';
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_source_id IS NULL OR p_action IS NULL OR p_action NOT IN ('duplicate','delete') OR p_title IS NULL OR
 (p_action='duplicate' AND p_title !~ '[^[:space:]]') OR (p_action='delete' AND p_title<>'') THEN RAISE EXCEPTION 'Invalid request' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text||':'||p_request_id::text,0));
 SELECT * INTO receipt FROM public.portfolio_action_receipts WHERE user_id=actor AND request_id=p_request_id;
 IF FOUND THEN
  IF receipt.action<>p_action OR receipt.source_id<>p_source_id OR receipt.title<>p_title THEN RAISE EXCEPTION 'Request key reused with different arguments' USING ERRCODE='22023'; END IF;
  RETURN pg_catalog.to_jsonb(receipt)-'user_id'-'created_at';
 END IF;
 PERFORM 1 FROM public.portfolios WHERE id=p_source_id AND user_id=actor FOR UPDATE;
 IF FOUND THEN
  IF p_action='delete' THEN
   DELETE FROM public.portfolios WHERE id=p_source_id AND user_id=actor RETURNING id INTO new_id;
   IF new_id IS NULL THEN RAISE EXCEPTION 'Delete returned no row'; END IF;
  ELSE
   SELECT pg_catalog.jsonb_build_object('portfolio',pg_catalog.to_jsonb(p),
'covers',coalesce((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)) FROM public.covers c WHERE c.portfolio_id=p.id),'[]'::jsonb),
'prefaces',coalesce((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)) FROM public.prefaces c WHERE c.portfolio_id=p.id),'[]'::jsonb),
'profiles',coalesce((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)) FROM public.profiles c WHERE c.portfolio_id=p.id),'[]'::jsonb),
'activities',coalesce((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)) FROM public.activities c WHERE c.portfolio_id=p.id),'[]'::jsonb),
'certificates',coalesce((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)) FROM public.certificates c WHERE c.portfolio_id=p.id),'[]'::jsonb),
'educations',coalesce((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)) FROM public.educations c WHERE c.portfolio_id=p.id),'[]'::jsonb),
'portfolio_educations',coalesce((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)) FROM public.portfolio_educations c WHERE c.portfolio_id=p.id),'[]'::jsonb),
'portfolio_activities',coalesce((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)) FROM public.portfolio_activities c WHERE c.portfolio_id=p.id),'[]'::jsonb),
'portfolio_certificates',coalesce((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)) FROM public.portfolio_certificates c WHERE c.portfolio_id=p.id),'[]'::jsonb),
'portfolio_section_visibility',coalesce((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)) FROM public.portfolio_section_visibility c WHERE c.portfolio_id=p.id),'[]'::jsonb)) INTO snapshot FROM public.portfolios p WHERE p.id=p_source_id AND p.user_id=actor;
IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_populate_recordset(NULL::public.portfolio_activities,snapshot->'portfolio_activities') x LEFT JOIN public.user_library_activities l ON l.id=x.activity_id AND l.user_id=actor WHERE l.id IS NULL) THEN RAISE EXCEPTION 'Invalid library ownership' USING ERRCODE='42501'; END IF;
IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_populate_recordset(NULL::public.portfolio_certificates,snapshot->'portfolio_certificates') x LEFT JOIN public.user_library_certificates l ON l.id=x.certificate_id AND l.user_id=actor WHERE l.id IS NULL) THEN RAISE EXCEPTION 'Invalid library ownership' USING ERRCODE='42501'; END IF;
IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_populate_recordset(NULL::public.portfolio_educations,snapshot->'portfolio_educations') x LEFT JOIN public.user_library_educations l ON l.id=x.education_id AND l.user_id=actor WHERE l.id IS NULL) THEN RAISE EXCEPTION 'Invalid library ownership' USING ERRCODE='42501'; END IF;
INSERT INTO public.portfolios(user_id,title,template_key,theme_color) SELECT actor,p_title,p.template_key,p.theme_color FROM pg_catalog.jsonb_populate_record(NULL::public.portfolios,snapshot->'portfolio') p RETURNING id INTO new_id;
INSERT INTO public.covers(portfolio_id,cover_image_url,title,subtitle,school_name,first_name,last_name) SELECT new_id,cover_image_url,title,subtitle,school_name,first_name,last_name FROM pg_catalog.jsonb_populate_recordset(NULL::public.covers,snapshot->'covers');
INSERT INTO public.prefaces(portfolio_id,content,signature_name) SELECT new_id,content,signature_name FROM pg_catalog.jsonb_populate_recordset(NULL::public.prefaces,snapshot->'prefaces');
INSERT INTO public.profiles(portfolio_id,profile_image_url,first_name,last_name,nickname,date_of_birth,blood_group,address,phone,contact_email,social_links,talents,motto,nationality,ethnicity,religion,school,plan,gpax,custom_fields) SELECT new_id,profile_image_url,first_name,last_name,nickname,date_of_birth,blood_group,address,phone,contact_email,social_links,talents,motto,nationality,ethnicity,religion,school,plan,gpax,custom_fields FROM pg_catalog.jsonb_populate_recordset(NULL::public.profiles,snapshot->'profiles');
INSERT INTO public.activities(portfolio_id,title,description,images) SELECT new_id,title,description,images FROM pg_catalog.jsonb_populate_recordset(NULL::public.activities,snapshot->'activities');
INSERT INTO public.certificates(portfolio_id,title,description,image_url) SELECT new_id,title,description,image_url FROM pg_catalog.jsonb_populate_recordset(NULL::public.certificates,snapshot->'certificates');
INSERT INTO public.educations(portfolio_id,level,school_name,major,gpa) SELECT new_id,level,school_name,major,gpa FROM pg_catalog.jsonb_populate_recordset(NULL::public.educations,snapshot->'educations');
INSERT INTO public.portfolio_educations(portfolio_id,education_id,sort_order) SELECT new_id,education_id,sort_order FROM pg_catalog.jsonb_populate_recordset(NULL::public.portfolio_educations,snapshot->'portfolio_educations');
INSERT INTO public.portfolio_activities(portfolio_id,activity_id,sort_order) SELECT new_id,activity_id,sort_order FROM pg_catalog.jsonb_populate_recordset(NULL::public.portfolio_activities,snapshot->'portfolio_activities');
INSERT INTO public.portfolio_certificates(portfolio_id,certificate_id,sort_order) SELECT new_id,certificate_id,sort_order FROM pg_catalog.jsonb_populate_recordset(NULL::public.portfolio_certificates,snapshot->'portfolio_certificates');
INSERT INTO public.portfolio_section_visibility(portfolio_id,section,visible) SELECT new_id,section,visible FROM pg_catalog.jsonb_populate_recordset(NULL::public.portfolio_section_visibility,snapshot->'portfolio_section_visibility');
  END IF;
  outcome:='confirmed';
 END IF;
 INSERT INTO public.portfolio_action_receipts(user_id,request_id,action,source_id,title,status,portfolio_id) VALUES(actor,p_request_id,p_action,p_source_id,p_title,outcome,new_id) RETURNING * INTO receipt;
 RETURN pg_catalog.to_jsonb(receipt)-'user_id'-'created_at';
END $$;
REVOKE ALL ON FUNCTION public.perform_portfolio_action(uuid,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.perform_portfolio_action(uuid,text,uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
