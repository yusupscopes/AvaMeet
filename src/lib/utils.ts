import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import humanizeDuration from "humanize-duration";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDuration = (seconds: number) => {
  return humanizeDuration(seconds * 1000, {
    round: true,
    largest: 1,
    units: ["h", "m", "s"],
  });
};
