import React, { useState, useEffect } from 'react';
import { History, RotateCcw, AlertTriangle, CheckCircle, X, ShieldAlert } from 'lucide-react';
import adminContentService from '../../services/adminContent';
import Button from '../ui/Button';

export default function ContentVersionHistoryModal({ isOpen, onClose, entityType, entityId, onRolledBack }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen && entityType && entityId) {
      fetchVersions();
    }
  }, [isOpen, entityType, entityId]);

  const fetchVersions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminContentService.getVersions(entityType, entityId);
      if (res.data.success) {
        setVersions(res.data.versions || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (targetVersionNumber) => {
    if (!window.confirm('Restore version ' + targetVersionNumber + '? Existing student progress will remain safely preserved.')) {
      return;
    }

    setRollbackLoading(true);
    setError('');
    try {
      const res = await adminContentService.rollbackVersion(entityType, entityId, targetVersionNumber);
      if (res.data.success) {
        setSuccessMsg('Restored to version ' + targetVersionNumber + ' successfully');
        fetchVersions();
        if (onRolledBack) onRolledBack();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Rollback failed');
    } finally {
      setRollbackLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
      <div className='bg-surface border border-subtle rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col'>
        <div className='flex items-center justify-between p-6 border-b border-subtle'>
          <div className='flex items-center gap-2.5'>
            <div className='w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center'>
              <History className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-lg font-bold text-text'>Content Version History</h2>
              <p className='text-xs text-muted'>Non-destructive rollback protecting historical learning progress</p>
            </div>
          </div>
          <button onClick={onClose} className='text-muted hover:text-text p-1 rounded-lg'>
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-6 space-y-4'>
          {error && (
            <div className='p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs flex items-center gap-2'>
              <AlertTriangle className='w-4 h-4 shrink-0' />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className='p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2'>
              <CheckCircle className='w-4 h-4 shrink-0' />
              <span>{successMsg}</span>
            </div>
          )}

          <div className='p-3 bg-white/5 border border-subtle rounded-xl text-xs text-muted flex items-start gap-2'>
            <ShieldAlert className='w-4 h-4 text-primary shrink-0 mt-0.5' />
            <span>
              Restoring a prior snapshot updates content text without deleting student enrollments, quiz records, or flashcard stats.
            </span>
          </div>

          {loading ? (
            <div className='py-8 text-center text-muted text-xs'>Loading version history...</div>
          ) : versions.length === 0 ? (
            <div className='py-8 text-center text-muted text-xs'>No prior version snapshots recorded yet.</div>
          ) : (
            <div className='space-y-3'>
              {versions.map((ver) => (
                <div key={ver._id} className='p-3.5 bg-dark/40 border border-subtle rounded-xl flex items-center justify-between gap-4'>
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs font-bold text-primary'>Version {ver.versionNumber}</span>
                      <span className='text-[10px] text-muted'>
                        {new Date(ver.createdAt).toLocaleDateString()} at {new Date(ver.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className='text-xs text-text font-medium mt-0.5'>{ver.title || 'Untitled Snapshot'}</div>
                    <div className='text-[11px] text-muted'>{ver.changeSummary}</div>
                  </div>

                  <Button
                    size='sm'
                    variant='secondary'
                    onClick={() => handleRollback(ver.versionNumber)}
                    loading={rollbackLoading}
                  >
                    <RotateCcw className='w-3.5 h-3.5 mr-1.5' />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
