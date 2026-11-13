import { useState, type FC } from 'react';
import { CheckIcon } from '@/assets/icons';

interface Job {
  id: string;
  initial: string;
  color: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  source: string;
  status: string;
  matchScore: number;
  whyMatched: { good: boolean; text: string }[];
}

const JOBS: Job[] = [
  {
    id: 'stripe-1',
    initial: 'S',
    color: '#6366f1',
    title: 'Senior Product Designer, Payments',
    company: 'Stripe',
    location: 'Remote · EMEA',
    salary: '$150–180k',
    source: 'via Greenhouse',
    status: 'Draft ready',
    matchScore: 94,
    whyMatched: [
      { good: true, text: '6+ yrs product design asked — you have 7' },
      { good: true, text: 'Fintech depth: Paystack, Flutterwave' },
      { good: true, text: 'Led a design system used by 40+ engineers' },
      { good: false, text: 'Asks for 2 days of Pacific-hours overlap' },
    ],
  },
  {
    id: 'monzo-1',
    initial: 'M',
    color: '#f97316',
    title: 'Design Systems Lead',
    company: 'Monzo',
    location: 'London / Remote',
    salary: '£110–130k',
    source: 'via Lever',
    status: 'Sent',
    matchScore: 91,
    whyMatched: [
      { good: true, text: 'Design Tokens architecture & component governance' },
      { good: true, text: 'Fintech banking compliance background' },
      { good: true, text: 'Figma component libraries leadership' },
    ],
  },
  {
    id: 'shopify-1',
    initial: 'S',
    color: '#10b981',
    title: 'Staff Product Designer, Checkout',
    company: 'Shopify',
    location: 'Remote',
    salary: '$165k',
    source: 'via Career page',
    status: 'Drafting',
    matchScore: 88,
    whyMatched: [
      { good: true, text: 'High-volume checkout optimization experience' },
      { good: true, text: 'Global multi-currency design knowledge' },
    ],
  },
  {
    id: 'linear-1',
    initial: 'L',
    color: '#8b5cf6',
    title: 'Product Designer',
    company: 'Linear',
    location: 'Remote',
    salary: '$140–170k',
    source: 'via Email alert',
    status: 'New',
    matchScore: 84,
    whyMatched: [
      { good: true, text: 'Daily Linear power user & product taste' },
      { good: true, text: 'Fast-paced autonomous product squad experience' },
    ],
  },
  {
    id: 'figma-1',
    initial: 'F',
    color: '#0ea5e9',
    title: 'Product Designer, Editor',
    company: 'Figma',
    location: 'Remote · US',
    salary: '$160k',
    source: 'via LinkedIn',
    status: 'Needs you',
    matchScore: 81,
    whyMatched: [
      { good: true, text: 'Deep canvas & vector tools mastery' },
      { good: false, text: 'Requires US work authorization verification' },
    ],
  },
  {
    id: 'wise-1',
    initial: 'W',
    color: '#14b8a6',
    title: 'Senior Designer, Platform',
    company: 'Wise',
    location: 'Tallinn / Remote',
    salary: '€95k',
    source: 'via Feed',
    status: 'New',
    matchScore: 76,
    whyMatched: [
      { good: true, text: 'International money transfer product background' },
    ],
  },
];

export const JobFeedView: FC = () => {
  const [selectedJob, setSelectedJob] = useState<Job>(JOBS[0]);
  const [newUrl, setNewUrl] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Job feed</h2>
        <p style={{ margin: 0, fontSize: 12, color: '#6a6a72' }}>
          142 scanned today from APIs, feeds, ATS boards and your career pages · 38 matched
        </p>
      </div>

      {/* Input bar */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Paste a job link, or forward postings to ada@in.javi.app"
          style={{
            flex: 1,
            height: 40,
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '0 14px',
            fontSize: 12.5,
            outline: 'none',
            background: '#fff',
            fontFamily: 'Montserrat, sans-serif',
          }}
        />
        <button
          type="button"
          onClick={() => setNewUrl('')}
          style={{
            height: 40,
            padding: '0 18px',
            background: '#2563eb',
            border: 0,
            color: '#fff',
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Add job
        </button>
      </div>

      {/* Main split view */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'start' }}>
        {/* Left List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {JOBS.map((j) => {
            const isSelected = selectedJob.id === j.id;
            return (
              <div
                key={j.id}
                onClick={() => setSelectedJob(j)}
                style={{
                  background: '#fff',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #eef0f4',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,.02)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: j.color,
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                    }}
                  >
                    {j.initial}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{j.title}</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      {j.company} · {j.location} · {j.salary}
                    </span>
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>{j.source}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#4b5563',
                      background: '#f3f4f6',
                      borderRadius: 999,
                      padding: '3px 9px',
                    }}
                  >
                    {j.status}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: j.matchScore >= 90 ? '#10b981' : j.matchScore >= 80 ? '#2563eb' : '#6b7280',
                    }}
                  >
                    {j.matchScore}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Card */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #eef0f4',
            borderRadius: 14,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,.03)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#6b7280' }}>
              {selectedJob.company} · {selectedJob.location}
            </span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: '22px' }}>
              {selectedJob.title}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#10b981', letterSpacing: '-.6px' }}>
              {selectedJob.matchScore}%
            </span>
            <span style={{ fontSize: 11.5, color: '#4b5563' }}>match to your verified profile</span>
          </div>

          <div style={{ borderTop: '1px solid #f0f0f3', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#374151' }}>Why it matched</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {selectedJob.whyMatched.map((w, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5 }}>
                  <span style={{ color: w.good ? '#10b981' : '#f59e0b', marginTop: 1, flex: 'none' }}>
                    {w.good ? <CheckIcon size={14} color="#10b981" /> : '!'}
                  </span>
                  <span style={{ color: w.good ? '#374151' : '#92400e', lineHeight: '16px' }}>{w.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            <button
              type="button"
              style={{
                height: 38,
                background: '#2563eb',
                border: 0,
                color: '#fff',
                borderRadius: 9,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Draft CV &amp; letter
            </button>
            <button
              type="button"
              style={{
                height: 36,
                background: '#f3f4f6',
                border: 0,
                color: '#374151',
                borderRadius: 9,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Not for me
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
