/**
 * EduFlow Multi-Language Practice Pool (MVP Production Dataset)
 * Subjects: Computer Science, Mathematics, English, Physics, Chemistry, Biology, History
 * Languages supported: 'uz' (O'zbek), 'ru' (Русский), 'en' (English)
 */

export const SUBJECTS_CONFIG = [
  {
    id: 'Computer Science',
    icon: 'Code2',
    color: 'from-blue-500 to-cyan-500',
    title: {
      uz: 'Informatika va Dasturlash',
      ru: 'Информатика и Программирование',
      en: 'Computer Science & Coding',
    },
    topics: {
      uz: [
        'JavaScript Asoslari',
        'Python Dasturlash',
        'Algoritmlar',
        'Ma\'lumotlar Tuzilmalari',
        'React & Web',
        'SQL va Ma\'lumotlar Bazasi',
        'Kiberxavfsizlik Asoslari',
        'Sun\'iy Intellekt & ML',
        'Git & Versiyalarni Boshqarish',
        'Kompyuter Tarmoqlari & Internet',
      ],
      ru: [
        'Основы JavaScript',
        'Программирование на Python',
        'Алгоритмы',
        'Структуры Данных',
        'React и Веб',
        'SQL и Базы Данных',
        'Основы Кибербезопасности',
        'Искусственный Интеллект и ML',
        'Git и Контроль Версий',
        'Компьютерные Сети и Интернет',
      ],
      en: [
        'JavaScript Basics',
        'Python Programming',
        'Algorithms',
        'Data Structures',
        'React & Web',
        'SQL & Databases',
        'Cybersecurity Basics',
        'AI & Machine Learning',
        'Git & Version Control',
        'Computer Networks & Internet',
      ],
    },
  },
  {
    id: 'Mathematics',
    icon: 'Binary',
    color: 'from-indigo-500 to-purple-500',
    title: {
      uz: 'Matematika',
      ru: 'Математика',
      en: 'Mathematics',
    },
    topics: {
      uz: [
        'Chiziqli Algebra',
        'Matematik Analiz & Hosilalar',
        'Integrallar',
        'Ehtimollar Nazariyasi',
        'Trigonometriya',
        'Geometriya',
        'Kombinatorika & Graf Nazariyasi',
        'Stereometriya (Fazoviy Geometriya)',
        'Kasrlar va Ratsional Sonlar',
        'Tenglamalar va Tengsizliklar',
      ],
      ru: [
        'Линейная Алгебра',
        'Математический Анализ',
        'Интегралы',
        'Теория Вероятностей',
        'Тригонометрия',
        'Геометрия',
        'Комбинаторика и Графы',
        'Стереометрия',
        'Дроби и Рациональные Числа',
        'Уравнения и Неравенства',
      ],
      en: [
        'Linear Algebra',
        'Calculus & Derivatives',
        'Integrals',
        'Probability Theory',
        'Trigonometry',
        'Geometry',
        'Combinatorics & Graph Theory',
        'Solid Geometry',
        'Fractions & Rational Numbers',
        'Equations & Inequalities',
      ],
    },
  },
  {
    id: 'English',
    icon: 'Languages',
    color: 'from-emerald-500 to-teal-500',
    title: {
      uz: 'Ingliz Tili',
      ru: 'Английский Язык',
      en: 'English Language',
    },
    topics: {
      uz: [
        'Grammatika & Tenses',
        'Conditionals (Shart gaplar)',
        'Phrasal Verbs',
        'Passive Voice',
        'IELTS & Lug\'at',
        'Reading & Skimming',
        'Writing & Insho Tuzilmasi',
        'Listening & Talaffuz',
        'Idiomalar va So\'zlashuv',
        'Prepositions & Articles',
      ],
      ru: [
        'Грамматика и Времена',
        'Условные предложения',
        'Фразовые глаголы',
        'Пассивный залог',
        'IELTS и Словарный запас',
        'Чтение и Понимание Текста',
        'Письмо и Структура Эссе',
        'Аудирование и Произношение',
        'Идиомы и Разговорные Фразы',
        'Предлоги и Артикли',
      ],
      en: [
        'Grammar & Tenses',
        'Conditionals',
        'Phrasal Verbs',
        'Passive Voice',
        'IELTS & Vocabulary',
        'Reading & Comprehension',
        'Writing & Essay Structure',
        'Listening & Pronunciation',
        'Idioms & Expressions',
        'Prepositions & Articles',
      ],
    },
  },
  {
    id: 'Physics',
    icon: 'Zap',
    color: 'from-amber-500 to-orange-500',
    title: {
      uz: 'Fizika',
      ru: 'Физика',
      en: 'Physics',
    },
    topics: {
      uz: [
        'Nyuton Qonunlari',
        'Energiya va Impuls',
        'Elektr Toki & Zanjirlar',
        'Termodinamika',
        'Optika',
        'Elektromagnit Induksiya',
        'Kinematika & Harakat',
        'Atom va Yadro Fizikasi',
        'Tebranishlar va To\'lqinlar',
        'Gravitatsiya & Kosmik Tezliklar',
      ],
      ru: [
        'Законы Ньютона',
        'Энергия и Импульс',
        'Электрический Ток',
        'Термодинамика',
        'Оптика',
        'Электромагнитная Индукция',
        'Кинематика и Движение',
        'Атомная и Ядерная Физика',
        'Колебания и Волны',
        'Гравитация и Космос',
      ],
      en: [
        'Newton\'s Laws',
        'Energy & Momentum',
        'Electric Circuits',
        'Thermodynamics',
        'Optics',
        'Electromagnetic Induction',
        'Kinematics & Motion',
        'Atomic & Nuclear Physics',
        'Oscillations & Waves',
        'Gravity & Orbital Mechanics',
      ],
    },
  },
  {
    id: 'Chemistry',
    icon: 'FlaskConical',
    color: 'from-pink-500 to-rose-500',
    title: {
      uz: 'Kimyo',
      ru: 'Химия',
      en: 'Chemistry',
    },
    topics: {
      uz: [
        'Atom Tuzilishi',
        'Kimyoviy Bog\'lanishlar',
        'Davriy Qonun',
        'Oksidlanish-Qaytarilish',
        'Organik Kimyo',
        'Eritmalar va Konsentratsiya',
        'Elektrolitik Dissotsiatsiya',
        'Reaksiya Tezligi & Muvozanat',
        'Kislotalar, Asoslar va Tuzlar',
        'Uglevodorodlar & Polimerlar',
      ],
      ru: [
        'Строение Атома',
        'Химические Связи',
        'Периодический Закон',
        'Окислительно-восстановительные реакции',
        'Органическая Химия',
        'Растворы и Концентрация',
        'Электролитическая Диссоциация',
        'Скорость Реакций и Равновесие',
        'Кислоты, Основания и Соли',
        'Углеводороды и Полимеры',
      ],
      en: [
        'Atomic Structure',
        'Chemical Bonds',
        'Periodic Table',
        'Redox Reactions',
        'Organic Chemistry',
        'Solutions & Concentration',
        'Electrolytic Dissociation',
        'Reaction Rates & Equilibrium',
        'Acids, Bases & Salts',
        'Hydrocarbons & Polymers',
      ],
    },
  },
  {
    id: 'Biology',
    icon: 'Dna',
    color: 'from-green-500 to-emerald-600',
    title: {
      uz: 'Biologiya',
      ru: 'Биология',
      en: 'Biology',
    },
    topics: {
      uz: [
        'Hujayra Biologiyasi',
        'DNK va Genetika',
        'Fotosintez',
        'Inson Anatomiyasi',
        'Evolyutsiya',
        'Ekologiya va Biosfera',
        'O\'simliklar Fiziologiyasi',
        'Immunitet va Salomatlik',
        'Nerv Sistemasi va Boshqaruv',
        'Biotexnologiya va Gen Muhandisligi',
      ],
      ru: [
        'Клеточная Биология',
        'ДНК и Генетика',
        'Фотосинтез',
        'Анатомия Человека',
        'Эволюция',
        'Экология и Биосфера',
        'Физиология Растений',
        'Иммунитет и Здоровье',
        'Нервная Система',
        'Биотехнологии и Генная Инженерия',
      ],
      en: [
        'Cell Biology',
        'DNA & Genetics',
        'Photosynthesis',
        'Human Anatomy',
        'Evolution',
        'Ecology & Biosphere',
        'Plant Physiology',
        'Immunity & Health',
        'Nervous System & Control',
        'Biotechnology & Genetic Engineering',
      ],
    },
  },
  {
    id: 'History',
    icon: 'BookOpen',
    color: 'from-violet-500 to-fuchsia-600',
    title: {
      uz: 'Tarix',
      ru: 'История',
      en: 'History',
    },
    topics: {
      uz: [
        'Amir Temur Davri',
        'Buyuk Ipak Yo\'li',
        'Jadidchilik Harakati',
        'Uyg\'onish Davri',
        'Sanoat Inqilobi',
        'Qadimgi Dunyo Sivilizatsiyalari',
        'Birinchi va Ikkinchi Jahon Urushlari',
        'O\'zbekiston Mustaqillik Tarixi',
        'Temuriylar Uyg\'onishi',
        'BMT va Xalqaro Munozaralar',
      ],
      ru: [
        'Эпоха Амира Темура',
        'Великий Шёлковый Путь',
        'Движение Джадидов',
        'Эпоха Возрождения',
        'Промышленная Революция',
        'Древние Цивилизации',
        'Первая и Вторая Мировые Войны',
        'История Независимости Узбекистана',
        'Темуридское Возрождение',
        'ООН и Международная Политика',
      ],
      en: [
        'Era of Amir Temur',
        'The Great Silk Road',
        'Jadid Movement',
        'The Renaissance',
        'Industrial Revolution',
        'Ancient World Civilizations',
        'World War I & II',
        'Modern History of Uzbekistan',
        'Timurid Renaissance',
        'UN & International Affairs',
      ],
    },
  },
  {
    id: 'Economics',
    icon: 'TrendingUp',
    color: 'from-amber-400 to-emerald-500',
    title: {
      uz: 'Iqtisodiyot',
      ru: 'Экономика',
      en: 'Economics',
    },
    topics: {
      uz: [
        'Mikroiqtisodiyot Asoslari',
        'Makroiqtisodiyot va YaIM',
        'Talab va Taklif Qonuni',
        'Inflyatsiya va Pul Qadri',
        'Bank Tizimi va Foizlar',
        'Moliyaviy Savodxonlik',
        'Xalqaro Savdo va Valyuta',
        'Investitsiyalar & Aksiya Bozori',
        'Soliq Siyosati va Byudjet',
        'Tadbirkorlik va Startaplar',
      ],
      ru: [
        'Основы Микроэкономики',
        'Макроэкономика и ВВП',
        'Спрос и Предложение',
        'Инфляция и Деньги',
        'Банковская Система и Ставки',
        'Финансовая Грамотность',
        'Международная Торговля',
        'Инвестиции и Фондовый Рынок',
        'Налоговая Политика и Бюджет',
        'Предпринимательство и Стартапы',
      ],
      en: [
        'Microeconomics Basics',
        'Macroeconomics & GDP',
        'Supply and Demand',
        'Inflation & Purchasing Power',
        'Banking & Interest Rates',
        'Financial Literacy',
        'International Trade & Forex',
        'Investments & Stock Markets',
        'Fiscal Policy & Taxation',
        'Entrepreneurship & Startups',
      ],
    },
  },
  {
    id: 'Geography',
    icon: 'Globe',
    color: 'from-teal-500 to-cyan-600',
    title: {
      uz: 'Geografiya',
      ru: 'География',
      en: 'Geography',
    },
    topics: {
      uz: [
        'Materiklar va Okeanlar',
        'O‘zbekiston Geografiyasi',
        'Litosfera va Yer Relyefi',
        'Atmosfera va Iqlim',
        'Gidrosfera: Daryo va Ko‘llar',
        'Iqtisodiy Geografiya',
        'Aholi va Demografiya',
        'Tabiiy Zonalar va Biomes',
        'Xaritalar va Kartografiya',
        'Foydali Qazilmalar va Geologiya',
      ],
      ru: [
        'Материки и Океаны',
        'География Узбекистана',
        'Литосфера и Рельеф',
        'Атмосфера и Климат',
        'Гидросфера: Реки и Озёра',
        'Экономическая География',
        'Население и Демография',
        'Природные Зоны и Биомы',
        'Картография и Масштаб',
        'Полезные Ископаемые и Геология',
      ],
      en: [
        'Continents & Oceans',
        'Geography of Uzbekistan',
        'Lithosphere & Earth Relief',
        'Atmosphere & Climate',
        'Hydrosphere: Rivers & Lakes',
        'Economic Geography',
        'Population & Demographics',
        'Natural Zones & Biomes',
        'Cartography & Maps',
        'Mineral Resources & Geology',
      ],
    },
  },
];

