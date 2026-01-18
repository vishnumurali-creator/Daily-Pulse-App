import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  DailyCheckout, 
  Task, 
  Interaction, 
  TabView, 
  UserRole,
  WeeklyGoal,
} from './types';
import { INITIAL_USERS } from './constants';
import DailyCheckoutForm from './components/DailyCheckout';
import TeamFeed from './components/TeamFeed';
import Dashboard from './components/Dashboard';
import Planner from './components/WeeklyPlanner';
import WeeklyGoals from './components/WeeklyGoals'; // New Component
import { fetchAppData, syncItem } from './services/storage';
import { 
  LayoutDashboard, 
  PenSquare, 
  Users, 
  CalendarClock,
  Loader2,
  PlusCircle,
  X,
  LogOut,
  ChevronRight,
  RotateCcw,
  Share2,
  Check,
  Copy,
  AlertTriangle,
  Link as LinkIcon,
  Target
} from 'lucide-react';

const App: React.FC = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); // Silent background sync state
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Null means logged out
  
  const [checkouts, setCheckouts] = useState<DailyCheckout[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  
  const [activeTab, setActiveTab] = useState<TabView>(TabView.CHECKOUT);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Centralized Data Fetcher
  const refreshData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsSyncing(true);

    const data = await fetchAppData();
    
    // Determine which user list to use
    const loadedUsers = data.users.length > 0 ? data.users : INITIAL_USERS;
    setUsers(loadedUsers);
    
    setCheckouts(data.checkouts);
    setTasks(data.tasks);
    setWeeklyGoals(data.weeklyGoals);
    setInteractions(data.interactions);

    setLastSynced(new Date());

    if (!isBackground) setLoading(false);
    else setIsSyncing(false);
  }, []);

  // Load Data on Mount & Setup Polling
  useEffect(() => {
    // Initial Load
    refreshData(false);

    // Check for saved session
    const savedUserId = localStorage.getItem('dailyPulse_userId');
    if (savedUserId) {
      const rehydrateUser = async () => {
         const data = await fetchAppData();
         const allUsers = data.users.length > 0 ? data.users : INITIAL_USERS;
         const returningUser = allUsers.find(u => u.userId === savedUserId);
         if (returningUser) {
            setCurrentUser(returningUser);
         }
      }
      rehydrateUser();
    }

    // Polling Interval (every 15 seconds)
    const intervalId = setInterval(() => {
      refreshData(true);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [refreshData]);

  // Handle Tab Switch
  const handleTabChange = (tab: TabView) => {
    setActiveTab(tab);
    if (tab === TabView.PLANNER || tab === TabView.DASHBOARD || tab === TabView.GOALS) {
        refreshData(true);
    }
  };

  // --- Handlers (Optimistic Updates + Sync) ---

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('dailyPulse_userId', user.userId); // Persist session
    setActiveTab(TabView.CHECKOUT); // Reset to default tab on login
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('dailyPulse_userId'); // Clear session
  };

  const handleAddCheckout = (data: Omit<DailyCheckout, 'checkoutId' | 'timestamp'>) => {
    if (!currentUser) return;
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
    if (!currentUser) return;
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
    if (!currentUser) return;
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

  // --- Task (Daily) Handlers ---

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
        const updated = { ...t, actualPomodoros: Math.max(0, t.actualPomodoros + increment) };
        syncItem('Tasks', updated);
        return updated;
      }
      return t;
    });
    setTasks(updatedTasks);
  };

  const handleToggleTaskStatus = (taskId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.taskId === taskId) {
        const updated = { ...t, status: t.status === 'Done' ? 'To Do' : 'Done' } as Task;
        syncItem('Tasks', updated);
        return updated;
      }
      return t;
    });
    setTasks(updatedTasks as Task[]);
  };

  // --- Weekly Goal Handlers ---

  const handleAddWeeklyGoal = (goalData: Omit<WeeklyGoal, 'goalId'>) => {
    const newGoal: WeeklyGoal = {
      ...goalData,
      goalId: `g${Date.now()}`,
    };
    setWeeklyGoals([newGoal, ...weeklyGoals]);
    syncItem('WeeklyGoals', newGoal);
  };

  const handleUpdateWeeklyGoal = (goalId: string, updates: Partial<WeeklyGoal>) => {
    const updatedGoals = weeklyGoals.map(g => {
      if (g.goalId === goalId) {
        const updated = { ...g, ...updates };
        syncItem('WeeklyGoals', updated);
        return updated;
      }
      return g;
    });
    setWeeklyGoals(updatedGoals);
  };

  const handleCreateUser = (name: string, role: UserRole) => {
    const newUser: User = {
      userId: `u${Date.now()}`,
      name,
      role,
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${name}`, 
    };
    
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    
    syncItem('Users', newUser);
    setIsUserModalOpen(false);
    handleLogin(newUser);
  };

  // --- Render ---

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Syncing with HQ...</p>
      </div>
    );
  }

  // --- Login Screen ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-indigo-600 p-8 text-center">
             <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <span className="text-white font-bold text-3xl">P</span>
             </div>
             <h1 className="text-2xl font-bold text-white mb-2">The Daily Pulse</h1>
             <p className="text-indigo-100">Select your profile to check in.</p>
          </div>
          
          <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
             {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                </div>
             ) : (
               users.map(u => (
                 <button
                   key={u.userId}
                   onClick={() => handleLogin(u)}
                   className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group text-left"
                 >
                   <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full bg-slate-200 border border-slate-100" />
                   <div className="flex-1">
                     <h3 className="font-bold text-slate-800">{u.name}</h3>
                     <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === UserRole.MANAGER ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                       {u.role}
                     </span>
                   </div>
                   <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                 </button>
               ))
             )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <button 
               onClick={() => setIsUserModalOpen(true)}
               className="text-indigo-600 font-medium text-sm flex items-center justify-center gap-2 hover:underline"
            >
              <PlusCircle className="w-4 h-4" />
              New Team Member?
            </button>
          </div>
        </div>

        {isUserModalOpen && (
          <CreateUserModal onClose={() => setIsUserModalOpen(false)} onCreate={handleCreateUser} />
        )}
      </div>
    );
  }

  // --- Main App (Logged In) ---

  const renderContent = () => {
    switch (activeTab) {
      case TabView.CHECKOUT:
        return <DailyCheckoutForm currentUser={currentUser} onSubmit={handleAddCheckout} />;
      case TabView.FEED:
        return (
          <TeamFeed 
            checkouts={checkouts} 
            users={users} 
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
            weeklyGoals={weeklyGoals}
            onAddTask={handleAddTask}
            onUpdatePomodoro={handleUpdatePomodoro}
            onToggleTaskStatus={handleToggleTaskStatus}
            onAddWeeklyGoal={handleAddWeeklyGoal}
            onUpdateWeeklyGoal={handleUpdateWeeklyGoal}
          />
        );
      case TabView.GOALS:
          return (
            <WeeklyGoals
              currentUser={currentUser}
              weeklyGoals={weeklyGoals}
              onAddWeeklyGoal={handleAddWeeklyGoal}
              onUpdateWeeklyGoal={handleUpdateWeeklyGoal}
            />
          );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0 md:pl-64 relative">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-white border-r border-slate-200 z-10">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Daily Pulse
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-1">Team Alignment & Coaching</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavButton 
            active={activeTab === TabView.CHECKOUT} 
            onClick={() => handleTabChange(TabView.CHECKOUT)} 
            icon={<PenSquare size={20} />} 
            label="Daily Checkout" 
            desktop
          />
          <NavButton 
            active={activeTab === TabView.FEED} 
            onClick={() => handleTabChange(TabView.FEED)} 
            icon={<Users size={20} />} 
            label="Team Feed" 
            desktop
          />
          <NavButton 
            active={activeTab === TabView.PLANNER} 
            onClick={() => handleTabChange(TabView.PLANNER)} 
            icon={<CalendarClock size={20} />} 
            label="Planner" 
            desktop
          />
           <NavButton 
            active={activeTab === TabView.GOALS} 
            onClick={() => handleTabChange(TabView.GOALS)} 
            icon={<Target size={20} />} 
            label="Weekly Goals" 
            desktop
          />
           <NavButton 
            active={activeTab === TabView.DASHBOARD} 
            onClick={() => handleTabChange(TabView.DASHBOARD)} 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            desktop
          />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full border border-slate-200" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </aside>

      {/* Header (Mobile Only mainly, but keeps consistent styling) */}
      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="font-bold text-lg tracking-tight">Daily Pulse</h1>
          </div>
          <div className="flex items-center gap-2">
             <button 
               onClick={() => refreshData(false)} 
               className="p-2 text-slate-400 hover:text-indigo-600"
             >
               <RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <img src={currentUser.avatar} alt="avatar" className="w-9 h-9 rounded-full bg-slate-200" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        {renderContent()}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          <NavButton 
            active={activeTab === TabView.CHECKOUT} 
            onClick={() => handleTabChange(TabView.CHECKOUT)} 
            icon={<PenSquare className="w-5 h-5" />} 
            label="Post" 
          />
           <NavButton 
            active={activeTab === TabView.FEED} 
            onClick={() => handleTabChange(TabView.FEED)} 
            icon={<Users className="w-5 h-5" />} 
            label="Feed" 
          />
           <NavButton 
            active={activeTab === TabView.PLANNER} 
            onClick={() => handleTabChange(TabView.PLANNER)} 
            icon={<CalendarClock className="w-5 h-5" />} 
            label="Plan" 
          />
          <NavButton 
            active={activeTab === TabView.GOALS} 
            onClick={() => handleTabChange(TabView.GOALS)} 
            icon={<Target className="w-5 h-5" />} 
            label="Goals" 
          />
           <NavButton 
            active={activeTab === TabView.DASHBOARD} 
            onClick={() => handleTabChange(TabView.DASHBOARD)} 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Dash" 
          />
        </div>
      </nav>
    </div>
  );
};

// NavButton Component handles both Mobile (Stacked) and Desktop (Side-by-side)
const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; desktop?: boolean }> = ({ active, onClick, icon, label, desktop }) => {
  if (desktop) {
    return (
      <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium ${
          active ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }

  // Mobile
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full h-full transition-all ${
        active ? 'text-indigo-600' : 'text-slate-400'
      }`}
    >
      <div className={`mb-1 ${active ? 'scale-110' : ''} transition-transform`}>{icon}</div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
};

