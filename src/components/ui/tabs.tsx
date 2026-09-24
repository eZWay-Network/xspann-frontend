"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cx } from "@/lib/format";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cx("flex min-w-0 overflow-x-auto", className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cx(
        "flex min-w-36 items-center justify-center gap-2 border-b-2 border-transparent px-5 py-4 text-sm font-bold text-violet-100/45 transition hover:text-violet-100/80 data-[state=active]:border-white data-[state=active]:text-white",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