export const PRACTICE_QUESTIONS = [
  // ==========================================
  // COMPUTER SCIENCE - JAVASCRIPT
  // ==========================================
  {
    id: 'cs_js_1',
    subject: 'Computer Science',
    topic: 'JavaScript Basics',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'JavaScript-da qaysi kalit so\'z o\'zgarmas (reassign qilib bo\'lmaydigan) o\'zgaruvchi e\'lon qilish uchun ishlatiladi?',
        options: ['let', 'const', 'var', 'static'],
        correctAnswer: 'const',
        explanation: '`const` bilan e\'lon qilingan o\'zgaruvchilarning qiymatini qayta o\'zgartirib (reassign qilib) bo\'lmaydi.',
      },
      ru: {
        question: 'Какое ключевое слово в JavaScript используется для объявления переменной, значение которой нельзя переназначить?',
        options: ['let', 'const', 'var', 'static'],
        correctAnswer: 'const',
        explanation: 'Переменные, объявленные через `const`, имеют блочную область видимости и не могут быть повторно переназначены.',
      },
      en: {
        question: 'Which JavaScript keyword is used to declare a variable that cannot be reassigned?',
        options: ['let', 'const', 'var', 'static'],
        correctAnswer: 'const',
        explanation: '`const` creates a block-scoped variable whose reference cannot be reassigned after declaration.',
      },
    },
  },
  {
    id: 'cs_js_2',
    subject: 'Computer Science',
    topic: 'JavaScript Basics',
    type: 'true_false',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'JavaScript-da `===` operatori qiymat bilan birga ma\'lumot turini (type) ham tekshiradi.',
        options: ['To‘g‘ri', 'Noto‘g‘ri'],
        correctAnswer: 'To‘g‘ri',
        explanation: '`===` qat\'iy tenglik operatori bo\'lib, tiplarni avtomatik o\'zgartirmasdan, qiymat va tipni bir vaqtda tekshiradi.',
      },
      ru: {
        question: 'В JavaScript оператор `===` проверяет не только значение, но и тип данных без неявного приведения.',
        options: ['Верно', 'Неверно'],
        correctAnswer: 'Верно',
        explanation: 'Строгое равенство `===` сравнивает операнды без приведения типов: если типы разные, возвращается `false`.',
      },
      en: {
        question: 'In JavaScript, the `===` operator checks both value and data type without type coercion.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Strict equality (`===`) checks both identity and type without coercing types.',
      },
    },
  },
  {
    id: 'cs_js_3',
    subject: 'Computer Science',
    topic: 'JavaScript Basics',
    type: 'multiple_choice',
    difficulty: 'hard',
    translations: {
      uz: {
        question: 'Quyidagi kod natijasi nima bo\'ladi: `typeof NaN` ?',
        options: ['"number"', '"nan"', '"undefined"', '"object"'],
        correctAnswer: '"number"',
        explanation: 'JavaScript spetsifikatsiyasiga ko\'ra `NaN` (Not-a-Number) sonlar toifasiga (IEEE 754 float) kiradi, shuning uchun `typeof NaN === "number"`.',
      },
      ru: {
        question: 'Какой результат вернёт выражение: `typeof NaN` ?',
        options: ['"number"', '"nan"', '"undefined"', '"object"'],
        correctAnswer: '"number"',
        explanation: 'В соответствии со спецификацией ECMAScript, значение `NaN` относится к числовому типу IEEE 754, поэтому `typeof NaN === "number"`.',
      },
      en: {
        question: 'What is the output of `typeof NaN` in JavaScript?',
        options: ['"number"', '"nan"', '"undefined"', '"object"'],
        correctAnswer: '"number"',
        explanation: 'In the IEEE 754 floating-point standard and JavaScript specification, NaN is technically a numeric value, so `typeof NaN` evaluates to "number".',
      },
    },
  },

  // ==========================================
  // COMPUTER SCIENCE - ALGORITHMS & DATA STRUCTURES
  // ==========================================
  {
    id: 'cs_algo_1',
    subject: 'Computer Science',
    topic: 'Algorithms',
    type: 'multiple_choice',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'Saralangan n ta elementli massivda Ikkilik qidiruv (Binary Search) algoritmining o\'rtacha va eng yomon vaqt murakkabligi nima?',
        options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(1)'],
        correctAnswer: 'O(log n)',
        explanation: 'Binary Search har bir qadamda qidiruv hududini yarmiga qisqartiradi, shuning uchun uning murakkabligi logarifmik: O(log n).',
      },
      ru: {
        question: 'Какова временная сложность бинарного поиска (Binary Search) в отсортированном массиве из n элементов?',
        options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(1)'],
        correctAnswer: 'O(log n)',
        explanation: 'Бинарный поиск на каждом шаге делит массив пополам, что обеспечивает логарифмическую сложность O(log n).',
      },
      en: {
        question: 'What is the time complexity of Binary Search on a sorted array of n elements?',
        options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(1)'],
        correctAnswer: 'O(log n)',
        explanation: 'Binary Search halves the search space at each step, yielding a logarithmic time complexity of O(log n).',
      },
    },
  },
  {
    id: 'cs_ds_1',
    subject: 'Computer Science',
    topic: 'Data Structures',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Stack (Stek) ma\'lumotlar tuzilmasi qaysi tamoyil asosida ishlaydi?',
        options: ['LIFO (Last In, First Out)', 'FIFO (First In, First Out)', 'Random Access', 'Priority Based'],
        correctAnswer: 'LIFO (Last In, First Out)',
        explanation: 'Stekda oxirgi kirgan element birinchi bo\'lib olinadi (LIFO — Last In, First Out).',
      },
      ru: {
        question: 'По какому принципу функционирует структура данных Стек (Stack)?',
        options: ['LIFO (Last In, First Out)', 'FIFO (First In, First Out)', 'Random Access', 'Priority Based'],
        correctAnswer: 'LIFO (Last In, First Out)',
        explanation: 'Стек работает по принципу LIFO (последним пришёл — первым ушёл).',
      },
      en: {
        question: 'Which principle governs the behavior of a Stack data structure?',
        options: ['LIFO (Last In, First Out)', 'FIFO (First In, First Out)', 'Random Access', 'Priority Based'],
        correctAnswer: 'LIFO (Last In, First Out)',
        explanation: 'A stack operates on the Last-In, First-Out (LIFO) order, where the newest element is processed first.',
      },
    },
  },
  {
    id: 'cs_react_1',
    subject: 'Computer Science',
    topic: 'React & Web',
    type: 'multiple_choice',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'React-da funksional komponentda nojo\'ya ta\'sirlar (API chaqiruvlari, obuna bo\'lish va h.k.) qaysi hook orqali boshqariladi?',
        options: ['useEffect', 'useState', 'useMemo', 'useRef'],
        correctAnswer: 'useEffect',
        explanation: '`useEffect` hooki komponentning render bo\'lishidan so\'ng nojo\'ya ta\'sirlarni (side-effects) bajarish uchun mo\'ljallangan.',
      },
      ru: {
        question: 'Какой React-хук предназначен для выполнения побочных эффектов (запросы к API, таймеры, подписки)?',
        options: ['useEffect', 'useState', 'useMemo', 'useRef'],
        correctAnswer: 'useEffect',
        explanation: 'Хук `useEffect` позволяет выполнять побочные действия (side-effects) в функциональных компонентах.',
      },
      en: {
        question: 'Which React hook is designed for handling side effects like data fetching and subscriptions in functional components?',
        options: ['useEffect', 'useState', 'useMemo', 'useRef'],
        correctAnswer: 'useEffect',
        explanation: '`useEffect` is specifically built to execute side effects after rendering functional components.',
      },
    },
  },

  // ==========================================
  // MATHEMATICS
  // ==========================================
  {
    id: 'math_calc_1',
    subject: 'Mathematics',
    topic: 'Calculus & Derivatives',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'f(x) = x³ funksiyasining hosilasi (f\'(x)) nimaga teng?',
        options: ['3x²', 'x²', '3x', 'x⁴ / 4'],
        correctAnswer: '3x²',
        explanation: 'Darajali funksiyalar qoidasiga ko\'ra: (xⁿ)\' = n * xⁿ⁻¹. Demak, (x³)\' = 3x².',
      },
      ru: {
        question: 'Чему равна производная функции f(x) = x³ ?',
        options: ['3x²', 'x²', '3x', 'x⁴ / 4'],
        correctAnswer: '3x²',
        explanation: 'По формуле производной степенной функции (xⁿ)\' = n * xⁿ⁻¹, производная x³ равна 3x².',
      },
      en: {
        question: 'What is the derivative of f(x) = x³ with respect to x?',
        options: ['3x²', 'x²', '3x', 'x⁴ / 4'],
        correctAnswer: '3x²',
        explanation: 'By the power rule of differentiation (d/dx[xⁿ] = n*xⁿ⁻¹), the derivative of x³ is 3x².',
      },
    },
  },
  {
    id: 'math_trig_1',
    subject: 'Mathematics',
    topic: 'Trigonometry',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Har qanday α burchak uchun sin²(α) + cos²(α) ifodaning qiymati nimaga teng?',
        options: ['1', '0', '2', 'tg(α)'],
        correctAnswer: '1',
        explanation: 'sin²(α) + cos²(α) = 1 — bu asosiy trigonometrik ayniyatdir.',
      },
      ru: {
        question: 'Чему равно значение выражения sin²(α) + cos²(α) для любого угла α?',
        options: ['1', '0', '2', 'tg(α)'],
        correctAnswer: '1',
        explanation: 'sin²(α) + cos²(α) = 1 является основным тригонометрическим тождеством.',
      },
      en: {
        question: 'What is the value of the identity sin²(α) + cos²(α) for any angle α?',
        options: ['1', '0', '2', 'tan(α)'],
        correctAnswer: '1',
        explanation: 'sin²(α) + cos²(α) = 1 is the fundamental Pythagorean trigonometric identity.',
      },
    },
  },
  {
    id: 'math_prob_1',
    subject: 'Mathematics',
    topic: 'Probability Theory',
    type: 'multiple_choice',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'Standart 6 qirrali o\'yin suyagini tashlaganda juft son (2, 4 yoki 6) tushish ehtimoli qancha?',
        options: ['1/2 (50%)', '1/3 (33.3%)', '1/6 (16.7%)', '2/3 (66.7%)'],
        correctAnswer: '1/2 (50%)',
        explanation: 'Jami 6 ta teng ehtimolli holatdan 3 tasi juft (2, 4, 6). Ehtimollik: 3 / 6 = 1/2.',
      },
      ru: {
        question: 'Какова вероятность выпадения чётного числа при броске правильной 6-гранной игральной кости?',
        options: ['1/2 (50%)', '1/3 (33.3%)', '1/6 (16.7%)', '2/3 (66.7%)'],
        correctAnswer: '1/2 (50%)',
        explanation: 'Из 6 граней чётными являются три (2, 4, 6). Вероятность равна 3/6 = 1/2 (50%).',
      },
      en: {
        question: 'What is the probability of rolling an even number on a standard six-sided die?',
        options: ['1/2 (50%)', '1/3 (33.3%)', '1/6 (16.7%)', '2/3 (66.7%)'],
        correctAnswer: '1/2 (50%)',
        explanation: 'There are 3 favorable outcomes (2, 4, 6) out of 6 possible outcomes, so 3/6 = 1/2 (50%).',
      },
    },
  },

  // ==========================================
  // ENGLISH LANGUAGE
  // ==========================================
  {
    id: 'eng_tenses_1',
    subject: 'English',
    topic: 'Grammar & Tenses',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Gapni to\'g\'ri to\'ldiring: "She _____ to London three times this year."',
        options: ['has gone', 'has been', 'was', 'went'],
        correctAnswer: 'has been',
        explanation: 'Agar inson biror joyga borib qaytgan bo\'lsa (tajriba), `have/has been to` ishlatiladi. `has gone` esa u yerga ketgan va hali qaytmaganini bildiradi.',
      },
      ru: {
        question: 'Заполните пропуск: "She _____ to London three times this year."',
        options: ['has gone', 'has been', 'was', 'went'],
        correctAnswer: 'has been',
        explanation: 'Конструкция `has been to` означает, что человек побывал там и вернулся. `has gone` означает, что человек уехал и всё ещё там.',
      },
      en: {
        question: 'Complete the sentence: "She _____ to London three times this year."',
        options: ['has gone', 'has been', 'was', 'went'],
        correctAnswer: 'has been',
        explanation: '`has been to` indicates that she has visited London and returned, expressing life experience within an ongoing time period.',
      },
    },
  },
  {
    id: 'eng_cond_1',
    subject: 'English',
    topic: 'Conditionals',
    type: 'multiple_choice',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'Second Conditional (2-shart ergash gap) qaysi holatlarni ifodalaydi?',
        options: [
          'Hozirgi yoki kelajakdagi nohaqiqiy, xayoliy holatlarni',
          'Umumiy haqiqat va tabiat qonunlarini',
          'Kelajakda yuz berishi aniq bo\'lgan ishlarni',
          'O\'tmishda sodir bo\'lib tugagan faktlarni',
        ],
        correctAnswer: 'Hozirgi yoki kelajakdagi nohaqiqiy, xayoliy holatlarni',
        explanation: 'Second Conditional (`If + Past Simple, would + V1`) hozirgi yoki kelajakdagi real bo\'lmagan, gipoteza holatlarini ifodalaydi.',
      },
      ru: {
        question: 'Что выражает Second Conditional (второй тип условных предложений)?',
        options: [
          'Нереальные или маловероятные ситуации в настоящем или будущем',
          'Общие факты и законы природы',
          'Реальные события в будущем',
          'События, произошедшие в прошлом',
        ],
        correctAnswer: 'Нереальные или маловероятные ситуации в настоящем или будущем',
        explanation: 'Second Conditional (`If + Past Simple, would + V`) используется для воображаемых и нереальных ситуаций в настоящем/будущем.',
      },
      en: {
        question: 'What does the Second Conditional typically express?',
        options: [
          'Unreal or hypothetical situations in the present or future',
          'General truths and scientific laws',
          'Definite future events',
          'Completed past events',
        ],
        correctAnswer: 'Unreal or hypothetical situations in the present or future',
        explanation: 'The Second Conditional (`If + Past Simple, would + base verb`) is used for hypothetical or imaginary situations in the present/future.',
      },
    },
  },

  // ==========================================
  // PHYSICS
  // ==========================================
  {
    id: 'phys_newt_1',
    subject: 'Physics',
    topic: 'Newton\'s Laws',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Nyutonning ikkinchi qonuni formulasini ko\'rsating:',
        options: ['F = m * a', 'E = m * c²', 'p = m * v', 'F = G * (m1*m2)/r²'],
        correctAnswer: 'F = m * a',
        explanation: 'Nyutonning II qonuniga ko\'ra jismga ta\'sir qiluvchi kuch uning massasi va olgan tezlanishining ko\'paytmasiga teng: F = m * a.',
      },
      ru: {
        question: 'Укажите математическое выражение второго закона Ньютона:',
        options: ['F = m * a', 'E = m * c²', 'p = m * v', 'F = G * (m1*m2)/r²'],
        correctAnswer: 'F = m * a',
        explanation: 'Второй закон Ньютона гласит: сила равна произведению массы тела на его ускорение: F = m * a.',
      },
      en: {
        question: 'Which equation represents Newton\'s Second Law of Motion?',
        options: ['F = m * a', 'E = m * c²', 'p = m * v', 'F = G * (m1*m2)/r²'],
        correctAnswer: 'F = m * a',
        explanation: 'Newton\'s Second Law states that force equals mass times acceleration: F = m * a.',
      },
    },
  },
  {
    id: 'phys_elec_1',
    subject: 'Physics',
    topic: 'Electric Circuits',
    type: 'multiple_choice',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'Zanjir qismi uchun Om qonuni qanday ifodalanadi?',
        options: ['I = U / R', 'U = I / R', 'R = I * U', 'P = I / U'],
        correctAnswer: 'I = U / R',
        explanation: 'Tok kuchi (I) kuchlanishga (U) to\'g\'ri mutanosib, qarshilikka (R) teskari mutanosibdir: I = U / R.',
      },
      ru: {
        question: 'Как формулируется закон Ома для участка цепи?',
        options: ['I = U / R', 'U = I / R', 'R = I * U', 'P = I / U'],
        correctAnswer: 'I = U / R',
        explanation: 'Сила тока прямо пропорциональна напряжению и обратно пропорциональна сопротивлению: I = U / R.',
      },
      en: {
        question: 'What is the formula for Ohm\'s Law for a circuit component?',
        options: ['I = U / R', 'U = I / R', 'R = I * U', 'P = I / U'],
        correctAnswer: 'I = U / R',
        explanation: 'Current (I) is directly proportional to voltage (U or V) and inversely proportional to resistance (R): I = V / R.',
      },
    },
  },

  // ==========================================
  // CHEMISTRY
  // ==========================================
  {
    id: 'chem_atom_1',
    subject: 'Chemistry',
    topic: 'Atomic Structure',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Atom yadrosi qanday zarrachalardan tashkil topgan?',
        options: ['Protonlar va neytronlar', 'Protonlar va elektronlar', 'Faqat elektronlar', 'Faqat neytronlar'],
        correctAnswer: 'Protonlar va neytronlar',
        explanation: 'Atom yadrosi musbat zaryadlangan protonlar va neytral neytronlardan iborat bo\'lib, elektronlar yadro atrofida aylanadi.',
      },
      ru: {
        question: 'Из каких частиц состоит атомное ядро?',
        options: ['Протоны и нейтроны', 'Протоны и электроны', 'Только электроны', 'Только нейтроны'],
        correctAnswer: 'Протоны и нейтроны',
        explanation: 'Ядро атома образовано положительными протонами и нейтральными нейтронами (нуклонами).',
      },
      en: {
        question: 'Which subatomic particles constitute the nucleus of an atom?',
        options: ['Protons and neutrons', 'Protons and electrons', 'Only electrons', 'Only neutrons'],
        correctAnswer: 'Protons and neutrons',
        explanation: 'The atomic nucleus consists of positively charged protons and neutral neutrons, surrounded by an electron cloud.',
      },
    },
  },

  // ==========================================
  // BIOLOGY
  // ==========================================
  {
    id: 'bio_cell_1',
    subject: 'Biology',
    topic: 'Cell Biology',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Hujayraning "energiya stansiyasi" deb ataluvchi, ATF (ATP) sintez qiluvchi organoid qaysi?',
        options: ['Mitoxondriya', 'Ribosoma', 'Golji majmuasi', 'Lizosoma'],
        correctAnswer: 'Mitoxondriya',
        explanation: 'Mitoxondriyalar hujayra nafas olishida qatnashadi va organizm uchun zarur energiyani ATF shaklida ishlab chiqaradi.',
      },
      ru: {
        question: 'Какой органоид клетки называют её «энергетической станцией» из-за синтеза молекул АТФ?',
        options: ['Митохондрия', 'Рибосома', 'Комплекс Гольджи', 'Лизосома'],
        correctAnswer: 'Митохондрия',
        explanation: 'Митохондрии отвечают за клеточное дыхание и синтез молекул АТФ — главного источника энергии клетки.',
      },
      en: {
        question: 'Which organelle is referred to as the "powerhouse of the cell" due to ATP synthesis?',
        options: ['Mitochondria', 'Ribosome', 'Golgi apparatus', 'Lysosome'],
        correctAnswer: 'Mitochondria',
        explanation: 'Mitochondria perform cellular respiration to produce adenosine triphosphate (ATP), the primary energy currency.',
      },
    },
  },

  // ==========================================
  // HISTORY
  // ==========================================
  {
    id: 'hist_temur_1',
    subject: 'History',
    topic: 'Era of Amir Temur',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Amir Temurning mashhur davlat shiori qaysi edi?',
        options: ['Kuch — adolatdadir', 'Bilim — eng buyuk boylik', 'Tinchlik — taraqqiyot garovi', 'Birlashgan kuch yengilmas'],
        correctAnswer: 'Kuch — adolatdadir',
        explanation: 'Amir Temur davlat boshqaruvida "Kuch — adolatdadir" ("Rosti-rusti") shiorini asosiy mezon qilib belgilagan.',
      },
      ru: {
        question: 'Какой известный девиз принадлежал великому полководцу Амиру Темуру?',
        options: ['Сила — в справедливости', 'Знание — высшее богатство', 'Мир — залог прогресса', 'В единстве сила'],
        correctAnswer: 'Сила — в справедливости',
        explanation: 'Девизом государственной печати Амира Темура были слова «Сила — в справедливости» («Рости-русти»).',
      },
      en: {
        question: 'What was the famous governing motto of Amir Temur (Tamerlane)?',
        options: ['Strength is in Justice', 'Knowledge is the Greatest Wealth', 'Peace is the Key to Progress', 'Unity is Power'],
        correctAnswer: 'Strength is in Justice',
        explanation: 'Amir Temur chose "Strength is in Justice" ("Rosti-rusti") as his foundational state motto.',
      },
    },
  },
  {
    id: 'hist_silk_1',
    subject: 'History',
    topic: 'The Great Silk Road',
    type: 'true_false',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Buyuk Ipak yo\'li qadimgi Xitoyni O\'rta Osiyo va O\'rta yer dengizi mintaqalari bilan bog\'lagan.',
        options: ['To‘g‘ri', 'Noto‘g‘ri'],
        correctAnswer: 'To‘g‘ri',
        explanation: 'Buyuk Ipak yo\'li Sharq va G\'arb sivilizatsiyalarini bog\'lagan eng yirik qadimiy karvon yo\'li tarmog\'i hisoblangan.',
      },
      ru: {
        question: 'Великий Шёлковый путь соединял древний Китай со Средней Азией и Средиземноморьем.',
        options: ['Верно', 'Неверно'],
        correctAnswer: 'Верно',
        explanation: 'Великий Шёлковый путь представлял собой грандиозную сеть караванных дорог между Китаем, Средней Азией и Европой.',
      },
      en: {
        question: 'The Great Silk Road connected ancient China with Central Asia and the Mediterranean regions.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'The Silk Road was an expansive network of trade routes bridging East Asia with Central Asia and Europe.',
      },
    },
  },
  // ==========================================
  // GEOGRAPHY QUESTIONS
  // ==========================================
  {
    id: 'geo_ocean_1',
    subject: 'Geography',
    topic: 'Continents & Oceans',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Yer yuzidagi eng katta va eng chuqur okean qaysi?',
        options: ['Tinch okeani', 'Atlantika okeani', 'Hind okeani', 'Shimoliy Muz okeani'],
        correctAnswer: 'Tinch okeani',
        explanation: 'Tinch okeani maydoni bo‘yicha Yer yuzidagi eng ulkan va eng chuqur (Mariana botig‘i 11 022 m) okean hisoblanadi.',
      },
      ru: {
        question: 'Какой океан на Земле является самым большим и глубоким?',
        options: ['Тихий океан', 'Атлантический океан', 'Индийский океан', 'Северный Ледовитый океан'],
        correctAnswer: 'Тихий океан',
        explanation: 'Тихий океан занимает наибольшую площадь и имеет максимальную глубину (Марианский жёлоб).',
      },
      en: {
        question: 'Which ocean on Earth is the largest and deepest?',
        options: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
        correctAnswer: 'Pacific Ocean',
        explanation: 'The Pacific Ocean is both the largest and deepest of Earth\'s oceanic divisions, containing the Mariana Trench.',
      },
    },
  },
  {
    id: 'geo_uzb_1',
    subject: 'Geography',
    topic: 'Geography of Uzbekistan',
    type: 'true_false',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'O‘zbekiston dunyoda dengizga chiqish uchun kamida ikkita davlat hududidan o‘tish talab etiladigan (doubly landlocked) kam sonli davlatlardan biridir.',
        options: ['To‘g‘ri', 'Noto‘g‘ri'],
        correctAnswer: 'To‘g‘ri',
        explanation: 'O‘zbekiston va Lixtenshteyn dunyodagi faqat ikkita "qo‘shaloq quruqlik ichidagi" (doubly landlocked) davlat hisoblanadi.',
      },
      ru: {
        question: 'Узбекистан является одним из двух государств мира, не имеющих выхода к морю и граничащих исключительно со странами, также не имеющими выхода к морю.',
        options: ['Верно', 'Неверно'],
        correctAnswer: 'Верно',
        explanation: 'Узбекистан и Лихтенштейн — единственные в мире два государства, изолированные от мирового океана двумя границами.',
      },
      en: {
        question: 'Uzbekistan is one of only two doubly landlocked countries in the world.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Uzbekistan and Liechtenstein are the only two doubly landlocked countries globally, surrounded entirely by other landlocked states.',
      },
    },
  },
  {
    id: 'geo_mountain_1',
    subject: 'Geography',
    topic: 'Lithosphere & Earth Relief',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Yer yuzidagi eng baland cho‘qqi (Everest / Jomolungma) qaysi tog‘ tizmasida joylashgan?',
        options: ['Himoloy tog‘lari', 'Alp tog‘lari', 'And tog‘lari', 'Kavkaz tog‘lari'],
        correctAnswer: 'Himoloy tog‘lari',
        explanation: 'Everest (8848 metr) Osiyo qit\'asidagi Himoloy tog‘ tizmasida, Nepal va Xitoy chegarasida joylashgan.',
      },
      ru: {
        question: 'В какой горной системе находится высочайшая вершина планеты Эверест (Джомолунгма)?',
        options: ['Гималаи', 'Альпы', 'Анды', 'Кавказ'],
        correctAnswer: 'Гималаи',
        explanation: 'Эверест (8848 м) расположен в Гималаях на границе Непала и Китая.',
      },
      en: {
        question: 'In which mountain range is Mount Everest (Chomolungma) located?',
        options: ['Himalayas', 'Alps', 'Andes', 'Caucasus'],
        correctAnswer: 'Himalayas',
        explanation: 'Mount Everest (8,848 m) is situated in the Mahalangur Himal sub-range of the Himalayas on the border of Nepal and China.',
      },
    },
  },
  {
    id: 'geo_river_1',
    subject: 'Geography',
    topic: 'Hydrosphere: Rivers & Lakes',
    type: 'multiple_choice',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'O‘rta Osiyodagi eng sersuv va eng uzun asosiy daryolar qaysilar?',
        options: ['Amudaryo va Sirdaryo', 'Volga va Dnepr', 'Irtish va Ob', 'Nil va Kongo'],
        correctAnswer: 'Amudaryo va Sirdaryo',
        explanation: 'Amudaryo va Sirdaryo O‘rta Osiyo mintaqasining asosiy hayot manbai va eng yirik transchegaraviy daryolari hisoblanadi.',
      },
      ru: {
        question: 'Какие две реки являются главными водными артериями Средней Азии?',
        options: ['Амударья и Сырдарья', 'Волга и Днепр', 'Иртыш и Обь', 'Нил и Конго'],
        correctAnswer: 'Амударья и Сырдарья',
        explanation: 'Амударья и Сырдарья — крупнейшие реки Средней Азии, впадающие в бассейн Аральского моря.',
      },
      en: {
        question: 'Which two rivers serve as the primary historic water arteries of Central Asia?',
        options: ['Amu Darya and Syr Darya', 'Volga and Dnieper', 'Irtysh and Ob', 'Nile and Congo'],
        correctAnswer: 'Amu Darya and Syr Darya',
        explanation: 'The Amu Darya and Syr Darya are the two principal rivers forming the historical Aral Sea drainage basin.',
      },
    },
  },
  // ==========================================
  // ECONOMICS QUESTIONS
  // ==========================================
  {
    id: 'econ_demand_1',
    subject: 'Economics',
    topic: 'Supply and Demand',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Bozorda mahsulotga bo‘lgan talab keskin oshsa, lekin taklif hajmi o‘zgarmay qolsa, narx qanday o‘zgaradi?',
        options: ['Narx oshadi', 'Narx pasayadi', 'Narx mutlaqo o‘zgarmaydi', 'Taklif darhol nolga tushadi'],
        correctAnswer: 'Narx oshadi',
        explanation: 'Talab va taklif qonuniga ko‘ra, xaridorlar talabi taklifdan ortib ketganda tanqislik vujudga keladi va narx ko‘tariladi.',
      },
      ru: {
        question: 'Как изменится цена товара на рынке при резком росте спроса и неизменном предложении?',
        options: ['Цена вырастет', 'Цена упадет', 'Цена останется прежней', 'Спрос обнулится'],
        correctAnswer: 'Цена вырастет',
        explanation: 'Согласно закону спроса и предложения, при превышении спроса над предложением возникает дефицит, стимулирующий рост цен.',
      },
      en: {
        question: 'What happens to the market price of a good when demand surges while supply remains fixed?',
        options: ['Price increases', 'Price decreases', 'Price stays constant', 'Supply falls to zero'],
        correctAnswer: 'Price increases',
        explanation: 'According to the law of supply and demand, excess demand creates a shortage, exerting upward pressure on market prices.',
      },
    },
  },
  {
    id: 'econ_gdp_1',
    subject: 'Economics',
    topic: 'Macroeconomics & GDP',
    type: 'multiple_choice',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'Mamlakat hududida bir yil davomida ishlab chiqarilgan barcha yakuniy tovar va xizmatlar qiymati nima deb ataladi?',
        options: ['Yalpi Ichki Mahsulot (YaIM)', 'Inflyatsiya ko‘rsatkichi', 'Davlat byudjeti kamomadi', 'Tashqi savdo aylanmasi'],
        correctAnswer: 'Yalpi Ichki Mahsulot (YaIM)',
        explanation: 'YaIM (GDP) ma\'lum muddat davomida mamlakat iqtisodiyotida yaratilgan yakuniy mahsulotlar umumiy bozor qiymatini ifodalaydi.',
      },
      ru: {
        question: 'Как называется общая рыночная стоимость всех конечных товаров и услуг, произведенных в стране за год?',
        options: ['Валовой внутренний продукт (ВВП)', 'Уровень инфляции', 'Бюджетный дефицит', 'Торговый баланс'],
        correctAnswer: 'Валовой внутренний продукт (ВВП)',
        explanation: 'ВВП — фундаментальный макроэкономический показатель совокупного объема национального производства.',
      },
      en: {
        question: 'What term describes the total monetary value of all finished goods and services produced within a country over a year?',
        options: ['Gross Domestic Product (GDP)', 'Inflation Rate', 'Fiscal Deficit', 'Trade Balance'],
        correctAnswer: 'Gross Domestic Product (GDP)',
        explanation: 'GDP is the core macroeconomic gauge measuring the market output produced within national boundaries in a given period.',
      },
    },
  },
  // ==========================================
  // MATHEMATICS QUESTIONS
  // ==========================================
  {
    id: 'math_pyth_1',
    subject: 'Mathematics',
    topic: 'Geometry',
    type: 'multiple_choice',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'To‘g‘ri burchakli uchburchakning katetlari 6 sm va 8 sm bo‘lsa, gipotenuzasi necha sm?',
        options: ['10 sm', '12 sm', '14 sm', '16 sm'],
        correctAnswer: '10 sm',
        explanation: 'Pifagor teoremasi: c² = a² + b² = 6² + 8² = 36 + 64 = 100, demak c = √100 = 10 sm.',
      },
      ru: {
        question: 'Катеты прямоугольного треугольника равны 6 см и 8 см. Чему равна гипотенуза?',
        options: ['10 см', '12 см', '14 см', '16 см'],
        correctAnswer: '10 см',
        explanation: 'По теореме Пифагора: c² = 6² + 8² = 36 + 64 = 100, гипотенуза равна 10 см.',
      },
      en: {
        question: 'If the legs of a right triangle are 6 cm and 8 cm, what is the length of the hypotenuse?',
        options: ['10 cm', '12 cm', '14 cm', '16 cm'],
        correctAnswer: '10 cm',
        explanation: 'By the Pythagorean theorem: c² = a² + b² = 36 + 64 = 100, therefore c = 10 cm.',
      },
    },
  },
  {
    id: 'math_eq_1',
    subject: 'Mathematics',
    topic: 'Equations & Inequalities',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Chiziqli tenglamani yeching: 4x - 8 = 24. x ning qiymati nechaga teng?',
        options: ['8', '6', '10', '4'],
        correctAnswer: '8',
        explanation: '4x = 24 + 8 = 32; x = 32 / 4 = 8.',
      },
      ru: {
        question: 'Решите линейное уравнение: 4x - 8 = 24. Чему равен x?',
        options: ['8', '6', '10', '4'],
        correctAnswer: '8',
        explanation: '4x = 32, следовательно x = 32 / 4 = 8.',
      },
      en: {
        question: 'Solve the linear equation: 4x - 8 = 24. What is the value of x?',
        options: ['8', '6', '10', '4'],
        correctAnswer: '8',
        explanation: '4x = 24 + 8 = 32, so x = 32 / 4 = 8.',
      },
    },
  },
  // ==========================================
  // ENGLISH QUESTIONS
  // ==========================================
  {
    id: 'eng_tenses_1',
    subject: 'English',
    topic: 'Grammar & Tenses',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Gapni to‘g‘ri to‘ldiring: "He usually ___ coffee in the morning."',
        options: ['drinks', 'drink', 'drinking', 'drank'],
        correctAnswer: 'drinks',
        explanation: 'Present Simple zamonida 3-shaxs birlik (he/she/it) fe\'liga -s qo‘shimchasi qo‘shiladi: drinks.',
      },
      ru: {
        question: 'Вставьте правильную форму глагола: "He usually ___ coffee in the morning."',
        options: ['drinks', 'drink', 'drinking', 'drank'],
        correctAnswer: 'drinks',
        explanation: 'В Present Simple с местоимением he глагол принимает окончание -s: drinks.',
      },
      en: {
        question: 'Choose the correct form: "He usually ___ coffee in the morning."',
        options: ['drinks', 'drink', 'drinking', 'drank'],
        correctAnswer: 'drinks',
        explanation: 'In the simple present tense with a third-person singular subject (he), the verb takes -s: drinks.',
      },
    },
  },
  {
    id: 'eng_cond_1',
    subject: 'English',
    topic: 'Conditionals',
    type: 'multiple_choice',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'To‘g‘ri shart gap tuzilmasini tanlang: "If it rains tomorrow, we ___ at home."',
        options: ['will stay', 'stayed', 'would stay', 'stay'],
        correctAnswer: 'will stay',
        explanation: 'First Conditional qoidasi: If + Present Simple, will + fe\'lning asosiy shakli (Future Simple).',
      },
      ru: {
        question: 'Выберите правильный вариант: "If it rains tomorrow, we ___ at home."',
        options: ['will stay', 'stayed', 'would stay', 'stay'],
        correctAnswer: 'will stay',
        explanation: 'Правило First Conditional: If + Present Simple, will + глагол.',
      },
      en: {
        question: 'Select the correct form: "If it rains tomorrow, we ___ at home."',
        options: ['will stay', 'stayed', 'would stay', 'stay'],
        correctAnswer: 'will stay',
        explanation: 'First conditional structure requires "will + base verb" in the main clause when predicting real future conditions.',
      },
    },
  },
  // ==========================================
  // PHYSICS QUESTIONS
  // ==========================================
  {
    id: 'phys_ohm_1',
    subject: 'Physics',
    topic: 'Electric Circuits',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Zanjir qismidagi Om qonunining to‘g‘ri formulasini ko‘rsating:',
        options: ['I = U / R', 'U = I / R', 'R = I * U', 'I = U * R'],
        correctAnswer: 'I = U / R',
        explanation: 'Om qonuniga ko‘ra, tok kuchi (I) kuchlanishga (U) to‘g‘ri, qarshilikka (R) teskari mutanosibdir: I = U / R.',
      },
      ru: {
        question: 'Укажите формулу закона Ома для участка цепи:',
        options: ['I = U / R', 'U = I / R', 'R = I * U', 'I = U * R'],
        correctAnswer: 'I = U / R',
        explanation: 'Закон Ома гласит, что сила тока прямо пропорциональна напряжению и обратно пропорциональна сопротивлению: I = U / R.',
      },
      en: {
        question: 'Which formula represents Ohm\'s Law for an electric circuit segment?',
        options: ['I = U / R', 'U = I / R', 'R = I * U', 'I = U * R'],
        correctAnswer: 'I = U / R',
        explanation: 'Ohm\'s Law states that current (I) is directly proportional to voltage (U) and inversely proportional to resistance (R): I = U / R.',
      },
    },
  },
  {
    id: 'phys_newt_1',
    subject: 'Physics',
    topic: 'Newton\'s Laws',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Nyutonning ikkinchi qonuni formulasini aniqlang:',
        options: ['F = m * a', 'E = m * c²', 'p = m * v', 'A = F * s'],
        correctAnswer: 'F = m * a',
        explanation: 'Nyutonning 2-qonuni bo‘yicha kuch (F) jism massasi (m) va uning tezlanishi (a) ko‘paytmasiga teng.',
      },
      ru: {
        question: 'Укажите формулу второго закона Ньютона:',
        options: ['F = m * a', 'E = m * c²', 'p = m * v', 'A = F * s'],
        correctAnswer: 'F = m * a',
        explanation: 'Второй закон Ньютона связывает силу с массой и ускорением: F = m * a.',
      },
      en: {
        question: 'Identify the formula for Newton\'s Second Law of Motion:',
        options: ['F = m * a', 'E = m * c²', 'p = m * v', 'A = F * s'],
        correctAnswer: 'F = m * a',
        explanation: 'Newton\'s second law defines force as the product of mass and acceleration: F = m * a.',
      },
    },
  },
  // ==========================================
  // CHEMISTRY QUESTIONS
  // ==========================================
  {
    id: 'chem_water_1',
    subject: 'Chemistry',
    topic: 'Chemical Bonds',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'Suv molekulasining kimyoviy formulasini ko‘rsating:',
        options: ['H₂O', 'CO₂', 'NaCl', 'H₂SO₄'],
        correctAnswer: 'H₂O',
        explanation: 'Suv 2 ta vodorod va 1 ta kislorod atomidan tashkil topgan kovalent qutbli moddadir: H₂O.',
      },
      ru: {
        question: 'Какова химическая формула воды?',
        options: ['H₂O', 'CO₂', 'NaCl', 'H₂SO₄'],
        correctAnswer: 'H₂O',
        explanation: 'Молекула воды состоит из двух атомов водорода и одного атома кислорода: H₂O.',
      },
      en: {
        question: 'What is the chemical formula of water?',
        options: ['H₂O', 'CO₂', 'NaCl', 'H₂SO₄'],
        correctAnswer: 'H₂O',
        explanation: 'A molecule of water consists of two hydrogen atoms bonded to one oxygen atom: H₂O.',
      },
    },
  },
  {
    id: 'chem_ph_1',
    subject: 'Chemistry',
    topic: 'Acids, Bases & Salts',
    type: 'multiple_choice',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'Neytral eritmada (masalan, sof distillangan suvda) pH qiymati nechaga teng?',
        options: ['7', '0', '14', '1'],
        correctAnswer: '7',
        explanation: 'pH shkalasida 7 neytral muhitni, 7 dan kichigi kislotali, 7 dan kattasi esa ishqoriy muhitni ifodalaydi.',
      },
      ru: {
        question: 'Чему равен показатель pH для нейтрального раствора (чистой воды)?',
        options: ['7', '0', '14', '1'],
        correctAnswer: '7',
        explanation: 'Значение pH = 7 соответствует нейтральной среде, ниже 7 — кислой, выше 7 — щелочной.',
      },
      en: {
        question: 'What is the pH value of a neutral aqueous solution at room temperature?',
        options: ['7', '0', '14', '1'],
        correctAnswer: '7',
        explanation: 'A pH of 7 is neutral; solutions with pH < 7 are acidic, while those with pH > 7 are basic.',
      },
    },
  },
  // ==========================================
  // BIOLOGY QUESTIONS
  // ==========================================
  {
    id: 'bio_photo_1',
    subject: 'Biology',
    topic: 'Photosynthesis',
    type: 'multiple_choice',
    difficulty: 'easy',
    translations: {
      uz: {
        question: 'O‘simliklarda quyosh nuri yordamida organik modda va kislorod hosil bo‘lish jarayoni nima deb ataladi?',
        options: ['Fotosintez', 'Transpiratsiya', 'Glikoliz', 'Fermentatsiya'],
        correctAnswer: 'Fotosintez',
        explanation: 'Xloroplastlarda xlorofill pigmenti vositasida yorug‘lik energiyasi hisobiga organik moddalar sintezlanishi fotosintez deyiladi.',
      },
      ru: {
        question: 'Как называется процесс образования органических веществ и кислорода на свету у растений?',
        options: ['Фотосинтез', 'Транспирация', 'Гликолиз', 'Ферментация'],
        correctAnswer: 'Фотосинтез',
        explanation: 'Фотосинтез — превращение световой энергии в энергию химических связей с выделением кислорода.',
      },
      en: {
        question: 'What is the process by which green plants synthesize organic compounds and release oxygen using sunlight?',
        options: ['Photosynthesis', 'Transpiration', 'Glycolysis', 'Fermentation'],
        correctAnswer: 'Photosynthesis',
        explanation: 'Photosynthesis converts light energy into chemical energy, producing carbohydrates and oxygen from water and CO2.',
      },
    },
  },
  {
    id: 'bio_dna_1',
    subject: 'Biology',
    topic: 'DNA & Genetics',
    type: 'multiple_choice',
    difficulty: 'medium',
    translations: {
      uz: {
        question: 'Organizmning irsiy axborotini saqlovchi va avloddan-avlodga yetkazuvchi asosiy qo‘sh spiral molekula nima?',
        options: ['DNK', 'Ribosoma', 'Insulin', 'Gemoglobin'],
        correctAnswer: 'DNK',
        explanation: 'Dezoksiribonuklein kislota (DNK) tirik organizmlarning irsiy dasturini o‘zida saqlovchi makromolekuladir.',
      },
      ru: {
        question: 'Какая двухцепочечная молекула хранит генетическую информацию живых организмов?',
        options: ['ДНК', 'Рибосома', 'Инсулин', 'Гемоглобин'],
        correctAnswer: 'ДНК',
        explanation: 'ДНК (дезоксирибонуклеиновая кислота) обеспечивает хранение и передачу генетической программы развития.',
      },
      en: {
        question: 'Which double-helical molecule stores the genetic instructions for living organisms?',
        options: ['DNA', 'Ribosome', 'Insulin', 'Hemoglobin'],
        correctAnswer: 'DNA',
        explanation: 'Deoxyribonucleic acid (DNA) carries hereditary genetic instructions utilized in development and function.',
      },
    },
  },
];

/**
 * Helper to get question in current user language ('uz' | 'ru' | 'en')
 */
export function getLocalizedQuestion(questionObj, targetLang = 'uz') {
  const lang = ['uz', 'ru', 'en'].includes(targetLang) ? targetLang : 'uz';
  const localized = questionObj.translations?.[lang] || questionObj.translations?.uz || questionObj.translations?.en;
  
  return {
    id: questionObj.id,
    subject: questionObj.subject,
    topic: questionObj.topic,
    difficulty: questionObj.difficulty,
    type: questionObj.type,
    question: localized?.question || questionObj.question,
    options: localized?.options || questionObj.options || [],
    correctAnswer: localized?.correctAnswer || questionObj.correctAnswer,
    explanation: localized?.explanation || questionObj.explanation,
  };
}
