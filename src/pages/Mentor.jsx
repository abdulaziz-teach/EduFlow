import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import mentorService from '../services/mentor';

function Mentor() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // Loading states
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Input states
  const [inputMessage, setInputMessage] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  // UI states
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const chatEndRef = useRef(null);

  // 1. Fetch conversations on mount
  const fetchConversations = async (selectId = null) => {
    setLoadingList(true);
    try {
      const data = await mentorService.getConversations();
      setConversations(data.conversations);
      
      // Auto-select a conversation if specified or present
      if (selectId) {
        loadConversation(selectId);
      } else if (data.conversations.length > 0 && !activeConv) {
        loadConversation(data.conversations[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // 2. Handle state prefill from Study Plan task cards
  useEffect(() => {
    if (location.state?.prefillMessage) {
      setInputMessage(location.state.prefillMessage);
      if (location.state.subject) {
        setSelectedSubject(location.state.subject);
      }
      // Start a new chat with prefill
      setActiveConv(null);
      setMessages([]);
      // Clear routing state so it does not trigger again
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate, location.pathname]);

  // 3. Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // 4. Load specific conversation messages
  const loadConversation = async (id) => {
    setLoadingChat(true);
    setError('');
    try {
      const data = await mentorService.getConversation(id);
      setActiveConv(data.conversation);
      setMessages(data.messages);
      setSelectedSubject(data.conversation.subject || '');
    } catch (err) {
      setError('Could not load conversation history. Please try again.');
    } finally {
      setLoadingChat(false);
    }
  };

  // 5. Send a chat message
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setSending(true);
    setError('');

    // Optimistically push user message to history
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await mentorService.sendMessage(
        activeConv?.id || null,
        messageText,
        selectedSubject || null
      );

      // Add actual assistant reply
      setMessages((prev) => [...prev, res.message]);

      // If it was a new conversation, update active conv info and refresh sidebar
      if (!activeConv) {
        setActiveConv(res.conversation);
        await fetchConversations(res.conversation.id);
      } else {
        // Refresh conversations list to update 'updatedAt' sorting order
        const listData = await mentorService.getConversations();
        setConversations(listData.conversations);
      }
    } catch (err) {
      // Remove the optimistic user message or leave it with error styling
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      // Re-populate text area
      setInputMessage(messageText);
      setError("I couldn't respond right now. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // 6. Delete a conversation
  const handleDeleteConv = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await mentorService.deleteConversation(id);
      // If we deleted the currently active conversation, reset view
      if (activeConv?.id === id) {
        setActiveConv(null);
        setMessages([]);
        setSelectedSubject('');
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert('Failed to delete conversation. Please try again.');
    }
  };

  // 7. Start a fresh new chat
  const handleNewChat = () => {
    setActiveConv(null);
    setMessages([]);
    setSelectedSubject('');
    setInputMessage('');
    setError('');
    setSidebarOpen(false); // Close sidebar on mobile
  };

  // 8. Capture Enter key triggers
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="pt-16 h-screen flex overflow-hidden bg-[#0B0F19]">
      {/* 1. SIDEBAR SIDE-NAV (Desktop & Mobile drawer layout) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#111827] border-r border-white/5 pt-16 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header in sidebar */}
        <div className="p-4 flex items-center justify-between md:hidden border-b border-white/5">
          <span className="font-semibold text-text">Chats</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded text-muted hover:text-text cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all shadow-lg shadow-primary/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 select-none">
          {loadingList ? (
            /* Sidebar Skeletons */
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-transparent">
                <div className="h-4 bg-white/10 rounded w-32" />
                <div className="w-4 h-4 bg-white/10 rounded" />
              </div>
            ))
          ) : conversations.length === 0 ? (
            <p className="text-center text-xs text-muted/50 py-8 px-4">No recent chats</p>
          ) : (
            conversations.map((conv) => (
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
                  title="Delete Chat"
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

      {/* 2. CHAT PANEL CONTENT VIEW */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Chat Sub-Header */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-[#0B0F19]/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg border border-white/5 bg-[#111827] text-muted hover:text-text md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-text">
                {activeConv ? activeConv.title : 'AI Mentor'}
              </h2>
              <p className="text-[11px] text-muted">
                {activeConv?.subject ? `${activeConv.subject} Session` : 'Personal Learning Assistant'}
              </p>
            </div>
          </div>
          {/* Subject Dropdown Selector */}
          {!activeConv && user?.subjects?.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted hidden sm:inline">Subject:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-[#111827] border border-white/5 text-muted hover:text-text rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer"
              >
                <option value="">Inferred Subject</option>
                {user.subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}
        </header>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Skeletons when chat is loading */}
          {loadingChat ? (
            <div className="space-y-4 max-w-2xl mx-auto">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : ''}`}>
                  <div className={`rounded-2xl p-4 max-w-sm w-full animate-pulse ${i % 2 === 0 ? 'bg-[#6366F1]/10' : 'bg-[#111827]'}`}>
                    <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !activeConv && messages.length === 0 ? (
            /* Empty Chat State */
            <div className="max-w-md mx-auto text-center py-16 md:py-24">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-text mb-3">Your AI Mentor is ready.</h1>
              <p className="text-muted text-sm leading-relaxed mb-8">
                Ask questions. Understand difficult concepts. Get help with your study tasks.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
                <button
                  onClick={() => setInputMessage('Explain quadratic equations step-by-step.')}
                  className="py-2 px-3 rounded-lg border border-white/5 bg-white/[0.02] text-xs text-muted hover:text-text hover:bg-white/[0.04] cursor-pointer text-left transition-all"
                >
                  &ldquo;Explain quadratic equations step-by-step.&rdquo;
                </button>
                <button
                  onClick={() => setInputMessage('How does photosynthesis work?')}
                  className="py-2 px-3 rounded-lg border border-white/5 bg-white/[0.02] text-xs text-muted hover:text-text hover:bg-white/[0.04] cursor-pointer text-left transition-all"
                >
                  &ldquo;How does photosynthesis work?&rdquo;
                </button>
              </div>
            </div>
          ) : (
            /* Message Bubbles */
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
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
                        /* AI Assistant Markdown safely parsed and rendered */
                        <div className="prose prose-invert max-w-none prose-sm">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
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
                    Mentor is thinking...
                  </div>
                </div>
              )}

              {/* Error Callout */}
              {error && (
                <div className="p-3.5 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-xs text-center max-w-sm mx-auto">
                  {error}
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar Form */}
        <footer className="p-4 border-t border-white/5 bg-[#0B0F19] shrink-0">
          <form onSubmit={handleSend} className="max-w-2xl mx-auto flex gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your mentor..."
              className="flex-1 bg-[#111827] border border-white/5 focus:border-primary/50 text-text rounded-xl px-4 py-3 text-sm outline-none resize-none h-[50px] min-h-[50px] max-h-[120px] transition-all placeholder:text-muted/40"
              rows={1}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || sending}
              className="px-4 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-lg shadow-primary/10"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}

export default Mentor;
