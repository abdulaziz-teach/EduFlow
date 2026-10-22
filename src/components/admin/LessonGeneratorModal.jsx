import React, { useState } from 'react';
import { Sparkles, FileText, CheckCircle, AlertTriangle, X, RefreshCw } from 'lucide-react';
import adminContentService from '../../services/adminContent';
import Button from '../ui/Button';

export default function LessonGeneratorModal({ isOpen, onClose, courseId, onCreated }) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [targetLevel, setTargetLevel] = useState('beginner');
  const [language, setLanguage] = useState('en');
  const [groundingContent, setGroundingContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim() && !title.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await adminContentService.generateLesson({
        courseId,
        title,
        topic: topic || title,
        targetLevel,
        language,
        groundingContent,
      });

      if (res.data.success) {
        setGenerationResult(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate lesson');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!generationResult?.generationId) return;
    setLoading(true);
    try {
      const res = await adminContentService.approveGeneration(generationResult.generationId, {
        courseId,
        editedContent: generationResult.lesson,
      });
      if (res.data.success) {
        if (onCreated) onCreated(res.data.entity);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve lesson');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
      <div className='bg-surface border border-subtle rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col'>
        <div className='flex items-center justify-between p-6 border-b border-subtle'>
          <div className='flex items-center gap-2.5'>
            <div className='w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center'>
              <FileText className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-lg font-bold text-text'>AI Lesson Generator</h2>
              <p className='text-xs text-muted'>Grounded, structured lesson drafts in DRAFT status</p>
            </div>
          </div>
          <button onClick={onClose} className='text-muted hover:text-text p-1 rounded-lg'>
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-6 space-y-6'>
          {error && (
            <div className='p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs flex items-center gap-2'>
              <AlertTriangle className='w-4 h-4 shrink-0' />
              <span>{error}</span>
            </div>
          )}

          {!generationResult ? (
            <form onSubmit={handleGenerate} className='space-y-4'>
              <div>
                <label className='block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5'>
                  Lesson Topic *
                </label>
                <input
                  type='text'
                  placeholder='e.g. Asynchronous JavaScript & Promises'
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  className='w-full bg-dark/50 border border-subtle rounded-xl px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5'>
                  Lesson Title (Optional)
                </label>
                <input
                  type='text'
                  placeholder='e.g. Mastering Promises & Async/Await'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className='w-full bg-dark/50 border border-subtle rounded-xl px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5'>
                  Grounding Source Content (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder='Paste course notes or syllabus text to ground generation in verified material'
                  value={groundingContent}
                  onChange={(e) => setGroundingContent(e.target.value)}
                  className='w-full bg-dark/50 border border-subtle rounded-xl px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none'
                />
              </div>

              <div className='pt-2'>
                <Button type='submit' loading={loading} className='w-full'>
                  <Sparkles className='w-4 h-4 mr-2' />
                  Generate Structured Lesson
                </Button>
              </div>
            </form>
          ) : (
            <div className='space-y-5'>
              <div className='p-4 bg-dark/40 border border-subtle rounded-xl space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold uppercase tracking-wider text-primary'>
                    Status: Draft (Pending Review)
                  </span>
                  <span className='text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1'>
                    <CheckCircle className='w-3 h-3' />
                    Quality Score: {Math.round((generationResult.validation?.qualityScore || 1) * 100)}%
                  </span>
                </div>
                <h3 className='text-base font-bold text-text'>{generationResult.lesson.title}</h3>
                <p className='text-xs text-muted'>{generationResult.lesson.description}</p>
              </div>

              {/* Structured sections */}
              <div className='space-y-3 text-xs'>
                <div className='p-3 bg-white/5 border border-subtle rounded-xl space-y-1.5'>
                  <div className='font-semibold text-primary uppercase tracking-wider text-[11px]'>Learning Objectives</div>
                  <ul className='list-disc list-inside text-muted pl-1 space-y-1'>
                    {generationResult.lesson.objectives?.map((obj, idx) => (
                      <li key={idx} className='text-text/90'>{obj}</li>
                    ))}
                  </ul>
                </div>

                <div className='p-3 bg-white/5 border border-subtle rounded-xl space-y-1.5'>
                  <div className='font-semibold text-primary uppercase tracking-wider text-[11px]'>Pedagogical Explanation</div>
                  <p className='text-muted leading-relaxed whitespace-pre-wrap'>{generationResult.lesson.explanation}</p>
                </div>

                <div className='p-3 bg-white/5 border border-subtle rounded-xl space-y-1.5'>
                  <div className='font-semibold text-primary uppercase tracking-wider text-[11px]'>Summary</div>
                  <p className='text-muted leading-relaxed'>{generationResult.lesson.summary}</p>
                </div>
              </div>

              <div className='flex items-center gap-3 pt-2'>
                <Button variant='secondary' onClick={() => setGenerationResult(null)} className='w-1/2'>
                  Edit Input
                </Button>
                <Button onClick={handleApprove} loading={loading} className='w-1/2'>
                  <CheckCircle className='w-4 h-4 mr-1.5' />
                  Approve Draft
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
