# Payment Requests (Phase 1 — Manual Payout)

Docspot admin panel screens for doctor withdrawal requests. **No Razorpay Checkout / RazorpayX outbound pay.** Admin pays outside the app, then marks PAID.

## Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| List | `/payment-requests` | Pending withdrawals table |
| Detail | `/payment-requests/[id]?doctorId=` | Reveal bank/UPI, pricing, approve/reject |
| Legacy | `/payments` | Redirects to `/payment-requests` |

Sidebar: **Payment Requests** with pending count badge.

## Endpoints used

Base: `https://api.heydoctor.cloud` + path prefix `/doctor/admin/...`  
(same pattern as `/doctor/admin/all-verified`)

| Action | Method | Path |
|--------|--------|------|
| Pending list / badge | `GET` | `/doctor/admin/payouts/pending?page=&size=` |
| Reveal full account/UPI | `GET` | `/doctor/admin/doctors/{doctorId}/payout-secret` |
| Mark paid | `POST` multipart | `/doctor/admin/payouts/{id}/mark-paid` (`utr`, `note`, optional `invoiceFile` emailed to doctor — **not stored**; `invoiceUrl` is always null) |
| Mark failed | `POST` JSON | `/doctor/admin/payouts/{id}/mark-failed` `{ "reason" }` |
| Get pricing | `GET` | `/doctor/admin/doctors/{doctorId}/pricing` |
| Update pricing | `PATCH` | `/doctor/admin/doctors/{doctorId}/pricing` |
| Related payments | `GET` | `/doctor/admin/payments?page=&size=` (client-filter by `doctorId`) |
| Doctor card | `GET` | `/doctor/admin/all-verified` (reuse) |

## Flow

1. Doctor requests withdrawal → `PENDING`
2. Admin opens request → masked BANK/UPI visible
3. **Reveal full bank / UPI** → secret in modal only (cleared on close, never logged)
4. Admin pays manually (IMPS/NEFT/UPI)
5. **Approve & Mark Paid** → UTR + optional note + optional receipt file emailed to doctor (not stored) → confirm
6. Or **Reject** → reason required → wallet restored + email

**Note:** Payout receipts are email-only. There is no stored `invoiceUrl` to view/download in admin.

## Out of scope (TODO later)

- `GET /admin/payouts?status=` history
- `GET /admin/payouts/{id}` single detail
- `GET /admin/payments?doctorId=`
- `GET /admin/doctors/{id}/wallet`
- RazorpayX auto payout
