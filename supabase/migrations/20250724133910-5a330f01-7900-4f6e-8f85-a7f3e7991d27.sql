-- アプリケーション識別子を追加してデータを分離
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS app_identifier TEXT DEFAULT 'threads-manager-app';

-- 既存データにアプリ識別子を設定（このアプリ用として）
UPDATE public.personas SET app_identifier = 'threads-manager-app' WHERE app_identifier IS NULL;

-- 他の関連テーブルにもアプリ識別子を追加
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS app_identifier TEXT DEFAULT 'threads-manager-app';
UPDATE public.posts SET app_identifier = 'threads-manager-app' WHERE app_identifier IS NULL;

ALTER TABLE public.analytics ADD COLUMN IF NOT EXISTS app_identifier TEXT DEFAULT 'threads-manager-app';
UPDATE public.analytics SET app_identifier = 'threads-manager-app' WHERE app_identifier IS NULL;