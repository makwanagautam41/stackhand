import { Link, useRouterState } from "@tanstack/react-router";
import {
  IconBrandDocker,
  IconDashboard,
  IconDatabase,
  IconFileCode,
  IconRobot,
  IconSettings,
  IconStack2,
  IconGauge,
  IconBell,
  IconFileText,
  IconCloudDownload,
  IconPhoto,
  IconDeviceDesktopAnalytics,
} from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

const GROUPS = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", to: "/dashboard", icon: IconDashboard },
      { title: "Metrics", to: "/metrics", icon: IconGauge },
      { title: "Alerts", to: "/alerts", icon: IconBell },
    ],
  },
  {
    label: "Manage",
    items: [
      { title: "Stacks", to: "/stacks", icon: IconStack2 },
      { title: "Containers", to: "/containers", icon: IconBrandDocker },
      { title: "Images", to: "/images", icon: IconPhoto },
      { title: "Volumes", to: "/volumes", icon: IconDatabase },
      { title: "Registry", to: "/registry", icon: IconCloudDownload },
    ],
  },
  {
    label: "Files",
    items: [
      { title: "Explorer", to: "/yaml", icon: IconFileCode },
      { title: "Env files", to: "/env", icon: IconFileText },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "AI Assistant", to: "/ai", icon: IconRobot },
      { title: "Setup", to: "/setup", icon: IconDeviceDesktopAnalytics },
      { title: "Settings", to: "/settings", icon: IconSettings },
    ],
  },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-3 group-data-[collapsible=icon]:p-2">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md">
            <img src="/docker.svg" alt="Docker" className="h-8 w-8" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-mono text-sm font-semibold tracking-tight">
              stackhand
            </span>
            <span className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              stack manager
            </span>
          </div>
        </Link>
        <div className="mt-3 group-data-[collapsible=icon]:hidden">
          <WorkspaceSwitcher compact />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {GROUPS.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-widest">
              {g.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="rounded-md transition-colors duration-150"
                      >
                        <Link to={item.to}>
                          <item.icon className="h-4 w-4" stroke={1.75} />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:hidden">
          {import.meta.env.DEV ? (
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-amber-100 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Development
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-100 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              production
            </span>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
