import { useState, useEffect } from "react"
import { Upload, Calendar, Clock, Plus, X, Image as ImageIcon, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface Persona {
  id: string
  name: string
  threads_username: string | null
}

export default function NewPost() {
  const [postContent, setPostContent] = useState("")
  const [selectedPersona, setSelectedPersona] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingPersonas, setFetchingPersonas] = useState(true)
  const { toast } = useToast()
  const navigate = useNavigate()

  const fetchPersonas = async () => {
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('id, name, threads_username')
        .eq('is_active', true)
        .eq('app_identifier', 'threads-manager-app-v2')

      if (error) throw error
      setPersonas(data || [])
    } catch (error) {
      console.error('Error fetching personas:', error)
      toast({
        title: "エラー",
        description: "アカウント情報の取得に失敗しました",
        variant: "destructive"
      })
    } finally {
      setFetchingPersonas(false)
    }
  }

  useEffect(() => {
    fetchPersonas()
  }, [])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newFiles = Array.from(files).slice(0, 4 - images.length)
    
    for (const file of newFiles) {
      try {
        // SECURITY: Validate file type and size
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: "エラー",
            description: "JPG、PNG、GIF、WebP形式の画像のみアップロード可能です",
            variant: "destructive"
          })
          continue
        }

        // Max file size: 20MB
        const maxSizeInBytes = 20 * 1024 * 1024
        if (file.size > maxSizeInBytes) {
          toast({
            title: "エラー",
            description: "ファイルサイズは20MB以下にしてください",
            variant: "destructive"
          })
          continue
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `uploads/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('post-images')
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
    
    setLoading(true)
    
    try {
      const scheduledDateTime = scheduledDate && scheduledTime 
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null

      // If scheduled and persona has access token, publish immediately
      // Otherwise just save as draft/scheduled
      const shouldPublish = scheduledDateTime && selectedPersona
      let publishError = null

      if (shouldPublish) {
        // Check if persona has access token
        const { data: persona } = await supabase
          .from('personas')
          .select('threads_access_token')
          .eq('id', selectedPersona)
          .single()

        if (persona?.threads_access_token) {
          // Try to publish immediately via edge function
          const { error: pubError } = await supabase.functions.invoke('publish-post', {
            body: {
              content: postContent,
              images: images.length > 0 ? images : undefined,
              accessToken: persona.threads_access_token
            }
          })
          publishError = pubError
        }
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          persona_id: selectedPersona || null,
          content: postContent,
          scheduled_for: scheduledDateTime,
          images: images.length > 0 ? images : null,
          status: publishError ? 'failed' : (shouldPublish && !scheduledDateTime ? 'published' : (scheduledDateTime ? 'scheduled' : 'draft')),
          app_identifier: 'threads-manager-app-v2'
        })

      if (error) throw error
      
      toast({
        title: "投稿作成完了",
        description: scheduledDateTime ? "投稿が予約されました！" : "下書きが保存されました！",
      })
      
      // Reset form
      setPostContent("")
      setSelectedPersona("")
      setScheduledDate("")
      setScheduledTime("")
      setImages([])
      
      // Navigate back to posts
      navigate("/")
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "エラー",
        description: "投稿の作成に失敗しました",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = postContent.trim() && selectedPersona

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
                <Label htmlFor="persona">投稿アカウント</Label>
                {fetchingPersonas ? (
                  <div className="flex items-center gap-2 p-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">アカウントを読み込み中...</span>
                  </div>
                ) : personas.length === 0 ? (
                  <div className="p-4 border rounded-lg text-center space-y-2">
                    <p className="text-sm text-muted-foreground">アカウントが登録されていません</p>
                    <Link to="/accounts">
                      <Button variant="outline" size="sm">
                        アカウントを追加
                      </Button>
                    </Link>
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
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
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
                  disabled={!isFormValid || loading}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Upload className="w-4 h-4 mr-2" />
                  {scheduledDate && scheduledTime ? "投稿を予約する" : "下書きを保存"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}