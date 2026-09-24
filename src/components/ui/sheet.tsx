"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cx } from "@/lib/format";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

export function SheetOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cx("fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]", className)}
      {...props}
    />
  );
}

export function SheetContent({
  className,
  children,
  side = "left",
  showOverlay = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: "left" | "right";
  showOverlay?: boolean;
}) {
  return (
    <SheetPortal>
      {showOverlay && <SheetOverlay />}
      <DialogPrimitive.Content
        className={cx(
          "fixed inset-y-0 z-50 w-[380px] max-w-[calc(100vw-18px)] outline-none",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}
