import React, { useState } from 'react';
import { api } from './api';
import type { AnswerEntry } from './types';

export interface AnswersCardProps {
  answers: AnswerEntry[];
  onChanged: () => void | Promise<void>;
  addNotice: (type: 'success' | 'error' | 'warning', text: string) => void;
}

export default function AnswersCard({ answers, onChanged, addNotice }: AnswersCardProps) {
  const [filter, setFilter] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [savingNew, setSavingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) {
      addNotice('warning', 'Please enter both the question and your answer.');
      return;
    }
    setSavingNew(true);
    try {
      await api<AnswerEntry>('/api/answers', {
        method: 'POST',
        json: { question: newQuestion.trim(), answer: newAnswer.trim() }
      });
      setNewQuestion('');
      setNewAnswer('');
      addNotice('success', 'Answer saved to library.');
      await onChanged();
    } catch (err: any) {
      addNotice('error', err.message || 'Could not save answer.');
    } finally {
      setSavingNew(false);
    }
  };

  const startEdit = (entry: AnswerEntry) => {
    setEditingId(entry.id);
    setEditQuestion(entry.question);
    setEditAnswer(Array.isArray(entry.answer) ? entry.answer.join(', ') : String(entry.answer ?? ''));
  };

  const handleSaveEdit = async (id: string) => {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      addNotice('warning', 'Question and answer cannot be empty.');
      return;
    }
    setSavingEdit(true);
    try {
      await api<AnswerEntry>(`/api/answers/${encodeURIComponent(id)}`, {
        method: 'PUT',
        json: { question: editQuestion.trim(), answer: editAnswer.trim() }
      });
      setEditingId(null);
      addNotice('success', 'Saved answer updated.');
      await onChanged();
    } catch (err: any) {
      addNotice('error', err.message || 'Could not update answer.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api(`/api/answers/${encodeURIComponent(id)}`, { method: 'DELETE' });
      addNotice('success', 'Saved answer removed.');
      await onChanged();
    } catch (err: any) {
      addNotice('error', err.message || 'Could not delete answer.');
    }
  };

  const filtered = answers.filter((a) => {
    const q = (a.question || '').toLowerCase();
    const ans = String(a.answer || '').toLowerCase();
    const search = filter.toLowerCase();
    return q.includes(search) || ans.includes(search);
  });

  const renderAnswer = (val: AnswerEntry['answer']) => {
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val ?? '');
  };

  return (
    <section className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h2 className="card-title" style={{ margin: 0 }}>
          Saved answers ({answers.length})
        </h2>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
        Answers you give on job forms or save here are reused on matching questions. Sensitive info (passwords, codes, IDs) is never stored.
      </p>

      {/* Add new answer form */}
      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <div className="field-group">
          <label htmlFor="ans-q" style={{ fontSize: '0.8rem' }}>Question</label>
          <input
            id="ans-q"
            type="text"
            placeholder="e.g. Do you have experience with TypeScript?"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
          />
        </div>
        <div className="field-group">
          <label htmlFor="ans-a" style={{ fontSize: '0.8rem' }}>Your answer</label>
          <input
            id="ans-a"
            type="text"
            placeholder="e.g. Yes, over 5 years building production apps."
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-secondary btn-sm" disabled={savingNew}>
            {savingNew ? 'Saving…' : 'Add to library'}
          </button>
        </div>
      </form>

      {/* Search filter if there are answers */}
      {answers.length > 3 && (
        <div style={{ marginBottom: 10 }}>
          <input
            type="search"
            placeholder="Search saved answers…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '6px 10px' }}
          />
        </div>
      )}

      {/* Answers list */}
      {filtered.length === 0 ? (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
          {answers.length === 0 ? 'No saved answers yet. Fill flagged questions on forms to capture them automatically.' : 'No answers match your search.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
          {filtered.map((entry) => (
            <div
              key={entry.id}
              style={{
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
                fontSize: '0.85rem'
              }}
            >
              {editingId === entry.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    type="text"
                    value={editQuestion}
                    onChange={(e) => setEditQuestion(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSaveEdit(entry.id)}
                      disabled={savingEdit}
                    >
                      {savingEdit ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>{entry.question}</div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{renderAnswer(entry.answer)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Used {entry.uses} time{entry.uses === 1 ? '' : 's'} · {entry.source === 'form' ? 'Captured from form' : 'Added manually'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                      onClick={() => startEdit(entry)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 6px', fontSize: '0.75rem', color: 'var(--accent-red-text)' }}
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
