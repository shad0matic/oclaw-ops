"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Brain,
  Activity,
  Settings,
  ListTodo,
  FlaskConical,
  DollarSign,
  User,
  FileText,
} from "lucide-react";
import useSWR from "swr";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/lab", label: "Lab", icon: FlaskConical },
  { href: "/tasks", label: "Kanban", icon: ListTodo },
  { href: "/knowledge", label: "Knowledge", icon: Brain },
  { href: "/costs", label: "Costs", icon: DollarSign },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/events", label: "Events", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const { data: agents } = useSWR("/api/agents", fetcher);
  const { data: tasks } = useSWR("/api/tasks", fetcher);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K (may conflict with browser)
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      // Alternative: Ctrl/Cmd + / (works on Windows where Ctrl+K opens browser search)
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      // Alternative: Ctrl/Cmd + P (common in VS Code)
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleNavigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {navItems.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => handleNavigate(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        {agents && (
          <CommandGroup heading="Agents">
            {agents.map((agent: any) => (
              <CommandItem
                key={agent.id}
                onSelect={() => handleNavigate(`/agents/${agent.id}`)}
              >
                <User className="mr-2 h-4 w-4" />
                <span>{agent.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {tasks && (
          <CommandGroup heading="Tasks">
            {tasks.map((task: any) => (
              <CommandItem
                key={task.id}
                onSelect={() => handleNavigate(`/tasks/${task.id}`)}
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>{task.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
