import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, Heart, MessageCircle, Share, RefreshCw, Calendar } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface AnalyticsData {
  id: string
  date: string
  posts_count: number
  replies_count: number
  likes_count: number
  comments_count: number
  shares_count: number
  engagement_rate: number
  personas: { name: string } | null
}

interface Persona {
  id: string
  name: string
}

export default function Analytics() {
  const { toast } = useToast()
  const [selectedPersona, setSelectedPersona] = useState<string>("all")
  const [dateRange, setDateRange] = useState<string>("7")
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchPersonas = async () => {
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('id, name')
        .eq('is_active', true)

      if (error) throw error
      setPersonas(data || [])
    } catch (error) {
      console.error('Error fetching personas:', error)
    }
  }

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const daysAgo = parseInt(dateRange)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)

      let query = supabase
        .from('analytics')
        .select(`
          *,
          personas (name)
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (selectedPersona !== "all") {
        query = query.eq('persona_id', selectedPersona)
      }

      const { data, error } = await query

      if (error) throw error
      setAnalytics(data || [])
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast({
        title: "エラー",
        description: "アナリティクスデータの取得に失敗しました",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const syncAnalytics = async () => {
    setSyncing(true)
    try {
      const { error } = await supabase.functions.invoke('analytics-sync')
      
      if (error) throw error
      
      toast({
        title: "同期完了",
        description: "アナリティクスデータを同期しました",
      })
      
      // Refresh data
      await fetchAnalytics()
    } catch (error) {
      console.error('Error syncing analytics:', error)
      toast({
        title: "エラー",
        description: "アナリティクスの同期に失敗しました",
        variant: "destructive"
      })
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchPersonas()
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [selectedPersona, dateRange])

  // Calculate summary statistics
  const totalPosts = analytics.reduce((sum, day) => sum + day.posts_count, 0)
  const totalLikes = analytics.reduce((sum, day) => sum + day.likes_count, 0)
  const totalComments = analytics.reduce((sum, day) => sum + day.comments_count, 0)
  const totalShares = analytics.reduce((sum, day) => sum + day.shares_count, 0)
  const avgEngagement = analytics.length > 0 
    ? analytics.reduce((sum, day) => sum + day.engagement_rate, 0) / analytics.length 
    : 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">アナリティクス</h1>
            <p className="text-muted-foreground">投稿のパフォーマンスを分析</p>
          </div>
          <Button 
            onClick={syncAnalytics} 
            disabled={syncing}
            className="bg-gradient-primary hover:opacity-90"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            データ同期
          </Button>
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">アカウント</label>
                <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべてのアカウント</SelectItem>
                    {personas.map(persona => (
                      <SelectItem key={persona.id} value={persona.id}>
                        {persona.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">期間</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">過去7日間</SelectItem>
                    <SelectItem value="30">過去30日間</SelectItem>
                    <SelectItem value="90">過去90日間</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総投稿数</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPosts}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総いいね数</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLikes}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総コメント数</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalComments}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総シェア数</CardTitle>
              <Share className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalShares}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均エンゲージメント率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgEngagement.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Breakdown */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>日別パフォーマンス</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-20"></div>
                    <div className="h-4 bg-muted rounded w-32"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </div>
                ))}
              </div>
            ) : analytics.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">データがありません</p>
                <Button onClick={syncAnalytics} variant="outline">
                  データを同期
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                  <div>日付</div>
                  <div>投稿数</div>
                  <div>いいね</div>
                  <div>コメント</div>
                  <div>シェア</div>
                  <div>エンゲージメント率</div>
                </div>
                {analytics.map((day) => (
                  <div key={day.id} className="grid grid-cols-6 gap-4 items-center py-2 border-b border-border/50">
                    <div className="font-medium">{formatDate(day.date)}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{day.posts_count}</Badge>
                      {day.personas && (
                        <span className="text-xs text-muted-foreground">{day.personas.name}</span>
                      )}
                    </div>
                    <div>{day.likes_count}</div>
                    <div>{day.comments_count}</div>
                    <div>{day.shares_count}</div>
                    <div className="flex items-center gap-2">
                      <span>{day.engagement_rate.toFixed(1)}%</span>
                      {day.engagement_rate > avgEngagement && (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}