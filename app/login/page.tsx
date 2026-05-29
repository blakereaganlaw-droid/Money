"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-[#e7efe8] via-[#f3f6f3] to-[#e3ecef] p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Wallet className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Reagan Family Budget</CardTitle>
          <CardDescription>
            Private budgeting, savings, and debt planning for Blake & Amanda.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button size="lg" onClick={signIn} disabled={loading}>
            {loading ? "Redirecting..." : "Continue with Google"}
          </Button>
          {error ? (
            <p className="text-center text-sm text-expense">{error}</p>
          ) : null}
          <p className="text-center text-xs text-muted-foreground">
            Access is restricted to approved family accounts only.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
