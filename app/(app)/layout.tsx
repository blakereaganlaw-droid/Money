import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/config";
import { Nav, MobileNav } from "@/components/nav";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isAllowedEmail(user.email)) redirect("/denied");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.display_name ?? user.email;

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Reagan Budget</p>
            <p className="text-xs text-muted-foreground">Family planning</p>
          </div>
        </div>
        <Nav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <div className="md:hidden flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="font-semibold">Reagan Budget</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{name}</span>
            <form action="/auth/signout" method="post">
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-5 pb-20 md:pb-8 lg:p-8">{children}</main>

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card md:hidden">
          <MobileNav />
        </div>
      </div>
    </div>
  );
}
