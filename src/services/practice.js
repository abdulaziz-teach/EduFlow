import api from './api.js';
import { PRACTICE_QUESTIONS, SUBJECTS_CONFIG, getLocalizedQuestion } from '../data/practicePool.js';

const LOCAL_STORAGE_KEY = 'eduflow_practice_sessions';

export const SUBJECT_ALIASES = {
  // English
  'english': 'English',
  'ingliz tili': 'English',
  'ingliz': 'English',
  'английский': 'English',
  'английский язык': 'English',

  // Mathematics
  'mathematics': 'Mathematics',
  'matematika': 'Mathematics',
  'математика': 'Mathematics',
  'math': 'Mathematics',

  // Computer Science
  'computer science': 'Computer Science',
  'informatika': 'Computer Science',
  'informatika va dasturlash': 'Computer Science',
  'информатика': 'Computer Science',

  // Physics
  'physics': 'Physics',
  'fizika': 'Physics',
  'физика': 'Physics',

  // Chemistry
  'chemistry': 'Chemistry',
  'kimyo': 'Chemistry',
  'химия': 'Chemistry',

  // Biology
  'biology': 'Biology',
  'biologiya': 'Biology',
  'биология': 'Biology',

  // History
  'history': 'History',
  'tarix': 'History',
  'история': 'History',

  // Economics
  'economics': 'Economics',
  'iqtisodiyot': 'Economics',
  'экономика': 'Economics',

  // Geography
  'geography': 'Geography',
  'geografiya': 'Geography',
  'география': 'Geography',
};

export function normalizeSubjectKey(subj) {
  if (!subj) return 'Mathematics';
  const clean = String(subj).trim().toLowerCase();
  return SUBJECT_ALIASES[clean] || subj;
}

function getStoredSessions() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Could not read practice sessions from localStorage:', err.message);
    return [];
  }
}

function saveStoredSessions(sessions) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Could not save practice sessions to localStorage:', err.message);
  }
}

