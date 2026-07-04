import { Link, useRouterState } from "@tanstack/react-router";
import {
  IconBrandDocker,
  IconDashboard,
  IconDatabase,
  IconFileCode,
  IconRobot,
  IconSettings,
  IconStack2,
  IconTerminal2,
  IconTemplate,
  IconGauge,
  IconBell,
  IconFileText,
  IconCloudDownload,
  IconNetwork,
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
      { title: "Templates", to: "/templates", icon: IconTemplate },
      { title: "Registry", to: "/registry", icon: IconCloudDownload },
      { title: "Network", to: "/network", icon: IconNetwork },
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
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <IconTerminal2 className="h-4 w-4" stroke={2} />
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
      {/* <SidebarFooter className="border-t p-3">
        <p className="font-mono text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          v0.1.0 · stackhand
        </p>
      </SidebarFooter> */}
    </Sidebar>
  );
}
