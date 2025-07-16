import { useState, useEffect } from "react"
import { Plus, Trash2, User, ExternalLink, Shield, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"

interface Persona {
  id: string
  name: string
  threads_username: string | null
  is_active: boolean
  created_at: string
  avatar_url: string | null
  threads_access_token: string | null
}

export default function AccountManagement() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newPersonaName, setNewPersonaName] = useState("")
  const [newPersonaUsername, setNewPersonaUsername] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchPersonas = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

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
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchPersonas()
    }
  }, [user])

  const handleCreatePersona = async () => {
    if (!user || !newPersonaName.trim()) return
    
    setCreating(true)
    
    try {
      const { error } = await supabase
        .from('personas')
        .insert({
          user_id: user.id,
          name: newPersonaName.trim(),
          threads_username: newPersonaUsername.trim() || null,
          is_active: true
        })

      if (error) throw error
      
      toast({
        title: "アカウント作成完了",
        description: "新しいアカウントが作成されました",
      })
      
      setNewPersonaName("")
      setNewPersonaUsername("")
      setIsAddDialogOpen(false)
      fetchPersonas()
    } catch (error) {
      console.error('Error creating persona:', error)
      toast({
        title: "エラー",
        description: "アカウントの作成に失敗しました",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePersona = async (personaId: string) => {
    const confirmed = window.confirm("このアカウントを削除しますか？")
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', personaId)

      if (error) throw error
      
      setPersonas(personas.filter(persona => persona.id !== personaId))
      toast({
        title: "削除完了",
        description: "アカウントが削除されました",
      })
    } catch (error) {
      console.error('Error deleting persona:', error)
      toast({
        title: "エラー",
        description: "アカウントの削除に失敗しました",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">アカウントを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="hover-scale">
                <ArrowLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">アカウント管理</h1>
              <p className="text-muted-foreground">Threadsアカウントの追加・削除ができます</p>
            </div>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                アカウントを追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新しいアカウントを追加</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="personaName">アカウント名</Label>
                  <Input
                    id="personaName"
                    placeholder="例: メインアカウント"
                    value={newPersonaName}
                    onChange={(e) => setNewPersonaName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="threadsUsername">Threadsユーザー名（オプション）</Label>
                  <Input
                    id="threadsUsername"
                    placeholder="例: @username"
                    value={newPersonaUsername}
                    onChange={(e) => setNewPersonaUsername(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={handleCreatePersona}
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={!newPersonaName.trim() || creating}
                >
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Plus className="w-4 h-4 mr-2" />
                  アカウントを作成
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {personas.map((persona, index) => (
            <Card 
              key={persona.id} 
              className="shadow-card hover:shadow-elegant transition-all duration-300 hover-scale animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{persona.name}</h3>
                        <Badge 
                          variant={persona.is_active ? "default" : "secondary"}
                          className={persona.is_active ? "bg-green-100 text-green-700" : ""}
                        >
                          {persona.is_active ? "アクティブ" : "非アクティブ"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {persona.threads_username || "Threads未連携"}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>作成日: {new Date(persona.created_at).toLocaleDateString('ja-JP')}</span>
                        <span>状態: {persona.threads_access_token ? "連携済み" : "未連携"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePersona(persona.id)}
                    className="hover:bg-destructive/10 hover:text-destructive hover-scale"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {personas.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">アカウントがありません</h3>
            <p className="text-muted-foreground mb-4">
              アカウントを追加して投稿管理を始めましょう
            </p>
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              className="bg-gradient-primary hover:opacity-90 hover-scale"
            >
              <Plus className="w-4 h-4 mr-2" />
              アカウントを追加
            </Button>
          </div>
        )}

        <Card className="bg-gradient-card border-primary/20 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-sm text-primary">使い方</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• アカウントを作成後、投稿ページで選択できます</p>
            <p>• Threads連携は今後のアップデートで追加予定です</p>
            <p>• 不要になったアカウントはいつでも削除できます</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}