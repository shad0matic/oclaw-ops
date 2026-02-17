"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle, Clock, AlertTriangle, CheckCircle } from "lucide-react";

export function KanbanLegend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-border bg-card/50 mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Legend</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Chat Status */}
          <div className="space-y-2">
            <div className="font-medium text-foreground">Chat Status</div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <span>Unread by agent</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-300" />
              <span>Read, no reply</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Agent replied</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-gray-400" />
              <span>Closed</span>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <div className="font-medium text-foreground">Priority</div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span>P1-2 Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              <span>P3-4 High</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              <span>P5-6 Normal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
              <span>P7+ Low</span>
            </div>
          </div>

          {/* Task Status */}
          <div className="space-y-2">
            <div className="font-medium text-foreground">Columns</div>
            <div className="flex items-center gap-2">📥 Backlog</div>
            <div className="flex items-center gap-2">📋 Planned</div>
            <div className="flex items-center gap-2">⚡ Running</div>
            <div className="flex items-center gap-2">🔄 Review</div>
            <div className="flex items-center gap-2">👤 Human Todo</div>
            <div className="flex items-center gap-2">✅ Done</div>
          </div>

          {/* Other Indicators */}
          <div className="space-y-2">
            <div className="font-medium text-foreground">Other</div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Time since update</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-1 bg-muted rounded">Tag</span>
              <span>Project/epic tag</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-gradient-to-r from-green-500 to-blue-500" />
              <span>Agent avatar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
