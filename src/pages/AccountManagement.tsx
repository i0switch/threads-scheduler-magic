import { useState, useEffect } from "react"
import { Plus, Trash2, User, ExternalLink, Shield, ArrowLeft, Loader2, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
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
  const { toast } = useToast()

  const fetchPersonas = async () => {
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
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
    fetchPersonas()
  }, [])

  const handleCreatePersona = async () => {
    if (!newPersonaName.trim()) return
    
    setCreating(true)
    
    try {
      const { error } = await supabase
        .from('personas')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
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

  const handleConnectThreads = async (personaId: string) => {
    console.log('=== Starting Threads OAuth Process ===')
    console.log('Persona ID:', personaId)
    
    try {
      // Get the Threads App ID from secrets via edge function
      console.log('Fetching app configuration...')
      const { data, error } = await supabase.functions.invoke('get-app-config')
      
      if (error) {
        console.error('App config error:', error)
        toast({
          title: "設定エラー",
          description: "アプリ設定の取得に失敗しました",
          variant: "destructive"
        })
        return
      }
      
      if (!data?.threads_app_id) {
        console.error('No Threads App ID found in config:', data)
        toast({
          title: "設定エラー",
          description: "Threads App IDが設定されていません",
          variant: "destructive"
        })
        return
      }
      
      console.log('App config retrieved successfully, App ID:', data.threads_app_id)
      
      // Fix the redirect URI to point to the correct endpoint
      const supabaseUrl = "https://tqcgbsnoiarnawnppwia.supabase.co"
      const redirectUri = encodeURIComponent(`${supabaseUrl}/functions/v1/threads-oauth`)
      const scope = "threads_basic,threads_content_publish"
      
      // Create OAuth URL
      const oauthUrl = `https://threads.net/oauth/authorize?client_id=${data.threads_app_id}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${personaId}`
      
      console.log('OAuth configuration:', {
        threadsAppId: data.threads_app_id,
        redirectUri: decodeURIComponent(redirectUri),
        scope,
        personaId,
        fullOAuthUrl: oauthUrl
      })
      
      // Open OAuth URL in a new tab to avoid iframe restrictions
      console.log('Opening Threads OAuth in new tab...')
      const newWindow = window.open(oauthUrl, '_blank', 'noopener,noreferrer')
      
      if (!newWindow) {
        toast({
          title: "ポップアップブロック",
          description: "ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。",
          variant: "destructive"
        })
        return
      }
      
      toast({
        title: "認証開始",
        description: "新しいタブでThreads認証が開始されました。認証完了後、このページを更新してください。",
      })
      
    } catch (error) {
      console.error('Error in handleConnectThreads:', error)
      toast({
        title: "エラー",
        description: "連携処理中にエラーが発生しました",
        variant: "destructive"
      })
    }
  }

  const handleTestConnection = async (personaId: string) => {
    try {
      toast({
        title: "接続テスト開始",
        description: "Threads API接続をテストしています...",
      })

      const { data, error } = await supabase.functions.invoke('get-threads-profile', {
        body: { personaId }
      })

      if (error) {
        console.error('Test connection error:', error)
        toast({
          title: "接続テスト失敗",
          description: "Threads APIとの接続に失敗しました",
          variant: "destructive"
        })
        return
      }

      if (data.success) {
        toast({
          title: "接続テスト成功",
          description: data.message || "Threads APIとの接続が正常に動作しています",
        })
        
        // Refresh personas to get updated profile info
        fetchPersonas()
      } else {
        toast({
          title: "接続テスト失敗",
          description: data.error || "接続テストに失敗しました",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      toast({
        title: "エラー",
        description: "接続テスト中にエラーが発生しました",
        variant: "destructive"
      })
    }
  }

  const handleDeletePersona = async (personaId: string) => {
    try {
      // Delete related records first to avoid foreign key constraint violations
      
      // Delete thread replies
      const { error: threadRepliesError } = await supabase
        .from('thread_replies')
        .delete()
        .eq('persona_id', personaId)

      if (threadRepliesError) {
        console.error('Error deleting thread replies:', threadRepliesError)
        // Continue with deletion even if this fails
      }

      // Delete auto replies
      const { error: autoRepliesError } = await supabase
        .from('auto_replies')
        .delete()
        .eq('persona_id', personaId)

      if (autoRepliesError) {
        console.error('Error deleting auto replies:', autoRepliesError)
        // Continue with deletion even if this fails
      }

      // Delete posts
      const { error: postsError } = await supabase
        .from('posts')
        .delete()
        .eq('persona_id', personaId)

      if (postsError) {
        console.error('Error deleting posts:', postsError)
        // Continue with deletion even if this fails
      }

      // Delete analytics
      const { error: analyticsError } = await supabase
        .from('analytics')
        .delete()
        .eq('persona_id', personaId)

      if (analyticsError) {
        console.error('Error deleting analytics:', analyticsError)
        // Continue with deletion even if this fails
      }

      // Delete activity logs
      const { error: activityLogsError } = await supabase
        .from('activity_logs')
        .delete()
        .eq('persona_id', personaId)

      if (activityLogsError) {
        console.error('Error deleting activity logs:', activityLogsError)
        // Continue with deletion even if this fails
      }

      // Delete webhook settings
      const { error: webhookError } = await supabase
        .from('webhook_settings')
        .delete()
        .eq('persona_id', personaId)

      if (webhookError) {
        console.error('Error deleting webhook settings:', webhookError)
        // Continue with deletion even if this fails
      }

      // Delete reply check settings
      const { error: replyCheckError } = await supabase
        .from('reply_check_settings')
        .delete()
        .eq('persona_id', personaId)

      if (replyCheckError) {
        console.error('Error deleting reply check settings:', replyCheckError)
        // Continue with deletion even if this fails
      }

      // Delete scheduling settings
      const { error: schedulingError } = await supabase
        .from('scheduling_settings')
        .delete()
        .eq('persona_id', personaId)

      if (schedulingError) {
        console.error('Error deleting scheduling settings:', schedulingError)
        // Continue with deletion even if this fails
      }

      // Finally delete the persona
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
                  
                  <div className="flex gap-2">
                    {persona.threads_access_token ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(persona.id)}
                        className="hover-scale"
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        テスト
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnectThreads(persona.id)}
                        className="hover-scale"
                      >
                        <LinkIcon className="w-4 h-4 mr-1" />
                        連携
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-destructive/10 hover:text-destructive hover-scale"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>アカウントを削除しますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            この操作は取り消せません。アカウントと関連するすべてのデータ（投稿、返信、設定など）が完全に削除されます。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePersona(persona.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            削除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
            <p>• アカウントを作成後、「連携」ボタンでThreadsと連携してください</p>
            <p>• 新しいタブでThreads認証が開きます</p>
            <p>• 認証完了後、このページを更新してください</p>
            <p>• 連携済みアカウントは投稿ページで選択できます</p>
            <p>• 不要になったアカウントはいつでも削除できます</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
