-- 外部キー制約を削除して認証なしでpersonasテーブルを使用可能にする
ALTER TABLE public.personas DROP CONSTRAINT IF EXISTS personas_user_id_fkey;

-- 他の関連テーブルからも外部キー制約を削除
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.analytics DROP CONSTRAINT IF EXISTS analytics_user_id_fkey;
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
ALTER TABLE public.auto_replies DROP CONSTRAINT IF EXISTS auto_replies_user_id_fkey;
ALTER TABLE public.thread_replies DROP CONSTRAINT IF EXISTS thread_replies_user_id_fkey;
ALTER TABLE public.webhook_settings DROP CONSTRAINT IF EXISTS webhook_settings_user_id_fkey;
ALTER TABLE public.scheduling_settings DROP CONSTRAINT IF EXISTS scheduling_settings_user_id_fkey;
ALTER TABLE public.reply_check_settings DROP CONSTRAINT IF EXISTS reply_check_settings_user_id_fkey;
ALTER TABLE public.post_queue DROP CONSTRAINT IF EXISTS post_queue_user_id_fkey;