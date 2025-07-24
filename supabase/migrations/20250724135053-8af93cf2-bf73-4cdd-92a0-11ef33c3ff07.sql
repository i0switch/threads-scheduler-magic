-- post-imagesバケットへのアップロードを誰でも可能にする（テストアプリ用）
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;

-- 新しいポリシーを作成（認証不要でアップロード・閲覧可能）
CREATE POLICY "Anyone can upload to post-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "Anyone can view post-images" ON storage.objects
FOR SELECT USING (bucket_id = 'post-images');

CREATE POLICY "Anyone can update post-images" ON storage.objects
FOR UPDATE USING (bucket_id = 'post-images');

CREATE POLICY "Anyone can delete post-images" ON storage.objects
FOR DELETE USING (bucket_id = 'post-images');