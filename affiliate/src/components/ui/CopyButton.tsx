"use client";

import { useState } from "react";
import { Copy, CheckCircle } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: "xs" | "sm";
  variant?: "outline" | "ghost";
}

export default function CopyButton({ text, label = "Copy", size = "sm", variant = "outline" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyToClipboard(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  const sizeClass = size === "xs" ? "!py-1 !px-2 !text-xs gap-1" : "!py-1.5 !px-3 !text-xs";

  return (
    <button
      onClick={handleCopy}
      className={cn(
        variant === "outline" ? "btn-outline" : "btn-ghost",
        sizeClass,
        copied && "text-emerald-600 border-emerald-200"
      )}
    >
      {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
      {copied ? "Copied!" : label}
    </button>
  );
}
