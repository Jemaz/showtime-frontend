import { useMemo } from "react";
import { Platform } from "react-native";

import { Video } from "expo-av";
import { useTailwind } from "tailwindcss-react-native";

import { Image } from "design-system/image";

export const supportedImageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
export const supportedVideoExtensions = ["mp4", "mov", "avi", "mkv", "webm"];

type PreviewProps = {
  file?: File | string;
  type?: "image" | "video";
  tw?: string;
  style?: any;
};

export const Preview = ({ tw = "", style, type, file }: PreviewProps) => {
  const tailwind = useTailwind();
  const uri = getLocalFileURI(file);

  const fileType = useMemo(() => {
    if (type) return type;

    if (typeof file === "string") {
      // try to get file type from file extension
      const fileExtension =
        typeof file === "string" ? file?.split(".").pop() : undefined;
      const isVideo =
        fileExtension && supportedVideoExtensions.includes(fileExtension);

      return isVideo ? "video" : "image";
    } else if (typeof file === "object") {
      return file?.type.includes("video") ? "video" : "image";
    }
  }, [file, type]);

  if (uri) {
    if (fileType === "image") {
      return (
        <Image
          tw={tw}
          style={style}
          source={{
            uri,
          }}
        />
      );
    }

    if (fileType === "video") {
      return (
        <Video
          source={{ uri }}
          style={[tailwind(tw), style]}
          resizeMode="cover"
          isMuted
          shouldPlay
        />
      );
    }
  }

  return null;
};

export const getLocalFileURI = (file?: string | File) => {
  if (!file) return null;

  if (typeof file === "string") return file;

  if (Platform.OS === "web") return URL.createObjectURL(file);

  return null;
};
