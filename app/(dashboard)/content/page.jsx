'use client';

import { useState } from 'react';
import { FileText, Megaphone } from 'lucide-react';
import ArticlesTab from './components/ArticlesTab';
import AdvertisementsTab from './components/AdvertisementsTab';

const MAIN_TABS = [
  { id: 'articles', label: 'Health Articles', icon: FileText },
  { id: 'advertisements', label: 'Advertisements', icon: Megaphone },
];

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('articles');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-600 mt-1">
          Manage health articles and carousel advertisements for patient and doctor apps
        </p>
      </div>

      <div className="bg-white rounded-xl soft-shadow-lg p-1.5 inline-flex gap-1">
        {MAIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'articles' ? <ArticlesTab /> : <AdvertisementsTab />}
      </div>
    </div>
  );
}
