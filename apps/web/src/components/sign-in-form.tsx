import { Button } from "@cdm-pickleball/ui/components/button";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignInForm() {
  const { isPending } = authClient.useSession();

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      <h1 className="mb-2 text-center text-3xl font-bold">Sign in</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Continue with your Google account.
      </p>
      <Button
        type="button"
        className="w-full"
        onClick={() => {
          void authClient.signIn.social({
            provider: "google",
            callbackURL: `${window.location.origin}/dashboard`,
          });
        }}
      >
        Continue with Google
      </Button>
    </div>
  );
}
