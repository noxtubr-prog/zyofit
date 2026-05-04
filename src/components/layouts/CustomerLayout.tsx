import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, User, Menu, X, Scissors, LogOut, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import SearchModal from "@/components/SearchModal";

const CustomerLayout = ({ children }: { children: React.ReactNode }) => {
  const { itemCount } = useCart();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const publicLinks = [
    { to: "/browse", label: "Browse Tailors" },
    { to: "/how-it-works", label: "How It Works" },
    { to: "/become-tailor", label: "Become a Tailor" },
  ];

  const loggedInLinks = [
    { to: "/browse", label: "Browse Tailors" },
    { to: "/profile", label: "Orders" },
    { to: "/how-it-works", label: "How It Works" },
  ];

  const navLinks = user ? loggedInLinks : publicLinks;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-primary/30 bg-background/95 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl accent-gradient flex items-center justify-center">
              <Scissors className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-xl font-extrabold text-foreground tracking-tight">ZyloFit</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-sm font-medium text-foreground/80 hover:text-accent",
                    isActive(link.to) && "text-accent bg-primary/10"
                  )}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex text-foreground/80 hover:text-accent"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" className="text-foreground/80 hover:text-accent">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full accent-gradient text-xs text-accent-foreground flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {user ? (
              <div className="hidden md:block relative" ref={profileRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground/80 hover:text-accent gap-1"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  <User className="h-4 w-4" />
                  Profile
                  <ChevronDown className={cn("h-3 w-3 transition-transform", profileOpen && "rotate-180")} />
                </Button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border bg-card shadow-lg py-1 animate-fade-in">
                    <Link to="/profile" onClick={() => setProfileOpen(false)}>
                      <button className="w-full text-left px-4 py-2.5 text-sm text-foreground/80 hover:text-accent hover:bg-primary/10 transition-colors">
                        Dashboard
                      </button>
                    </Link>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-foreground/80 hover:text-accent hover:bg-primary/10 transition-colors">
                      Settings
                    </button>
                    <div className="border-t my-1" />
                    <button
                      className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => { signOut(); setProfileOpen(false); }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-accent">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="default" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            <Button variant="ghost" size="icon" className="md:hidden text-foreground/80" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-primary/20 bg-background p-4 animate-fade-in">
            <nav className="flex flex-col gap-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-base text-foreground/80"
                onClick={() => { setSearchOpen(true); setMobileOpen(false); }}
              >
                <Search className="h-4 w-4" /> Search
              </Button>
              {navLinks.map(link => (
                <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-base text-foreground/80",
                      isActive(link.to) && "text-accent bg-primary/10"
                    )}
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              <div className="border-t border-primary/20 my-2" />
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-foreground/80">
                      <User className="h-4 w-4" /> My Profile
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive"
                    onClick={async () => { await signOut(); setMobileOpen(false); }}
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-foreground/80">Login</Button>
                  </Link>
                  <Link to="/signup" onClick={() => setMobileOpen(false)}>
                    <Button variant="default" className="w-full">Sign Up</Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 animate-fade-in-up">{children}</main>

      <footer className="border-t border-primary/20 bg-card mt-20">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-lg accent-gradient flex items-center justify-center">
                  <Scissors className="h-4 w-4 text-accent-foreground" />
                </div>
                <span className="text-lg font-extrabold">ZyloFit</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Smart Fit. Seamless Style. Connecting you with the best local tailors for custom stitching.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-foreground">Quick Links</h4>
              <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <Link to="/browse" className="hover:text-accent transition-colors">Browse Tailors</Link>
                <Link to="/how-it-works" className="hover:text-accent transition-colors">How It Works</Link>
                <Link to="/cart" className="hover:text-accent transition-colors">Cart</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-foreground">For Tailors</h4>
              <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <Link to="/signup" className="hover:text-accent transition-colors">Register as Tailor</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-primary/20 mt-10 pt-6 text-center text-sm text-muted-foreground">
            © 2026 ZyloFit. All rights reserved.
          </div>
        </div>
      </footer>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
};

export default CustomerLayout;