const DYNAMIC_BANK = {
  Mathematics: [
    {
      uz: { q: 'Agar 3x + 15 = 45 bo‘lsa, x ning qiymati nechaga teng?', opts: ['10', '15', '5', '12'], a: '10', exp: '3x = 45 - 15 = 30; x = 30 / 3 = 10.' },
      ru: { q: 'Решите уравнение: 3x + 15 = 45. Чему равен x?', opts: ['10', '15', '5', '12'], a: '10', exp: '3x = 30, следовательно x = 10.' },
      en: { q: 'Solve for x: 3x + 15 = 45. What is x?', opts: ['10', '15', '5', '12'], a: '10', exp: '3x = 30, therefore x = 10.' },
    },
    {
      uz: { q: 'Sonning 25 foizi 50 ga teng bo‘lsa, bu sonning o‘zi nechaga teng?', opts: ['200', '150', '100', '250'], a: '200', exp: 'x ning 25% i 50 bo‘lsa: x = 50 / 0.25 = 200.' },
      ru: { q: 'Если 25% числа равны 50, то чему равно само число?', opts: ['200', '150', '100', '250'], a: '200', exp: 'Число = 50 / 0.25 = 200.' },
      en: { q: 'If 25% of a number is 50, what is the number?', opts: ['200', '150', '100', '250'], a: '200', exp: 'Number = 50 / 0.25 = 200.' },
    },
    {
      uz: { q: 'Doiraning radiusi 7 sm bo‘lsa, uning diametri necha sm bo‘ladi?', opts: ['14 sm', '21 sm', '49 sm', '7 sm'], a: '14 sm', exp: 'Doira diametri: d = 2 * r = 2 * 7 = 14 sm.' },
      ru: { q: 'Радиус круга равен 7 см. Чему равен его диаметр?', opts: ['14 см', '21 см', '49 см', '7 см'], a: '14 см', exp: 'Диаметр d = 2 * r = 14 см.' },
      en: { q: 'If the radius of a circle is 7 cm, what is its diameter?', opts: ['14 cm', '21 cm', '49 cm', '7 cm'], a: '14 cm', exp: 'Diameter d = 2 * r = 14 cm.' },
    },
    {
      uz: { q: 'f(x) = x³ + 4x funksiyaning hosilasi f\'(x) qanday bo‘ladi?', opts: ['3x² + 4', '3x² + 4x', 'x² + 4', '3x³ + 4'], a: '3x² + 4', exp: '(xⁿ)\' = n*xⁿ⁻¹ qoidasiga ko‘ra: (x³)\' = 3x² va (4x)\' = 4.' },
      ru: { q: 'Найдите производную функции f(x) = x³ + 4x:', opts: ['3x² + 4', '3x² + 4x', 'x² + 4', '3x³ + 4'], a: '3x² + 4', exp: 'По формуле степенной функции: (x³)\' = 3x² и (4x)\' = 4.' },
      en: { q: 'Find the derivative of f(x) = x³ + 4x:', opts: ['3x² + 4', '3x² + 4x', 'x² + 4', '3x³ + 4'], a: '3x² + 4', exp: 'Using the power rule: (x³)\' = 3x² and (4x)\' = 4.' },
    },
    {
      uz: { q: 'Hisoblang: (15 * 4) - (8 * 5) = ?', opts: ['20', '25', '15', '30'], a: '20', exp: '15 * 4 = 60, 8 * 5 = 40, 60 - 40 = 20.' },
      ru: { q: 'Вычислите: (15 * 4) - (8 * 5) = ?', opts: ['20', '25', '15', '30'], a: '20', exp: '60 - 40 = 20.' },
      en: { q: 'Calculate: (15 * 4) - (8 * 5) = ?', opts: ['20', '25', '15', '30'], a: '20', exp: '60 - 40 = 20.' },
    },
  ],
  Geography: [
    {
      uz: { q: 'Yer sharidagi eng katta quruqlik (materik) qaysi?', opts: ['Yevroosiyo', 'Afrika', 'Shimoliy Amerika', 'Antarktida'], a: 'Yevroosiyo', exp: 'Yevroosiyo yer yuzidagi eng katta materik bo‘lib, Yevropa va Osiyo qit\'alarini o‘z ichiga oladi.' },
      ru: { q: 'Какой материк на Земле является самым большим по площади?', opts: ['Евразия', 'Африка', 'Северная Америка', 'Антарктида'], a: 'Евразия', exp: 'Евразия — крупнейший континент на Земле.' },
      en: { q: 'Which continent is the largest by land area?', opts: ['Eurasia', 'Africa', 'North America', 'Antarctica'], a: 'Eurasia', exp: 'Eurasia is the largest continent on Earth.' },
    },
    {
      uz: { q: 'O‘zbekiston hududining katta qismini (taxminan 78-80%) qanday relyef shakli egallaydi?', opts: ['Tekisliklar va cho‘llar', 'Baland qorli tog‘lar', 'Botqoqliklar', 'Chuqur vodiylar'], a: 'Tekisliklar va cho‘llar', exp: 'O‘zbekistonning katta qismini Qizilqum kabi keng tekislik va cho‘l mintaqalari tashkil etadi.' },
      ru: { q: 'Какой тип рельефа занимает большую часть территории Узбекистана (около 80%)?', opts: ['Равнины и пустыни', 'Высокогорья', 'Болота', 'Глубокие каньоны'], a: 'Равнины и пустыни', exp: 'Около 80% территории Узбекистана занимают равнины и пустыни (Кызылкум).' },
      en: { q: 'What landform covers the vast majority (about 80%) of Uzbekistan\'s territory?', opts: ['Plains and deserts', 'Alpine mountains', 'Wetlands', 'Deep canyons'], a: 'Plains and deserts', exp: 'Plains and arid desert regions (such as Kyzylkum) account for nearly 80% of Uzbekistan.' },
    },
    {
      uz: { q: 'Dunyoning eng katta ko‘li (ichki berk havzasi) qaysi?', opts: ['Kaspiy dengizi', 'Baykal ko‘li', 'Viktoriya ko‘li', 'Yuqori ko‘l'], a: 'Kaspiy dengizi', exp: 'Kaspiy dengizi maydoni (371 ming km²) bo‘yicha dunyodagi eng ulkan oqmas ko‘l hisoblanadi.' },
      ru: { q: 'Какое озеро является самым большим по площади в мире?', opts: ['Каспийское море', 'Байкал', 'Виктория', 'Верхнее озеро'], a: 'Каспийское море', exp: 'Каспийское море — крупнейший на Земле замкнутый водоем.' },
      en: { q: 'Which body of water is the largest enclosed lake on Earth by surface area?', opts: ['Caspian Sea', 'Lake Baikal', 'Lake Victoria', 'Lake Superior'], a: 'Caspian Sea', exp: 'The Caspian Sea is the world\'s largest enclosed inland body of water.' },
    },
    {
      uz: { q: 'Afrikadagi eng uzun va dunyodagi eng mashhur daryolardan biri qaysi?', opts: ['Nil daryosi', 'Amazonka', 'Dunko', 'Yanszi'], a: 'Nil daryosi', exp: 'Nil daryosi Afrikaning shimoli-sharqidan oqib o‘tuvchi 6650 km uzunlikdagi daryodir.' },
      ru: { q: 'Какая река является самой длинной в Африке?', opts: ['Нил', 'Амазонка', 'Конго', 'Янцзы'], a: 'Нил', exp: 'Нил — величайшая река Африки длиной около 6650 км.' },
      en: { q: 'Which is the longest river in Africa?', opts: ['Nile River', 'Amazon River', 'Congo River', 'Yangtze River'], a: 'Nile River', exp: 'The Nile is the longest river in Africa, flowing northward through northeastern Africa.' },
    },
    {
      uz: { q: 'Xaritada joyning haqiqiy masofasi necha marta kichraytirilganini ko‘rsatuvchi son nima deyiladi?', opts: ['Masshtab', 'Gorizontal', 'Meridian', 'Paralell'], a: 'Masshtab', exp: 'Masshtab yer yuzidagi masofaning xaritadagi tasvirda necha marta kichraytirilganini bildiradi.' },
      ru: { q: 'Как называется отношение длины линии на карте к реальному расстоянию на местности?', opts: ['Масштаб', 'Меридиан', 'Параллель', 'Изогипса'], a: 'Масштаб', exp: 'Масштаб показывает, во сколько раз расстояние на карте уменьшено по сравнению с местностью.' },
      en: { q: 'What term defines the ratio of a distance on a map to the corresponding distance on the ground?', opts: ['Scale', 'Meridian', 'Parallel', 'Contour'], a: 'Scale', exp: 'A map scale represents the proportional ratio of map distance to ground distance.' },
    },
  ],
  English: [
    {
      uz: { q: 'To‘g‘ri gapni tanlang:', opts: ['She doesn\'t like cold weather.', 'She don\'t likes cold weather.', 'She not like cold weather.', 'She isn\'t likes cold weather.'], a: 'She doesn\'t like cold weather.', exp: 'Present Simple inkor shaklida he/she/it uchun "doesn\'t + asosiy fe\'l" ishlatiladi.' },
      ru: { q: 'Выберите грамматически правильное предложение:', opts: ['She doesn\'t like cold weather.', 'She don\'t likes cold weather.', 'She not like cold weather.', 'She isn\'t likes cold weather.'], a: 'She doesn\'t like cold weather.', exp: 'С местоимением she в отрицании используется doesn\'t + начальная форма глагола.' },
      en: { q: 'Choose the grammatically correct sentence:', opts: ['She doesn\'t like cold weather.', 'She don\'t likes cold weather.', 'She not like cold weather.', 'She isn\'t likes cold weather.'], a: 'She doesn\'t like cold weather.', exp: 'Negative third-person singular in present simple requires "doesn\'t + base verb".' },
    },
    {
      uz: { q: '"I have been living here ___ 2020." Bo‘sh joyga mos predlogni qo‘ying:', opts: ['since', 'for', 'in', 'at'], a: 'since', exp: 'Aniq boshlang‘ich vaqt ko‘rsatilganda Present Perfect Continuous da "since" ishlatiladi.' },
      ru: { q: 'Вставьте подходящий предлог: "I have been living here ___ 2020."', opts: ['since', 'for', 'in', 'at'], a: 'since', exp: 'Для указания момента начала действия в Present Perfect используется "since".' },
      en: { q: 'Fill in the blank: "I have been living here ___ 2020."', opts: ['since', 'for', 'in', 'at'], a: 'since', exp: '"Since" indicates the starting point of an action extending to the present.' },
    },
    {
      uz: { q: '"Generous" (saxiy) so‘zining teskari ma\'nosi (antonimi) qaysi?', opts: ['Stingy (baxil)', 'Brave (jasur)', 'Polite (xushmuomala)', 'Honest (rostgo‘y)'], a: 'Stingy (baxil)', exp: '"Generous" saxiylikni, "stingy" esa xasislik va baxillikni bildiradi.' },
      ru: { q: 'Какой антоним к слову "generous" (щедрый)?', opts: ['Stingy (жадный)', 'Brave (смелый)', 'Polite (вежливый)', 'Honest (честный)'], a: 'Stingy (жадный)', exp: '"Stingy" означает прижимистый, скупой.' },
      en: { q: 'What is the direct antonym of "generous"?', opts: ['Stingy', 'Brave', 'Polite', 'Honest'], a: 'Stingy', exp: '"Stingy" means unwilling to spend or give, the opposite of generous.' },
    },
  ],
  Physics: [
    {
      uz: { q: 'Avtomobil 2 soatda 140 km yo‘l bosdi. Uning o‘rtacha tezligi qanday bo‘lgan?', opts: ['70 km/soat', '60 km/soat', '80 km/soat', '75 km/soat'], a: '70 km/soat', exp: 'v = s / t = 140 / 2 = 70 km/soat.' },
      ru: { q: 'Автомобиль проехал 140 км за 2 часа. Какова его средняя скорость?', opts: ['70 км/ч', '60 км/ч', '80 км/ч', '75 км/ч'], a: '70 км/ч', exp: 'Скорость v = s / t = 140 / 2 = 70 км/ч.' },
      en: { q: 'A car covers 140 km in 2 hours. What is its average speed?', opts: ['70 km/h', '60 km/h', '80 km/h', '75 km/h'], a: '70 km/h', exp: 'Speed v = s / t = 140 / 2 = 70 km/h.' },
    },
    {
      uz: { q: 'Vakuumda yorug‘likning tarqalish tezligi taxminan qanchaga teng?', opts: ['300 000 km/s', '150 000 km/s', '30 000 km/s', '3 000 km/s'], a: '300 000 km/s', exp: 'Yorug‘lik tezligi c ≈ 3 * 10⁸ m/s, ya\'ni soniyasiga qariyb 300 000 km.' },
      ru: { q: 'Какова скорость света в вакууме?', opts: ['300 000 км/с', '150 000 км/с', '30 000 км/с', '3 000 км/с'], a: '300 000 км/с', exp: 'Скорость света c ≈ 300 000 км/с.' },
      en: { q: 'What is the speed of light in a vacuum?', opts: ['300,000 km/s', '150,000 km/s', '30,000 km/s', '3,000 km/s'], a: '300,000 km/s', exp: 'The speed of light c is approximately 300,000 km per second.' },
    },
  ],
  Chemistry: [
    {
      uz: { q: 'Osh tuzining kimyoviy formulasi qaysi?', opts: ['NaCl', 'KCl', 'CaCl₂', 'NaOH'], a: 'NaCl', exp: 'Osh tuzi natriy xlorid birikmasidir: NaCl.' },
      ru: { q: 'Какова химическая формула поваренной соли?', opts: ['NaCl', 'KCl', 'CaCl₂', 'NaOH'], a: 'NaCl', exp: 'Поваренная соль представляет собой хлорид натрия: NaCl.' },
      en: { q: 'What is the chemical formula of common table salt?', opts: ['NaCl', 'KCl', 'CaCl₂', 'NaOH'], a: 'NaCl', exp: 'Table salt is sodium chloride: NaCl.' },
    },
    {
      uz: { q: 'Havo tarkibining qariyb 78 foizini qaysi gaz tashkil qiladi?', opts: ['Azot (N₂)', 'Kislorod (O₂)', 'Karbonat angidrid', 'Vodorod'], a: 'Azot (N₂)', exp: 'Atmosfera havosining 78% qismi azot gazidan iborat.' },
      ru: { q: 'Какой газ составляет около 78% атмосферного воздуха?', opts: ['Азот (N₂)', 'Кислород (O₂)', 'Углекислый газ', 'Водород'], a: 'Азот (N₂)', exp: 'Азот составляет около 78% объема земной атмосферы.' },
      en: { q: 'Which gas comprises approximately 78% of Earth\'s atmosphere?', opts: ['Nitrogen (N₂)', 'Oxygen (O₂)', 'Carbon dioxide', 'Hydrogen'], a: 'Nitrogen (N₂)', exp: 'Nitrogen makes up roughly 78% of dry atmospheric air.' },
    },
  ],
  Biology: [
    {
      uz: { q: 'Hujayraning asosiy "energiya stansiyasi" hisoblangan organoid qaysi?', opts: ['Mitoxondriya', 'Ribosoma', 'Lizosoma', 'Vakuola'], a: 'Mitoxondriya', exp: 'Mitoxondriyalar ATF sintezlab, hujayrani zarur quvvat bilan ta\'minlaydi.' },
      ru: { q: 'Какой органоид называют «энергетической станцией клетки»?', opts: ['Митохондрия', 'Рибосома', 'Лизосома', 'Вакуоль'], a: 'Митохондрия', exp: 'Митохондрии производят молекулы АТФ, снабжая клетку энергией.' },
      en: { q: 'Which organelle is universally termed the "powerhouse of the cell"?', opts: ['Mitochondria', 'Ribosome', 'Lysosome', 'Vacuole'], a: 'Mitochondria', exp: 'Mitochondria generate most of the cell\'s chemical energy in the form of ATP.' },
    },
  ],
  History: [
    {
      uz: { q: 'O‘zbekiston Respublikasining Mustaqillik kuni qaysi sana?', opts: ['1-sentyabr', '8-dekabr', '21-mart', '9-may'], a: '1-sentyabr', exp: '1991-yil 31-avgustda mustaqillik e\'lon qilingan va 1-sentyabr Mustaqillik bayrami etib belgilangan.' },
      ru: { q: 'В какой день отмечается День независимости Республики Узбекистан?', opts: ['1 сентября', '8 декабря', '21 марта', '9 мая'], a: '1 сентября', exp: '1 сентября является национальным Днем независимости Узбекистана.' },
      en: { q: 'On which date is the Independence Day of Uzbekistan celebrated?', opts: ['September 1', 'December 8', 'March 21', 'May 9'], a: 'September 1', exp: 'Uzbekistan celebrates its Independence Day annually on September 1.' },
    },
  ],
  Economics: [
    {
      uz: { q: 'Pul qadrsizlanishi va tovarlar narxining umumiy ko‘tarilishi nima deb ataladi?', opts: ['Inflyatsiya', 'Deflyatsiya', 'Stagnatsiya', 'Monopoliya'], a: 'Inflyatsiya', exp: 'Inflyatsiya — pul xarid qobiliyatining pasayishi va narxlar darajasining o‘sishidir.' },
      ru: { q: 'Как называется устойчивое повышение общего уровня цен на товары и услуги?', opts: ['Инфляция', 'Дефляция', 'Стагнация', 'Монополия'], a: 'Инфляция', exp: 'Инфляция означает обесценение денег и снижение их покупательской способности.' },
      en: { q: 'What term describes a sustained increase in the general price level of goods and services?', opts: ['Inflation', 'Deflation', 'Stagnation', 'Monopoly'], a: 'Inflation', exp: 'Inflation represents the gradual decline in purchasing power reflected in rising prices.' },
    },
  ],
  'Computer Science': [
    {
      uz: { q: 'Massiv (Array) elementlariga indeks orqali to‘g‘ridan-to‘g‘ri murojaat qilish murakkabligi qanday?', opts: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], a: 'O(1)', exp: 'Massiv indeksi orqali xotiraga to‘g‘ridan-to‘g‘ri murojaat doimiy O(1) vaqt oladi.' },
      ru: { q: 'Какова временная сложность доступа к элементу массива по индексу?', opts: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], a: 'O(1)', exp: 'Доступ по индексу в массиве выполняется за константное время O(1).' },
      en: { q: 'What is the time complexity of indexing an element in an array?', opts: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], a: 'O(1)', exp: 'Array indexing directly computes memory offset in constant O(1) time.' },
    },
  ],
};

