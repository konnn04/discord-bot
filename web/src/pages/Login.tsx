import { Button } from "@/components/ui/button";
import { Gamepad2, Github, Globe, Facebook } from "lucide-react";

const Login = () => {
  const handleLogin = () => {
    // Redirect to backend auth
    window.location.href = "/api/auth/login";
  };

  return (
    <div className="flex min-h-screen w-full">

      {/* Left: Image (75%) */}
      <div className="hidden w-3/4 bg-muted md:block relative">
        <div className="absolute inset-0 bg-zinc-900/20" /> {/* Overlay */}
        <img
          src="./img/bg.jpg"
          alt="Login Background"
          className="h-full w-full object-cover"
        />
        <div className="absolute bottom-8 right-8 z-20 flex shadow-md items-center gap-2 rounded-lg bg-background/60 p-4 backdrop-blur-md">
            <div className="text-sm font-medium">MPClub Bot Dashboard</div>
        </div>
      </div>
      
      {/* Right: Login Form (25%) */}
      <div className="flex w-full flex-col justify-center bg-background px-8 md:w-1/4 lg:px-12">
        <div className="mx-auto flex w-full max-w-sm flex-col space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <img src="./logo.png" alt="Logo" className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Enter the dashboard to manage your bot services.
            </p>
          </div>

          <div className="grid gap-4">
            <Button onClick={handleLogin} className="w-full" size="lg">
              Login with Discord
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or find us on
                </span>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
                <a href="https://github.com/mpc-ou/discord-bot" target="_blank" rel="noreferrer" className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                    <Github className="h-5 w-5" />
                </a>
                <a href="https://mpclub.dev" target="_blank" rel="noreferrer" className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                    <Globe className="h-5 w-5" />
                </a>
                <a href="https://www.facebook.com/CLBLapTrinhTrenThietBiDiDong" target="_blank" rel="noreferrer" className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                    <Facebook className="h-5 w-5" />
                </a>
            </div>
          </div>

          <p className="px-8 text-center text-xs text-muted-foreground">
            By clicking login, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>
            .

            
          </p>
        </div>
      </div>

      
    </div>
  );
};

export default Login;
