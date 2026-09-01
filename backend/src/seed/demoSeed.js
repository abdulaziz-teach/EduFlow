import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import StudyPlan from '../models/StudyPlan.js';
import StudySession from '../models/StudySession.js';
import PracticeQuestion from '../models/PracticeQuestion.js';
import PracticeSession from '../models/PracticeSession.js';
import KnowledgeTopic from '../models/KnowledgeTopic.js';
import KnowledgeEvent from '../models/KnowledgeEvent.js';
import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import UserAchievement from '../models/UserAchievement.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

async function seedDemoData() {
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: Cannot run demo seed script in production environment.');
    process.exit(1);
  }

  console.log('Connecting to database for demo seed...');
  await connectDB();

  const demoEmail = 'demo@eduflow.app';
  console.log(`Clearing any existing demo data for ${demoEmail}...`);

  // Find existing demo user if any
  const existingUser = await User.findOne({ email: demoEmail });
  if (existingUser) {
    const userId = existingUser._id;
    await Promise.all([
      StudyPlan.deleteMany({ userId }),
      StudySession.deleteMany({ userId }),
      PracticeSession.deleteMany({ userId }),
      KnowledgeTopic.deleteMany({ userId }),
      KnowledgeEvent.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      NotificationPreference.deleteMany({ userId }),
      UserAchievement.deleteMany({ userId }),
      Conversation.deleteMany({ userId }),
      Message.deleteMany({ userId }),
      User.deleteOne({ _id: userId }),
    ]);
  }

  console.log('Creating demo user...');
  const now = new Date();
  const demoUser = await User.create({
    name: 'Alex Chen',
    email: demoEmail,
    password: 'DemoPassword123!',
    subjects: ['Computer Science', 'Mathematics', 'Physics'],
    goal: {
      type: 'exam',
      description: 'Prepare for Upcoming Computer Science & Calculus Midterms',
      targetDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
    dailyStudyMinutes: 60,
    streak: 5,
    lastStudyDate: now,
  });

  console.log(`Demo User created: ${demoUser.email} (ID: ${demoUser._id})`);

  // Notification Preferences
  await NotificationPreference.create({
    userId: demoUser._id,
    enabled: true,
    taskReminders: true,
    reviewRecommendations: true,
    practiceRecommendations: true,
    streakNotifications: true,
    achievementNotifications: true,
    studyPlanNotifications: true,
  });

  // Seed Practice Questions Pool
  console.log('Seeding question bank...');
  const sampleQuestions = [
    {
      subject: 'Computer Science',
      topic: 'Binary Search Trees',
      type: 'multiple_choice',
      question: 'What is the average time complexity for searching an element in a balanced Binary Search Tree?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      correctAnswer: 'O(log n)',
      explanation: 'In a balanced BST, each comparison eliminates half the remaining nodes, leading to logarithmic search time O(log n).',
      difficulty: 'medium',
      createdBy: 'system',
    },
    {
      subject: 'Computer Science',
      topic: 'Binary Search Trees',
      type: 'true_false',
      question: 'In an in-order traversal of a binary search tree, the node values are visited in ascending order.',
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'In-order traversal visits left subtree, root, then right subtree, producing values in non-decreasing sorted order.',
      difficulty: 'easy',
      createdBy: 'system',
    },
    {
      subject: 'Computer Science',
      topic: 'Dynamic Programming',
      type: 'multiple_choice',
      question: 'Which two key properties must a problem exhibit to be solved with Dynamic Programming?',
      options: [
        'Optimal substructure and overlapping subproblems',
        'Greedy choice and sorted inputs',
        'Divide-and-conquer and linear time complexity',
        'Memoization and randomized partitioning',
      ],
      correctAnswer: 'Optimal substructure and overlapping subproblems',
      explanation: 'Dynamic Programming applies when solutions to subproblems can be reused (overlapping subproblems) and form optimal global solutions (optimal substructure).',
      difficulty: 'hard',
      createdBy: 'system',
    },
    {
      subject: 'Mathematics',
      topic: 'Integration By Parts',
      type: 'multiple_choice',
      question: 'What is the formula for integration by parts?',
      options: [
        '∫ u dv = u*v - ∫ v du',
        '∫ u dv = u*v + ∫ v du',
        '∫ u dv = u\'*v - u*v\'',
        '∫ u dv = (u*v) / 2',
      ],
      correctAnswer: '∫ u dv = u*v - ∫ v du',
      explanation: 'Integration by parts is derived from the product rule of differentiation: ∫ u dv = uv - ∫ v du.',
      difficulty: 'medium',
      createdBy: 'system',
    },
    {
      subject: 'Mathematics',
      topic: 'Derivatives',
      type: 'short_answer',
      question: 'What is the derivative of f(x) = sin(x) with respect to x?',
      options: [],
      correctAnswer: 'cos(x)',
      explanation: 'The standard trigonometric derivative of sin(x) is cos(x).',
      difficulty: 'easy',
      createdBy: 'system',
    },
  ];

  const createdQuestions = [];
  for (const q of sampleQuestions) {
    let existing = await PracticeQuestion.findOne({
      subject: q.subject,
      topic: q.topic,
      question: q.question,
    });
    if (!existing) {
      existing = await PracticeQuestion.create(q);
    }
    createdQuestions.push(existing);
  }

  // Create 14-Day Study Plan
  console.log('Creating demo study plan...');
  const days = [];
  for (let i = 0; i < 14; i++) {
    const dayDate = new Date(now.getTime() + (i - 3) * 24 * 60 * 60 * 1000); // 3 days ago to 10 days ahead
    dayDate.setHours(0, 0, 0, 0);

    const isPast = i < 3;
    const isToday = i === 3;

    let tasks;
    if (i % 3 === 0) {
      tasks = [
        {
          title: 'Review Binary Search Tree properties and balanced rotations',
          subject: 'Computer Science',
          duration: 30,
          type: 'learning',
          completed: isPast || isToday,
        },
        {
          title: 'Solve tree traversal and recursion practice problems',
          subject: 'Computer Science',
          duration: 30,
          type: 'practice',
          completed: isPast,
        },
      ];
    } else if (i % 3 === 1) {
      tasks = [
        {
          title: 'Study integration by parts and substitution techniques',
          subject: 'Mathematics',
          duration: 35,
          type: 'learning',
          completed: isPast,
        },
        {
          title: 'Calculus practice quiz on definite integrals',
          subject: 'Mathematics',
          duration: 25,
          type: 'quiz',
          completed: isPast,
        },
      ];
    } else {
      tasks = [
        {
          title: 'Newtonian mechanics revision and free body diagrams',
          subject: 'Physics',
          duration: 30,
          type: 'revision',
          completed: isPast,
        },
        {
          title: 'Physics problem set on kinetic and potential energy',
          subject: 'Physics',
          duration: 30,
          type: 'practice',
          completed: isPast,
        },
      ];
    }

    days.push({
      dayNumber: i + 1,
      date: dayDate,
      focus: i % 3 === 0 ? 'Data Structures & Algorithms' : i % 3 === 1 ? 'Integral Calculus' : 'Classical Mechanics',
      tasks,
    });
  }

  const studyPlan = await StudyPlan.create({
    userId: demoUser._id,
    title: 'Midterm Mastery: Computer Science & Calculus',
    summary: 'A structured 14-day study roadmap combining core concept reviews, active problem solving, and targeted revisions.',
    goal: {
      type: 'exam',
      description: 'Prepare for Upcoming Computer Science & Calculus Midterms',
    },
    dailyMinutes: 60,
    startDate: days[0].date,
    endDate: days[days.length - 1].date,
    days,
    adaptation: {
      enabled: true,
      adaptationCount: 0,
      lastAdaptedAt: null,
    },
  });

  // Create Past Study Sessions
  console.log('Logging study sessions...');
  const pastDates = [3, 2, 1];
  for (const daysAgo of pastDates) {
    const sessionStart = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const sessionEnd = new Date(sessionStart.getTime() + 45 * 60 * 1000);
    const dayIndex = 3 - daysAgo;
    const taskObj = studyPlan.days[dayIndex].tasks[0];

    await StudySession.create({
      userId: demoUser._id,
      taskId: taskObj._id,
      planId: studyPlan._id,
      subject: taskObj.subject,
      durationMinutes: 45,
      startedAt: sessionStart,
      completedAt: sessionEnd,
    });
  }

  // Create Completed Practice Session
  console.log('Logging completed practice session...');
  const practiceQ1 = createdQuestions[0];
  const practiceQ2 = createdQuestions[1];

  await PracticeSession.create({
    userId: demoUser._id,
    subject: 'Computer Science',
    topic: 'Binary Search Trees',
    totalQuestions: 2,
    correctAnswers: 2,
    completed: true,
    startedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
    questions: [
      {
        questionId: practiceQ1._id,
        order: 1,
        answer: 'O(log n)',
        isCorrect: true,
        answeredAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 1000),
      },
      {
        questionId: practiceQ2._id,
        order: 2,
        answer: 'True',
        isCorrect: true,
        answeredAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000),
      },
    ],
  });

  // Create Knowledge Topics
  console.log('Seeding knowledge topics and learning map...');
  const topicBST = await KnowledgeTopic.create({
    userId: demoUser._id,
    subject: 'Computer Science',
    topic: 'Binary Search Trees',
    status: 'strong',
    confidence: 85,
    practiceCount: 4,
    successfulActivities: 4,
    lastPracticedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
  });

  const topicDP = await KnowledgeTopic.create({
    userId: demoUser._id,
    subject: 'Computer Science',
    topic: 'Dynamic Programming',
    status: 'needs_review',
    confidence: 35,
    practiceCount: 2,
    successfulActivities: 1,
    lastPracticedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
  });

  const topicCalc = await KnowledgeTopic.create({
    userId: demoUser._id,
    subject: 'Mathematics',
    topic: 'Derivatives',
    status: 'strong',
    confidence: 90,
    practiceCount: 3,
    successfulActivities: 3,
    lastPracticedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
  });

  const topicInt = await KnowledgeTopic.create({
    userId: demoUser._id,
    subject: 'Mathematics',
    topic: 'Integration By Parts',
    status: 'needs_review',
    confidence: 40,
    practiceCount: 2,
    successfulActivities: 1,
    lastPracticedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
  });

  const topicPhysics = await KnowledgeTopic.create({
    userId: demoUser._id,
    subject: 'Physics',
    topic: 'Newtonian Mechanics',
    status: 'learning',
    confidence: 60,
    practiceCount: 1,
    successfulActivities: 1,
    lastPracticedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
  });

  // Seed Knowledge Events
  await KnowledgeEvent.create([
    {
      userId: demoUser._id,
      topicId: topicBST._id,
      source: 'study_session',
      type: 'practice',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      userId: demoUser._id,
      topicId: topicBST._id,
      source: 'review',
      type: 'correct',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      userId: demoUser._id,
      topicId: topicDP._id,
      source: 'mentor',
      type: 'asked_help',
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      userId: demoUser._id,
      topicId: topicInt._id,
      source: 'review',
      type: 'incorrect',
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  ]);

  // Seed Achievements
  console.log('Seeding achievements...');
  await UserAchievement.create([
    {
      userId: demoUser._id,
      achievementKey: 'first_study_session',
      unlockedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      userId: demoUser._id,
      achievementKey: 'first_practice',
      unlockedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      userId: demoUser._id,
      achievementKey: '5_completed_tasks',
      unlockedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  ]);

  // Seed Mentor Conversation
  console.log('Seeding AI mentor conversation...');
  const conversation = await Conversation.create({
    userId: demoUser._id,
    title: 'Understanding Dynamic Programming',
    subject: 'Computer Science',
    updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
  });

  await Message.create([
    {
      conversationId: conversation._id,
      userId: demoUser._id,
      role: 'user',
      content: 'Can you help me understand when to use memoization versus tabulation in Dynamic Programming?',
      createdAt: new Date(now.getTime() - 65 * 60 * 1000),
    },
    {
      conversationId: conversation._id,
      userId: demoUser._id,
      role: 'assistant',
      content: `Here is a straightforward way to think about it:

1. **Memoization (Top-Down)**:
   - You start from the main problem and recursively break it into subproblems.
   - Whenever you compute a subproblem, you cache its answer.
   - **Best when**: You don't need to visit all possible subproblems.

2. **Tabulation (Bottom-Up)**:
   - You solve all base cases first and build up a table sequentially.
   - Avoids recursion overhead and stack overflow limits.
   - **Best when**: You need all subproblems solved in order.

Which specific problem are you working on right now? We can walk through it step by step!`,
      createdAt: new Date(now.getTime() - 64 * 60 * 1000),
    },
  ]);

  // Seed Notifications
  console.log('Seeding demo notifications...');
  await Notification.create([
    {
      userId: demoUser._id,
      type: 'streak',
      title: 'Study Streak Active! 🔥',
      message: "Nice work! You've completed your study session today and kept your 5-day streak alive!",
      link: '/dashboard',
      read: false,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      userId: demoUser._id,
      type: 'review_recommendation',
      title: 'Review Recommended',
      message: 'Dynamic Programming in Computer Science could use some extra practice.',
      link: '/practice?subject=Computer%20Science&topic=Dynamic%20Programming',
      read: false,
      createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
    },
    {
      userId: demoUser._id,
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: '5 Completed Tasks 🏆',
      link: '/profile',
      read: true,
      readAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
  ]);

  console.log('========================================');
  console.log('Demo Seed Completed Successfully!');
  console.log(`Demo Account Credentials:`);
  console.log(`Email:    ${demoEmail}`);
  console.log(`Password: DemoPassword123!`);
  console.log('========================================');

  await mongoose.disconnect();
  process.exit(0);
}

seedDemoData().catch((err) => {
  console.error('Demo seed error:', err);
  process.exit(1);
});
