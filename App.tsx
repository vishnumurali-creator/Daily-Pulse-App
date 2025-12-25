import React, { useState, useEffect } from 'react';
import { 
  User, 
  DailyCheckout, 
  Task, 
  Interaction, 
  TabView, 
} from './types';
import { INITIAL_USERS } from './constants';
import DailyCheckoutForm from './components/DailyCheckout';
import TeamFeed from './components/TeamFeed';
import Dashboard from './components/Dashboard';
import Planner from './components/WeeklyPlanner';
import { fetchAppData, syncItem } from './services/storage';
import { 
  LayoutDashboard, 
  PenSquare, 
  Users, 
  CalendarClock,
  Loader2
} from 'lucide-react';

const App: React.FC = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[1]); // Default to Bob
  
  const [checkouts, setCheckouts] = useState<DailyCheckout[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  
  const [activeTab, setActiveTab] = useState<TabView>(TabView.CHECKOUT);

  // Load Data on Mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchAppData();
      setUsers(data.users.length > 0 ? data.users : INITIAL_USERS);
      setCheckouts(data.checkouts);
      setTasks(data.tasks);
      setInteractions(data.interactions);
      setLoading(false);
    };
    load();
  }, []);

  // --- Handlers (Optimistic Updates + Sync) ---

  const handleAddCheckout = (data: Omit<DailyCheckout, 'checkoutId' | 'timestamp'>) => {
    const newCheckout: DailyCheckout = {
      ...data,
      checkoutId: `c${Date.now()}`,
      timestamp: Date.now(),
    };
    setCheckouts([newCheckout, ...checkouts]);
    syncItem('Checkouts', newCheckout);
    setActiveTab(TabView.FEED); 
  };

  const handleAddKudos = (checkoutId: string) => {
    const newInteraction: Interaction = {
      interactionId: `i${Date.now()}`,
      checkoutId,
      commenterId: currentUser.userId,
      type: 'kudos',
      timestamp: Date.now(),
    };
    setInteractions([...interactions, newInteraction]);
    syncItem('Interactions', newInteraction);
  };

  const handleAddReply = (checkoutId: string, text: string) => {
    const newInteraction: Interaction = {
      interactionId: `i${Date.now()}`,
      checkoutId,
      commenterId: currentUser.userId,
      commentText: text,
      type: 'reply',
      timestamp: Date.now(),
    };
    setInteractions([...interactions, newInteraction]);
    syncItem('Interactions', newInteraction);
  };

  const handleAddTask = (taskData: Omit<Task, 'taskId' | 'actualPomodoros' | 'status'>) => {
    const newTask: Task = {
      ...taskData,
      taskId: `t${Date.now()}`,
      actualPomodoros: 0,
      status: 'To Do',
    };
    setTasks([newTask, ...tasks]);
    syncItem('Tasks', newTask);
  };

  const handleUpdatePomodoro = (taskId: string, increment: number) => {
    const updatedTasks = tasks.map(t => {
      if (t.taskId === taskId) {
        const updated = { ...t, actualPomodoros: t.actualPomodoros + increment };
        // Note: Full sync update logic would require an ID-based update endpoint, 
        // simplified here to just local update for the prototype session.
        return updated;
      }
      return t;
    });
    setTasks(updatedTasks);
  };

  const handleToggleTaskStatus = (taskId: string) => {
    const updatedTasks = tasks.map(t => 
      t.taskId === taskId ? { ...t, status: t.status === 'Done' ? 'To Do' : 'Done' } : t
    );
    setTasks(updatedTasks as Task[]);
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Syncing with HQ...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case TabView.CHECKOUT:
        return <DailyCheckoutForm currentUser={currentUser} onSubmit={handleAddCheckout} />;
      case TabView.FEED:
        return (
          <TeamFeed 
            checkouts={checkouts} 
            users={users} 
            currentUser={currentUser}
            interactions={interactions}
            onAddKudos={handleAddKudos}
            onReply={handleAddReply}
          />
        );
      case TabView.DASHBOARD:
        return (
          <Dashboard 
            currentUser={currentUser} 
            users={users} 
            checkouts={checkouts} 
            tasks={tasks}
            interactions={interactions}
          />
        );
      case TabView.PLANNER:
        return (
          <Planner 
            currentUser={currentUser}
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdatePomodoro={handleUpdatePomodoro}
            onToggleStatus={handleToggleTaskStatus}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="font-bold text-lg tracking-tight hidden sm:block">The Daily Pulse</h1>
          </div>
          
          {/* User Switcher for Demo */}
          <div className="flex items-center gap-3">
             <span className="text-xs text-slate-400 uppercase font-bold hidden sm:inline">Viewing As:</span>
             <select 
              value={currentUser.userId}
              onChange={(e) => setCurrentUser(users.find(u => u.userId === e.target.value) || users[0])}
              className="text-sm border border-slate-300 rounded-md py-1 px-2 bg-slate-50 focus:ring-indigo-500 focus:border-indigo-500"
             >
               {users.map(u => (
                 <option key={u.userId} value={u.userId}>{u.name}</option>
               ))}
             </select>
             <img src={currentUser.avatar} alt="avatar" className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 md:sticky md:bottom-auto md:top-0">
        <div className="max-w-4xl mx-auto flex justify-around items-center h-16 md:hidden">
          <NavButton 
            active={activeTab === TabView.CHECKOUT} 
            onClick={() => setActiveTab(TabView.CHECKOUT)} 
            icon={<PenSquare className="w-6 h-6" />} 
            label="Checkout" 
          />
           <NavButton 
            active={activeTab === TabView.FEED} 
            onClick={() => setActiveTab(TabView.FEED)} 
            icon={<Users className="w-6 h-6" />} 
            label="Team Feed" 
          />
           <NavButton 
            active={activeTab === TabView.PLANNER} 
            onClick={() => setActiveTab(TabView.PLANNER)} 
            icon={<CalendarClock className="w-6 h-6" />} 
            label="Planner" 
          />
           <NavButton 
            active={activeTab === TabView.DASHBOARD} 
            onClick={() => setActiveTab(TabView.DASHBOARD)} 
            icon={<LayoutDashboard className="w-6 h-6" />} 
            label="Dash" 
          />
        </div>
        
         <div className="hidden md:flex max-w-4xl mx-auto justify-center gap-8 py-4 bg-white/80 backdrop-blur-md sticky bottom-4 rounded-full shadow-lg border border-slate-200 mt-4 mb-8">
             <NavButton 
                active={activeTab === TabView.CHECKOUT} 
                onClick={() => setActiveTab(TabView.CHECKOUT)} 
                icon={<PenSquare className="w-5 h-5" />} 
                label="Daily Checkout" 
                desktop
              />
               <NavButton 
                active={activeTab === TabView.FEED} 
                onClick={() => setActiveTab(TabView.FEED)} 
                icon={<Users className="w-5 h-5" />} 
                label="Team Feed" 
                 desktop
              />
               <NavButton 
                active={activeTab === TabView.PLANNER} 
                onClick={() => setActiveTab(TabView.PLANNER)} 
                icon={<CalendarClock className="w-5 h-5" />} 
                label="Planner" 
                 desktop
              />
               <NavButton 
                active={activeTab === TabView.DASHBOARD} 
                onClick={() => setActiveTab(TabView.DASHBOARD)} 
                icon={<LayoutDashboard className="w-5 h-5" />} 
                label="Dashboard" 
                 desktop
              />
         </div>
      </nav>
    </div>
  );
};

// Helper Subcomponent for Nav
const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; desktop?: boolean }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full md:w-auto md:flex-row md:gap-2 md:px-6 md:py-2 md:rounded-full transition-all ${
      active 
        ? 'text-indigo-600 md:bg-indigo-50' 
        : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    {icon}
    <span className={`text-[10px] md:text-sm font-medium ${active ? 'font-bold' : ''}`}>{label}</span>
  </button>
);

export default App;