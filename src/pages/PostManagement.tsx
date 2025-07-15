import { useState } from "react"
import { Calendar, Clock, Edit, Trash2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock data for demonstration
const mockPosts = [
  {
    id: "1",
    content: "今日の朝食は美味しいパンケーキを作りました！レシピも近日公開予定です 🥞",
    scheduledDate: "2024-07-16",
    scheduledTime: "09:00",
    account: "@user_account1",
    status: "scheduled",
    images: ["https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=300&h=300&fit=crop"]
  },
  {
    id: "2", 
    content: "新しいプロジェクトについての投稿です。詳細は後ほど...",
    scheduledDate: "2024-07-17",
    scheduledTime: "14:30",
    account: "@user_account2", 
    status: "scheduled",
    images: []
  },
  {
    id: "3",
    content: "週末の写真撮影の様子をシェアします📸",
    scheduledDate: "2024-07-15",
    scheduledTime: "18:00",
    account: "@user_account1",
    status: "posted",
    images: ["https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=300&h=300&fit=crop"]
  }
]

const accounts = ["すべて", "@user_account1", "@user_account2"]

export default function PostManagement() {
  const [selectedAccount, setSelectedAccount] = useState("すべて")
  const [posts, setPosts] = useState(mockPosts)

  const filteredPosts = selectedAccount === "すべて" 
    ? posts 
    : posts.filter(post => post.account === selectedAccount)

  const handleEdit = (postId: string) => {
    // TODO: Implement edit functionality
    console.log("Edit post:", postId)
  }

  const handleDelete = (postId: string) => {
    setPosts(posts.filter(post => post.id !== postId))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="secondary" className="bg-primary/10 text-primary">予約済み</Badge>
      case "posted":
        return <Badge variant="secondary" className="bg-green-100 text-green-700">投稿済み</Badge>
      case "failed":
        return <Badge variant="destructive">失敗</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">投稿管理</h1>
            <p className="text-muted-foreground">予約投稿の確認・編集ができます</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="アカウント選択" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account} value={account}>{account}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="shadow-card hover:shadow-elegant transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-muted-foreground">{post.account}</div>
                    {getStatusBadge(post.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(post.id)}
                      className="hover:bg-primary/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground leading-relaxed">{post.content}</p>
                
                {post.images.length > 0 && (
                  <div className="flex gap-2">
                    {post.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Post image ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{post.scheduledDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{post.scheduledTime}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">投稿がありません</h3>
            <p className="text-muted-foreground">選択したアカウントには予約投稿がありません</p>
          </div>
        )}
      </div>
    </div>
  )
}