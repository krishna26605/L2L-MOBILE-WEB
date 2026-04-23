import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { LogOut, User, Settings, Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Navbar = ({ title, showBack = false }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <nav className="glass-morphism sticky top-0 z-50 border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left side */}
          <div className="flex items-center space-x-6">
            {showBack && (
              <button
                onClick={handleBack}
                className="p-2.5 rounded-xl text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-all active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => router.push('/')}>
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-premium group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-lg">ZW</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-slate-900 leading-none">{title}</h1>
                <span className="text-xs font-medium text-primary-600 uppercase tracking-wider mt-1">ZeroWaste DineMap</span>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-3 p-1.5 pr-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 hover:bg-white hover:shadow-premium transition-all"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="h-9 w-9 rounded-xl object-cover shadow-sm"
                    />
                  ) : (
                    <div className="h-9 w-9 bg-primary-100 rounded-xl flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                  )}
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold leading-none">{user?.displayName || user?.name || 'User'}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-tighter mt-0.5">{user?.role}</span>
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-premium-hover py-2 z-50 border border-slate-100 animate-scale-in">
                    <div className="px-4 py-3 border-b border-slate-50 mb-1">
                      <p className="text-xs text-slate-400 font-medium uppercase mb-1">Signed in as</p>
                      <p className="text-sm font-semibold truncate text-slate-900">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full text-left transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2.5 rounded-xl text-slate-600 hover:text-primary-600 hover:bg-primary-50 transition-all active:scale-90"
              >
                {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {showMenu && (
          <div className="md:hidden border-t border-slate-100 py-6 animate-slide-up">
            <div className="flex items-center space-x-4 px-4 py-4 bg-slate-50 rounded-2xl mb-4">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="h-12 w-12 rounded-xl object-cover shadow-sm"
                />
              ) : (
                <div className="h-12 w-12 bg-primary-100 rounded-xl flex items-center justify-center">
                  <User className="h-6 w-6 text-primary-600" />
                </div>
              )}
              <div>
                <p className="text-base font-bold text-slate-900">{user?.displayName || user?.name || 'User'}</p>
                <p className="text-sm text-slate-500 font-medium capitalize">{user?.role} Account</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl w-full text-left transition-all"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
