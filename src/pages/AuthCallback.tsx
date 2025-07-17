import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('認証を処理中...')

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state') // This should be the persona ID
      const error = searchParams.get('error')

      if (error) {
        setStatus('error')
        setMessage('認証がキャンセルされました')
        toast({
          title: "認証エラー",
          description: "Threads認証がキャンセルされました",
          variant: "destructive"
        })
        setTimeout(() => navigate('/accounts'), 3000)
        return
      }

      if (!code || !state) {
        setStatus('error')
        setMessage('認証パラメータが不正です')
        setTimeout(() => navigate('/accounts'), 3000)
        return
      }

      try {
        // Call our OAuth edge function
        const { data, error } = await supabase.functions.invoke('threads-oauth', {
          body: {
            personaId: state,
            authCode: code
          }
        })

        if (error) throw error

        if (data.success) {
          setStatus('success')
          setMessage(`@${data.username} として連携完了！`)
          toast({
            title: "連携完了",
            description: `@${data.username} として連携されました`,
          })
          setTimeout(() => navigate('/accounts'), 2000)
        } else {
          throw new Error(data.error || '連携に失敗しました')
        }
      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        setMessage('連携に失敗しました')
        toast({
          title: "連携エラー",
          description: "Threads連携に失敗しました",
          variant: "destructive"
        })
        setTimeout(() => navigate('/accounts'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, navigate, toast])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        )}
        {status === 'success' && (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <div className="w-4 h-4 rounded-full bg-green-500" />
          </div>
        )}
        {status === 'error' && (
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <div className="w-4 h-4 rounded-full bg-red-500" />
          </div>
        )}
        <p className="text-foreground text-lg font-medium">{message}</p>
        <p className="text-muted-foreground text-sm">
          {status === 'processing' && 'しばらくお待ちください...'}
          {status === 'success' && 'アカウント管理ページに戻ります'}
          {status === 'error' && 'アカウント管理ページに戻ります'}
        </p>
      </div>
    </div>
  )
}