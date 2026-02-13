"use client";

import { motion } from "framer-motion";
import { useDrag } from "react-dnd";
import { useRef } from "react";
import { FileText } from "lucide-react";
import { ItemTypes } from "./item-types";
import { FeatureRequest, Project, getFrPriorityColor } from "./types";

interface FeatureRequestCardProps {
  fr: FeatureRequest;
  projects: Project[];
  onClick: () => void;
}

export function CompactFrCard({ fr, projects, onClick }: FeatureRequestCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pc = getFrPriorityColor(fr.priority);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.FR_CARD,
      item: fr,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [fr]
  );

  drag(ref);

  const proj = projects.find(p => p.id === (fr.project || "other"));
  const projectIcon = proj?.icon || "📦";
  const projectColor = proj?.color || "border-l-zinc-500";

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={`relative rounded-md border border-border bg-card/40 hover:bg-card/80 p-2 cursor-pointer active:cursor-grabbing border-l-2 ${projectColor}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onClick={onClick}
    >
      <div className="absolute top-1.5 right-1.5 text-muted-foreground/40">
        <FileText size={10} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold text-foreground truncate">{fr.title}</h3>
           <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
            <span>{projectIcon}</span>
            <span className="truncate">{proj?.label || fr.project}</span>
          </div>
        </div>
        <div className="shrink-0">
           <span className={`flex items-center gap-1 text-[10px] font-mono ${pc.text} ${pc.bg} rounded px-1.5 py-0.5`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${pc.dot}`} />
            {fr.priority}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