// ... (Subcomponents ShareModal and CreateUserModal remain unchanged, but included in full file output if needed by user constraints, but for brevity in diff I focus on main logic unless full file overwrite is required. The prompt implies I should output full content of changed files.)
// I will just include the full file content as required.

const ShareModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const url = window.location.origin + window.location.pathname;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
       <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-lg text-slate-800">Share Team Link</h3>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
          </div>
          <div className="p-6">
             <p className="text-sm text-slate-600 mb-4">
                Share this URL with your team to invite them to the Daily Pulse.
             </p>
             <div className="flex gap-2">
                <input 
                  readOnly 
                  value={url} 
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 select-all font-mono"
                />
                <button 
                   onClick={handleCopy}
                   className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 min-w-[90px] justify-center"
                >
                   {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                   {copied ? 'Copied' : 'Copy'}
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};

const CreateUserModal: React.FC<{ onClose: () => void; onCreate: (name: string, role: UserRole) => void }> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.EMPLOYEE);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name, role);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">Add New User</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g. Sarah Connor"
              autoFocus
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setRole(UserRole.EMPLOYEE)}
                className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-all ${
                  role === UserRole.EMPLOYEE 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500 ring-offset-1' 
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Employee
              </button>
              <button 
                type="button"
                onClick={() => setRole(UserRole.MANAGER)}
                className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-all ${
                  role === UserRole.MANAGER 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500 ring-offset-1' 
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Manager
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-colors"
            >
              Create Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;