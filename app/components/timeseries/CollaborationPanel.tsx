'use client';

import { useState } from 'react';
import { MessageSquare, Send, User, Clock, Pin, Trash2, X, Users, Reply } from 'lucide-react';

export interface Comment {
  id: string;
  widgetId?: string;
  widgetName?: string;
  user: string;
  userAvatar?: string;
  message: string;
  timestamp: Date;
  pinned: boolean;
  replies: Comment[];
  mentions: string[];
}

interface CollaborationPanelProps {
  comments: Comment[];
  onAddComment: (comment: Omit<Comment, 'id' | 'timestamp' | 'replies'>) => void;
  onDeleteComment: (id: string) => void;
  onPinComment: (id: string) => void;
  onReply: (commentId: string, reply: Omit<Comment, 'id' | 'timestamp' | 'replies'>) => void;
  currentUser: string;
  widgets: any[];
}

export default function CollaborationPanel({ comments, onAddComment, onDeleteComment, onPinComment, onReply, currentUser, widgets }: CollaborationPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedWidget, setSelectedWidget] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleSendComment = () => {
    if (!newComment.trim()) return;

    const selectedWidgetData = widgets.find(w => w.id === selectedWidget);

    if (replyingTo) {
      onReply(replyingTo, {
        widgetId: selectedWidget || undefined,
        widgetName: selectedWidgetData?.name,
        user: currentUser,
        message: newComment,
        pinned: false,
        mentions: extractMentions(newComment),
      });
      setReplyingTo(null);
    } else {
      onAddComment({
        widgetId: selectedWidget || undefined,
        widgetName: selectedWidgetData?.name,
        user: currentUser,
        message: newComment,
        pinned: false,
        mentions: extractMentions(newComment),
      });
    }

    setNewComment('');
    setSelectedWidget('');
  };

  const extractMentions = (text: string): string[] => {
    const mentions = text.match(/@(\w+)/g);
    return mentions ? mentions.map(m => m.substring(1)) : [];
  };

  const pinnedComments = comments.filter(c => c.pinned);
  const regularComments = comments.filter(c => !c.pinned);
  const unreadCount = comments.length;

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getUserColor = (name: string) => {
    const colors = [
      'from-blue-600 to-blue-700',
      'from-green-600 to-green-700',
      'from-purple-600 to-purple-700',
      'from-pink-600 to-pink-700',
      'from-orange-600 to-orange-700',
      'from-teal-600 to-teal-700',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <div
      key={comment.id}
      className={`${
        isReply ? 'ml-12 mt-2' : ''
      } rounded-xl border p-4 ${
        comment.pinned
          ? 'border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/30'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      } hover:shadow-md transition-all`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r ${getUserColor(comment.user)} flex-shrink-0 shadow-md`}>
          <span className="text-xs font-bold text-white">{getUserInitials(comment.user)}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{comment.user}</span>
                {comment.pinned && (
                  <Pin className="h-3 w-3 text-yellow-600" />
                )}
                {comment.widgetName && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                    {comment.widgetName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                <Clock className="h-3 w-3" />
                {new Date(comment.timestamp).toLocaleString()}
              </div>
            </div>
            {!isReply && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-all"
                  title="Reply"
                >
                  <Reply className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onPinComment(comment.id)}
                  className={`p-1 rounded transition-all ${
                    comment.pinned
                      ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
                      : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={comment.pinned ? 'Unpin' : 'Pin'}
                >
                  <Pin className="h-3 w-3" />
                </button>
                {comment.user === currentUser && (
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {comment.message}
          </p>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-2">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Collaboration Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-md hover:shadow-lg transition-all"
      >
        <MessageSquare className="h-4 w-4" />
        Comments
        {comments.length > 0 && (
          <span className="ml-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-2.5 py-0.5 text-xs font-bold text-white shadow-md">
            {comments.length}
          </span>
        )}
      </button>

      {/* Collaboration Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[600px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95 z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Team Collaboration
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {comments.length} comments • {pinnedComments.length} pinned
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* New Comment Form */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/30">
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  Replying to comment...
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r ${getUserColor(currentUser)} flex-shrink-0 shadow-md`}>
                <span className="text-xs font-bold text-white">{getUserInitials(currentUser)}</span>
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment... (Use @username to mention)"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none"
                  rows={3}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleSendComment();
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <select
                    value={selectedWidget}
                    onChange={(e) => setSelectedWidget(e.target.value)}
                    className="text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                  >
                    <option value="">General Comment</option>
                    {widgets.map(widget => (
                      <option key={widget.id} value={widget.id}>{widget.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSendComment}
                    disabled={!newComment.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-3 w-3" />
                    Send
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Ctrl + Enter to send
                </p>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4">
            {comments.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No comments yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Start a discussion with your team
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Pinned Comments */}
                {pinnedComments.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Pin className="h-3 w-3" />
                      Pinned Comments
                    </div>
                    {pinnedComments.map(comment => renderComment(comment))}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-4" />
                  </>
                )}

                {/* Regular Comments */}
                {regularComments.map(comment => renderComment(comment))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
