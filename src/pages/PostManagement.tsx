import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditPostModal } from "@/components/EditPostModal"
import { Link } from "react-router-dom"

interface Post {
  id: string
  content: string
  scheduledDate: string
  scheduledTime: string
  account: string
  status: string
  images: string[]
}

// Mock data for demonstration
const mockPosts = [
  {
    id: "1",
    content: "今日の朝食は美味しいパンケーキを作りました！レシピも近日公開予定です 🥞",
    scheduledDate: "Jul 26, 2024",
    scheduledTime: "10:00 AM",
    account: "Account 1",
    status: "scheduled",
    images: ["https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=300&h=300&fit=crop"]
  },
  {
    id: "2", 
    content: "新しいプロジェクトについての投稿です。詳細は後ほど...",
    scheduledDate: "Jul 27, 2024",
    scheduledTime: "2:00 PM",
    account: "Account 2", 
    status: "scheduled",
    images: ["https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=300&h=300&fit=crop"]
  },
  {
    id: "3",
    content: "週末の写真撮影の様子をシェアします📸",
    scheduledDate: "Jul 28, 2024",
    scheduledTime: "4:00 PM",
    account: "Account 1",
    status: "posted",
    images: ["https://images.unsplash.com/photo-1471666875520-c75081f42081?w=300&h=300&fit=crop"]
  }
]

const accounts = ["All Accounts", "Account 1", "Account 2"]

export default function PostManagement() {
  const [selectedAccount, setSelectedAccount] = useState("All Accounts")
  const [posts, setPosts] = useState(mockPosts)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const filteredPosts = selectedAccount === "All Accounts" 
    ? posts 
    : posts.filter(post => post.account === selectedAccount)

  const handleEdit = (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (post) {
      setEditingPost(post)
      setIsEditModalOpen(true)
    }
  }

  const handleSaveEdit = (updatedPost: Post) => {
    setPosts(posts.map(post => 
      post.id === updatedPost.id ? updatedPost : post
    ))
  }

  const handleDelete = (postId: string) => {
    const confirmed = window.confirm("この投稿を削除しますか？")
    if (confirmed) {
      setPosts(posts.filter(post => post.id !== postId))
    }
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
              className="flex items-center gap-4 bg-background px-4 min-h-[72px] py-2 border-b border-border/20 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => handleEdit(post.id)}
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                {post.images.length > 0 ? (
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
                  {post.scheduledDate} · {post.scheduledTime}
                </p>
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