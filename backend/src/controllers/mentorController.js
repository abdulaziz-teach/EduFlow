import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import * as aiService from '../services/aiService.js';
import * as studyPlanService from '../services/studyPlanService.js';
import KnowledgeTopic from '../models/KnowledgeTopic.js';
import * as knowledgeService from '../services/knowledgeService.js';

/**
 * Generate a short title from the first message content.
 */
function generateTitle(text) {
  let title = text.trim();
  // Strip common introductory phrases
  title = title.replace(/^(please explain|what is|tell me about|how do i|i don't understand)\s+/i, '');
  if (title.length > 30) {
    return title.substring(0, 27) + '...';
  }
  return title || 'Study Helper';
}

/**
 * @desc    Send a message to the AI Mentor
 * @route   POST /api/mentor/chat
 * @access  Private
 */
export const chat = async (req, res, next) => {
  try {
    const { conversationId, message, subject } = req.body;
    const user = req.user;

    // 1. Message validations
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message content is required and must be a string.',
      });
    }

    const trimmedMsg = message.trim();
    if (trimmedMsg.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty.',
      });
    }

    if (trimmedMsg.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message is too long. Please shorten your message to under 2000 characters.',
      });
    }

    let conversation;

    // 2. Fetch or create conversation
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId: user._id });
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found or access denied.',
        });
      }
    } else {
      const newTitle = generateTitle(trimmedMsg);
      conversation = await Conversation.create({
        userId: user._id,
        title: newTitle,
        subject: subject || null,
      });
    }

    // 3. Save User Message to DB
    const userMessage = await Message.create({
      conversationId: conversation._id,
      userId: user._id,
      role: 'user',
      content: trimmedMsg,
    });

    // Scan userMessage for tracked topics and log asked_help events
    try {
      const userTopics = await KnowledgeTopic.find({ userId: user._id });
      const lowerText = trimmedMsg.toLowerCase();
      
      for (const t of userTopics) {
        if (lowerText.includes(t.topic.toLowerCase())) {
          await knowledgeService.logEvent(user._id, t.subject, t.topic, 'mentor', 'asked_help');
        }
      }
    } catch (err) {
      console.error('Error scanning mentor chat for knowledge events:', err.message);
    }

    // 4. Fetch Configurable Message Context Limit (last 20 messages)
    const recentMessages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Reverse because we queried descending for limiting
    recentMessages.reverse();

    // Remove the last message from history array if it is the current userMessage to avoid duplicate context
    const historyMessages = recentMessages.filter(
      (m) => m._id.toString() !== userMessage._id.toString()
    );

    // 5. Build Study Plan Tasks context dynamically if relevant
    let todayTasksContext = '';
    const lowerMsg = trimmedMsg.toLowerCase();
    if (lowerMsg.includes('today') || lowerMsg.includes('study plan') || lowerMsg.includes('task')) {
      try {
        const activePlan = await studyPlanService.getCurrentPlan(user._id);
        if (activePlan) {
          const todayStr = new Date().toDateString();
          const todayDay = activePlan.days.find(
            (d) => new Date(d.date).toDateString() === todayStr
          );
          if (todayDay && todayDay.tasks && todayDay.tasks.length > 0) {
            todayTasksContext = todayDay.tasks
              .map((t) => `- ${t.title} (${t.subject}) — ${t.duration} min [${t.completed ? 'Completed' : 'Pending'}]`)
              .join('\n');
          }
        }
      } catch (err) {
        console.error('Error fetching today study tasks for mentor context:', err.message);
      }
    }

    // 6. Generate Response using the extended AI service
    let assistantReply;
    try {
      assistantReply = await aiService.generateMentorResponse({
        user,
        conversation,
        messages: historyMessages,
        question: trimmedMsg,
        todayTasksContext,
      });
    } catch (error) {
      console.error('AI Mentor generation failed:', error.message);
      // Fails gracefully - does NOT save a fake assistant response
      return res.status(503).json({
        success: false,
        message: 'The mentor is temporarily unavailable. Please try again.',
      });
    }

    // 7. Save Assistant Message to DB
    const assistantMessage = await Message.create({
      conversationId: conversation._id,
      userId: user._id,
      role: 'assistant',
      content: assistantReply,
    });

    // 8. Update conversation timestamp so it moves to top of list
    conversation.updatedAt = new Date();
    await conversation.save();

    // 9. Format response
    res.status(200).json({
      success: true,
      conversation: {
        id: conversation._id,
        title: conversation.title,
        subject: conversation.subject,
      },
      message: {
        id: assistantMessage._id,
        role: 'assistant',
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's conversations
 * @route   GET /api/mentor/conversations
 * @access  Private
 */
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      conversations: conversations.map((c) => ({
        id: c._id,
        title: c.title,
        subject: c.subject,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get conversation by ID along with its messages
 * @route   GET /api/mentor/conversations/:id
 * @access  Private
 */
export const getConversationById = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      conversation: {
        id: conversation._id,
        title: conversation.title,
        subject: conversation.subject,
        updatedAt: conversation.updatedAt,
      },
      messages: messages.map((m) => ({
        id: m._id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a conversation and its messages
 * @route   DELETE /api/mentor/conversations/:id
 * @access  Private
 */
export const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId: conversation._id });
    
    // Delete conversation
    await conversation.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
