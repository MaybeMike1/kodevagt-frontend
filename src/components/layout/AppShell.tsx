import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AppShellProps = {
  header: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
  sidebarCollapsed?: boolean;
};

export function AppShell({
  header,
  sidebar,
  main,
  sidebarCollapsed = false,
}: AppShellProps) {
  return (
    <div className="app-surface flex h-screen flex-col overflow-hidden">
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {header}
        <div className="flex min-h-0 flex-1">
          <aside
            className={cn(
              "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 text-sidebar-foreground backdrop-blur-xl transition-[width] duration-300 ease-out",
              sidebarCollapsed ? "w-0 overflow-hidden border-r-0" : "w-[272px]",
              "max-md:absolute max-md:z-20 max-md:h-full max-md:shadow-xl",
              sidebarCollapsed && "max-md:w-0",
              !sidebarCollapsed && "max-md:w-[272px]",
            )}
          >
            {sidebar}
          </aside>
          <main className="flex min-w-0 flex-1 flex-col">{main}</main>
        </div>
      </div>
    </div>
  );
}
