'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy /payments route → Payment Requests (manual payout) */
export default function PaymentsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/payment-requests');
  }, [router]);
  return (
    <div className="p-12 text-center text-gray-500 text-sm">
      Redirecting to Payment Requests…
    </div>
  );
}
