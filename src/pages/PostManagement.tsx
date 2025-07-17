
import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditPostModal } from "@/components/EditPostModal"
import { Link } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Post {
  id: string
  content: string
  scheduled_for: string | null
  persona_id: string | null
  status: string
  images: string[] | null
  personas?: {
    name: string
    threads_access_token: string | null
  }
}

export default function PostManagement() {
  const [selectedAccount, setSelectedAccount] = useState("All Accounts")
  const [posts, setPosts] = useState<Post[]>([])
  const [accounts, setAccounts] = useState<string[]>(["All Accounts"])
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchPosts = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          personas (
            name,
            threads_access_token
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast({
        title: "エラー",
        description: "投稿の取得に失敗しました",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('name')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error
      const accountNames = ["All Accounts", ...(data?.map(p => p.name) || [])]
      setAccounts(accountNames)
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  useEffect(() => {
    if (user) {
      fetchPosts()
      fetchAccounts()
    }
  }, [user])

  const filteredPosts = selectedAccount === "All Accounts" 
    ? posts 
    : posts.filter(post => post.personas?.name === selectedAccount)

  const handleEdit = (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (post) {
      setEditingPost(post)
      setIsEditModalOpen(true)
    }
  }

  const handleSaveEdit = async (updatedPost: Post) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          content: updatedPost.content,
          scheduled_for: updatedPost.scheduled_for,
          images: updatedPost.images,
        })
        .eq('id', updatedPost.id)

      if (error) throw error
      
      setPosts(posts.map(post => 
        post.id === updatedPost.id ? { ...post, ...updatedPost } : post
      ))
      
      toast({
        title: "更新完了",
        description: "投稿が更新されました",
      })
    } catch (error) {
      console.error('Error updating post:', error)
      toast({
        title: "エラー",
        description: "投稿の更新に失敗しました",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error
      
      setPosts(posts.filter(post => post.id !== postId))
      toast({
        title: "削除完了",
        description: "投稿が削除されました",
      })
    } catch (error) {
      console.error('Error deleting post:', error)
      toast({
        title: "エラー",
        description: "投稿の削除に失敗しました",
        variant: "destructive"
      })
    }
  }

  const handleInstantPost = async (post: Post) => {
    if (!post.personas?.threads_access_token) {
      toast({
        title: "エラー",
        description: "このアカウントのThreadsアクセストークンが見つかりません",
        variant: "destructive"
      })
      return
    }

    try {
      toast({
        title: "投稿中",
        description: "投稿を公開しています...",
      })

      const { data, error } = await supabase.functions.invoke('publish-post', {
        body: {
          postId: post.id,
          content: post.content,
          images: post.images,
          accessToken: post.personas.threads_access_token
        }
      })

      if (error) {
        console.error('Instant post error:', error)
        toast({
          title: "投稿失敗",
          description: "投稿の公開に失敗しました",
          variant: "destructive"
        })
        return
      }

      if (data.success) {
        toast({
          title: "投稿完了",
          description: "投稿が正常に公開されました",
        })
        
        // Update the post status locally
        setPosts(posts.map(p => 
          p.id === post.id 
            ? { ...p, status: 'published', published_at: new Date().toISOString() }
            : p
        ))
      } else {
        toast({
          title: "投稿失敗",
          description: data.error || "投稿の公開に失敗しました",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error in instant post:', error)
      toast({
        title: "エラー",
        description: "投稿処理中にエラーが発生しました",
        variant: "destructive"
      })
    }
  }

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return { date: '', time: '' }
    const date = new Date(dateTime)
    return {
      date: date.toLocaleDateString('ja-JP'),
      time: date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">投稿を読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background font-inter">
        {/* Header */}
        <div className="flex items-center bg-background p-4 pb-2 justify-between">
          <h2 className="text-foreground text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pl-12">
            Scheduled Posts
          </h2>
          <div className="flex w-12 items-center justify-end">
            <Link to="/new-post">
              <Button
                variant="ghost"
                size="sm"
                className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 bg-transparent text-foreground gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 hover:bg-muted/50"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-3 p-3 overflow-x-auto">
          {accounts.map((account) => (
            <button
              key={account}
              onClick={() => setSelectedAccount(account)}
              className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 whitespace-nowrap transition-colors ${
                selectedAccount === account
                  ? 'bg-muted text-foreground font-medium'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              <p className="text-sm font-medium leading-normal">{account}</p>
            </button>
          ))}
        </div>

        {/* Posts list */}
        <div className="space-y-0">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-4 bg-background px-4 min-h-[72px] py-2 border-b border-border/20 last:border-b-0 hover:bg-muted/20 transition-colors"
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                {post.images && post.images.length > 0 ? (
                  <img
                    src={post.images[0]}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <div className="w-6 h-6 rounded bg-muted-foreground/20" />
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <p className="text-foreground text-base font-medium leading-normal line-clamp-1">
                  {post.content.length > 30 ? post.content.substring(0, 30) + "..." : post.content}
                </p>
                <p className="text-muted-foreground text-sm font-normal leading-normal line-clamp-1">
                  {(() => {
                    const { date, time } = formatDateTime(post.scheduled_for)
                    return date && time ? `${date} · ${time}` : post.status
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {post.personas?.name || 'アカウントなし'} · {post.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {post.status !== 'published' && post.personas?.threads_access_token && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInstantPost(post)}
                    className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    title="即時投稿"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(post.id)}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>投稿を削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        この操作は取り消せません。投稿が完全に削除されます。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(post.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        削除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">投稿がありません</h3>
            <p className="text-muted-foreground mb-4">選択したアカウントには予約投稿がありません</p>
            <Link to="/new-post">
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="w-4 h-4 mr-2" />
                最初の投稿を作成
              </Button>
            </Link>
          </div>
        )}
      </div>

      <EditPostModal
        post={editingPost}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingPost(null)
        }}
        onSave={handleSaveEdit}
      />
    </>
  )
}
