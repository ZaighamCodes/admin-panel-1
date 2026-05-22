'use client';

import { useState } from 'react';
import { Lightbulb, Megaphone, LayoutGrid, BookOpen } from 'lucide-react';
import HealthTipsTab from './components/HealthTipsTab';
import AdvertisementsTab from './components/AdvertisementsTab';
import ArticlesTab from './components/ArticlesTab';

const MAIN_TABS = [
  { id: 'advertisements', label: 'Advertisements', icon: Megaphone, accent: 'from-primary-500 to-purple-500' },
  { id: 'tips', label: 'Health Tips', icon: Lightbulb, accent: 'from-amber-500 to-orange-500' },
  { id: 'articles', label: 'Articles', icon: BookOpen, accent: 'from-emerald-500 to-teal-500' },
];

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('advertisements');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600 mb-2">
            <LayoutGrid className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">CMS</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Content Management</h1>
          <p className="text-gray-600 mt-2 max-w-xl">
            Manage carousel ads, daily tips, and health articles for the patient and doctor apps.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl soft-shadow-lg p-2 inline-flex flex-wrap gap-1 border border-gray-100">
        {MAIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? `bg-gradient-to-r ${tab.accent} text-white shadow-md`
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[480px]">
        {activeTab === 'tips' && <HealthTipsTab />}
        {activeTab === 'articles' && <ArticlesTab />}
        {activeTab === 'advertisements' && <AdvertisementsTab />}
      </div>
    </div>
  );
}
