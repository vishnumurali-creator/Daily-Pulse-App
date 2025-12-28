import React, { useMemo, useState } from 'react';
import { User, DailyCheckout, Task, UserRole, Interaction } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Flame, BrainCircuit, Loader2, Trophy, MessageSquare, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getAiCoachingInsight } from '../services/geminiService';

interface DashboardProps {
  currentUser: User;
  users: User[];
  checkouts: DailyCheckout[];
  tasks: Task[];
  interactions: Interaction[];
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, users, checkouts, tasks, interactions }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const isManager = currentUser.role === UserRole.MANAGER;
  const userCheckouts = checkouts.filter(c => c.userId === currentUser.userId);
  const userTasks = tasks.filter(t => t.userId === currentUser.userId);

  // --- Metrics Calculation ---

  const streak = userCheckouts.length; // Simplified streak

  // Weekly Snapshot Metrics
  const completedTasks = userTasks.filter(t => t.status === 'Done').length;
  const totalTasks = userTasks.length;
  const missedTasks = totalTasks - completedTasks;
  const totalFocusPomodoros = userTasks.reduce((acc, t) => acc + t.actualPomodoros, 0);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Pie Chart Data
  const taskStatusData = [
    { name: 'Achieved', value: completedTasks, color: '#22c55e' },
    { name: 'Missed', value: missedTasks, color: '#f1f5f9' },
  ];

  // Overwork Calculation
  const overworkedDaysCount = useMemo(() => {
    // Group tasks by scheduled date
    const pomosByDate: {[key: string]: number} = {};
    userTasks.forEach(t => {
      const date = t.scheduledDate || 'unknown';
      if (date !== 'unknown') {
        pomosByDate[date] = (pomosByDate[date] || 0) + t.estimatedPomodoros;
      }
    });
    // Count days > 16
    return Object.values(pomosByDate).filter(total => total > 16).length;
  }, [userTasks]);

  // Highlights (Kudos & Manager Replies)
  const highlights = useMemo(() => {
    // Get checkouts by this user
    const myCheckoutIds = new Set(userCheckouts.map(c => c.checkoutId));
    
    // Find interactions on these checkouts
    return interactions
      .filter(i => myCheckoutIds.has(i.checkoutId))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5) // Last 5 highlights
      .map(i => {
        const relatedCheckout = userCheckouts.find(c => c.checkoutId === i.checkoutId);
        const commenter = users.find(u => u.userId === i.commenterId);
        return { ...i, relatedCheckout, commenter };
      });
  }, [interactions, userCheckouts, users]);

  const vibeData = useMemo(() => {
    return userCheckouts
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-14)
      .map(c => ({ date: c.date.slice(5), vibe: c.vibeScore }));
  }, [userCheckouts]);

  const pomodoroData = useMemo(() => {
    return userTasks
      .filter(t => t.status === 'Done')
      .slice(0, 5)
      .map(t => ({
        name: t.taskDescription.substring(0, 10) + '...',
        Estimated: t.estimatedPomodoros,
        Actual: t.actualPomodoros
      }));
  }, [userTasks]);

  const handleGetInsight = async () => {
    setLoadingInsight(true);
    const result = await getAiCoachingInsight(userCheckouts, userTasks, currentUser.name);
    setInsight(result);
    setLoadingInsight(false);
  };

  const ManagerView = () => {
    const blockers = checkouts.filter(c => c.blockerText.length > 0).sort((a, b) => a.timestamp - b.timestamp);

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-800">Manager Overview</h3>
        <div className="bg-red-50 border border-red-100 rounded-xl p-6">
          <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5" />
            Active Blockers
          </h4>
          {blockers.length === 0 ? (
            <p className="text-slate-600">No active blockers reported.</p>
          ) : (
            <ul className="space-y-3">
              {blockers.map(b => {
                const user = users.find(u => u.userId === b.userId);
                return (
                  <li key={b.checkoutId} className="bg-white p-3 rounded shadow-sm">
                    <span className="font-bold text-slate-900">{user?.name}: </span>
                    <span className="text-slate-700">{b.blockerText}</span>
                    <div className="text-xs text-slate-400 mt-1">{b.date}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Performance Dashboard</h2>
        {isManager && <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded">Admin View</span>}
      </div>

      {!isManager || (isManager && checkouts.filter(c => c.userId === currentUser.userId).length > 0) ? (
        <>
           {/* Row 1: Streak, AI & Overwork */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Consistency Streak</p>
                <h3 className="text-3xl font-bold text-slate-900">{streak} Days</h3>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Flame className="w-6 h-6 text-orange-600" />
              </div>
            </div>

            <div className={`p-6 rounded-xl shadow-sm border flex items-center justify-between ${overworkedDaysCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
              <div>
                <p className="text-slate-500 text-sm font-medium">Overworked Days</p>
                <h3 className={`text-3xl font-bold ${overworkedDaysCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{overworkedDaysCount}</h3>
                <p className="text-[10px] text-slate-400">Days &gt; 16 Pomos</p>
              </div>
              <div className={`${overworkedDaysCount > 0 ? 'bg-red-100' : 'bg-slate-100'} p-3 rounded-full`}>
                <AlertTriangle className={`w-6 h-6 ${overworkedDaysCount > 0 ? 'text-red-500' : 'text-slate-400'}`} />
              </div>
            </div>

            <div className="bg-indigo-600 p-6 rounded-xl shadow-sm border border-indigo-700 text-white relative overflow-hidden">
               <div className="relative z-10">
                 <p className="opacity-80 text-sm font-medium">AI Coach</p>
                 <div className="mt-2 min-h-[60px]">
                   {loadingInsight ? (
                     <div className="flex items-center gap-2">
                       <Loader2 className="w-5 h-5 animate-spin" />
                       <span>Analyzing your vibes...</span>
                     </div>
                   ) : insight ? (
                     <p className="text-sm italic">"{insight}"</p>
                   ) : (
                     <button 
                       onClick={handleGetInsight}
                       className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded text-sm transition-colors"
                     >
                       <BrainCircuit className="w-4 h-4" />
                       Get Insight
                     </button>
                   )}
                 </div>
               </div>
            </div>
          </div>

          {/* Row 2: Weekly Snapshot */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Weekly Snapshot</h3>
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                
                {/* Metric 1: Completion */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 relative">
                       <PieChart width={64} height={64}>
                          <Pie
                            data={taskStatusData}
                            cx={32}
                            cy={32}
                            innerRadius={20}
                            outerRadius={32}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {taskStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                           {completionRate}%
                        </div>
                    </div>
                    <div>
                       <div className="text-xs text-slate-500 font-bold uppercase">Goal Completion</div>
                       <div className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3"/> {completedTasks} Done</span>
                          <span className="flex items-center gap-1 text-slate-400"><XCircle className="w-3 h-3"/> {missedTasks} Missed</span>
                       </div>
                    </div>
                </div>

                {/* Metric 2: Total Focus */}
                <div className="md:border-l md:border-slate-100 md:pl-8">
                   <p className="text-xs text-slate-500 font-bold uppercase mb-1">Deep Work</p>
                   <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-slate-900">{totalFocusPomodoros}</span>
                      <span className="text-sm text-slate-500 mb-1">Pomodoros</span>
                   </div>
                   <p className="text-xs text-slate-400 mt-1">Approx {totalFocusPomodoros * 25} mins focused</p>
                </div>

                {/* Metric 3: Impact Score (Simple calc) */}
                <div className="md:border-l md:border-slate-100 md:pl-8">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Impact Score</p>
                    <div className="flex items-center gap-2">
                        <Trophy className={`w-8 h-8 ${completedTasks > 2 ? 'text-amber-500' : 'text-slate-300'}`} />
                        <div>
                             <span className="text-xl font-bold text-slate-900">{completedTasks * 10 + streak * 5}</span>
                             <span className="text-xs text-slate-400 block">points</span>
                        </div>
                    </div>
                </div>

             </div>
          </div>

          {/* Row 3: Charts & Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Vibe Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Vibe Trend</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vibeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{fontSize: 10}} stroke="#94a3b8" />
                    <YAxis domain={[0, 10]} tick={{fontSize: 10}} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="vibe" stroke="#4f46e5" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pomodoro Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Est. vs Actual Focus</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pomodoroData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fontSize: 10}} stroke="#94a3b8" />
                    <YAxis tick={{fontSize: 10}} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                    <Bar dataKey="Estimated" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
           {/* Row 4: Highlights */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Highlights & Kudos</h3>
              </div>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[300px]">
                  {highlights.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm">
                          No highlights yet. keep pushing!
                      </div>
                  ) : (
                      highlights.map(h => (
                          <div key={h.interactionId} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                              <div className="flex items-start gap-3">
                                  {h.type === 'kudos' ? (
                                      <div className="bg-orange-100 text-orange-600 p-1.5 rounded-full">
                                          <Trophy className="w-3 h-3" />
                                      </div>
                                  ) : (
                                      <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-full">
                                          <MessageSquare className="w-3 h-3" />
                                      </div>
                                  )}
                                  <div>
                                      <p className="text-sm text-slate-800">
                                          <span className="font-bold">{h.commenter?.name}</span>
                                          {h.type === 'kudos' ? ' gave you kudos!' : ' replied to your check-in:'}
                                      </p>
                                      {h.commentText && (
                                          <p className="text-sm text-slate-600 mt-1 italic">"{h.commentText}"</p>
                                      )}
                                      <p className="text-xs text-slate-400 mt-2">
                                          On: {h.relatedCheckout?.winText.substring(0, 30)}...
                                      </p>
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
            </div>

        </>
      ) : null}

      {isManager && (
        <>
          <hr className="border-slate-200" />
          <ManagerView />
        </>
      )}
    </div>
  );
};

export default Dashboard;