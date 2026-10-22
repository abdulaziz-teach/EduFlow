import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import connectDB, { disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import FlashcardDeck from '../models/FlashcardDeck.js';
import Flashcard from '../models/Flashcard.js';
import Achievement from '../models/Achievement.js';
import ShopItem from '../models/ShopItem.js';
import Wallet from '../models/Wallet.js';

export async function seedProduction() {
  console.log('🌱 Seeding production development database...');
  await connectDB();

  try {
    const salt = await bcrypt.genSalt(12);
    const commonPasswordHash = await bcrypt.hash('Password123!', salt);

    // 1. Seed Admin User
    let adminUser = await User.findOne({ email: 'admin@eduflow.test' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'System Admin',
        displayName: 'System Admin',
        email: 'admin@eduflow.test',
        password: commonPasswordHash,
        passwordHash: commonPasswordHash,
        role: 'admin',
        status: 'active',
        emailVerified: true,
      });
      console.log(`Created admin user: ${adminUser.email}`);
    }

    // 2. Seed Student User
    let studentUser = await User.findOne({ email: 'student@eduflow.test' });
    if (!studentUser) {
      studentUser = await User.create({
        name: 'Alex Student',
        displayName: 'Alex Student',
        email: 'student@eduflow.test',
        password: commonPasswordHash,
        passwordHash: commonPasswordHash,
        role: 'user',
        status: 'active',
        emailVerified: true,
      });
      console.log(`Created student user: ${studentUser.email}`);
    }

    // Ensure wallets
    await Wallet.findOneAndUpdate(
      { userId: adminUser._id },
      { $setOnInsert: { userId: adminUser._id, coins: 5000, gems: 500, tickets: 50 } },
      { upsert: true }
    );
    await Wallet.findOneAndUpdate(
      { userId: studentUser._id },
      { $setOnInsert: { userId: studentUser._id, coins: 250, gems: 20, tickets: 10 } },
      { upsert: true }
    );

    // 3. Seed Course
    let course = await Course.findOne({ slug: 'modern-web-development' });
    if (!course) {
      course = await Course.create({
        title: 'Modern Full-Stack Web Development',
        slug: 'modern-web-development',
        description: 'Master frontend, backend, and cloud architectures with practical industry projects.',
        category: 'Computer Science',
        level: 'intermediate',
        language: 'en',
        status: 'published',
        instructorId: adminUser._id,
        tags: ['web', 'javascript', 'react', 'node', 'mongodb'],
        publishedAt: new Date(),
      });
      console.log(`Created course: ${course.title}`);
    }

    // 4. Seed Lessons
    const lessonsData = [
      {
        courseId: course._id,
        title: 'Introduction to Web Architecture',
        slug: 'intro-web-architecture',
        description: 'Understand clients, servers, protocols, and database fundamentals.',
        content: '# Architecture Overview\nIn this lesson, we explore how modern web clients communicate with APIs.',
        order: 1,
        duration: 900,
        isPublished: true,
      },
      {
        courseId: course._id,
        title: 'Building Scalable RESTful APIs',
        slug: 'building-restful-apis',
        description: 'Design robust APIs with proper status codes, validation, and middleware.',
        content: '# REST API Design\nLearn HTTP verbs, status codes, and clean request validation.',
        order: 2,
        duration: 1200,
        isPublished: true,
      },
      {
        courseId: course._id,
        title: 'Database Design & MongoDB Indexes',
        slug: 'database-design-indexes',
        description: 'Optimize collections, compound indexes, and queries.',
        content: '# MongoDB Indexing\nExplore single field, compound, and TTL index strategies.',
        order: 3,
        duration: 1500,
        isPublished: true,
      },
    ];

    for (const lData of lessonsData) {
      await Lesson.findOneAndUpdate(
        { courseId: course._id, slug: lData.slug },
        { $setOnInsert: lData },
        { upsert: true }
      );
    }
    console.log('Seeded course lessons.');

    // 5. Seed Quiz
    const firstLesson = await Lesson.findOne({ courseId: course._id, order: 1 });
    if (firstLesson) {
      const existingQuiz = await Quiz.findOne({ lessonId: firstLesson._id });
      if (!existingQuiz) {
        await Quiz.create({
          lessonId: firstLesson._id,
          title: 'Web Architecture Knowledge Check',
          description: 'Verify your understanding of HTTP protocols, APIs, and client-server models.',
          passingScore: 70,
          timeLimit: 15,
          status: 'published',
          questions: [
            {
              question: 'Which HTTP method is idempotent and used for full resource updates?',
              options: ['POST', 'PUT', 'PATCH', 'DELETE'],
              correctAnswer: 'PUT',
              explanation: 'PUT replaces the target resource entirely and multiple identical requests yield the same state.',
              points: 1,
            },
            {
              question: 'Which header prevents clickjacking attacks in modern browsers?',
              options: ['Content-Type', 'X-Frame-Options', 'Authorization', 'Accept'],
              correctAnswer: 'X-Frame-Options',
              explanation: 'X-Frame-Options (or CSP frame-ancestors) prevents the page from being embedded in iframes.',
              points: 1,
            },
            {
              question: 'What is the purpose of a compound index in MongoDB?',
              options: [
                'To automatically encrypt fields',
                'To index multiple fields together for compound query conditions and sorting',
                'To compress documents',
                'To store binary media',
              ],
              correctAnswer: 'To index multiple fields together for compound query conditions and sorting',
              explanation: 'Compound indexes accelerate queries filtering or sorting across multiple document attributes.',
              points: 1,
            },
          ],
        });
        console.log('Seeded lesson quiz.');
      }
    }

    // 6. Seed Flashcards
    let deck = await FlashcardDeck.findOne({ title: 'System Design Flashcards' });
    if (!deck) {
      deck = await FlashcardDeck.create({
        userId: adminUser._id,
        title: 'System Design Flashcards',
        description: 'Core concepts for distributed databases, caching, and scalability.',
        subject: 'Computer Science',
        tags: ['system-design', 'databases', 'backend'],
        isPublic: true,
        cards: [
          {
            front: 'What is the CAP theorem?',
            back: 'A distributed system can guarantee at most two out of Consistency, Availability, and Partition Tolerance.',
            hint: 'Consistency, Availability, Partitioning',
          },
          {
            front: 'What is write-through caching?',
            back: 'Data is written into the cache and corresponding database simultaneously.',
            hint: 'Synchronous cache + DB write',
          },
        ],
      });
      console.log('Seeded flashcard deck.');

      // Also create normalized Flashcards
      await Flashcard.create({
        deckId: deck._id,
        front: 'What is the CAP theorem?',
        back: 'A distributed system can guarantee at most two out of Consistency, Availability, and Partition Tolerance.',
        hint: 'Consistency, Availability, Partitioning',
        difficulty: 'medium',
      });
      await Flashcard.create({
        deckId: deck._id,
        front: 'What is write-through caching?',
        back: 'Data is written into the cache and corresponding database simultaneously.',
        hint: 'Synchronous cache + DB write',
        difficulty: 'easy',
      });
    }

    // 7. Seed Achievements
    const achievementsData = [
      {
        name: 'First Study Session',
        description: 'Complete your very first focused study session.',
        icon: 'clock',
        conditionType: 'study_session',
        conditionValue: 1,
        reward: { currency: 'coins', amount: 50 },
        active: true,
      },
      {
        name: 'Practice Master',
        description: 'Answer 10 practice questions correctly.',
        icon: 'brain',
        conditionType: 'practice_questions',
        conditionValue: 10,
        reward: { currency: 'coins', amount: 100 },
        active: true,
      },
      {
        name: '7-Day Streak',
        description: 'Maintain a study streak for 7 consecutive days.',
        icon: 'flame',
        conditionType: 'streak',
        conditionValue: 7,
        reward: { currency: 'gems', amount: 25 },
        active: true,
      },
    ];

    for (const ach of achievementsData) {
      await Achievement.findOneAndUpdate(
        { name: ach.name },
        { $setOnInsert: ach },
        { upsert: true }
      );
    }
    console.log('Seeded achievements.');

    // 8. Seed Shop Items
    const shopItemsData = [
      {
        name: 'Golden Scholar Frame',
        description: 'An exclusive golden profile avatar frame for top performers.',
        type: 'avatar_frame',
        price: 150,
        currency: 'coins',
        stock: -1,
        active: true,
      },
      {
        name: 'Streak Freeze Shield',
        description: 'Protects your active study streak for one missed day.',
        type: 'streak_freeze',
        price: 50,
        currency: 'coins',
        stock: 500,
        active: true,
      },
      {
        name: 'AI Hint Pack (5 Hints)',
        description: 'Unlocks 5 in-depth AI guided hints during practice exams.',
        type: 'hint_pack',
        price: 10,
        currency: 'gems',
        stock: -1,
        active: true,
      },
    ];

    for (const item of shopItemsData) {
      await ShopItem.findOneAndUpdate(
        { name: item.name },
        { $setOnInsert: item },
        { upsert: true }
      );
    }
    console.log('Seeded shop items.');

    console.log('🎉 Production development seed completed successfully!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await disconnectDB();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedProduction();
}

export default seedProduction;
