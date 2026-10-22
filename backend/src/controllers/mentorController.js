import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import AIFeedback from '../models/AIFeedback.js';
import * as aiService from '../services/aiService.js';
import * as learningContextEngine from '../services/learningContextEngine.js';
import * as aiMemoryService from '../services/aiMemoryService.js';
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
    const { conversationId, message, subject, mode = 'explain', courseId, lessonId } = req.body;
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

    // Validate mode
    const selectedMode = mode === 'socratic' ? 'socratic' : 'explain';

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
      metadata: {
        mode: selectedMode,
        courseId: courseId || null,
        lessonId: lessonId || null,
      },
    });

    // Extract educational observations asynchronously
    try {
      await aiMemoryService.extractLearningMemoriesFromChat(user._id, trimmedMsg);
    } catch (memErr) {
      console.error('Error extracting memory from chat:', memErr.message);
    }

    // Scan userMessage for tracked topics and log asked_help events
    try {
      const userTopics = await KnowledgeTopic.find({ userId: user._id })
        .select('topic subject')
        .lean();
      const lowerText = trimmedMsg.toLowerCase();
      const matchingTopics = userTopics.filter((t) => lowerText.includes(t.topic.toLowerCase()));

      if (matchingTopics.length > 0) {
        Promise.allSettled(
          matchingTopics.map((t) =>
            knowledgeService.logEvent(user._id, t.subject, t.topic, 'mentor', 'asked_help')
          )
        ).catch((err) => console.error('Error in background topic event logging:', err.message));
      }
    } catch (err) {
      console.error('Error scanning mentor chat for knowledge events:', err.message);
    }

    // 4. Fetch Message Context Limit (last 15 messages)
    const recentMessages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    recentMessages.reverse();

    const historyMessages = recentMessages.filter(
      (m) => m._id.toString() !== userMessage._id.toString()
    );

    // 5. Build dynamic learning context (learner profile, weak topics, course grounding)
    let learningContext = null;
    try {
      learningContext = await learningContextEngine.buildLearningContext({
        userId: user._id,
        userMessage: trimmedMsg,
        subject: conversation.subject || subject,
        courseId,
        lessonId,
      });
    } catch (ctxErr) {
      console.error('Error assembling learning context:', ctxErr.message);
    }

    // 6. Generate Response using AI Mentor 2.0
    let assistantReply;
    try {
      assistantReply = await aiService.generateMentorResponse({
        user,
        conversation,
        messages: historyMessages,
        question: trimmedMsg,
        mode: selectedMode,
        learningContext,
      });
    } catch (error) {
      console.error('AI Mentor generation failed:', error.message);
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
      metadata: {
        mode: selectedMode,
        isGrounded: learningContext?.isGrounded || false,
        courseTitle: learningContext?.courseTitle || null,
        lessonTitle: learningContext?.lessonTitle || null,
      },
    });

    // 8. Update conversation timestamp
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
        metadata: assistantMessage.metadata,
      },
      context: {
        mode: selectedMode,
        isGrounded: learningContext?.isGrounded || false,
        courseTitle: learningContext?.courseTitle || null,
        lessonTitle: learningContext?.lessonTitle || null,
        relevantWeakTopics: learningContext?.relevantWeakTopics || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit feedback on an AI message
 * @route   POST /api/mentor/feedback
 * @access  Private
 */
export const submitFeedback = async (req, res, next) => {
  try {
    const { messageId, helpful, reason, comment } = req.body;
    const userId = req.user._id;

    if (!messageId || helpful === undefined) {
      return res.status(400).json({
        success: false,
        message: 'messageId and helpful boolean are required.',
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    // Verify conversation ownership
    const conv = await Conversation.findOne({ _id: message.conversationId, userId });
    if (!conv) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only provide feedback on messages in your conversations.',
      });
    }

    const feedback = await AIFeedback.findOneAndUpdate(
      { userId, messageId },
      {
        $set: {
          conversationId: conv._id,
          helpful: Boolean(helpful),
          reason: reason || null,
          comment: comment ? String(comment).substring(0, 500) : '',
        },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Feedback recorded successfully.',
      feedback,
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
    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

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
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id }).lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    // Fetch any feedback submitted for these messages
    const messageIds = messages.map((m) => m._id);
    const feedbacks = await AIFeedback.find({ messageId: { $in: messageIds }, userId: req.user._id }).lean();
    const feedbackMap = new Map(feedbacks.map((f) => [f.messageId.toString(), f]));

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
        metadata: m.metadata,
        feedback: feedbackMap.get(m._id.toString()) || null,
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

    // Delete all messages and feedback in the conversation
    const messages = await Message.find({ conversationId: conversation._id }).select('_id');
    const messageIds = messages.map((m) => m._id);

    await AIFeedback.deleteMany({ messageId: { $in: messageIds } });
    await Message.deleteMany({ conversationId: conversation._id });
    await conversation.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
