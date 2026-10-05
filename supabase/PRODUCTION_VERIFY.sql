-- وقِّع — Production verification queries
-- تشغيل يدوي بعد تطبيق migrations على مشروع Supabase الإنتاجي.
-- هذا الملف للقراءة/التحقق فقط ولا يغيّر البيانات.

-- 1) تأكد أن RLS مفعلة على الجداول الحساسة.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles',
    'user_roles',
    'documents',
    'signatures',
    'templates',
    'teams',
    'team_members',
    'certificates',
    'audit_logs',
    'document_pages',
    'document_fields',
    'field_versions',
    'document_versions',
    'usage_days',
    'entitlements'
  )
order by c.relname;

-- 2) اعرض سياسات RLS الحالية لمراجعتها.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3) تأكد أن RPCs الحساسة SECURITY DEFINER وبـsearch_path ثابت.
select
  p.proname,
  p.prosecdef as security_definer,
  p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'has_role',
    'get_usage_status',
    'consume_signing_pages',
    'delete_own_account',
    'handle_new_user',
    'update_updated_at_column'
  )
order by p.proname;

-- 4) افحص صلاحيات التنفيذ. anon/PUBLIC لا يجب أن يملكا تنفيذ RPCs الحساسة.
select
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name in (
    'has_role',
    'get_usage_status',
    'consume_signing_pages',
    'delete_own_account'
  )
order by routine_name, grantee;

-- 5) تأكد من constraint عدم سلبية الاستخدام.
select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.usage_days'::regclass
order by conname;

-- 6) تحقق سريع من عدم وجود pages_used سالبة.
select count(*) as negative_usage_rows
from public.usage_days
where pages_used < 0;

-- 7) راجع أي entitlement مجاني نشط؛ يجب ألا يمنح unlimited بعد migration الأخيرة.
select
  user_id,
  plan,
  status,
  expires_at
from public.entitlements
where plan = 'free'
  and status = 'active';

-- 8) Storage policies الخاصة بـbucket documents إن كان مستخدمًا في الإنتاج.
select
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    coalesce(qual, '') ilike '%documents%'
    or coalesce(with_check, '') ilike '%documents%'
  )
order by policyname;


-- 9) تحقق خاص بدالة حذف الحساب: يجب أن تكون بلا معاملات حتى لا يستطيع العميل تحديد مستخدم آخر.
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'delete_own_account';

-- المتوقع: صف واحد، arguments فارغ، security_definer=true، وsearch_path=""
