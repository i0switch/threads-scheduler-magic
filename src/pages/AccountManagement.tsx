import { useState } from "react"
import { Plus, Trash2, User, ExternalLink, Shield, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Link } from "react-router-dom"

// Mock accounts data
const mockAccounts = [
  {
    id: "1",
    username: "@user_account1",
    displayName: "メインアカウント",
    profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    isConnected: true,
    followerCount: "1.2K",
    connectedAt: "2024-01-15"
  },
  {
    id: "2", 
    username: "@user_account2",
    displayName: "サブアカウント",
    profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    isConnected: true,
    followerCount: "856",
    connectedAt: "2024-02-20"
  }
]

export default function AccountManagement() {
  const [accounts, setAccounts] = useState(mockAccounts)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const handleConnectAccount = () => {
    // TODO: Implement OAuth flow for Threads
    console.log("Starting OAuth flow...")
    alert("Threads OAuth認証を開始します（実装予定）")
    setIsAddDialogOpen(false)
  }

  const handleDisconnectAccount = (accountId: string) => {
    const confirmed = window.confirm("このアカウントの連携を解除しますか？")
    if (confirmed) {
      setAccounts(accounts.filter(account => account.id !== accountId))
    }
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
                <DialogTitle>Threadsアカウントを追加</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">安全な認証</h3>
                    <p className="text-sm text-muted-foreground">
                      Threads公式のOAuth認証を使用してアカウントを安全に連携します
                    </p>
                  </div>
                </div>
                
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">認証プロセス:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Threadsの認証ページにリダイレクト</li>
                    <li>アカウントでログイン</li>
                    <li>アプリケーションへのアクセスを許可</li>
                    <li>自動的にこのアプリに戻る</li>
                  </ol>
                </div>
                
                <Button 
                  onClick={handleConnectAccount} 
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Threadsで認証する
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {accounts.map((account, index) => (
            <Card 
              key={account.id} 
              className="shadow-card hover:shadow-elegant transition-all duration-300 hover-scale animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={account.profileImage}
                      alt={account.username}
                      className="w-12 h-12 rounded-full object-cover border-2 border-border hover-scale cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{account.username}</h3>
                        <Badge 
                          variant="secondary" 
                          className="bg-green-100 text-green-700 text-xs animate-scale-in"
                        >
                          連携済み
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{account.displayName}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>フォロワー: {account.followerCount}</span>
                        <span>連携日: {account.connectedAt}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisconnectAccount(account.id)}
                    className="hover:bg-destructive/10 hover:text-destructive hover-scale"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {accounts.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">アカウントがありません</h3>
            <p className="text-muted-foreground mb-4">
              Threadsアカウントを追加して投稿管理を始めましょう
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
            <CardTitle className="text-sm text-primary">セキュリティについて</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• アカウント情報は暗号化されて安全に保存されます</p>
            <p>• いつでもアカウントの連携を解除できます</p>
            <p>• パスワードは保存されず、OAuth認証のみを使用します</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}