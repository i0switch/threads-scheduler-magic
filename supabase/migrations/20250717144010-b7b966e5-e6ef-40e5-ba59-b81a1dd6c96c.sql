-- Check if cron job is calling the schedule-posts function
SELECT 
    cron.schedule(
        'schedule-posts-job',
        '*/5 * * * *',  -- Every 5 minutes
        $$
        select
            net.http_post(
                url:='https://tqcgbsnoiarnawnppwia.supabase.co/functions/v1/schedule-posts',
                headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY2dic25vaWFybmF3bnBwd2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTUxODEsImV4cCI6MjA2NTQ5MTE4MX0.5_mXobtncEbIHyigC_EqP-z1cr7AWYepR7L2CZwjBvI"}'::jsonb
            ) as request_id;
        $$
    );

-- Also check existing cron jobs
SELECT jobname, schedule, active FROM cron.job;