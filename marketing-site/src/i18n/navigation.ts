import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware replacements for next/link, useRouter, usePathname, redirect —
// every internal link should import these instead of the plain next/*
// versions so navigation preserves the active locale automatically.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
