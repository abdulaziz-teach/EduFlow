/**
 * Curriculum Taxonomy & Prerequisite Relationships
 */
export const CURRICULUM_TAXONOMY = {
  Mathematics: {
    Fractions: { prerequisites: [], description: 'Foundations of numerator, denominator, and fractional arithmetic.' },
    Algebra: { prerequisites: ['Fractions'], description: 'Working with variables, algebraic expressions, and simplification.' },
    Equations: { prerequisites: ['Algebra'], description: 'Solving linear, quadratic, and simultaneous equations.' },
    Functions: { prerequisites: ['Equations'], description: 'Domain, range, function notation, and graphing.' },
    Derivatives: { prerequisites: ['Functions'], description: 'Limits, rate of change, power rule, and differential calculus.' },
    Integrals: { prerequisites: ['Derivatives'], description: 'Definite and indefinite integrals, area under curves.' },
    Geometry: { prerequisites: ['Equations'], description: 'Angles, shapes, theorems, and area calculations.' },
    Trigonometry: { prerequisites: ['Geometry'], description: 'Sin, cos, tan, unit circle, and trigonometric identities.' },
    Probability: { prerequisites: ['Algebra'], description: 'Random variables, permutations, and combinatorics.' },
    Stereometry: { prerequisites: ['Geometry'], description: 'Spatial shapes, cylinders, spheres, and 3D volumes.' },
  },
  'Computer Science': {
    'Variables & Types': { prerequisites: [], description: 'Primitive types, memory allocation, and value assignment.' },
    'Control Flow': { prerequisites: ['Variables & Types'], description: 'Conditionals, loops, and branching logic.' },
    'Functions & Scope': { prerequisites: ['Control Flow'], description: 'Parameters, return values, call stack, and variable scope.' },
    'Data Structures': { prerequisites: ['Functions & Scope'], description: 'Arrays, linked lists, stacks, queues, and hash maps.' },
    Algorithms: { prerequisites: ['Data Structures'], description: 'Searching, sorting, recursion, and time complexity analysis.' },
    'JavaScript Basics': { prerequisites: ['Variables & Types'], description: 'Syntax, operators, arrays, and objects in JS.' },
    'Python Programming': { prerequisites: ['Control Flow'], description: 'Python idioms, list comprehensions, and scripts.' },
    'React & Web': { prerequisites: ['JavaScript Basics'], description: 'Components, state, props, and modern frontend.' },
    'SQL & Databases': { prerequisites: ['Data Structures'], description: 'Relational tables, joins, indexes, and queries.' },
    Cybersecurity: { prerequisites: ['Algorithms'], description: 'Encryption, auth, network safety, and vulnerability hygiene.' },
  },
  English: {
    'Grammar & Tenses': { prerequisites: [], description: 'Present, past, future tenses and sentence mechanics.' },
    'Articles & Prepositions': { prerequisites: ['Grammar & Tenses'], description: 'Definite/indefinite articles and positional prepositions.' },
    Conditionals: { prerequisites: ['Grammar & Tenses'], description: 'Zero, first, second, and third conditional structures.' },
    'Passive Voice': { prerequisites: ['Grammar & Tenses'], description: 'Agent omission, active-to-passive conversions.' },
    'Phrasal Verbs': { prerequisites: ['Grammar & Tenses'], description: 'Multi-word verbs and contextual idiomatic usages.' },
    'Vocabulary & IELTS': { prerequisites: ['Grammar & Tenses'], description: 'Academic word lists and lexical resource.' },
    'Reading Comprehension': { prerequisites: ['Vocabulary & IELTS'], description: 'Skimming, scanning, and main idea extraction.' },
    'Writing Skills': { prerequisites: ['Grammar & Tenses', 'Vocabulary & IELTS'], description: 'Paragraph coherence, essays, and task responses.' },
    'Listening Skills': { prerequisites: ['Vocabulary & IELTS'], description: 'Auditory processing, accents, and dialogue comprehension.' },
    'Idioms & Collocations': { prerequisites: ['Vocabulary & IELTS'], description: 'Native figurative speech and conversational fluency.' },
  },
  Physics: {
    Kinematics: { prerequisites: [], description: 'Velocity, acceleration, displacement, and motion graphs.' },
    'Newton Laws': { prerequisites: ['Kinematics'], description: 'Inertia, force equals mass times acceleration, action-reaction.' },
    'Energy & Momentum': { prerequisites: ['Newton Laws'], description: 'Work-energy theorem, kinetic energy, conservation laws.' },
    Gravity: { prerequisites: ['Newton Laws'], description: 'Universal gravitation, free fall, and orbital speed.' },
    Thermodynamics: { prerequisites: ['Energy & Momentum'], description: 'Heat, temperature, gas laws, and thermal cycles.' },
    'Electric Circuits': { prerequisites: ['Energy & Momentum'], description: 'Ohm law, current, voltage, resistance, and Kirchoff laws.' },
    Electromagnetism: { prerequisites: ['Electric Circuits'], description: 'Magnetic fields, induction, and Faraday law.' },
    Optics: { prerequisites: ['Energy & Momentum'], description: 'Reflection, refraction, lenses, and wave-particle nature.' },
    'Oscillations & Waves': { prerequisites: ['Newton Laws'], description: 'Pendulums, frequency, wavelength, and resonance.' },
    'Nuclear Physics': { prerequisites: ['Energy & Momentum'], description: 'Atoms, radioactivity, isotopes, and fission/fusion.' },
  },
  Chemistry: {
    'Atomic Structure': { prerequisites: [], description: 'Protons, neutrons, electrons, and energy levels.' },
    'Periodic Table': { prerequisites: ['Atomic Structure'], description: 'Groups, periods, electronegativity, and periodic trends.' },
    'Chemical Bonds': { prerequisites: ['Atomic Structure'], description: 'Covalent, ionic, metallic, and hydrogen bonding.' },
    'Acids & Bases': { prerequisites: ['Chemical Bonds'], description: 'pH scale, neutralization, titration, and indicator colors.' },
    'Solutions & Concentration': { prerequisites: ['Chemical Bonds'], description: 'Molarity, solubility curves, and dilution formulas.' },
    'Redox Reactions': { prerequisites: ['Chemical Bonds'], description: 'Oxidation numbers, electron transfer, and galvanic cells.' },
    'Reaction Rates': { prerequisites: ['Chemical Bonds'], description: 'Collision theory, activation energy, and catalysts.' },
    'Equilibrium & Le Chatelier': { prerequisites: ['Reaction Rates'], description: 'Dynamic equilibrium and equilibrium constant (Kc).' },
    'Organic Chemistry': { prerequisites: ['Chemical Bonds'], description: 'Alkanes, alkenes, functional groups, and isomerism.' },
    Polymers: { prerequisites: ['Organic Chemistry'], description: 'Monomers, polymerisation, and biochemical polymers.' },
  },
  Biology: {
    'Cell Structure': { prerequisites: [], description: 'Organelles, cell membranes, and eukaryotic/prokaryotic cells.' },
    Photosynthesis: { prerequisites: ['Cell Structure'], description: 'Chloroplasts, light-dependent reactions, and Calvin cycle.' },
    Genetics: { prerequisites: ['Cell Structure'], description: 'DNA, RNA, Mendelian inheritance, and gene expression.' },
    'Cell Respiration': { prerequisites: ['Cell Structure'], description: 'Glycolysis, Krebs cycle, and ATP synthesis.' },
    'Human Anatomy': { prerequisites: ['Cell Structure'], description: 'Circulatory, digestive, and nervous organ systems.' },
    'Plant Physiology': { prerequisites: ['Photosynthesis'], description: 'Xylem, phloem, transpiration, and plant hormones.' },
    'Immune System': { prerequisites: ['Cell Structure'], description: 'Antigens, antibodies, white blood cells, and vaccines.' },
    Evolution: { prerequisites: ['Genetics'], description: 'Natural selection, adaptation, and fossil records.' },
    Ecology: { prerequisites: ['Cell Structure'], description: 'Food webs, nutrient cycles, biomes, and conservation.' },
    Biotechnology: { prerequisites: ['Genetics'], description: 'CRISPR, recombinant DNA, cloning, and PCR.' },
  },
  History: {
    'Ancient Civilizations': { prerequisites: [], description: 'Mesopotamia, Egypt, Greece, Rome, and Silk Road origins.' },
    'Great Silk Road': { prerequisites: ['Ancient Civilizations'], description: 'Trade networks connecting East Asia, Central Asia, and Europe.' },
    'Era of Amir Temur': { prerequisites: ['Great Silk Road'], description: 'Centralized governance, military campaigns, and culture.' },
    'Timurid Renaissance': { prerequisites: ['Era of Amir Temur'], description: 'Ulugbek observatory, literature of Navoiy, and science.' },
    'The Renaissance': { prerequisites: ['Ancient Civilizations'], description: 'Humanism, arts, exploration, and scientific revolution.' },
    'Industrial Revolution': { prerequisites: ['The Renaissance'], description: 'Steam engines, factory production, and urbanisation.' },
    'Jadid Movement': { prerequisites: ['Industrial Revolution'], description: 'Enlightenment, modern schools, and press in Turkestan.' },
    'World War I': { prerequisites: ['Industrial Revolution'], description: 'Alliances, trench warfare, and post-war treaties.' },
    'World War II': { prerequisites: ['World War I'], description: 'Global frontlines, defeat of fascism, and aftermath.' },
    'Modern Uzbekistan & UN': { prerequisites: ['World War II'], description: 'Declaration of independence, Constitution, and international role.' },
  },
  Economics: {
    'Microeconomics Basics': { prerequisites: [], description: 'Scarcity, choice, opportunity cost, and consumer utility.' },
    'Supply and Demand': { prerequisites: ['Microeconomics Basics'], description: 'Equilibrium price, shortages, and elasticity.' },
    'Macroeconomics & GDP': { prerequisites: ['Supply and Demand'], description: 'Gross Domestic Product, aggregate output, and economic growth.' },
    'Inflation & Purchasing Power': { prerequisites: ['Macroeconomics & GDP'], description: 'CPI index, price levels, and cost of living.' },
    'Banking & Interest Rates': { prerequisites: ['Inflation & Purchasing Power'], description: 'Central banks, money supply, credit, and monetary policy.' },
    'Fiscal Policy & Taxation': { prerequisites: ['Macroeconomics & GDP'], description: 'Government expenditure, budget deficits, and tax structures.' },
    'International Trade': { prerequisites: ['Supply and Demand'], description: 'Comparative advantage, tariffs, and exchange rates.' },
    'Financial Literacy': { prerequisites: ['Microeconomics Basics'], description: 'Budgeting, compound interest, savings, and debt management.' },
    'Investments & Stock Market': { prerequisites: ['Financial Literacy'], description: 'Stocks, bonds, diversification, and risk-return profile.' },
    'Entrepreneurship & Startups': { prerequisites: ['Microeconomics Basics'], description: 'Business plans, revenue models, scaling, and market validation.' },
  },
};

