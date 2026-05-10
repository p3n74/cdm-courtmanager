import { Button } from "@cdm-pickleball/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cdm-pickleball/ui/components/card";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignInForm() {
  const { isPending } = authClient.useSession();

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-20">
      <Card className="border-border mx-auto overflow-hidden shadow-[0_24px_80px_-36px_rgba(30,41,59,0.35)]">
        <CardHeader className="space-y-1 border-b bg-gradient-to-br from-[#fdfbf7] to-[#f1f5f9] dark:from-[#1e293b]/80 dark:to-[#1e293b]/40">
          <CardTitle className="font-serif text-foreground text-center text-2xl tracking-tight md:text-[1.75rem]">
            Corona Del Mar Clubhouse
          </CardTitle>
          <CardDescription className="text-center text-sm md:text-[0.9375rem]">
            Sign in with Google to open the clubhouse tools for court reservations—allowlisted staff only.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-10 pb-10">
          <Button
            type="button"
            className="focus-visible:ring-ring/40 w-full text-sm md:h-11"
            onClick={() => {
              void authClient.signIn.social({
                provider: "google",
                callbackURL: `${window.location.origin}/dashboard`,
              });
            }}
          >
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
