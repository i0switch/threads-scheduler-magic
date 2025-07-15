import { useState } from "react"
import { Upload, Calendar, Clock, Plus, X, Image as ImageIcon, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link } from "react-router-dom"

// Mock accounts data
const accounts = [
  { id: "1", username: "@user_account1", displayName: "メインアカウント" },
  { id: "2", username: "@user_account2", displayName: "サブアカウント" }
]

export default function NewPost() {
  const [postContent, setPostContent] = useState("")
  const [selectedAccount, setSelectedAccount] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [images, setImages] = useState<string[]>([])

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
    // TODO: Implement post scheduling logic
    console.log({
      content: postContent,
      account: selectedAccount,
      date: scheduledDate,
      time: scheduledTime,
      images: images
    })
    alert("投稿が予約されました！")
    
    // Reset form
    setPostContent("")
    setSelectedAccount("")
    setScheduledDate("")
    setScheduledTime("")
    setImages([])
  }

  const isFormValid = postContent.trim() && selectedAccount && scheduledDate && scheduledTime

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="hover-scale">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">新規投稿</h1>
            <p className="text-muted-foreground">Threadsへの投稿を予約できます</p>
          </div>
        </div>

        <Card className="shadow-card hover:shadow-elegant transition-all duration-300 animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              投稿を作成
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                             className="w-full h-32 object-cover rounded-lg border hover-scale transition-transform"
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
                        id="image-upload"
                      />
                      <Label
                        htmlFor="image-upload"
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

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                  disabled={!isFormValid}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  投稿を予約する
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}