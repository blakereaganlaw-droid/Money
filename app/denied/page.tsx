import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function DeniedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-expense/10 text-expense">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            This budget is private to approved family accounts. You have been
            signed out.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/login" className={buttonVariants({ variant: "outline" })}>
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