/**
 * Clean and normalize a topic name string
 */
export function normalizeTopicName(topic) {
  if (!topic || typeof topic !== 'string') return 'General';
  return topic
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase()); // Title Case
}

/**
 * Get prerequisites defined for a given topic and subject
 */
export function getPrerequisitesForTopic(topicName, subject = '') {
  const normTopic = normalizeTopicName(topicName);
  const normSubject = subject ? normalizeTopicName(subject) : '';

  // 1. Direct match in subject taxonomy
  if (normSubject && CURRICULUM_TAXONOMY[normSubject]?.[normTopic]) {
    return CURRICULUM_TAXONOMY[normSubject][normTopic].prerequisites;
  }

  // 2. Search all subjects
  for (const s of Object.keys(CURRICULUM_TAXONOMY)) {
    if (CURRICULUM_TAXONOMY[s][normTopic]) {
      return CURRICULUM_TAXONOMY[s][normTopic].prerequisites;
    }
  }

  return [];
}

/**
 * Extract associated topics from course, lesson, quiz, or text
 */
export function extractTopicsFromContent({ lesson, course, quiz, flashcard, topic, subject }) {
  const extracted = new Set();

  if (topic) {
    extracted.add(normalizeTopicName(topic));
  }

  if (lesson) {
    if (Array.isArray(lesson.topics) && lesson.topics.length > 0) {
      lesson.topics.forEach((t) => extracted.add(normalizeTopicName(t)));
    } else if (lesson.title) {
      extracted.add(normalizeTopicName(lesson.title));
    }
  }

  if (course) {
    if (Array.isArray(course.topics) && course.topics.length > 0) {
      course.topics.forEach((t) => extracted.add(normalizeTopicName(t)));
    }
  }

  if (quiz) {
    if (quiz.title) {
      extracted.add(normalizeTopicName(quiz.title.replace(/quiz/i, '').trim() || 'Quiz Concepts'));
    }
  }

  if (flashcard) {
    if (Array.isArray(flashcard.tags)) {
      flashcard.tags.forEach((tag) => extracted.add(normalizeTopicName(tag)));
    }
  }

  if (extracted.size === 0) {
    extracted.add(normalizeTopicName(subject || 'General'));
  }

  return Array.from(extracted);
}

export default {
  CURRICULUM_TAXONOMY,
  normalizeTopicName,
  getPrerequisitesForTopic,
  extractTopicsFromContent,
};