function generateDynamicQuestions(subjectKey, topic, difficulty, count, language = 'uz') {
  const normSubj = normalizeSubjectKey(subjectKey);
  const bank = DYNAMIC_BANK[normSubj] || DYNAMIC_BANK.Mathematics;
  const langKey = ['uz', 'ru', 'en'].includes(language) ? language : 'uz';

  const questions = [];
  for (let i = 0; i < count; i++) {
    const item = bank[i % bank.length];
    const data = item[langKey] || item.uz;
    questions.push({
      id: `${normSubj.toLowerCase().replace(/\s+/g, '_')}_dyn_${Date.now()}_${i}`,
      subject: normSubj,
      topic: topic || `${normSubj} darsi`,
      type: 'multiple_choice',
      difficulty: difficulty || 'medium',
      translations: {
        [langKey]: {
          question: data.q,
          options: data.opts,
          correctAnswer: data.a,
          explanation: data.exp,
        },
      },
    });
  }
  return questions;
}

/**
 * Generate fallback / mock session when backend is offline or on GitHub Pages
 */
function createLocalPracticeSession(data) {
  const { subject, topic, difficulty = 'medium', count = 5, language = 'uz' } = data;
  const targetSubj = normalizeSubjectKey(subject);

  // FAQAT VA FAQAT TANLANGAN FANDAN SAVOLLAR OLINADI!
  let candidates = PRACTICE_QUESTIONS.filter((q) => {
    return normalizeSubjectKey(q.subject).toLowerCase() === targetSubj.toLowerCase();
  });

  // Agar mavzu ko'rsatilgan bo'lsa, mos keladiganlarini tanlashga harakat qilamiz
  if (topic) {
    const topicMatches = candidates.filter((q) =>
      q.topic.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(q.topic.toLowerCase())
    );
    if (topicMatches.length >= 3) {
      candidates = topicMatches;
    }
  }

  // Agar savollar soni yetarli bo'lmasa, FAQAT SHU FAN bo'yicha dinamik savollar to'ldiriladi
  if (candidates.length < count) {
    const needed = count - candidates.length;
    const generated = generateDynamicQuestions(targetSubj, topic, difficulty, needed, language);
    candidates = [...candidates, ...generated];
  }

  // Shuffle and take count
  const shuffled = [...candidates].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  const localizedQuestions = selected.map((q) => getLocalizedQuestion(q, language));
  const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const fullSession = {
    id: sessionId,
    subject: targetSubj,
    topic: topic || `${targetSubj} amaliyoti`,
    difficulty,
    language,
    startedAt: new Date().toISOString(),
    totalQuestions: localizedQuestions.length,
    questions: localizedQuestions.map((q, idx) => ({
      id: q.id,
      order: idx + 1,
      type: q.type,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      userAnswer: null,
      isCorrect: null,
    })),
    completed: false,
    score: 0,
  };

  const sessions = getStoredSessions();
  sessions.unshift(fullSession);
  saveStoredSessions(sessions);

  // Return sanitized session (without revealing correctAnswer and explanation upfront)
  return {
    success: true,
    session: {
      id: fullSession.id,
      subject: fullSession.subject,
      topic: fullSession.topic,
      totalQuestions: fullSession.totalQuestions,
      questions: fullSession.questions.map((q) => ({
        id: q.id,
        order: q.order,
        type: q.type,
        question: q.question,
        options: q.options,
        difficulty: q.difficulty,
      })),
    },
  };
}

