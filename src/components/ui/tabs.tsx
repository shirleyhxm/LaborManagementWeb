"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs@1.1.3";

import { cn } from "./utils";

type TabsOrientation = "horizontal" | "vertical";

interface TabsProps extends Omit<React.ComponentProps<typeof TabsPrimitive.Root>, 'orientation'> {
  orientation?: TabsOrientation;
}

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsProps) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      orientation={orientation}
      className={cn(
        orientation === "vertical" ? "flex flex-row gap-0" : "flex flex-col gap-2",
        className
      )}
      {...props}
    />
  );
}

interface TabsListProps extends Omit<React.ComponentProps<typeof TabsPrimitive.List>, 'orientation'> {
  orientation?: TabsOrientation;
}

function TabsList({
  className,
  orientation = "horizontal",
  ...props
}: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex items-center",
        orientation === "vertical"
          ? "flex-col h-full w-fit p-2"
          : "bg-muted text-muted-foreground justify-center p-[3px] flex-row h-9 w-fit rounded-xl",
        className,
      )}
      {...props}
    >
      <TabsListContext.Provider value={{ orientation }}>
        {props.children}
      </TabsListContext.Provider>
    </TabsPrimitive.List>
  );
}

const TabsListContext = React.createContext<{ orientation: TabsOrientation }>({
  orientation: "horizontal"
});

function TabsTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { orientation } = React.useContext(TabsListContext);

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center text-sm font-medium transition-all focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        orientation === "vertical"
          ? "w-full justify-start gap-3 px-4 py-3 h-auto !border-l-4 !border-l-transparent text-neutral-700 hover:!bg-neutral-50 data-[state=active]:!bg-blue-50 data-[state=active]:!text-blue-600 data-[state=active]:!border-l-blue-600"
          : "h-[calc(100%-1px)] flex-1 justify-center gap-1.5 rounded-xl px-2 py-1 whitespace-nowrap border border-transparent data-[state=active]:bg-card dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
