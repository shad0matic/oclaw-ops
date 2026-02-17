"use client";
import { FC } from 'react';
import { MessageCircle } from 'lucide-react';

type CommentStatus = 'waiting' | 'attention' | 'gray';

interface ChatStatusIconProps {
  status: CommentStatus;
  commentCount: number;
}

const statusStyles: Record<CommentStatus, { color: string; pulse?: boolean }> = {
  waiting: { color: 'text-blue-500' },           // Boss waiting for agent
  attention: { color: 'text-amber-500', pulse: true },  // Agent replied, needs Boss
  gray: { color: 'text-gray-400' },              // Resolved
};

export const ChatStatusIcon: FC<ChatStatusIconProps> = ({ status, commentCount }) => {
  if (commentCount === 0) {
    return null;
  }

  const style = statusStyles[status] || statusStyles.gray;

  return (
    <div className={`relative w-5 h-5 ${style.color} ${style.pulse ? 'animate-pulse' : ''}`}>
      <MessageCircle className="w-full h-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1 h-1 bg-current rounded-full" />
        <div className="w-1 h-1 mx-0.5 bg-current rounded-full" />
        <div className="w-1 h-1 bg-current rounded-full" />
      </div>
    </div>
  );
};
