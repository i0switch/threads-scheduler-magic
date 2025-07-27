import { useState, useEffect } from "react"
import { Plus, Calendar, BarChart3, Users, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Badge } from "@/components/ui/badge"

interface DashboardStats {
  totalPosts: number
  scheduledPosts: number
  publishedPosts: number
  draftPosts: number
  totalPersonas: number
}

interface RecentPost {
  id: string
  content: string
  status: string
  scheduled_for: string | null
  personas: { name: string } | null
  created_at: string
}

const Index = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    scheduledPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalPersonas: 0
  })
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    try {
      // ハードコードされたダミーデータ
      const dummyStats = {
        totalPosts: 8,
        scheduledPosts: 3,
        publishedPosts: 2,
        draftPosts: 3,
        totalPersonas: 3
      }

      const dummyRecentPosts = [
        {
          id: '55555555-5555-5555-5555-555555555555',
          content: 'これは最初のテスト投稿です。素晴らしい一日ですね！ #テスト #投稿',
          status: 'scheduled',
          scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          personas: { name: 'テストアカウント1' }
        },
        {
          id: '66666666-6666-6666-6666-666666666666',
          content: 'コーヒーを飲みながらコーディング中☕️ 今日も一日頑張ります！',
          status: 'draft',
          scheduled_for: null,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          personas: { name: 'テストアカウント1' }
        },
        {
          id: '77777777-7777-7777-7777-777777777777',
          content: '新しいプロジェクトが始まりました！ワクワクしています 🚀',
          status: 'published',
          scheduled_for: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          personas: { name: 'テストアカウント2' }
        },
        {
          id: '88888888-8888-8888-8888-888888888888',
          content: 'お昼休みです🍱 美味しいランチを食べています。午後も頑張ろう！',
          status: 'scheduled',
          scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          personas: { name: 'テストアカウント2' }
        },
        {
          id: '99999999-9999-9999-9999-999999999999',
          content: '週末の計画を立てています。映画を見に行こうかな🎬',
          status: 'draft',
          scheduled_for: null,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          personas: { name: 'テストアカウント3' }
        }
      ]

      setStats(dummyStats)
      setRecentPosts(dummyRecentPosts)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />予約済み</Badge>
      case 'published':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />公開済み</Badge>
      case 'draft':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800"><AlertCircle className="w-3 h-3 mr-1" />下書き</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">ダッシュボード</h1>
            <p className="text-muted-foreground">ThreadsBot管理画面</p>
          </div>
          <Link to="/new-post">
            <Button className="bg-gradient-primary hover:opacity-90 hover-scale">
              <Plus className="w-4 h-4 mr-2" />
              新規投稿
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総投稿数</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalPosts}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">予約投稿</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.scheduledPosts}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">公開済み投稿</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.publishedPosts}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">アカウント数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalPersonas}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Posts */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>最近の投稿</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : recentPosts.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">まだ投稿がありません</p>
                <Link to="/new-post">
                  <Button variant="outline">
                    最初の投稿を作成
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium truncate max-w-md">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{post.personas?.name || '未設定'}</span>
                        <span>•</span>
                        <span>{formatDate(post.created_at)}</span>
                        {post.scheduled_for && (
                          <>
                            <span>•</span>
                            <span>予約: {formatDate(post.scheduled_for)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(post.status)}
                    </div>
                  </div>
                ))}
                <div className="text-center pt-4">
                  <Link to="/posts">
                    <Button variant="outline" size="sm">
                      すべての投稿を見る
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Index;
