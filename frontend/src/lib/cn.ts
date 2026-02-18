import clsx, { type ClassValue } from "clsx";

function twMerge(classes: string) {
  return classes;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
