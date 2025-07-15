import { useState, useEffect } from "react"
import { Upload, Calendar, Clock, X, Image as ImageIcon, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Post {
  id: string
  content: string
  scheduledDate: string
  scheduledTime: string
  account: string
  status: string
  images: string[]
}

interface EditPostModalProps {
  post: Post | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedPost: Post) => void
}

const accounts = [
  { id: "1", username: "@user_account1", displayName: "メインアカウント" },
  { id: "2", username: "@user_account2", displayName: "サブアカウント" }
]

export function EditPostModal({ post, isOpen, onClose, onSave }: EditPostModalProps) {
  const [postContent, setPostContent] = useState("")
  const [selectedAccount, setSelectedAccount] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    if (post) {
      setPostContent(post.content)
      setSelectedAccount(post.account)
      setScheduledDate(post.scheduledDate)
      setScheduledTime(post.scheduledTime)
      setImages(post.images)
    }
  }, [post])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && images.length < 4) {
      const newImages = Array.from(files).slice(0, 4 - images.length)
      newImages.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            setImages(prev => [...prev, e.target!.result as string])
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!post) return
    
    const updatedPost: Post = {
      ...post,
      content: postContent,
      account: selectedAccount,
      scheduledDate,
      scheduledTime,
      images
    }
    
    onSave(updatedPost)
    onClose()
  }

  const isFormValid = postContent.trim() && selectedAccount && scheduledDate && scheduledTime

  if (!post) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            投稿を編集
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="account">投稿アカウント</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="アカウントを選択してください" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.username}>
                    <div className="flex flex-col">
                      <span className="font-medium">{account.username}</span>
                      <span className="text-xs text-muted-foreground">{account.displayName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Post Content */}
          <div className="space-y-2">
            <Label htmlFor="content">投稿内容</Label>
            <Textarea
              id="content"
              placeholder="投稿内容を入力してください..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <div className="text-right text-xs text-muted-foreground">
              {postContent.length} / 500文字
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>画像（最大4枚）</Label>
            <div className="space-y-4">
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group animate-fade-in">
                      <img
                        src={image}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover-scale"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {images.length < 4 && (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload-edit"
                  />
                  <Label
                    htmlFor="image-upload-edit"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      画像をアップロード ({images.length}/4)
                    </span>
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">予約日付</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">予約時刻</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-primary hover:opacity-90"
              disabled={!isFormValid}
            >
              <Upload className="w-4 h-4 mr-2" />
              変更を保存
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}