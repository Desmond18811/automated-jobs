/** How an application's status reads on a job card, and where it links. */
export function statusLine(a: any): { text: string; color: string; dot: string; to?: string } {
  const sent = (a.history || []).find((h: any) => h.to === 'sent')?.at || a.delivery?.sentAt;
  const d = sent ? new Date(sent).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  switch (a.status) {
    case 'discovered': return { text: 'Found · being matched', color: '#4E5862', dot: '#94A3B8' };
    case 'matched': return { text: 'Matched · drafting', color: '#1D4ED8', dot: '#60A5FA' };
    case 'drafted': return { text: 'Draft ready for your review →', color: '#1D4ED8', dot: '#60A5FA', to: '/dash/drafts' };
    case 'approved': return { text: 'Approved · sends in the next window', color: '#1D4ED8', dot: '#2563EB', to: '/dash/tracker' };
    case 'needs_user': return { text: 'Paused · needs you →', color: '#92400E', dot: '#F59E0B', to: '/dash/needs-you' };
    case 'sent': return { text: `Sent ${d} · in Tracker →`.replace('  ', ' '), color: '#4E5862', dot: '#94A3B8', to: '/dash/tracker' };
    case 'replied': return { text: 'They replied →', color: '#0F766E', dot: '#14B8A6', to: '/dash/tracker' };
    case 'interview': return { text: 'Interview stage →', color: '#0F766E', dot: '#14B8A6', to: '/dash/tracker' };
    case 'offer': case 'hired': return { text: a.status === 'hired' ? 'Hired' : 'Offer received →', color: '#0F766E', dot: '#0F766E', to: '/dash/tracker' };
    case 'no_response': return { text: 'No reply yet', color: '#4E5862', dot: '#CBD3DA', to: '/dash/tracker' };
    case 'rejected': return { text: 'Not moving forward', color: '#8A2C42', dot: '#E11D48' };
    case 'failed': return { text: 'Could not send', color: '#B42318', dot: '#EF4444', to: '/dash/needs-you' };
    case 'archived': return { text: 'Archived', color: '#5F6A74', dot: '#CBD3DA' };
    default: return { text: String(a.status || ''), color: '#4E5862', dot: '#CBD3DA' };
  }
}

export const sentAt = (a: any): Date | null => {
  const t = (a.history || []).find((h: any) => h.to === 'sent')?.at || a.delivery?.sentAt;
  return t ? new Date(t) : null;
};
