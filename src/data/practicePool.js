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
