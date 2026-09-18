import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

export function AdminLogin() {
  const navigate = useNavigate();
  const login = useAdminStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email, password);
    if (success) {
      navigate('/at');
    } else {
      setError('Invalid email or password. Please try again.');
    }
    setLoading(false);
  };

  return (<div className="min-h-screen bg-gradient-to-br from-[#0F1E2E] via-[#0B1E32] to-[#0C4949] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-white/10 p-1.5 rounded-full ring-2 ring-white/20 shadow-2xl backdrop-blur-sm">
            <img
              src="/images/logo.png"
              alt="AT Specialist Australia"
              className="w-full h-full object-contain rounded-full drop-shadow-md"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">AT Specialist Australia</h1>
          <p className="text-teal-300/80 text-xs font-semibold uppercase tracking-widest mt-1">Admin Portal</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-6">Sign in to manage your store</p>

          {error && (<div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>)}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@atspecialists.com.au"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 focus:border-[#147A7A] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 focus:border-[#147A7A] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#147A7A] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#106262] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:scale-[1.01]"
            >
              {loading ? (<>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>) : ('Sign In')}
            </button>

            {/* Quick 1-Click Dev / Local Bypass Login */}
            <div className="pt-2 border-t border-slate-100 mt-3">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('at_admin_token', 'dev-bypass-token');
                  useAdminStore.setState({
                    isAuthenticated: true,
                    adminUser: {
                      id: 'admin-dev',
                      name: 'Clinical Administrator',
                      email: 'admin@atspecialists.com.au',
                      role: 'admin',
                    },
                    adminName: 'Clinical Administrator',
                  });
                  navigate('/at/invoices');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-50 hover:bg-teal-100/90 border border-teal-200 text-[#147A7A] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:scale-[1.01]"
              >
                <span>⚡ Instant Dev Bypass &bull; Jump to Invoices &amp; Documents</span>
              </button>
            </div>
          </form>

          <p className="mt-4 text-center text-[11px] text-slate-400">
            Authorised administrators only. Quick bypass enabled for testing &amp; validation.
          </p>
        </div>
      </div>
    </div>);
}
