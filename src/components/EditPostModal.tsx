import { useState, useEffect } from "react"
import { Upload, Calendar, Clock, X, Image as ImageIcon, Edit, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"

interface Post {
  id: string
  content: string
  scheduled_for: string | null
  persona_id: string | null
  status: string
  images: string[] | null
  personas?: {
    name: string
  }
}

interface Persona {
  id: string
  name: string
  threads_username: string | null
}

interface EditPostModalProps {
  post: Post | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedPost: Post) => Promise<void>
}

export function EditPostModal({ post, isOpen, onClose, onSave }: EditPostModalProps) {
  const [postContent, setPostContent] = useState("")
  const [selectedPersona, setSelectedPersona] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingPersonas, setFetchingPersonas] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchPersonas = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('id, name, threads_username')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error
      setPersonas(data || [])
    } catch (error) {
      console.error('Error fetching personas:', error)
    } finally {
      setFetchingPersonas(false)
    }
  }

  useEffect(() => {
    if (user && isOpen) {
      fetchPersonas()
    }
  }, [user, isOpen])

  useEffect(() => {
    if (post) {
      setPostContent(post.content)
      setSelectedPersona(post.persona_id || "")
      setImages(post.images || [])
      
      if (post.scheduled_for) {
        const date = new Date(post.scheduled_for)
        setScheduledDate(date.toISOString().split('T')[0])
        setScheduledTime(date.toTimeString().split(' ')[0].slice(0, 5))
      } else {
        setScheduledDate("")
        setScheduledTime("")
      }
    }
  }, [post])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || !user) return

    const newFiles = Array.from(files).slice(0, 4 - images.length)
    
    for (const file of newFiles) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('persona-avatars')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('persona-avatars')
          .getPublicUrl(filePath)

        setImages(prev => [...prev, data.publicUrl])
      } catch (error) {
        console.error('Error uploading image:', error)
        toast({
          title: "エラー",
          description: "画像のアップロードに失敗しました",
          variant: "destructive"
        })
      }
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!post) return
    
    setLoading(true)
    
    try {
      const scheduledDateTime = scheduledDate && scheduledTime 
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null

      const updatedPost: Post = {
        ...post,
        content: postContent,
        persona_id: selectedPersona || null,
        scheduled_for: scheduledDateTime,
        images: images.length > 0 ? images : null,
        status: scheduledDateTime ? 'scheduled' : 'draft'
      }
      
      await onSave(updatedPost)
      onClose()
      
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
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = postContent.trim() && selectedPersona

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
            <Label htmlFor="persona">投稿アカウント</Label>
            {fetchingPersonas ? (
              <div className="flex items-center gap-2 p-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">アカウントを読み込み中...</span>
              </div>
            ) : personas.length === 0 ? (
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">アカウントが登録されていません</p>
              </div>
            ) : (
              <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                <SelectTrigger>
                  <SelectValue placeholder="アカウントを選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {personas.map(persona => (
                    <SelectItem key={persona.id} value={persona.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{persona.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {persona.threads_username || "Threads未連携"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
              disabled={!isFormValid || loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Upload className="w-4 h-4 mr-2" />
              変更を保存
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}