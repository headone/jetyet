import {
  NavigationMenu,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Rocket, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

interface LayoutProps {
  children: React.ReactNode;
  navItems: { label: string; href: string }[];
}

export const Layout: React.FC<LayoutProps> = ({ children, navItems }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: localStorage.getItem("authToken") ?? "" },
    });
    localStorage.removeItem("authToken");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex-col md:flex">
      {/* Top Border */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          {/* Logo / Team Switcher Area */}
          <div className="flex items-center mr-6 font-semibold text-lg tracking-tight">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center mr-2">
              <Rocket className="w-5 h-5" />
            </div>
            JetYet
          </div>

          {/* Main Navigation */}
          <NavigationMenu>
            {navItems.map((item) => (
              <NavigationMenuLink asChild key={item.label}>
                <a
                  className={cn(
                    "cursor-pointer text-sm font-medium",
                    item.href === location.pathname
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                  onClick={() => navigate(item.href)}
                >
                  {item.label}
                </a>
              </NavigationMenuLink>
            ))}
          </NavigationMenu>

          {/* Right Side: Search & Profile */}
          <div className="ml-auto flex items-center space-x-4">
            {/*<div className="hidden md:block">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search..."
                  className="pl-8 h-9 w-37.5 lg:w-62.5 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>*/}

            {/* User Profile Dropdown Simulator */}
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage
                  src="https://github.com/evilrabbit.png"
                  alt="@evilrabbit"
                />
                <AvatarFallback>ER</AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLogout}
                className="text-xs font-medium text-muted-foreground hover:text-red-600 transition-colors"
              >
                Log out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 space-y-4 p-8 pt-6">{children}</main>
    </div>
  );
};
