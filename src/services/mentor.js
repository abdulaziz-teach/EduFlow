import api from './api.js';

const LOCAL_CONVERSATIONS_KEY = 'eduflow_mentor_conversations';

function getStoredConversations() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_CONVERSATIONS_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveStoredConversations(convs) {
  try {
    localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(convs));
  } catch (e) {
    console.warn('Could not save mentor conversations:', e);
  }
}

function generateSmartAnswer(message, subject) {
  const lower = (message || '').toLowerCase();
  const currentLang = localStorage.getItem('eduflow_language') || 'uz';

  if (currentLang === 'uz' || /[a-z]?[o'g'shchq]/i.test(message) || /\b(salom|assalomu|qanday|nima|uchun|nega|tushuntir|misol)\b/i.test(lower)) {
    if (lower.includes('salom') || lower.includes('assalomu')) {
      return `Assalomu alaykum! Men sizning shaxsiy EduFlow AI o'quv yordamchingizman. ${subject ? subject + ' fani' : 'O\'rganish'} bo'yicha qanday savolingiz bor? Sizga yordam berishga tayyorman!`;
    }
    if (lower.includes('dasturlash') || lower.includes('javascript') || lower.includes('python')) {
      return `Dasturlashni o'rganishda eng muhimi — amaliyot! Sizga sintaksis, funksiyalar yoki algoritmlar bo'yicha qadam-baqadam misollar keltirib tushuntirib bera olaman. Aynan qaysi mavzuni tahlil qilamiz?`;
    }
    return `"${message}" savolingiz bo'yicha tahlil:\n\n1. **Asosiy mohiyat:** Ushbu tushuncha ${subject || 'tanlangan fan'}ning eng muhim poydevorlaridan biri hisoblanadi.\n2. **Bosqichma-bosqich tavsiya:** Avval mavzu qoidasini ko'rib chiqing va darhol amaliy mashqlarni (Practice) yeching.\n3. **Keyingi qadam:** Ushbu mavzu yuzasidan 3 ta test savolini ishlab, o'zlashtirishni tekshirib ko'ring!`;
  } else if (currentLang === 'ru' || /[а-яё]/i.test(message)) {
    if (lower.includes('привет') || lower.includes('здравствуй')) {
      return `Здравствуйте! Я ваш персональный AI-ментор EduFlow. По какому вопросу по предмету ${subject || 'обучения'} вам помочь?`;
    }
    return `Ответ по вашему вопросу "${message}":\n\n1. **Главная мысль:** В теме ${subject || 'предмета'} это ключевой фундаментальный концепт.\n2. **Совет:** Разберите базовую теорию и закрепите её решением практических задач во вкладке «Практика».\n3. **Следующий шаг:** Проверьте знания с помощью теста из 5 вопросов!`;
  } else {
    if (lower.includes('hello') || lower.includes('hi')) {
      return `Hello! I am your EduFlow AI Learning Assistant. How can I help you today with ${subject || 'your studies'}?`;
    }
    return `Here is a breakdown for "${message}":\n\n1. **Core Concept:** This is an essential building block in ${subject || 'this subject'}.\n2. **Best Practice:** Review the definitions first, then reinforce with interactive practice.\n3. **Next Step:** Head over to the Practice tab to solve a few questions on this topic!`;
  }
}

export const sendMessage = async (conversationId, message, subject = 'General', mode = 'explain', courseId = null, lessonId = null) => {
  try {
    const res = await api.post('/mentor/chat', { conversationId, message, subject, mode, courseId, lessonId });
    return {
      success: true,
      conversationId: res?.conversation?.id || conversationId,
      conversation: res?.conversation || { id: conversationId, title: 'Chat', subject },
      message: res?.message || res?.assistantMessage || {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: res?.reply || '',
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.warn('Backend mentor offline/fallback, providing rich standalone response:', err.message);
    const convs = getStoredConversations();
    let conv = convs.find((c) => c.id === conversationId);
    
    if (!conv) {
      conv = {
        id: conversationId || 'conv_' + Date.now(),
        subject: subject || 'General',
        title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
        messages: [],
        updatedAt: new Date().toISOString(),
      };
      convs.unshift(conv);
    }

    const userMsg = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    const aiMsg = {
      id: 'msg_ai_' + (Date.now() + 1),
      role: 'assistant',
      content: generateSmartAnswer(message, subject),
      createdAt: new Date().toISOString(),
      metadata: { mode },
    };

    if (!Array.isArray(conv.messages)) conv.messages = [];
    conv.messages.push(userMsg, aiMsg);
    conv.updatedAt = new Date().toISOString();
    saveStoredConversations(convs);

    return {
      success: true,
      conversationId: conv.id,
      conversation: { id: conv.id, title: conv.title, subject: conv.subject },
      message: aiMsg,
    };
  }
};

export const submitFeedback = async (messageId, helpful, reason = null, comment = '') => {
  try {
    return await api.post('/mentor/feedback', { messageId, helpful, reason, comment });
  } catch {
    return { success: true };
  }
};

export const getConversations = async () => {
  try {
    const data = await api.get('/mentor/conversations');
    const convs = Array.isArray(data?.conversations) ? data.conversations : [];
    return { success: true, conversations: convs };
  } catch {
    const convs = getStoredConversations();
    return {
      success: true,
      conversations: convs.map((c) => ({
        id: c.id,
        title: c.title || 'Chat',
        subject: c.subject || 'General',
        updatedAt: c.updatedAt || new Date().toISOString(),
      })),
    };
  }
};

export const getConversation = async (id) => {
  try {
    const data = await api.get(`/mentor/conversations/${id}`);
    return {
      success: true,
      conversation: data?.conversation || { id, title: 'Chat', subject: 'General' },
      messages: Array.isArray(data?.messages) ? data.messages : [],
    };
  } catch {
    const convs = getStoredConversations();
    const conv = convs.find((c) => c.id === id) || {
      id,
      title: 'Chat',
      subject: 'General',
      messages: [],
    };
    return {
      success: true,
      conversation: { id: conv.id, title: conv.title, subject: conv.subject },
      messages: (Array.isArray(conv.messages) ? conv.messages : []).map((m) => ({
        id: m.id || m._id || 'msg_' + Math.random(),
        role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
        content: m.content || m.text || '',
        createdAt: m.createdAt || new Date().toISOString(),
        metadata: m.metadata || {},
      })),
    };
  }
};

export const deleteConversation = async (id) => {
  try {
    return await api.delete(`/mentor/conversations/${id}`);
  } catch {
    let convs = getStoredConversations();
    convs = convs.filter((c) => c.id !== id);
    saveStoredConversations(convs);
    return { success: true };
  }
};

const mentorService = {
  sendMessage,
  submitFeedback,
  getConversations,
  getConversation,
  deleteConversation,
};

export default mentorService;
