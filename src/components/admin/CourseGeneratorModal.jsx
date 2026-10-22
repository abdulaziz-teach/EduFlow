import React, { useState } from 'react';
import { Sparkles, BookOpen, CheckCircle, AlertTriangle, Layers, X } from 'lucide-react';
import adminContentService from '../../services/adminContent';
import Button from '../ui/Button';

export default function CourseGeneratorModal({ isOpen, onClose, onCreated }) {
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [targetLevel, setTargetLevel] = useState('beginner');
  const [language, setLanguage] = useState('en');
  const [objectives, setObjectives] = useState('');
  const [loading, setLoading] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!subject.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await adminContentService.generateCourse({
        subject,
        title,
        targetLevel,
        language,
        objectives: objectives.split('\n').map((o) => o.trim()).filter(Boolean),
      });

      if (res.data.success) {
        setGenerationResult(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate course');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!generationResult?.generationId) return;
    setLoading(true);
    try {
      const res = await adminContentService.approveGeneration(generationResult.generationId, {
        editedContent: generationResult.course,
      });
      if (res.data.success) {
        if (onCreated) onCreated(res.data.entity);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve course');
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
              <Sparkles className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-lg font-bold text-text'>AI Course Builder</h2>
              <p className='text-xs text-muted'>Generate curriculum structure with human review</p>
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
                  Subject / Domain *
                </label>
                <input
                  type='text'
                  placeholder='e.g. JavaScript, Algebra, Biology'
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className='w-full bg-dark/50 border border-subtle rounded-xl px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5'>
                  Course Title (Optional)
                </label>
                <input
                  type='text'
                  placeholder='e.g. Modern JavaScript from Fundamentals to Production'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className='w-full bg-dark/50 border border-subtle rounded-xl px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5'>
                    Target Level
                  </label>
                  <select
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(e.target.value)}
                    className='w-full bg-dark/50 border border-subtle rounded-xl px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none'
                  >
                    <option value='beginner'>Beginner</option>
                    <option value='intermediate'>Intermediate</option>
                    <option value='advanced'>Advanced</option>
                    <option value='all_levels'>All Levels</option>
                  </select>
                </div>
                <div>
                  <label className='block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5'>
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className='w-full bg-dark/50 border border-subtle rounded-xl px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none'
                  >
                    <option value='en'>English</option>
                    <option value='uz'>Uzbek</option>
                    <option value='ru'>Russian</option>
                  </select>
                </div>
              </div>

              <div>
                <label className='block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5'>
                  Learning Objectives (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder='Understand core concepts&#10;Build practical solutions'
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  className='w-full bg-dark/50 border border-subtle rounded-xl px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none'
                />
              </div>

              <div className='pt-2'>
                <Button type='submit' loading={loading} className='w-full'>
                  <Sparkles className='w-4 h-4 mr-2' />
                  Generate Course Structure
                </Button>
              </div>
            </form>
          ) : (
            <div className='space-y-6'>
              <div className='p-4 bg-dark/40 border border-subtle rounded-xl space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold uppercase tracking-wider text-primary'>
                    Status: Draft (Pending Review)
                  </span>
                  <span className='text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1'>
                    <CheckCircle className='w-3 h-3' />
                    Validated
                  </span>
                </div>
                <h3 className='text-base font-bold text-text'>{generationResult.course.title}</h3>
                <p className='text-xs text-muted leading-relaxed'>{generationResult.course.description}</p>
              </div>

              <div className='space-y-3'>
                <h4 className='text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5'>
                  <Layers className='w-3.5 h-3.5 text-primary' />
                  Proposed Modules ({generationResult.course.modules?.length || 0})
                </h4>
                {generationResult.course.modules?.map((mod, idx) => (
                  <div key={idx} className='p-3 bg-white/5 border border-subtle rounded-xl space-y-2 text-xs'>
                    <div className='font-semibold text-text'>{mod.title}</div>
                    <ul className='list-disc list-inside text-muted pl-1 space-y-1'>
                      {mod.lessons?.map((les, lIdx) => (
                        <li key={lIdx} className='text-text/90'>
                          {les.title} <span className='text-muted'>({Math.round(les.duration / 60)} min)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className='flex items-center gap-3 pt-2'>
                <Button variant='secondary' onClick={() => setGenerationResult(null)} className='w-1/2'>
                  Edit Prompt
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
