import { useState } from 'react';
import { useRouter } from 'next/router';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

export const LoginForm = ({ onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { signIn } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }

  setLoading(true);
  setErrors({});

  try {
    console.log('🔄 LoginForm: Attempting login for:', email);
    console.log('📝 LoginForm: Calling signIn function...');
    
    const response = await signIn(email, password);
    
    console.log('✅ LoginForm: signIn response received:', response);
    
    if (!response) {
      throw new Error('No response from signIn function');
    }
    
    // Check if signIn was successful
    if (response.success === false) {
      throw new Error(response.error || 'Login failed');
    }
    
    console.log('✅ LoginForm: Login successful!', response);
    
    // ✅ Wait a bit more to ensure state updates
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // ✅ Verify auth state after login
    const { user: authUser } = useAuth();
    console.log('🔍 Auth state after login:', {
      user: authUser,
      hasUser: !!authUser
    });
    
    toast.success('Welcome back!');
    
    // Determine redirect path
    let redirectPath = '/donor-dashboard'; // fallback
    
    if (response?.redirectTo) {
      redirectPath = response.redirectTo;
      console.log('🎯 Using backend redirect:', redirectPath);
    } else if (response?.user?.role) {
      redirectPath = response.user.role === 'ngo' ? '/ngo-dashboard' : '/donor-dashboard';
      console.log('🎯 Determined redirect from role:', redirectPath);
    } else if (response?.role) {
      redirectPath = response.role === 'ngo' ? '/ngo-dashboard' : '/donor-dashboard';
      console.log('🎯 Determined redirect from role in response:', redirectPath);
    }
    
    console.log('🔄 Final redirect to:', redirectPath);
    
    // ✅ Use window.location for more reliable redirect
    window.location.href = redirectPath;
    
  } catch (error) {
    console.error('❌ LoginForm: Login failed!', error);
    console.error('❌ Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    let errorMessage = 'Login failed. Please try again.';
    
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Specific error handling
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      errorMessage = 'Cannot connect to server. Please check if backend is running.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Invalid email or password';
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    }
    
    console.log('📢 Showing error to user:', errorMessage);
    toast.error(errorMessage);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="card-premium p-8 sm:p-10 animate-fade-in">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium ring-4 ring-primary-50">
          <span className="text-white font-bold text-3xl">ZW</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
        <p className="text-slate-500 mt-2.5 font-medium">Sign in to continue making an impact</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
            Email Address
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500">
              <Mail className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`input-modern pl-12 ${
                errors.email ? 'border-red-300 bg-red-50 focus:ring-red-500/10 focus:border-red-500' : ''
              }`}
              placeholder="name@example.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <div className="flex items-center mt-2.5 ml-1 text-sm text-red-600 font-medium animate-slide-up">
              <AlertCircle className="h-4 w-4 mr-1.5" />
              {errors.email}
            </div>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex justify-between items-center mb-2 ml-1">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Password
            </label>
            <button type="button" className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors">
              Forgot?
            </button>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`input-modern pl-12 pr-12 ${
                errors.password ? 'border-red-300 bg-red-50 focus:ring-red-500/10 focus:border-red-500' : ''
              }`}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <div className="flex items-center mt-2.5 ml-1 text-sm text-red-600 font-medium animate-slide-up">
              <AlertCircle className="h-4 w-4 mr-1.5" />
              {errors.password}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-4 text-base tracking-wide"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3"></div>
              Verifying...
            </div>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Switch to Signup */}
      <div className="mt-8 text-center bg-slate-50 -mx-8 -mb-8 p-6 border-t border-slate-100 sm:-mx-10 sm:-mb-10 rounded-b-2xl">
        <p className="text-slate-600 text-sm font-medium">
          New to ZeroWaste?{' '}
          <button
            onClick={onSwitchToSignup}
            className="text-primary-600 hover:text-primary-700 font-bold transition-colors ml-1"
            disabled={loading}
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
};