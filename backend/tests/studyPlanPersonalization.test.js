import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRuleBasedPlan } from '../src/services/studyPlanService.js';

const profile = (overrides = {}) => ({
  _id: 'profile-id',
  age: 30,
  subjects: ['Mathematics', 'Biology'],
  goal: { type: 'exam', description: 'Prepare for exams' },
  dailyStudyMinutes: 90,
  level: 'intermediate',
  weakTopics: ['Algebra'],
  studySchedule: { preferredDays: ['wednesday', 'friday'], preferredTime: 'evening' },
  preferredLanguage: 'en',
  ...overrides,
});

describe('Rule-based study plan personalization', () => {
  it('caps younger learners at short sessions and a modest daily workload', () => {
    const plan = buildRuleBasedPlan(profile({ age: 10, dailyStudyMinutes: 120 }), {
      startDate: '2026-10-21T00:00:00.000Z',
    });
    const durations = plan.days[0].tasks.map((task) => task.duration);

    assert.ok(durations.every((duration) => duration <= 15));
    assert.ok(durations.reduce((sum, duration) => sum + duration, 0) <= 60);
    assert.equal(plan.breakMinutes, 5);
    assert.match(plan.summary, /rule-based/);
    assert.match(plan.days[0].tasks[0].title, /Algebra/);
  });

  it('uses the learner level while keeping teenager study blocks age-appropriate', () => {
    const plan = buildRuleBasedPlan(profile({
      age: 16,
      dailyStudyMinutes: 45,
      level: 'beginner',
      preferredLanguage: 'ru',
    }), { startDate: '2026-10-21T00:00:00.000Z' });

    assert.ok(plan.days[0].tasks.every((task) => task.duration <= 25));
    assert.ok(plan.days[0].tasks.reduce((sum, task) => sum + task.duration, 0) <= 45);
    assert.match(plan.summary, /начальный/);
    assert.match(plan.days[0].tasks[0].title, /начальный/);
  });

  it('respects an adult daily study-time limit and selected study days', () => {
    const plan = buildRuleBasedPlan(profile({
      age: 35,
      dailyStudyMinutes: 30,
      studySchedule: { preferredDays: ['friday'] },
    }), { startDate: '2026-10-21T00:00:00.000Z' });

    assert.ok(plan.days.length > 0);
    assert.ok(plan.days.every((day) => day.date.getUTCDay() === 5));
    assert.ok(plan.days.every((day) =>
      day.tasks.reduce((sum, task) => sum + task.duration, 0) <= 30
    ));
  });

  it('uses conservative defaults for legacy profiles without age or deadline', () => {
    const plan = buildRuleBasedPlan(profile({ age: null, goal: { type: 'learn' } }), {
      startDate: '2026-10-21T00:00:00.000Z',
    });

    assert.ok(plan.days.length > 0);
    assert.ok(plan.days.every((day) => day.tasks.every((task) => task.duration <= 40)));
    assert.ok(plan.days.every((day) =>
      day.tasks.reduce((sum, task) => sum + task.duration, 0) <= 90
    ));
    assert.match(plan.summary, /for learn/);
  });

  it('rejects incomplete profiles and invalid age values', () => {
    assert.throws(
      () => buildRuleBasedPlan(profile({ subjects: [] })),
      { message: 'STUDY_PROFILE_INCOMPLETE' }
    );
    assert.throws(
      () => buildRuleBasedPlan(profile({ subjects: ['   '] })),
      { message: 'STUDY_PROFILE_INCOMPLETE' }
    );
    assert.throws(
      () => buildRuleBasedPlan(profile({ age: 4 })),
      { message: 'INVALID_AGE' }
    );
  });
});
