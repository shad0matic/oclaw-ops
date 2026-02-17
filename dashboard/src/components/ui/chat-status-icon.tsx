"use client";
import { FC } from 'react';
import { MessageCircle } from 'lucide-react';

type CommentStatus = 'red' | 'yellow' | 'green' | 'gray';

interface ChatStatusIconProps {
  status: CommentStatus;
  commentCount: number;
}

const statusColors: Record<CommentStatus, string> = {
  red: 'text-red-500',
  yellow: 'text-yellow-500',
  green: 'text-green-500',
  gray: 'text-gray-500',
};

export const ChatStatusIcon: FC<ChatStatusIconProps> = ({ status, commentCount }) => {
  if (commentCount === 0) {
    return null;
  }

  return (
    <div className={`relative w-5 h-5 ${statusColors[status]}`}>
      <MessageCircle className="w-full h-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1 h-1 bg-current rounded-full" />
        <div className="w-1 h-1 mx-0.5 bg-current rounded-full" />
        <div className="w-1 h-1 bg-current rounded-full" />
      </div>
    </div>
  );
};
