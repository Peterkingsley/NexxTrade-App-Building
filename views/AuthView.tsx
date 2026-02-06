import React, { useState, useEffect, useRef } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import axios from 'axios';
import { Mail, Lock, User, ArrowLeft, Send, Loader2, AlertTriangle, X, CheckCircle2, HelpCircle } from 'lucide-react';
import { AuthProvider, UserProfile } from '../types';

interface AuthViewProps {
  onLogin: (provider: AuthProvider, userData?: UserProfile, linkedAccounts?: AuthProvider[], isNewUser?: boolean) => void;
}

// Bot username provided
const TELEGRAM_BOT_USERNAME = 'NexxTradeApp_bot';
const GOOGLE_CLIENT_ID = '711534694113-s4qmdjctfmrit0isf8hfdja9lbl433t4.apps.googleusercontent.com';

// Using logo from public folder (public/logo.png)

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const telegramWrapperRef = useRef<HTMLDivElement>(null);

  // Initialize Capacitor Google Auth
  useEffect(() => {
      if (Capacitor.isNativePlatform()) {
          GoogleAuth.initialize({
              clientId: GOOGLE_CLIENT_ID,
              scopes: ['profile', 'email'],
              grantOfflineAccess: false, 
          });
      }
  }, []);

  // --- Backend Sync Helper ---
  const authenticateWithBackend = async (provider: AuthProvider, rawData: any) => {
      try {
          // Map incoming data to our API structure
          const payload = {
              provider,
              email: rawData.email,
              firstName: rawData.firstName,
              lastName: rawData.lastName,
              username: rawData.username,
              photoUrl: rawData.photoUrl,
              providerId: rawData.id
          };

          const response = await axios.post('/api/auth/login', payload);
          const dbUser = response.data; // The user object returned from DB

          // Create standard profile object
          const profile: UserProfile = {
            id: dbUser.id,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            username: dbUser.username,
            photoUrl: dbUser.photoUrl
          };
          
          // Pass isNewUser flag to the parent handler
          onLogin(provider, profile, dbUser.linkedProviders, dbUser.isNewUser);

      } catch (error) {
          console.error('Backend Authentication Failed:', error);
          alert('Failed to connect to server. Please check your connection and try again.');
          setIsLoading(false); 
      }
  };


  // --- Web Google Login ---
  const webGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        // 1. Get Google User Details
        const userInfo = await axios.get(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );

        // 2. Sync with Backend
        await authenticateWithBackend('google', {
            id: userInfo.data.sub,
            email: userInfo.data.email,
            firstName: userInfo.data.given_name,
            lastName: userInfo.data.family_name,
            username: userInfo.data.email?.split('@')[0],
            photoUrl: userInfo.data.picture
        });

      } catch (error) {
        console.error('Google Auth Failed:', error);
        setIsLoading(false);
        setErrorMsg('Google Web Login Failed. Please try again.');
      }
    },
    onError: errorResponse => {
        console.log('Google Login Failed:', errorResponse);
        setErrorMsg('Google Login Failed');
    },
  });

  // --- Native Android/iOS Google Login ---
  const nativeGoogleLogin = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
          console.log("Starting native sign in...");
          
          // Re-initialize to ensure fresh config
          await GoogleAuth.initialize({
              clientId: GOOGLE_CLIENT_ID,
              scopes: ['profile', 'email'],
              grantOfflineAccess: false,
          });

          const user = await GoogleAuth.signIn();
          
          if (!user) {
              setIsLoading(false);
              return;
          }

          // Map Native Response to Backend Format
          await authenticateWithBackend('google', {
              id: user.id, // Usually the 'sub' claim
              email: user.email,
              firstName: user.givenName,
              lastName: user.familyName,
              username: user.email.split('@')[0],
              photoUrl: user.imageUrl
          });
      } catch (error: any) {
          setIsLoading(false);
          console.error("Native Google Sign-In Error:", error);
          const msg = error.message || JSON.stringify(error);
          
          // Detect "Something went wrong" (Error 10)
          if (msg.includes('10') || msg.includes('Something went wrong')) {
             setErrorMsg("Configuration Error (SHA-1/Package Name).");
             setShowConfigHelp(true);
          } else {
             setErrorMsg(`Google Sign-In Error: ${msg}`);
          }
      }
  };

  // --- Unified Handler ---
  const handleGoogleClick = () => {
      // Use isNativePlatform to correctly identify Android/iOS context
      if (Capacitor.isNativePlatform()) {
          nativeGoogleLogin();
      } else {
          webGoogleLogin();
      }
  };

  // --- Telegram Login ---
  useEffect(() => {
    (window as any).onTelegramAuth = async (user: any) => {
      // Telegram widget returns user object directly
      await authenticateWithBackend('telegram', {
          id: user.id.toString(),
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          photoUrl: user.photo_url
      });
    };

    if (telegramWrapperRef.current) {
        telegramWrapperRef.current.innerHTML = ''; 
        const script = document.createElement('script');
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME);
        script.setAttribute('data-size', 'medium');
        script.setAttribute('data-radius', '12'); 
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-userpic', 'false');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.async = true;
        telegramWrapperRef.current.appendChild(script);
    }
  }, [isLogin]); 

  // --- Manual Email/Pass Login ---
  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return;
    
    // For demo purposes, we will treat this as an 'email' provider login
    await authenticateWithBackend('google', { 
        id: `email_${formData.email}`,
        email: formData.email,
        firstName: formData.fullName || 'User',
        lastName: '',
        username: formData.email.split('@')[0],
        photoUrl: undefined
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col px-6 py-10 font-sans transition-all duration-500 relative">
      
      {isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-3">
              <Loader2 className="w-10 h-10 text-brand-green animate-spin" />
              <p className="text-brand-green font-bold text-sm">Authenticating...</p>
          </div>
      )}

      {/* Back Button for Signup */}
      {!isLogin && (
        <button 
          onClick={() => setIsLogin(true)}
          className="mb-6 p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors w-fit"
        >
          <ArrowLeft size={24} />
        </button>
      )}

      {/* Header Section */}
      <div className="mb-8">
        {isLogin && (
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Nexxtrade logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Nexxtrade</h1>
          </div>
        )}

        <h2 className="text-3xl font-bold mb-2">
          {isLogin ? 'Welcome back' : 'Create Account'}
        </h2>
        <p className="text-gray-400 text-sm">
          {isLogin ? 'Sign in to access your signals' : 'Join Nexxtrade for premium signals'}
        </p>
      </div>

      {/* Form Section */}
      <form onSubmit={handleManualAuth} className="space-y-4">
        {!isLogin && (
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-green transition-colors">
              <User size={20} />
            </div>
            <input 
              type="text" 
              placeholder="Full Name"
              required={!isLogin}
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              className="w-full bg-[#151A25] border border-transparent focus:border-brand-green/30 rounded-xl py-4 pl-12 pr-4 text-white text-sm placeholder:text-gray-500 outline-none transition-all"
            />
          </div>
        )}

        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-green transition-colors">
            <Mail size={20} />
          </div>
          <input 
            type="email" 
            placeholder="Email"
            required
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full bg-[#151A25] border border-transparent focus:border-brand-green/30 rounded-xl py-4 pl-12 pr-4 text-white text-sm placeholder:text-gray-500 outline-none transition-all"
          />
        </div>

        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-green transition-colors">
            <Lock size={20} />
          </div>
          <input 
            type="password" 
            placeholder="Password"
            required
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full bg-[#151A25] border border-transparent focus:border-brand-green/30 rounded-xl py-4 pl-12 pr-4 text-white text-sm placeholder:text-gray-500 outline-none transition-all"
          />
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className="w-full bg-brand-green hover:bg-brand-neon text-dark-900 font-bold py-4 rounded-xl text-base mt-2 transition-all active:scale-[0.98] shadow-lg shadow-brand-green/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>

      {/* OR Divider */}
      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-[1px] bg-gray-700/50"></div>
        <span className="text-gray-500 text-xs font-bold tracking-widest uppercase">OR</span>
        <div className="flex-1 h-[1px] bg-gray-700/50"></div>
      </div>

      {/* Social Login Section */}
      <div className="space-y-3">
        {/* Error Message Display - Strict Mode */}
        {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-xs font-medium flex items-start gap-2 animate-in slide-in-from-top-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                    <span>{errorMsg}</span>
                    {showConfigHelp && (
                         <button onClick={() => setShowConfigHelp(true)} className="block mt-1 underline text-red-300 hover:text-white">View Troubleshooting</button>
                    )}
                </div>
            </div>
        )}

        {/* Custom Google Button */}
        <button 
          onClick={handleGoogleClick}
          disabled={isLoading}
          className="w-full border border-gray-600 hover:bg-white/5 text-white font-medium py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all text-sm disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Telegram Widget Wrapper */}
        <div className="w-full relative group">
          <div className="w-full min-h-[54px] border border-gray-600 rounded-xl flex items-center justify-center overflow-hidden transition-all hover:bg-[#2AABEE]/5">
             <div ref={telegramWrapperRef} className="z-10 scale-90" />
             <div className="absolute inset-0 flex items-center justify-center gap-3 pointer-events-none group-has-[iframe]:hidden">
                <div className="bg-[#2AABEE] p-1 rounded-full">
                  <Send size={14} fill="currentColor" className="text-white" />
                </div>
                <span className="text-sm font-medium">Continue with Telegram</span>
             </div>
          </div>
        </div>
      </div>

      {/* Footer Link */}
      <div className="mt-auto pt-6 text-center">
        {isLogin ? (
          <p className="text-gray-400 text-sm">
            Don't have an account? <button 
              onClick={() => setIsLogin(false)}
              className="text-brand-green font-bold hover:text-brand-neon ml-1"
            >
              Sign Up
            </button>
          </p>
        ) : (
          <p className="text-gray-400 text-sm">
            Already have an account? <button 
              onClick={() => setIsLogin(true)}
              className="text-brand-green font-bold hover:text-brand-neon ml-1"
            >
              Login
            </button>
          </p>
        )}
      </div>

      {/* Diagnostic/Help Modal for Error 10 */}
      {showConfigHelp && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowConfigHelp(false)}></div>
              <div className="bg-dark-800 w-full max-w-sm rounded-3xl overflow-hidden border border-dark-700 shadow-2xl relative animate-in zoom-in-95 duration-200">
                  <div className="p-5 border-b border-dark-700 flex justify-between items-center bg-dark-800">
                      <h3 className="text-white text-lg font-bold flex items-center gap-2">
                          <HelpCircle className="text-red-500" size={20} />
                          Login Help
                      </h3>
                      <button onClick={() => setShowConfigHelp(false)} className="p-1 bg-dark-700 rounded-full text-gray-400 hover:text-white transition">
                          <X size={18} />
                      </button>
                  </div>
                  <div className="p-5 space-y-4 text-sm text-gray-300">
                      <p className="font-bold text-white">"Something went wrong" (Error 10) usually means a configuration mismatch.</p>
                      
                      <ul className="space-y-3 list-disc pl-4">
                          <li>
                              <strong className="text-white">Package Name:</strong> Ensure your app package is exactly <code>app.nexxtrade.io</code> in Google Cloud Console.
                          </li>
                          <li>
                              <strong className="text-white">SHA-1 Fingerprint:</strong> You must add the SHA-1 of the keystore signing this app to Google Console. 
                              <span className="block text-xs text-gray-500 mt-1">Note: `gradlew assembleDebug` uses a different SHA-1 than a release build.</span>
                          </li>
                          <li>
                              <strong className="text-white">Client ID:</strong> This app is using the Web Client ID <code>711534...</code>. Do not use the Android Client ID in the code.
                          </li>
                      </ul>

                      <div className="bg-dark-900 p-3 rounded-lg border border-dark-700 mt-4">
                          <p className="text-xs text-gray-500 text-center">
                              This is a security feature from Google. The app cannot login until the signature matches what is in the Cloud Console.
                          </p>
                      </div>

                      <button onClick={() => setShowConfigHelp(false)} className="w-full bg-dark-700 hover:bg-dark-600 text-white font-bold py-3 rounded-xl transition">
                          Close
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AuthView;