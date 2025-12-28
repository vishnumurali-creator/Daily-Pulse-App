import React, { useState } from 'react';
import { DailyCheckout, User, Interaction, UserRole } from '../types';
import { MessageSquare, Heart, ShieldAlert } from 'lucide-react';

interface TeamFeedProps {
  checkouts: DailyCheckout[];
  users: User[];
  currentUser: User;
  interactions: Interaction[];
  onAddKudos: (checkoutId: string) => void;
  onReply: (checkoutId: string, text: string) => void;
}

const TeamFeed: React.FC<TeamFeedProps> = ({
  checkouts,
  users,
  currentUser,
  interactions,
  onAddKudos,
  onReply,
}) => {
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  // Sort by newest first
  const sortedCheckouts = [...checkouts].sort((a, b) => b.timestamp - a.timestamp);

  const getUser = (id: string) => users.find((u) => u.userId === id);

  const handleReplySubmit = (checkoutId: string) => {
    if (replyText[checkoutId]?.trim()) {
      onReply(checkoutId, replyText[checkoutId]);
      setReplyText((prev) => ({ ...prev, [checkoutId]: '' }));
      setActiveReplyId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <h2 className="text-2xl font-bold text-slate-800 px-1">Open Kitchen Feed</h2>
      
      {sortedCheckouts.length === 0 && (
        <div className="text-center text-slate-500 py-10">No checkouts yet today. Be the first!</div>
      )}

      {sortedCheckouts.map((checkout) => {
        const author = getUser(checkout.userId);
        if (!author) return null;

        const postInteractions = interactions.filter((i) => i.checkoutId === checkout.checkoutId);
        const kudosCount = postInteractions.filter((i) => i.type === 'kudos').length;
        const replies = postInteractions.filter((i) => i.type === 'reply');

        return (
          <div key={checkout.checkoutId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <img src={author.avatar} alt={author.name} className="w-10 h-10 rounded-full bg-slate-100" />
                <div>
                  <h3 className="font-semibold text-slate-900">{author.name}</h3>
                  <p className="text-xs text-slate-500">{checkout.date}</p>
                </div>
                <div className={`ml-auto px-2 py-1 rounded text-xs font-bold ${checkout.vibeScore >= 8 ? 'bg-green-100 text-green-700' : checkout.vibeScore <= 4 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  Vibe: {checkout.vibeScore}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Big Win</span>
                  <p className="text-slate-800 mt-1">{checkout.winText}</p>
                </div>

                {checkout.blockerText && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Blocker</span>
                    </div>
                    <p className="text-slate-800 text-sm">{checkout.blockerText}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Interactions Bar */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center gap-4">
              <button
                onClick={() => onAddKudos(checkout.checkoutId)}
                className="flex items-center gap-1.5 text-slate-600 hover:text-orange-500 transition-colors text-sm font-medium"
              >
                <Heart className={`w-4 h-4 ${kudosCount > 0 ? 'fill-orange-500 text-orange-500' : ''}`} />
                <span>{kudosCount || 'Kudos'}</span>
              </button>

               <button
                 onClick={() => setActiveReplyId(activeReplyId === checkout.checkoutId ? null : checkout.checkoutId)}
                 className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 transition-colors text-sm font-medium"
               >
                 <MessageSquare className="w-4 h-4" />
                 <span>Reply</span>
               </button>
            </div>

            {/* Replies Section */}
            {(replies.length > 0 || activeReplyId === checkout.checkoutId) && (
              <div className="bg-slate-50 px-5 pb-5 pt-0 border-t border-slate-100">
                {replies.map((reply) => {
                    const replyAuthor = getUser(reply.commenterId);
                    return (
                        <div key={reply.interactionId} className="mt-3 pl-3 border-l-2 border-indigo-200">
                            <p className="text-xs font-bold text-slate-700">{replyAuthor?.name}</p>
                            <p className="text-sm text-slate-600">{reply.commentText}</p>
                        </div>
                    );
                })}

                {activeReplyId === checkout.checkoutId && (
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={replyText[checkout.checkoutId] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [checkout.checkoutId]: e.target.value })}
                      className="flex-1 text-sm border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      onClick={() => handleReplySubmit(checkout.checkoutId)}
                      className="bg-indigo-600 text-white text-xs px-3 py-2 rounded-md font-medium"
                    >
                      Post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TeamFeed;