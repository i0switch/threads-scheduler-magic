import { Calendar, PlusCircle, Settings, Archive } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

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

  const isActive = (path: string) => currentPath === path
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted/50"

  const collapsed = state === "collapsed"

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

        <div className="p-4">
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
      </SidebarContent>
    </Sidebar>
  )
}