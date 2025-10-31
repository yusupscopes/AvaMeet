"use client";
import { BotIcon, LucideIcon, StarIcon, VideoIcon } from "lucide-react";

type MenuType = {
  icon: LucideIcon;
  label: string;
  href: string;
};

import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import DashboardAccountButton from "./dashboard-account-button";

const menus: MenuType[] = [
  {
    icon: VideoIcon,
    label: "Meetings",
    href: "/meetings",
  },
  {
    icon: BotIcon,
    label: "Agents",
    href: "/agents",
  },
];

const extraMenus: MenuType[] = [
  {
    icon: StarIcon,
    label: "Upgrade",
    href: "/upgrade",
  },
];

export const DashboardSidebar = () => {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="text-sidebar-accent-foreground">
        <Link href="/" className="flex items-center gap-2 px-2 pt-2">
          <Image src="/logo.svg" alt="AvaMeet" width={36} height={36} />
          <p className="text-2xl font-semibold">AvaMeet</p>
        </Link>
      </SidebarHeader>
      <div className="px-4 py-2">
        <Separator className="opacity-10 text-[#3A0CA3]" />
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menus.map((menu) => (
                <SidebarMenuItem key={menu.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === menu.href}
                    className={cn(
                      "h-10 hover:bg-linear-to-r/oklch border border-transparent hover:border-[#3A0CA3]/10 from-sidebar-accent from-5% via-30% via-sidebar/50 to-sidebar/50",
                      pathname === menu.href &&
                        "bg-linear-to-r/oklch border-[#3A0CA3]/10"
                    )}
                  >
                    <Link href={menu.href}>
                      <menu.icon className="size-5" />
                      <span className="text-sm font-medium tracking-tight">
                        {menu.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="px-4 py-2">
          <Separator className="opacity-10 text-[#3A0CA3]" />
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {extraMenus.map((menu) => (
                <SidebarMenuItem key={menu.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === menu.href}
                    className={cn(
                      "h-10 hover:bg-linear-to-r/oklch border border-transparent hover:border-[#3A0CA3]/10 from-sidebar-accent from-5% via-30% via-sidebar/50 to-sidebar/50",
                      pathname === menu.href &&
                        "bg-linear-to-r/oklch border-[#3A0CA3]/10"
                    )}
                  >
                    <Link href={menu.href}>
                      <menu.icon className="size-5" />
                      <span className="text-sm font-medium tracking-tight">
                        {menu.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="text-white">
        <DashboardAccountButton />
      </SidebarFooter>
    </Sidebar>
  );
};
