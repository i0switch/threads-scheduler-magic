-- 新しいユニークなアプリ識別子を生成
UPDATE public.personas 
SET app_identifier = 'threads-manager-app-' || gen_random_uuid()::text
WHERE app_identifier = 'threads-manager-app';

-- 他の関連テーブルも同様に更新
UPDATE public.posts 
SET app_identifier = 'threads-manager-app-' || gen_random_uuid()::text
WHERE app_identifier = 'threads-manager-app';

UPDATE public.analytics 
SET app_identifier = 'threads-manager-app-' || gen_random_uuid()::text
WHERE app_identifier = 'threads-manager-app';