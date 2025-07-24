-- 認証不要でpersonasテーブルを使用可能にするため、RLSポリシーを無効化
ALTER TABLE public.personas DISABLE ROW LEVEL SECURITY;

-- 関連テーブルのRLSも無効化（一人で使用するため）
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduling_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_check_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_queue DISABLE ROW LEVEL SECURITY;