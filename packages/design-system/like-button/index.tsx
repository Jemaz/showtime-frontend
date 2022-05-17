import { Button } from "design-system/button";
import { useIsDarkMode } from "design-system/hooks";
import { Heart, HeartFilled } from "design-system/icon";
import { colors } from "design-system/tailwind/colors";

const getRoundedCount = (count: number = 0) => {
  const digits = `${count}`.split("");

  if (digits[0] == "0") {
    return digits[0];
  }

  switch (digits.length) {
    case 8:
      return `${digits.slice(0, 2).join("")}m`;

    case 7:
      return `${digits[0]}m`;

    case 6:
      return `${digits.slice(0, 3).join("")}k`;

    case 5:
      return `${digits.slice(0, 2).join("")}k`;

    case 4:
      return `${digits[0]}k`;

    case 3:
    case 2:
    case 1:
      return digits.join("");

    default:
      return "00";
  }
};

export function LikeButton({
  onPress,
  isLiked,
  likeCount,
}: {
  onPress: () => void;
  isLiked?: boolean;
  likeCount: number;
}) {
  const isDark = useIsDarkMode();

  return (
    <Button variant="text" size="regular" tw="h-auto p-0" onPress={onPress}>
      {isLiked ? (
        // <Animated.View key="liked" exiting={ZoomOut} entering={ZoomIn}>
        <HeartFilled height={24} width={24} color={colors.red[500]} />
      ) : (
        // </Animated.View>
        // <Animated.View key="unliked" exiting={ZoomOut} entering={ZoomIn}>
        <Heart
          height={24}
          width={24}
          color={isDark ? "#fff" : colors.gray[900]}
        />
        // </Animated.View>
      )}{" "}
      {likeCount > 0 ? getRoundedCount(likeCount) : ""}
    </Button>
  );
}
