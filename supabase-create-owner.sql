-- ============================================================================
-- StockFlow — إنشاء حساب دخول المالك (Supabase Auth)
-- ============================================================================
-- يساوي بالضبط: Supabase Dashboard → Authentication → Users → Add user
-- لكن من محرر SQL نفسه حتى لا تضطر لمغادرة الموقع.
--
-- طريقة الاستخدام:
--   1) شغّل supabase-schema.sql أولاً (حتى توجد جداول users و root_admins).
--   2) شغّل هذا السكربت في: Supabase Dashboard → SQL Editor → New query → Run.
--   3) اقرأ كلمة المرور المولّدة من ناتج التشغيل (Messages / Notices)
--      واحفظها — هذه كلمة مرور دخولك.
--   4) افتح موقعك وسجّل الدخول بالبريد + كلمة المرور هذه.
--
-- آمن للتكرار: لو الحساب موجود من قبل يتخطاه فقط.
-- لو أخطأ هذا السكربت على نسخة Supabase عندك، تجاهله وأنشئ الحساب من
-- Dashboard — بقية النظام يعمل بأي طريقة.
-- ============================================================================

do $$
declare
  owner_email text;
  generated   text;
  new_id      uuid;
begin
  -- أول بريد مالك من supabase-schema.sql (root_admins).
  select email into owner_email from public.root_admins order by email limit 1;
  if owner_email is null then
    raise notice 'لا يوجد بريد مالك. شغّل supabase-schema.sql أولاً.';
    return;
  end if;

  if exists (select 1 from auth.users where lower(email) = lower(owner_email)) then
    raise notice 'حساب Auth موجود مسبقاً لـ %. لا شيء للتنفيذ.', owner_email;
    return;
  end if;

  -- كلمة مرور عشوائية لا تُحفظ في أي ملف — تظهر في ناتج التشغيل فقط.
  generated := 'SF' || lpad(floor(random()*10000)::int::text, 4, '0')
            || '@' || substring(md5(random()::text) from 1 for 8);
  new_id := gen_random_uuid();

  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      new_id,
      'authenticated', 'authenticated',
      owner_email,
      crypt(generated, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now()
    );
  exception when others then
    raise notice 'تعذر إنشاء حساب Auth: %. أنشئه من Authentication → Users → Add user بدلاً من ذلك.', sqlerrm;
    return;
  end;

  -- إضافة هوية البريد (مطلوبة في إصدارات GoTrue الأحدث).
  begin
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      new_id::text, new_id,
      jsonb_build_object('sub', new_id::text, 'email', owner_email,
                         'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    );
  exception when others then
    raise notice 'صف الهوية لم يُضف (قد لا يكون مطلوباً في هذه النسخة): %', sqlerrm;
  end;

  raise notice 'تم إنشاء حساب دخول المالك لـ %', owner_email;
  raise notice '  ← كلمة المرور: %', generated;
  raise notice 'احفظها جيداً. يمكنك تغييرها لاحقاً بأسطر التغيير أسفل الملف.';
end $$;

-- ============================================================================
-- لتغيير كلمة مرور المالك لاحقاً — شغّل هذه الأسطر عند الحاجة:
-- ============================================================================
-- update auth.users
-- set encrypted_password = crypt('كلمة_المرور_الجديدة', gen_salt('bf')),
--     updated_at = now()
-- where lower(email) = lower('mohammed3li.2029@gmail.com');
