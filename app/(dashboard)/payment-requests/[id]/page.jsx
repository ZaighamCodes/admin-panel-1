'use client';

import { Suspense } from 'react';
import PaymentRequestDetailPage from './PaymentRequestDetail';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-2xl p-16 text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading request...</p>
        </div>
      }
    >
      <PaymentRequestDetailPage />
    </Suspense>
  );
}
