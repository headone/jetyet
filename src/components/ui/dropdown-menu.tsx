"use client";

import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

const DropdownMenu = Menu.Root;

const DropdownMenuTrigger = Menu.Trigger;

const DropdownMenuPortal = Menu.Portal;

const DropdownMenuPositioner = Menu.Positioner;

function DropdownMenuContent({
    className,
    ...props
}: Menu.Popup.Props) {
    return (
        <DropdownMenuPortal>
            <DropdownMenuPositioner
                side="bottom"
                align="end"
                sideOffset={4}
            >
                <Menu.Popup
                    className={cn(
                        "z-50 min-w-[16rem] overflow-hidden rounded-lg border border-border/50 bg-popover p-1.5 text-popover-foreground shadow-lg shadow-black/10",
                        "transition-all duration-200",
                        "data-starting-style:opacity-0 data-starting-style:scale-95",
                        "data-ending-style:opacity-0 data-ending-style:scale-95",
                        className,
                    )}
                    {...props}
                />
            </DropdownMenuPositioner>
        </DropdownMenuPortal>
    );
}

function DropdownMenuItem({
    className,
    ...props
}: Menu.Item.Props) {
    return (
        <Menu.Item
            className={cn(
                "relative flex cursor-pointer select-none items-center rounded-md px-2.5 py-2 text-sm outline-none transition-all duration-150",
                "hover:bg-accent/80 hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                "data-disabled:pointer-events-none data-disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}

function DropdownMenuSeparator({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("-mx-1 my-1 h-px bg-muted", className)}
            {...props}
        />
    );
}

function DropdownMenuLabel({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("px-2 py-1.5 text-sm font-semibold", className)}
            {...props}
        />
    );
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuPositioner,
};