/**
 * Handle answer submission locally
 */
function submitLocalAnswer(sessionId, { questionId, answer }) {
  const sessions = getStoredSessions();
  const session = sessions.find((s) => s.id === sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  const q = session.questions.find((item) => item.id === questionId);
  if (!q) {
    throw new Error('Question not found');
  }

  const isCorrect = String(answer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
  q.userAnswer = answer;
  q.isCorrect = isCorrect;

  saveStoredSessions(sessions);

  return {
    success: true,
    correct: isCorrect,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
  };
}

/**
 * Complete session locally
 */
function completeLocalSession(sessionId) {
  const sessions = getStoredSessions();
  const session = sessions.find((s) => s.id === sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  session.completed = true;
  session.completedAt = new Date().toISOString();
  session.score = session.questions.filter((q) => q.isCorrect).length;
  session.correctAnswers = session.score;
  session.accuracy = Math.round((session.score / (session.questions.length || 1)) * 100);

  saveStoredSessions(sessions);

  return {
    success: true,
    session,
  };
}

export const generateQuestions = async (data) => {
  try {
    return await api.post('/practice/generate', data);
  } catch (err) {
    return { success: true, message: 'Local generation completed' };
  }
};

export const createPracticeSession = async (data) => {
  const targetSubj = normalizeSubjectKey(data?.subject);
  const normalizedData = { ...data, subject: targetSubj };

  try {
    const res = await api.post('/practice/sessions', normalizedData);
    if (res?.session?.questions?.length) {
      return res;
    }
    return createLocalPracticeSession(normalizedData);
  } catch (err) {
    console.warn('Backend unavailable, using rich client-side practice engine:', err.message);
    return createLocalPracticeSession(normalizedData);
  }
};

function getUserPreferredSubject() {
  try {
    const raw = localStorage.getItem('eduflow_local_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (Array.isArray(u.subjects) && u.subjects.length > 0) {
        return normalizeSubjectKey(u.subjects[0]);
      }
    }
  } catch {
    // ignore
  }
  return 'Mathematics';
}

export const quickStartPracticeSession = async (lang = 'uz') => {
  const chosenSubj = getUserPreferredSubject();
  const cfg = SUBJECTS_CONFIG.find((c) => c.id.toLowerCase() === chosenSubj.toLowerCase());
  const chosenTopic = cfg?.topics?.[lang]?.[0] || `${chosenSubj} 1-dars`;

  try {
    return await api.post('/practice/quick-start', { language: lang, subject: chosenSubj });
  } catch (err) {
    return createLocalPracticeSession({
      subject: chosenSubj,
      topic: chosenTopic,
      difficulty: 'medium',
      count: 5,
      language: lang,
    });
  }
};

export const submitAnswer = async (sessionId, data) => {
  try {
    return await api.post(`/practice/sessions/${sessionId}/answer`, data);
  } catch (err) {
    return submitLocalAnswer(sessionId, data);
  }
};

export const completePracticeSession = async (sessionId) => {
  try {
    return await api.post(`/practice/sessions/${sessionId}/complete`, {});
  } catch (err) {
    return completeLocalSession(sessionId);
  }
};

export const getPracticeRecommendation = async () => {
  const chosenSubj = getUserPreferredSubject();
  const cfg = SUBJECTS_CONFIG.find((c) => c.id.toLowerCase() === chosenSubj.toLowerCase());
  const chosenTopic = cfg?.topics?.uz?.[0] || `${chosenSubj} 1-dars`;

  try {
    const res = await api.get('/practice/recommendation');
    if (res?.recommendation?.subject) {
      return res;
    }
    return {
      success: true,
      recommendation: {
        subject: chosenSubj,
        topic: chosenTopic,
        difficulty: 'medium',
        reason: 'O‘quv profilingiz uchun tavsiya etildi.',
      },
    };
  } catch (err) {
    return {
      success: true,
      recommendation: {
        subject: chosenSubj,
        topic: chosenTopic,
        difficulty: 'medium',
        reason: 'O‘quv profilingiz uchun tavsiya etildi.',
      },
    };
  }
};

export const getPracticeHistory = async () => {
  try {
    return await api.get('/practice/history');
  } catch (err) {
    const sessions = getStoredSessions();
    return {
      success: true,
      sessions: sessions.filter((s) => s.completed),
    };
  }
};

export const getPracticeSessionDetails = async (sessionId) => {
  try {
    return await api.get(`/practice/sessions/${sessionId}`);
  } catch (err) {
    const sessions = getStoredSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return {
      success: true,
      session,
    };
  }
};

const practiceService = {
  generateQuestions,
  createSession: createPracticeSession,
  quickStart: quickStartPracticeSession,
  submitAnswer,
  completeSession: completePracticeSession,
  getRecommendation: getPracticeRecommendation,
  getHistory: getPracticeHistory,
  getSessionDetails: getPracticeSessionDetails,
  getSubjectsConfig: () => SUBJECTS_CONFIG,
};

export default practiceService;
