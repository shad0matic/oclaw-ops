"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function TodoSort({ onSortChange }: { onSortChange: (value: string) => void }) {
  return (
    <Select onValueChange={onSortChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="due_date">Due Date</SelectItem>
        <SelectItem value="priority">Priority</SelectItem>
        <SelectItem value="created_at">Created Date</SelectItem>
        <SelectItem value="manual">Manual</SelectItem>
      </SelectContent>
    </Select>
  );
}
