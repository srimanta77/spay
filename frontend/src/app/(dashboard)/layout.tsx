'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Home, Send, Wallet, History, Settings, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <span className="text-xl font-bold text-primary-600">SPay</span>
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Secure</span>
          </div>
          <div className="px-6 py-4 border-b border-gray-200">
            <p className="text-sm text-gray-500">Welcome back,</p>
            <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            <Link href="/dashboard" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Home className="w-5 h-5 mr-3" /> Dashboard
            </Link>
            <Link href="/dashboard/send" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Send className="w-5 h-5 mr-3" /> Send Money
            </Link>
            <Link href="/dashboard/wallet" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Wallet className="w-5 h-5 mr-3" /> Wallet
            </Link>
            <Link href="/dashboard/transactions" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <History className="w-5 h-5 mr-3" /> Transactions
            </Link>
            <Link href="/dashboard/settings" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Settings className="w-5 h-5 mr-3" /> Settings
            </Link>
          </nav>
          <div className="p-4 border-t border-gray-200">
            <button onClick={logout} className="flex items-center w-full px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <LogOut className="w-5 h-5 mr-3" /> Logout
            </button>
          </div>
        </div>
      </div>
      <div className="ml-64 p-8">{children}</div>
    </div>
  );
}