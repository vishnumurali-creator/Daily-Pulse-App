import React, { useState } from 'react';
import { User, DailyCheckout } from '../types';
import { Send, Zap, ShieldAlert, Target } from 'lucide-react';

interface DailyCheckoutProps {
  currentUser: User;
  onSubmit: (checkout: Omit<DailyCheckout, 'checkoutId' | 'timestamp'>) => void;
}

const DailyCheckoutForm: React.FC<DailyCheckoutProps> = ({ currentUser, onSubmit }) => {
  const [vibe, setVibe] = useState<number>(5);
  const [win, setWin] = useState('');
  const [blocker, setBlocker] = useState('');
  const [goal, setGoal] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate Local YYYY-MM-DD to avoid timezone shifts (e.g. 8pm EST becoming tomorrow UTC)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localDateStr = `${year}-${month}-${day}`;

    onSubmit({
      userId: currentUser.userId,
      date: localDateStr,
      vibeScore: vibe,
      winText: win,
      blockerText: blocker,
      tomorrowGoalText: goal,
    });
    setSubmitted(true);
    // Reset form for demo purposes after delay, or keep as "Done" state
    setTimeout(() => {
        setWin('');
        setBlocker('');
        setGoal('');
        setVibe(5);
        setSubmitted(false);
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
        <div className="bg-green-100 p-4 rounded-full mb-4">
          <Send className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Checkout Sent!</h2>
        <p className="text-slate-600 mt-2">Great work today. See you tomorrow!</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-indigo-600 p-6 text-white">
        <h2 className="text-xl font-bold">Daily Checkout</h2>
        <p className="opacity-90 text-sm">Close out your day, {currentUser.name.split(' ')[0]}.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Vibe Check */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Vibe Check ({vibe}/10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={vibe}
            onChange={(e) => setVibe(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
            <span>Drained 😫</span>
            <span>Energized 🚀</span>
          </div>
        </div>

        {/* Win */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            What's your #1 win today?
          </label>
          <textarea
            required
            value={win}
            onChange={(e) => setWin(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="I finally fixed the..."
            rows={2}
          />
        </div>

        {/* Blocker */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Any blockers? <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            value={blocker}
            onChange={(e) => setBlocker(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="Waiting on..."
            rows={2}
          />
        </div>

        {/* Goal */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            #1 Goal for tomorrow morning
          </label>
          <input
            type="text"
            required
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="Kick off the..."
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md active:transform active:scale-95"
        >
          Submit Checkout
        </button>
      </form>
    </div>
  );
};

export default DailyCheckoutForm;