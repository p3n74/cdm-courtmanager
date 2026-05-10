import { Button, Spinner, Surface, useToast } from "heroui-native";
import { useState } from "react";
import { Text } from "react-native";

import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";

function SignIn() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Surface variant="secondary" className="p-4 rounded-lg">
      <Text className="text-foreground font-medium mb-4">Sign in</Text>
      <Text className="text-muted text-sm mb-4">
        Continue with your Google account.
      </Text>
      <Button
        onPress={async () => {
          setIsSubmitting(true);
          const { error } = await authClient.signIn.social({
            provider: "google",
            callbackURL: "/",
          });
          setIsSubmitting(false);
          if (error) {
            toast.show({
              variant: "danger",
              label: error.message || "Failed to sign in",
            });
            return;
          }
          toast.show({
            variant: "success",
            label: "Signed in successfully",
          });
          await queryClient.refetchQueries();
        }}
        isDisabled={isSubmitting}
        className="mt-1"
      >
        {isSubmitting ? (
          <Spinner size="sm" color="default" />
        ) : (
          <Button.Label>Continue with Google</Button.Label>
        )}
      </Button>
    </Surface>
  );
}

export { SignIn };
