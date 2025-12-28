import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { GalleryVerticalEnd } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { apiCall } from "@/client";
import { useState } from "react";

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const authToken = localStorage.getItem("authToken");
    if (authToken) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // get the username and password from the form
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    setLoading(true);
    try {
      const { token } = await apiCall("/api/auth/login", "POST", {
        body: { username, password },
      });
      localStorage.setItem("authToken", token);
      toast.success("Logged in successfully");
      navigate("/", { replace: true });
    } catch {
      toast.error("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className={cn("flex flex-col gap-6")}>
          <Form onSubmit={handleLogin}>
            <div className="flex flex-col items-center gap-2 text-center">
              <a
                href="#"
                className="flex flex-col items-center gap-2 font-medium"
              >
                <div className="flex size-8 items-center justify-center rounded-md">
                  <GalleryVerticalEnd className="size-6" />
                </div>
                <span className="sr-only">JetYet Inc.</span>
              </a>
              <h1 className="text-xl font-bold">Welcome to JetYet</h1>
              <div className="text-muted-foreground text-sm">
                Enter your credentials to access the panel
              </div>
            </div>
            <div className="w-full space-y-5">
              <div className="space-y-4">
                <Field name="username">
                  <FieldLabel>Username</FieldLabel>
                  <Input
                    disabled={loading}
                    type="text"
                    placeholder="Enter your username"
                    required
                  />
                </Field>
                <Field name="password">
                  <FieldLabel>Password</FieldLabel>
                  <Input
                    disabled={loading}
                    type="password"
                    placeholder="Enter your password"
                    required
                  />
                </Field>
              </div>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner />
                    Loading...
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              <div className="flex items-center gap-3 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                <span className="text-muted-foreground text-xs">Or</span>
              </div>

              <Button className="w-full" variant="outline" disabled>
                Login with Google
              </Button>
            </div>
          </Form>
          <div className="px-6 text-center text-muted-foreground text-sm">
            By clicking continue, you agree to our{" "}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
};
