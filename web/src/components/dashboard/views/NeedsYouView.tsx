import { useEffect, useState, type FC } from 'react';
import { CheckIcon, ExternalLinkIcon, RefreshCwIcon } from '@/assets/icons';
import { tasksApi } from '@/api';

interface Task {
  _id: string;
  id?: string;
  reason: string;
  message: string;
  status: string;
  questions?: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
    required?: boolean;
    isSalary?: boolean;
  }>;
  payload?: {
    company?: string;
    role?: string;
    jobTitle?: string;
    openUrl?: string;
    live?: boolean;
    url?: string;
    pageUrl?: string;
    [key: string]: any;
  };
  createdAt?: string;
}

export const NeedsYouView: FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [saveToBank, setSaveToBank] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await tasksApi.list();
      const list = Array.isArray(res) ? res : res?.items || res?.tasks || [];
      setTasks(list.filter((t: any) => t.status === 'open'));
    } catch (e: any) {
      console.warn('Could not load tasks from API:', e?.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleFieldChange = (taskId: string, fieldKey: string, val: string) => {
    setAnswers((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || {}),
        [fieldKey]: val,
      },
    }));
  };

  const handleToggleBank = (taskId: string, checked: boolean) => {
    setSaveToBank((prev) => ({ ...prev, [taskId]: checked }));
  };

  const handleAnswer = async (task: Task) => {
    const id = task._id || task.id;
    if (!id) return;
    setSubmitting((prev) => ({ ...prev, [id]: true }));

    const taskAnswers = answers[id] || {};
    const defaultAnswer = Object.values(taskAnswers)[0] || '';
    const shouldRemember = saveToBank[id] !== false; // default true

    try {
      await tasksApi.answer(id, {
        answers: taskAnswers,
        remember: { default: shouldRemember },
      } as any);
      showToast('Answer submitted! J.A.V.I has resumed this application.');
      setTasks((prev) => prev.filter((t) => (t._id || t.id) !== id));
    } catch (err: any) {
      showToast('Failed to submit answer: ' + (err?.message || 'Server error'));
    } finally {
      setSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleMarkDone = async (task: Task) => {
    const id = task._id || task.id;
    if (!id) return;
    setSubmitting((prev) => ({ ...prev, [id]: true }));
    try {
      await tasksApi.markDone(id);
      showToast('Task marked as completed!');
      setTasks((prev) => prev.filter((t) => (t._id || t.id) !== id));
    } catch (err: any) {
      showToast('Could not complete task: ' + (err?.message || 'Server error'));
    } finally {
      setSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRetry = async (task: Task) => {
    const id = task._id || task.id;
    if (!id) return;
    setSubmitting((prev) => ({ ...prev, [id]: true }));
    try {
      await tasksApi.retry(id);
      showToast('Retrying application submission...');
      setTasks((prev) => prev.filter((t) => (t._id || t.id) !== id));
    } catch (err: any) {
      showToast('Retry error: ' + (err?.message || 'Server error'));
    } finally {
      setSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDismiss = async (task: Task) => {
    const id = task._id || task.id;
    if (!id) return;
    setSubmitting((prev) => ({ ...prev, [id]: true }));
    try {
      await tasksApi.dismiss(id);
      showToast('Task dismissed.');
      setTasks((prev) => prev.filter((t) => (t._id || t.id) !== id));
    } catch (err: any) {
      showToast('Could not dismiss task: ' + (err?.message || 'Server error'));
    } finally {
      setSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760, paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, letterSpacing: '-.5px' }}>Needs you</h2>
          <p style={{ margin: 0, fontSize: 12, color: '#6a6a72' }}>
            Sends J.A.V.I couldn't finish autonomously. Answer once, and J.A.V.I will remember your answer for future applications.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {toast && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 11.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CheckIcon size={14} color="#059669" />
              <span>{toast}</span>
            </div>
          )}
          <button
            type="button"
            onClick={loadTasks}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              color: '#374151',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCwIcon size={12} color="#374151" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading && tasks.length === 0 ? (
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: '36px 20px',
            textAlign: 'center',
            border: '1px solid #eef0f4',
            color: '#6b7280',
            fontSize: 12,
          }}
        >
          Loading tasks that need your attention...
        </div>
      ) : tasks.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #eef0f4',
            borderRadius: 14,
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,.02)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckIcon size={24} color="#059669" />
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
              All caught up! J.A.V.I needs nothing from you.
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', maxWidth: 440 }}>
              Whenever an application requires a custom question not found in your profile, encounters a CAPTCHA, or hits a login wall, it will be safely paused and listed here for quick resolution.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tasks.map((task) => {
            const taskId = task._id || task.id || '';
            const isSubmitting = Boolean(submitting[taskId]);
            const companyName = task.payload?.company || 'Target Company';
            // The server sends jobTitle/openUrl; role/url/pageUrl are kept for older tasks.
            const roleName = task.payload?.jobTitle || task.payload?.role || 'Job Application';
            const url = task.payload?.openUrl || task.payload?.url || task.payload?.pageUrl;

            // Reason metadata badge
            let badgeText = 'Answer needed';
            let badgeBg = '#fff7ed';
            let badgeColor = '#c2410c';
            let badgeBorder = '#fed7aa';

            if (task.reason === 'captcha') {
              badgeText = 'CAPTCHA Challenge';
              badgeBg = '#fef2f2';
              badgeColor = '#dc2626';
              badgeBorder = '#fecaca';
            } else if (task.reason === 'login_wall') {
              badgeText = 'Login required';
              badgeBg = '#eff6ff';
              badgeColor = '#2563eb';
              badgeBorder = '#bfdbfe';
            } else if (task.reason === 'assisted_platform') {
              badgeText = 'Assisted Apply';
              badgeBg = '#f5f3ff';
              badgeColor = '#7c3aed';
              badgeBorder = '#ddd6fe';
            }

            const questions = task.questions && task.questions.length > 0
              ? task.questions
              : [{ key: 'default', label: task.message || 'Please provide information for this application', type: 'textarea', required: true }];

            return (
              <div
                key={taskId}
                style={{
                  background: '#fff',
                  border: '1px solid #eef0f4',
                  borderRadius: 14,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  boxShadow: '0 1px 3px rgba(0,0,0,.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: '#111827',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {companyName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>
                        {companyName} — <span style={{ fontWeight: 600, color: '#4b5563' }}>{roleName}</span>
                      </span>
                      <span style={{ fontSize: 11, color: '#8a8a92' }}>
                        {task.message || 'Paused waiting for human confirmation'}
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: badgeColor,
                      background: badgeBg,
                      border: `1px solid ${badgeBorder}`,
                      borderRadius: 999,
                      padding: '3px 10px',
                    }}
                  >
                    {badgeText}
                  </span>
                </div>

                {/* Specific reason body */}
                {task.reason === 'captcha' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#991b1b' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>ATS Protection Triggered</div>
                    A CAPTCHA check appeared during submission. Please open the link below in your browser, solve the verification challenge, then click "Mark Solved" to complete submission.
                  </div>
                )}

                {task.reason === 'login_wall' && (
                  <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#1e40af' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Candidate Portal Account Required</div>
                    This employer's ATS requires creating or signing into a candidate account before submitting. Please log in through the application link.
                  </div>
                )}

                {url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11.5,
                        color: '#2563eb',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Open job application page <ExternalLinkIcon size={12} color="#2563eb" />
                    </a>
                  </div>
                )}

                {/* Render questions if present */}
                {task.reason !== 'captcha' && task.reason !== 'login_wall' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {questions.map((q) => {
                      const curVal = answers[taskId]?.[q.key] || '';
                      return (
                        <div key={q.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#1f2937' }}>
                            "{q.label}"
                          </label>

                          {q.options && q.options.length > 0 ? (
                            <select
                              value={curVal}
                              onChange={(e) => handleFieldChange(taskId, q.key, e.target.value)}
                              style={{
                                height: 38,
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                                padding: '0 10px',
                                fontSize: 12,
                                background: '#fff',
                                fontFamily: 'Montserrat, sans-serif',
                              }}
                            >
                              <option value="">Select an option...</option>
                              {q.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <textarea
                              rows={2}
                              value={curVal}
                              onChange={(e) => handleFieldChange(taskId, q.key, e.target.value)}
                              placeholder="Your answer..."
                              style={{
                                width: '100%',
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                                padding: '8px 12px',
                                fontSize: 12,
                                outline: 'none',
                                fontFamily: 'Montserrat, sans-serif',
                                boxSizing: 'border-box',
                              }}
                            />
                          )}
                        </div>
                      );
                    })}

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#4b5563', cursor: 'pointer', marginTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={saveToBank[taskId] !== false}
                        onChange={(e) => handleToggleBank(taskId, e.target.checked)}
                        style={{ accentColor: '#2563eb' }}
                      />
                      Save to my answer bank for similar questions in future applications
                    </label>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => handleDismiss(task)}
                    disabled={isSubmitting}
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: '#6b7280',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      padding: '6px 12px',
                    }}
                  >
                    Dismiss
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRetry(task)}
                    disabled={isSubmitting}
                    style={{
                      background: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      color: '#374151',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 8,
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      padding: '6px 14px',
                    }}
                  >
                    Retry
                  </button>

                  {task.reason === 'captcha' || task.reason === 'login_wall' || task.reason === 'assisted_platform' ? (
                    <button
                      type="button"
                      onClick={() => handleMarkDone(task)}
                      disabled={isSubmitting}
                      style={{
                        background: '#0b0b0c',
                        border: 0,
                        color: '#fff',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '6px 16px',
                        cursor: isSubmitting ? 'wait' : 'pointer',
                      }}
                    >
                      {isSubmitting ? 'Processing...' : 'Mark Completed'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAnswer(task)}
                      disabled={isSubmitting}
                      style={{
                        background: '#2563eb',
                        border: 0,
                        color: '#fff',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '6px 16px',
                        cursor: isSubmitting ? 'wait' : 'pointer',
                      }}
                    >
                      {isSubmitting ? 'Submitting...' : 'Save & Submit'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
