import {
  NavigationMenu,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogOut, Moon, Rocket, Sun, SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { apiCall } from "@/client";
import { useTheme } from "./theme-provider";

interface LayoutProps {
  children: React.ReactNode;
  navItems: { label: string; href: string }[];
}

export const Layout: React.FC<LayoutProps> = ({ children, navItems }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await apiCall("/api/auth/logout", "POST");
    localStorage.removeItem("authToken");
    navigate("/login", { replace: true });
  };

  const handleChooseTheme = () => {
    const nextTheme =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(nextTheme);
  };

  return (
    <div className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto m-auto flex flex-col h-screen">
      <div
        aria-hidden="true"
        className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto m-auto before:-left-3 after:-right-3 pointer-events-none absolute inset-0 z-45 before:absolute before:inset-y-0 before:w-px before:bg-border/50 after:absolute after:inset-y-0 after:w-px after:bg-border/50"
      />
      <header className="flex-col md:flex">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center mr-6 font-bold text-2xl tracking-tight font-orbitron">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center mr-2">
              <Rocket className="w-5 h-5" />
            </div>
            JetYet
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <NavigationMenu className="space-x-2">
              {navItems.map((item) => (
                <NavigationMenuLink asChild key={item.label}>
                  <a
                    className={cn(
                      "cursor-pointer text-sm font-medium",
                      item.href === location.pathname
                        ? "text-primary bg-accent"
                        : "text-muted-foreground",
                    )}
                    onClick={() => navigate(item.href)}
                  >
                    {item.label}
                  </a>
                </NavigationMenuLink>
              ))}
            </NavigationMenu>

            <Separator orientation="vertical" className="h-5" />

            <Button size="icon" variant="ghost" onClick={handleChooseTheme}>
              {theme === "system" && <SunMoon className="h-5 w-5" />}
              {theme === "light" && <Sun className="h-5 w-5" />}
              {theme === "dark" && <Moon className="h-5 w-5" />}
            </Button>

            <div>
              <Menu>
                <MenuTrigger>
                  <Avatar className="cursor-pointer">
                    <AvatarImage
                      src="https://github.com/evilrabbit.png"
                      alt="@evilrabbit"
                    />
                    <AvatarFallback>ER</AvatarFallback>
                  </Avatar>
                </MenuTrigger>
                <MenuPopup>
                  <MenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    logout
                  </MenuItem>
                </MenuPopup>
              </Menu>
            </div>
          </div>
        </div>
      </header>
      <Separator className="absolute left-0 top-16 w-screen" />
      {/* Main Content */}
      <main className="flex-1 space-y-4 p-8 pt-6">{children}</main>
    </div>
  );
};
