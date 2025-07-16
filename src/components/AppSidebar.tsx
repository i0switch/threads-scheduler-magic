import { Calendar, PlusCircle, Settings, Archive, LogOut, User } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

const items = [
  { title: "投稿管理", url: "/", icon: Archive },
  { title: "新規投稿", url: "/new-post", icon: PlusCircle },
  { title: "アカウント管理", url: "/accounts", icon: Settings },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const { user, signOut } = useAuth()

  const isActive = (path: string) => currentPath === path
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted/50"

  const collapsed = state === "collapsed"

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <Sidebar className="border-r border-border/50 bg-card/30 backdrop-blur-sm">
      <SidebarContent>
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Threads Scheduler
              </h2>
              <p className="text-xs text-muted-foreground">予約投稿管理</p>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-4 px-3">メニュー</p>
          <nav className="space-y-2">
            {items.map((item) => {
              const isItemActive = isActive(item.url)
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                    isItemActive
                      ? "bg-gradient-primary text-white shadow-elegant"
                      : "text-foreground hover:bg-accent/50 hover:shadow-card"
                  }`}
                >
                  <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                    isItemActive ? "text-white" : "text-muted-foreground"
                  }`} />
                  <span className="font-medium">{item.title}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-3 py-2 mb-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email || "ユーザー"}
              </p>
              <p className="text-xs text-muted-foreground">ログイン中</p>
            </div>
          </div>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}