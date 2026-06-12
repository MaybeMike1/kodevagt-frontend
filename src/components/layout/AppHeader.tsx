import { LogOut, Moon, PanelLeft, ShieldCheck, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/lib/theme";

type AppHeaderProps = {
  login: string;
  avatarUrl?: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onSignOut: () => void;
};

export function AppHeader({
  login,
  avatarUrl,
  sidebarCollapsed,
  onToggleSidebar,
  onSignOut,
}: AppHeaderProps) {
  const initials = login.slice(0, 2).toUpperCase();
  const { theme, toggleTheme } = useTheme();

  return (
    <TooltipProvider delay={300}>
      <header className="flex h-13 shrink-0 items-center gap-2.5 border-b border-border/80 bg-background/70 px-3 backdrop-blur-xl">
        {onToggleSidebar && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onToggleSidebar}
                  aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                >
                  <PanelLeft className="size-4" />
                </Button>
              }
            />
            <TooltipContent>{sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}</TooltipContent>
          </Tooltip>
        )}

        <div className="flex items-center gap-2.5">
          <div className="relative flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_2px_10px_-2px_var(--accent-glow),inset_0_1px_0_0_oklch(1_0_0/0.25)]">
            <ShieldCheck className="size-[18px]" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-brand text-[15px] font-semibold tracking-tight">Kodevagt</span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
              Code Review
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              }
            />
            <TooltipContent>{theme === "dark" ? "Light mode" : "Dark mode"}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label="Account menu"
                >
                  <Avatar size="sm" className="ring-1 ring-border">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
                    {login}
                  </span>
                </button>
              }
            />
            <DropdownMenuContent align="end" sideOffset={8} className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
                  <Avatar size="sm">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{login}</p>
                    <p className="text-xs text-muted-foreground">Signed in via GitHub</p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onSignOut}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}
