'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard, Send, Users } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const balance = 5420.50;
  const recentTransactions = [
    { id: 1, type: 'received', amount: 250, from: 'John Doe', date: '2024-02-24' },
    { id: 2, type: 'sent', amount: 75.50, to: 'Jane Smith', date: '2024-02-23' },
    { id: 3, type: 'received', amount: 1000, from: 'Company ABC', date: '2024-02-22' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">Download Statement</Button>
          <Button size="sm">Send Money</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${balance.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">+2.5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Money Sent</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,250.00</div>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Money Received</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$3,420.50</div>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/send" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Send className="h-6 w-6 text-primary-600 mb-2" />
              <span className="text-sm font-medium">Send Money</span>
            </Link>
            <Link href="/dashboard/request" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <CreditCard className="h-6 w-6 text-green-600 mb-2" />
              <span className="text-sm font-medium">Request</span>
            </Link>
            <Link href="/dashboard/add-money" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Wallet className="h-6 w-6 text-purple-600 mb-2" />
              <span className="text-sm font-medium">Add Money</span>
            </Link>
            <Link href="/dashboard/beneficiaries" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Users className="h-6 w-6 text-orange-600 mb-2" />
              <span className="text-sm font-medium">Beneficiaries</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`p-2 rounded-full ${tx.type === 'received' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {tx.type === 'received' ? (
                      <ArrowDownRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="ml-4">
                    <p className="font-medium text-gray-900">
                      {tx.type === 'received' ? `From: ${tx.from}` : `To: ${tx.to}`}
                    </p>
                    <p className="text-sm text-gray-500">{tx.date}</p>
                  </div>
                </div>
                <div className={`font-semibold ${tx.type === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'received' ? '+' : '-'}${tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}