import React, { useState, useEffect } from 'react';
import { 
  User, 
  DailyCheckout, 
  Task, 
  Interaction, 
  TabView, 
  UserRole,
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
  Loader2,
  PlusCircle,
  X
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
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

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

  const handleCreateUser = (name: string, role: UserRole) => {
    const newUser: User = {
      userId: `u${Date.now()}`,
      name,
      role,
      // Use Dicebear for consistent, nice-looking avatars based on name
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${name}`, 
    };
    
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setCurrentUser(newUser);
    syncItem('Users', newUser);
    setIsUserModalOpen(false);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0 relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="font-bold text-lg tracking-tight hidden sm:block">The Daily Pulse</h1>
          </div>
          
          {/* User Switcher & Creator */}
          <div className="flex items-center gap-3">
             <span className="text-xs text-slate-400 uppercase font-bold hidden sm:inline">Viewing As:</span>
             <select 
              value={currentUser.userId}
              onChange={(e) => setCurrentUser(users.find(u => u.userId === e.target.value) || users[0])}
              className="text-sm border border-slate-300 rounded-md py-1 px-2 bg-slate-50 focus:ring-indigo-500 focus:border-indigo-500 max-w-[120px] sm:max-w-none"
             >
               {users.map(u => (
                 <option key={u.userId} value={u.userId}>{u.name}</option>
               ))}
             </select>
             <button 
                onClick={() => setIsUserModalOpen(true)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-indigo-600"
                title="Add New User"
             >
                <PlusCircle className="w-6 h-6" />
             </button>
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

      {/* Create User Modal */}
      {isUserModalOpen && (
        <CreateUserModal onClose={() => setIsUserModalOpen(false)} onCreate={handleCreateUser} />
      )}
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

// Create User Modal Component
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