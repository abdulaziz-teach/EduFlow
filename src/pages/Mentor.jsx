import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Trash2,
  Plus,
  Menu,
  X,
  Loader2,
  Brain,
  MessageSquare,
  BookOpen,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import mentorService from '../services/mentor';
import learningService from '../services/learning';

function Mentor() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);

  // Mode and Grounding
  const [mode, setMode] = useState('explain'); // 'explain' | 'socratic'
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [learnerProfile, setLearnerProfile] = useState(null);

  // Loading states
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);

  // Input states
  const [inputMessage, setInputMessage] = useState('');
  const [lastSentText, setLastSentText] = useState('');

  // UI states
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedbackSuccessId, setFeedbackSuccessId] = useState(null);

  // AI Quiz Modal State
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);

  const chatEndRef = useRef(null);

  // 1. Fetch conversations and learner context on mount
  const fetchConversations = async (selectId = null) => {
    setLoadingList(true);
    try {
      const data = await mentorService.getConversations();
      const list = Array.isArray(data?.conversations) ? data.conversations : [];
      setConversations(list);

      if (selectId) {
        loadConversation(selectId);
      } else if (list.length > 0 && !activeConv) {
        loadConversation(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err.message);
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Fetch learner profile for context hints & enrolled courses
    learningService
      .getProfile()
      .then((res) => {
        if (res?.profile) {
          setLearnerProfile(res.profile);
          if (Array.isArray(res.profile.enrolledCoursesSummary)) {
            setEnrolledCourses(res.profile.enrolledCoursesSummary);
          }
        }
      })
      .catch((err) => console.log('Learner profile fetch notice:', err.message));
  }, []);

  // 2. Handle state prefill from Study Plan task cards
  useEffect(() => {
    if (location.state?.prefillMessage) {
      setInputMessage(location.state.prefillMessage);
      if (location.state.subject) {
        setSelectedSubject(location.state.subject);
      }
      setActiveConv(null);
      setMessages([]);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate, location.pathname]);

  // 3. Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // 4. Load specific conversation messages
  const loadConversation = async (id) => {
    if (!id) return;
    setLoadingChat(true);
    setError('');
    try {
      const data = await mentorService.getConversation(id);
      setActiveConv(data?.conversation || null);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      setSelectedSubject(data?.conversation?.subject || '');
    } catch (err) {
      setError('Could not load conversation history. Please try again.');
      setMessages([]);
    } finally {
      setLoadingChat(false);
    }
  };

  // 5. Send a chat message
  const handleSend = async (e, retryText = null) => {
    if (e) e.preventDefault();
    const textToSend = retryText || inputMessage.trim();
    if (!textToSend || sending) return;

    if (!retryText) {
      setInputMessage('');
    }
    setLastSentText(textToSend);
    setSending(true);
    setError('');

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...(Array.isArray(prev) ? prev : []), tempUserMsg]);

    try {
      const res = await mentorService.sendMessage(
        activeConv?.id || null,
        textToSend,
        selectedSubject || null,
        mode,
        selectedCourseId || null
      );

      if (res?.message) {
        setMessages((prev) => [...(Array.isArray(prev) ? prev : []).filter((m) => m.id !== tempUserMsg.id), tempUserMsg, res.message]);
      }

      if (!activeConv && res?.conversation) {
        setActiveConv(res.conversation);
        await fetchConversations(res.conversation.id);
      } else {
        const listData = await mentorService.getConversations();
        setConversations(Array.isArray(listData?.conversations) ? listData.conversations : []);
      }
    } catch (err) {
      setMessages((prev) => (Array.isArray(prev) ? prev : []).filter((m) => m.id !== tempUserMsg.id));
      if (!retryText) {
        setInputMessage(textToSend);
      }
      setError("The AI Mentor couldn't respond right now. Please check your connection and retry.");
    } finally {
      setSending(false);
    }
  };

  // 6. Submit feedback on an AI message
  const handleFeedback = async (messageId, helpful) => {
    try {
      await mentorService.submitFeedback(messageId, helpful);
      setFeedbackSuccessId(messageId);
      setTimeout(() => setFeedbackSuccessId(null), 3000);

      // Update message state inline
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback: { helpful } } : m))
      );
    } catch (err) {
      console.error('Failed to submit feedback:', err.message);
    }
  };

  // 7. Delete a conversation
  const handleDeleteConv = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await mentorService.deleteConversation(id);
      if (activeConv?.id === id) {
        setActiveConv(null);
        setMessages([]);
        setSelectedSubject('');
        setSelectedCourseId('');
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert('Failed to delete conversation. Please try again.');
    }
  };

  // 8. Start a fresh new chat
  const handleNewChat = () => {
    setActiveConv(null);
    setMessages([]);
    setSelectedSubject('');
    setSelectedCourseId('');
    setInputMessage('');
    setError('');
    setSidebarOpen(false);
  };

  // 9. Generate AI Practice Quiz on active topic
  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    setQuizModalOpen(true);
    setGeneratedQuiz(null);

    try {
      const targetTopic = activeConv?.subject || selectedSubject || 'Key Concepts';
      const res = await learningService.generateQuiz({
        topic: targetTopic,
        courseId: selectedCourseId || null,
        difficulty: learnerProfile?.preferredDifficulty || 'medium',
        count: 3,
      });
      setGeneratedQuiz(res);
    } catch (err) {
      console.error('Quiz generation failed:', err.message);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="pt-16 h-screen flex overflow-hidden bg-[#0B0F19]">
      {/* 1. SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#111827] border-r border-white/5 pt-16 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex items-center justify-between md:hidden border-b border-white/5">
          <span className="font-semibold text-text">{t('mentor.chats')}</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded text-muted hover:text-text cursor-pointer"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 shrink-0 space-y-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all shadow-lg shadow-primary/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('mentor.newChat')}
          </button>
        </div>

        {/* Learner Context Mini-Card */}
        {learnerProfile && (
          <div className="mx-3 mb-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-muted space-y-1">
            <div className="flex items-center justify-between font-medium text-text">
              <span className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-primary" />
                {t('mentor.learnerProfile')}
              </span>
              <span className="text-[10px] uppercase font-semibold text-primary/80">
                {learnerProfile.preferredDifficulty || 'Med'}
              </span>
            </div>
            {learnerProfile.weakTopics && learnerProfile.weakTopics.length > 0 && (
              <p className="text-[10px] text-amber-400/80 truncate">
                {t('mentor.weakness', { topic: learnerProfile.weakTopics[0].topic })}
              </p>
            )}
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 select-none">
          {loadingList ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-transparent"
              >
                <div className="h-4 bg-white/10 rounded w-32" />
                <div className="w-4 h-4 bg-white/10 rounded" />
              </div>
            ))
          ) : (conversations || []).length === 0 ? (
            <p className="text-center text-xs text-muted/50 py-8 px-4">{t('mentor.noChats')}</p>
          ) : (
            (conversations || []).map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  loadConversation(conv.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-sm transition-all cursor-pointer group ${
                  activeConv?.id === conv.id
                    ? 'bg-white/[0.04] border-white/10 text-text'
                    : 'bg-transparent border-transparent text-muted hover:bg-white/[0.02] hover:text-text'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{conv.title}</p>
                    {conv.subject && (
                      <span className="text-[10px] text-primary/70 uppercase font-semibold tracking-wider">
                        {conv.subject}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteConv(e, conv.id)}
                  className="p-1 rounded text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ml-1 cursor-pointer"
                  title={t('mentor.deleteChat')}
                  aria-label={t('mentor.deleteChat')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}

      {/* 2. CHAT PANEL */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header with Mode Switcher & Course Grounding */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-3 sm:px-4 shrink-0 bg-[#0B0F19]/50 backdrop-blur min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg border border-white/5 bg-[#111827] text-muted hover:text-text md:hidden cursor-pointer shrink-0"
              aria-label={t('mentor.chats')}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-sm font-semibold text-text truncate">
                  {activeConv ? activeConv.title : t('mentor.title')}
                </h2>
                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium whitespace-nowrap">
                  {mode === 'socratic' ? t('mentor.socraticTutor') : t('mentor.directExplanation')}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted truncate">
                {activeConv?.subject
                  ? `${activeConv.subject}`
                  : t('mentor.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mode Switcher */}
            <div className="flex items-center bg-[#111827] p-0.5 sm:p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setMode('explain')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  mode === 'explain'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-text'
                }`}
                title={t('mentor.explainDesc')}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('mentor.explain')}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('socratic')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  mode === 'socratic'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-text'
                }`}
                title={t('mentor.socraticDesc')}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">{t('mentor.socratic')}</span>
              </button>
            </div>

            {/* Course Grounding Dropdown */}
            {enrolledCourses.length > 0 && !activeConv && (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="bg-[#111827] border border-white/5 text-muted hover:text-text rounded-xl px-2.5 py-1.5 text-xs outline-none cursor-pointer hidden md:block"
                title={t('mentor.groundingAll')}
              >
                <option value="">{t('mentor.groundingAll')}</option>
                {enrolledCourses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}

            {/* AI Practice Quiz Generator Trigger */}
            <button
              onClick={handleGenerateQuiz}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium transition-all cursor-pointer"
              title={t('mentor.practiceQuiz')}
            >
              <Award className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('mentor.practiceQuiz')}</span>
            </button>
          </div>
        </header>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {loadingChat ? (
            <div className="space-y-4 max-w-2xl mx-auto">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : ''}`}>
                  <div
                    className={`rounded-2xl p-4 max-w-sm w-full animate-pulse ${
                      i % 2 === 0 ? 'bg-[#6366F1]/10' : 'bg-[#111827]'
                    }`}
                  >
                    <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !activeConv && (!messages || messages.length === 0) ? (
            <div className="max-w-md mx-auto text-center py-12 md:py-16">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-text mb-3">{t('mentor.title')}</h1>
              <p className="text-muted text-sm leading-relaxed mb-6">
                {t('mentor.subtitle')}
              </p>

              {/* Mode Explanation Card */}
              <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02] text-xs text-muted mb-6 text-left space-y-1.5">
                <div className="flex items-center gap-2 text-text font-medium">
                  {mode === 'socratic' ? (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      {t('mentor.socraticActive')}
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4 text-primary" />
                      {t('mentor.explainActive')}
                    </>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed">
                  {mode === 'socratic'
                    ? t('mentor.socraticDesc')
                    : t('mentor.explainDesc')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-xs mx-auto">
                <button
                  onClick={() => setInputMessage(t('mentor.inputPlaceholder'))}
                  className="py-2 px-3 rounded-lg border border-white/5 bg-white/[0.02] text-xs text-muted hover:text-text hover:bg-white/[0.04] cursor-pointer text-left transition-all"
                >
                  &ldquo;{t('mentor.inputPlaceholder')}&rdquo;
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {(messages || []).map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md border ${
                        isUser
                          ? 'bg-[#6366F1] border-transparent text-white rounded-br-none'
                          : 'bg-[#111827] border-white/5 text-text rounded-bl-none'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div>
                          {msg.metadata?.isGrounded && (
                            <div className="mb-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block font-medium">
                              Grounded: {msg.metadata.courseTitle || 'Course Lesson'}
                            </div>
                          )}
                          <div className="prose prose-invert max-w-none prose-sm">
                            <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Assistant Message Feedback Controls */}
                    {!isUser && (
                      <div className="flex items-center gap-2 mt-1.5 ml-2 text-[11px] text-muted">
                        <span className="text-[10px] text-muted/60">Helpful?</span>
                        <button
                          onClick={() => handleFeedback(msg.id, true)}
                          className={`p-1 rounded hover:text-emerald-400 transition-colors cursor-pointer ${
                            msg.feedback?.helpful === true ? 'text-emerald-400' : 'text-muted/60'
                          }`}
                          title="Helpful explanation"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, false)}
                          className={`p-1 rounded hover:text-rose-400 transition-colors cursor-pointer ${
                            msg.feedback?.helpful === false ? 'text-rose-400' : 'text-muted/60'
                          }`}
                          title="Confusing or unhelpful"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>

                        {feedbackSuccessId === msg.id && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Thanks!
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Animated Thinking State */}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-[#111827] border border-white/5 text-muted rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-md flex items-center gap-2 select-none">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-100" />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-200" />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-300" />
                    </span>
                    {mode === 'socratic' ? t('mentor.formulatingHint') : t('mentor.thinking')}
                  </div>
                </div>
              )}

              {/* Error Callout with Retry */}
              {error && (
                <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-center justify-between max-w-md mx-auto">
                  <span>{error}</span>
                  {lastSentText && (
                    <button
                      onClick={() => handleSend(null, lastSentText)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-medium cursor-pointer transition-all ml-2"
                    >
                      <RotateCcw className="w-3 h-3" /> {t('common.retry')}
                    </button>
                  )}
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar Form */}
        <footer className="p-3 sm:p-4 border-t border-white/5 bg-[#0B0F19] shrink-0">
          <form onSubmit={handleSend} className="max-w-2xl mx-auto flex gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'socratic'
                  ? t('mentor.socraticPlaceholder')
                  : t('mentor.explainPlaceholder')
              }
              className="flex-1 bg-[#111827] border border-white/5 focus:border-primary/50 text-text rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm outline-none resize-none h-[48px] sm:h-[50px] min-h-[48px] max-h-[120px] transition-all placeholder:text-muted/40"
              rows={1}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || sending}
              aria-label={t('mentor.send')}
              className="px-3.5 sm:px-4 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-lg shadow-primary/10 min-h-[44px]"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </footer>
      </main>

      {/* 3. AI PRACTICE QUIZ MODAL */}
      {quizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-text text-sm">
                  {generatingQuiz ? 'Generating AI Practice Quiz...' : 'AI Practice Questions'}
                </h3>
              </div>
              <button
                onClick={() => setQuizModalOpen(false)}
                className="p-1 rounded text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {generatingQuiz ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                  <p className="text-sm text-muted">
                    Extracting high-yield questions from lesson principles...
                  </p>
                </div>
              ) : generatedQuiz?.questions?.length > 0 ? (
                <div className="space-y-6">
                  <div className="text-xs text-muted flex items-center justify-between border-b border-white/5 pb-2">
                    <span>Topic: <strong className="text-text">{generatedQuiz.topic}</strong></span>
                    <span className="capitalize px-2 py-0.5 rounded bg-white/5">
                      Difficulty: {generatedQuiz.difficulty}
                    </span>
                  </div>

                  {generatedQuiz.questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3"
                    >
                      <p className="text-sm font-medium text-text">
                        {idx + 1}. {q.question}
                      </p>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className="p-2.5 rounded-lg border border-white/5 bg-[#0B0F19] text-xs text-muted"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                      <details className="text-xs text-primary cursor-pointer mt-2">
                        <summary className="font-medium hover:underline">
                          Show Answer & Explanation
                        </summary>
                        <div className="mt-2 p-2.5 rounded bg-primary/10 border border-primary/20 text-text space-y-1">
                          <p className="font-medium text-emerald-400">
                            Correct: {q.correctAnswer}
                          </p>
                          <p className="text-muted text-[11px]">{q.explanation}</p>
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted py-8">
                  No questions could be generated. Please try again.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-white/5 bg-[#0B0F19] flex justify-end">
              <button
                onClick={() => setQuizModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium cursor-pointer transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Mentor;
