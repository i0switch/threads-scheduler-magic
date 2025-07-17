import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Settings as SettingsIcon, Clock, MessageCircle, Bot, Plus, X, Save } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface Persona {
  id: string
  name: string
}

interface SchedulingSettings {
  id: string
  persona_id: string
  optimal_hours: number[]
  auto_schedule_enabled: boolean
  queue_limit: number
  retry_enabled: boolean
  timezone: string
}

interface AutoReply {
  id: string
  persona_id: string
  trigger_keywords: string[]
  response_template: string
  is_active: boolean
}

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [selectedPersona, setSelectedPersona] = useState<string>("")
  const [schedulingSettings, setSchedulingSettings] = useState<SchedulingSettings | null>(null)
  const [autoReplies, setAutoReplies] = useState<AutoReply[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New auto reply form
  const [newKeywords, setNewKeywords] = useState<string>("")
  const [newTemplate, setNewTemplate] = useState<string>("")

  const fetchPersonas = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('personas')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error
      setPersonas(data || [])
      
      if (data && data.length > 0 && !selectedPersona) {
        setSelectedPersona(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching personas:', error)
    }
  }

  const fetchSettings = async () => {
    if (!selectedPersona) return

    setLoading(true)
    try {
      // Fetch scheduling settings
      const { data: schedData, error: schedError } = await supabase
        .from('scheduling_settings')
        .select('*')
        .eq('persona_id', selectedPersona)
        .single()

      if (schedError && schedError.code !== 'PGRST116') { // PGRST116 = not found
        throw schedError
      }

      setSchedulingSettings(schedData || {
        id: '',
        persona_id: selectedPersona,
        optimal_hours: [9, 12, 15, 18, 21],
        auto_schedule_enabled: false,
        queue_limit: 10,
        retry_enabled: true,
        timezone: 'Asia/Tokyo'
      })

      // Fetch auto replies
      const { data: replyData, error: replyError } = await supabase
        .from('auto_replies')
        .select('*')
        .eq('persona_id', selectedPersona)

      if (replyError) throw replyError
      setAutoReplies(replyData || [])

    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: "エラー",
        description: "設定の取得に失敗しました",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSchedulingSettings = async () => {
    if (!schedulingSettings || !user) return

    setSaving(true)
    try {
      const settingsData = {
        user_id: user.id,
        persona_id: selectedPersona,
        optimal_hours: schedulingSettings.optimal_hours,
        auto_schedule_enabled: schedulingSettings.auto_schedule_enabled,
        queue_limit: schedulingSettings.queue_limit,
        retry_enabled: schedulingSettings.retry_enabled,
        timezone: schedulingSettings.timezone
      }

      const { error } = await supabase
        .from('scheduling_settings')
        .upsert(settingsData, {
          onConflict: 'persona_id'
        })

      if (error) throw error

      toast({
        title: "保存完了",
        description: "スケジューリング設定を保存しました",
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "エラー",
        description: "設定の保存に失敗しました",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const addAutoReply = async () => {
    if (!newKeywords.trim() || !newTemplate.trim() || !user) return

    try {
      const keywords = newKeywords.split(',').map(k => k.trim()).filter(k => k)
      
      const { error } = await supabase
        .from('auto_replies')
        .insert({
          user_id: user.id,
          persona_id: selectedPersona,
          trigger_keywords: keywords,
          response_template: newTemplate.trim(),
          is_active: true
        })

      if (error) throw error

      toast({
        title: "追加完了",
        description: "自動返信ルールを追加しました",
      })

      setNewKeywords("")
      setNewTemplate("")
      fetchSettings()
    } catch (error) {
      console.error('Error adding auto reply:', error)
      toast({
        title: "エラー",
        description: "自動返信ルールの追加に失敗しました",
        variant: "destructive"
      })
    }
  }

  const deleteAutoReply = async (id: string) => {
    try {
      const { error } = await supabase
        .from('auto_replies')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "削除完了",
        description: "自動返信ルールを削除しました",
      })

      fetchSettings()
    } catch (error) {
      console.error('Error deleting auto reply:', error)
      toast({
        title: "エラー",
        description: "自動返信ルールの削除に失敗しました",
        variant: "destructive"
      })
    }
  }

  const toggleAutoReply = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('auto_replies')
        .update({ is_active: isActive })
        .eq('id', id)

      if (error) throw error

      fetchSettings()
    } catch (error) {
      console.error('Error toggling auto reply:', error)
      toast({
        title: "エラー",
        description: "設定の更新に失敗しました",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    if (user) {
      fetchPersonas()
    }
  }, [user])

  useEffect(() => {
    fetchSettings()
  }, [selectedPersona])

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">設定</h1>
          <p className="text-muted-foreground">アカウントとボットの詳細設定</p>
        </div>

        {/* Persona Selection */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              アカウント選択
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>設定するアカウント</Label>
              <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                <SelectTrigger>
                  <SelectValue placeholder="アカウントを選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {personas.map(persona => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedPersona && !loading && schedulingSettings && (
          <>
            {/* Scheduling Settings */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  スケジューリング設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>自動スケジューリング</Label>
                    <p className="text-sm text-muted-foreground">
                      最適な時間帯に投稿を自動でスケジュール
                    </p>
                  </div>
                  <Switch
                    checked={schedulingSettings.auto_schedule_enabled}
                    onCheckedChange={(checked) =>
                      setSchedulingSettings({
                        ...schedulingSettings,
                        auto_schedule_enabled: checked
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>キュー制限</Label>
                    <Input
                      type="number"
                      value={schedulingSettings.queue_limit}
                      onChange={(e) =>
                        setSchedulingSettings({
                          ...schedulingSettings,
                          queue_limit: parseInt(e.target.value) || 10
                        })
                      }
                      min="1"
                      max="100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>タイムゾーン</Label>
                    <Select
                      value={schedulingSettings.timezone}
                      onValueChange={(value) =>
                        setSchedulingSettings({
                          ...schedulingSettings,
                          timezone: value
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>最適な投稿時間帯</Label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 24 }, (_, i) => (
                      <Button
                        key={i}
                        variant={schedulingSettings.optimal_hours.includes(i) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const hours = schedulingSettings.optimal_hours.includes(i)
                            ? schedulingSettings.optimal_hours.filter(h => h !== i)
                            : [...schedulingSettings.optimal_hours, i].sort((a, b) => a - b)
                          
                          setSchedulingSettings({
                            ...schedulingSettings,
                            optimal_hours: hours
                          })
                        }}
                      >
                        {i}:00
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>リトライ機能</Label>
                    <p className="text-sm text-muted-foreground">
                      投稿に失敗した場合の自動リトライ
                    </p>
                  </div>
                  <Switch
                    checked={schedulingSettings.retry_enabled}
                    onCheckedChange={(checked) =>
                      setSchedulingSettings({
                        ...schedulingSettings,
                        retry_enabled: checked
                      })
                    }
                  />
                </div>

                <Button onClick={saveSchedulingSettings} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />
                  スケジューリング設定を保存
                </Button>
              </CardContent>
            </Card>

            {/* Auto Reply Settings */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  自動返信設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Auto Reply */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium">新しい自動返信ルールを追加</h4>
                  
                  <div className="space-y-2">
                    <Label>トリガーキーワード（カンマ区切り）</Label>
                    <Input
                      placeholder="例: こんにちは, 質問, ヘルプ"
                      value={newKeywords}
                      onChange={(e) => setNewKeywords(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>返信テンプレート</Label>
                    <Textarea
                      placeholder="自動返信メッセージを入力してください"
                      value={newTemplate}
                      onChange={(e) => setNewTemplate(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={addAutoReply}
                    disabled={!newKeywords.trim() || !newTemplate.trim()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    ルールを追加
                  </Button>
                </div>

                <Separator />

                {/* Existing Auto Replies */}
                <div className="space-y-4">
                  <h4 className="font-medium">既存の自動返信ルール</h4>
                  
                  {autoReplies.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      自動返信ルールがありません
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {autoReplies.map((reply) => (
                        <div key={reply.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={reply.is_active}
                                onCheckedChange={(checked) => toggleAutoReply(reply.id, checked)}
                              />
                              <span className="font-medium">
                                {reply.is_active ? "有効" : "無効"}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAutoReply(reply.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <Label className="text-sm">キーワード:</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {reply.trigger_keywords?.map((keyword, index) => (
                                  <Badge key={index} variant="secondary">
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm">返信テンプレート:</Label>
                              <p className="text-sm text-muted-foreground mt-1 p-2 bg-muted rounded">
                                {reply.response_template}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {loading && (
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>設定を読み込み中...</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
