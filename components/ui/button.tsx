import * as React from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "ghost" | "outline";
type ButtonSize = "default" | "sm";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "primary",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "default" && "h-10 px-4",
        size === "sm" && "h-8 px-3",
        variant === "primary" &&
          "bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95",
        variant === "ghost" && "hover:bg-[var(--muted)]",
        variant === "outline" &&
          "border border-[var(--border)] bg-white hover:bg-[var(--muted)]",
        className,
      )}
      {...props}
    />
  );
}

