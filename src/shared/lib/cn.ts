import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const mergeClasses = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["control", "input", "dialog", "artwork", "sheet"],

      text: ["control"],
      leading: ["control"],
      spacing: ["control", "control-x", "control-y"],
    },
  },

  override: {
    conflictingClassGroups: {
      "font-size": []
    },
  },
});

export function cn (...inputs: ClassValue[]): string {
  return mergeClasses(clsx(inputs));
}
