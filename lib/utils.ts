import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate 6-character reference number, excluding ambiguous chars (0, O, 1, I)
 * Format: KSRTC-4F9K2Q
 */
export function generateRef(): string {
  const allowed = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * allowed.length);
    code += allowed[idx];
  }
  return `KSRTC-${code}`;
}

/**
 * Generate random 4-digit OTP code (e.g. 7482)
 */
export function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Format timestamp to human readable date/time
 */
export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return isoString;
  }
}
