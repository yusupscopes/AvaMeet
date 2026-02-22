import { botttsNeutral, initials } from "@dicebear/collection";
import { createAvatar, Result } from "@dicebear/core";

interface AvatarProps {
  seed: string;
  variant: "botttsNeutral" | "initials";
}

export const generateAvatarUri = ({ seed, variant }: AvatarProps): string => {
  let avatar: Result;
  let avatarUri: string = "";

  if (variant === "botttsNeutral") {
    avatar = createAvatar(botttsNeutral, {
      seed,
    });
    avatarUri = avatar.toDataUri();
  } else if (variant === "initials") {
    avatar = createAvatar(initials, {
      seed,
      fontWeight: 500,
      fontSize: 42,
    });
    avatarUri = avatar.toDataUri();
  }

  return avatarUri;
};
