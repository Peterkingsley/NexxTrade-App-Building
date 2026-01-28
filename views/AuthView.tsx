import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { AuthProvider } from '../types';

interface AuthViewProps {
  onLogin: (provider: AuthProvider) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-dark-900 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-brand-green/5 to-transparent pointer-events-none" />

      <div className="z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo Placeholder */}
        <div className="mb-8 relative">
            <div className="w-20 h-20 bg-brand-green rounded-xl rotate-45 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <div className="w-10 h-10 bg-dark-900 rotate-90" />
            </div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-24 bg-dark-900 rotate-45"></div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          {isLogin ? 'Hello NexxTrader' : 'Become A NexxTrader'}
        </h1>
        <p className="text-gray-400 text-center mb-12">
          {isLogin 
            ? 'Let\'s go back to trading like the banks.' 
            : 'Join thousands of traders worldwide.'}
        </p>

        <div className="w-full space-y-4 mb-12">
          <button 
            onClick={() => onLogin('google')}
            className="w-full bg-gray-200 hover:bg-white text-dark-900 font-semibold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-3 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <button 
            onClick={() => onLogin('telegram')}
            className="w-full bg-[#2AABEE] hover:bg-[#229ED9] text-white font-semibold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-blue-900/20"
          >
            <Send className="w-5 h-5" fill="currentColor" />
            Continue with Telegram
          </button>
        </div>

        <div className="text-center">
          <p className="text-gray-400 text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-brand-green font-medium hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-gray-500 mt-8 max-w-xs leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default AuthView;