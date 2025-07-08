"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, EyeOff, Mail, Lock, User, Shield, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();

  // Tabs: 'login' or 'signup'
  const [tab, setTab] = useState("login");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sign up state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/home');
    }
  }, [user, authLoading, router]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(email, password);
     
    } catch (err) {
      if (err instanceof ApiError) {
        setLoginError(err.message);
      } else {
        setLoginError("Login failed");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Sign up handler
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");
    setSignupLoading(true);
    setSignupSuccess(false);
    try {
      await api.register({
        email: signupEmail,
        password: signupPassword,
        first_name: signupFirstName,
        last_name: signupLastName,
      });
      setSignupSuccess(true);
      setTab("login");
    } catch (err) {
      if (err instanceof ApiError) {
        setSignupError(err.message);
      } else {
        setSignupError("Sign up failed");
      }
    } finally {
      setSignupLoading(false);
    }
  };

  // Show loading while auth is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't show login page if already authenticated
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      

      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50 shadow-2xl">
        <CardHeader className="text-center pb-8">
          
         
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-8 bg-muted/50 p-1">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="username"
                      required
                      className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="pl-10 pr-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium transition-all duration-200 shadow-lg hover:shadow-xl" 
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup" className="space-y-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      autoComplete="username"
                      required
                      className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="First name"
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      autoComplete="given-name"
                      className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Last name"
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      autoComplete="family-name"
                      className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Create password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      className="pl-10 pr-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {signupError && (
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                    <AlertDescription>{signupError}</AlertDescription>
                  </Alert>
                )}

                {signupSuccess && (
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <AlertDescription className="text-green-600">
                      Account created successfully! You can now sign in.
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium transition-all duration-200 shadow-lg hover:shadow-xl" 
                  disabled={signupLoading}
                >
                  {signupLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                      Creating account...
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

         
        </CardContent>
      </Card>
    </div>
  );
} 