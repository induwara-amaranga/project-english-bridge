import { Course, ShopItem } from '../types';

export const COURSES: Course[] = [
  {
    id: 'english_galaxy',
    title: 'Cosmic Grammar & Syntax',
    iconName: 'Sparkles',
    description: 'Master the cosmic laws of language through orbiting planets and celestial stages.',
    sectors: [
      {
        id: 'sector_1',
        title: 'Sector I: Inner Solar System',
        subtitle: 'Foundations of Verbal Orbit',
        color: '#10B981', // Emerald green
        planets: [
          {
            id: 'planet_1',
            number: 1,
            title: 'Tenses Alpha',
            category: 'Grammar Core',
            description: 'Navigate past, present, and future temporal anomalies.',
            lore: 'A vibrant emerald terra-world where time flows in harmonious loops.',
            type: 'terrestrial',
            colorPrimary: '#10B981',
            colorSecondary: '#059669',
            hasRings: false,
            hasMoons: true,
            moonCount: 1,
            position: { x: 50 },
            lessons: [
              {
                id: 'p1_l1',
                title: 'Simple Present Temporal Beams',
                description: 'Master daily habits and universal truths in space travel.',
                xpReward: 100,
                stardustReward: 20,
                questions: [
                  {
                    id: 'q1',
                    prompt: 'Which sentence correctly uses Simple Present for universal facts?',
                    options: [
                      'The Sun revolves around the Earth.',
                      'The Earth revolves around the Sun.',
                      'The Earth will revolving around the Sun.'
                    ],
                    correctIndex: 1,
                    explanation: 'Universal scientific truths use the simple present tense ("revolves").'
                  },
                  {
                    id: 'q2',
                    prompt: 'Choose the correct form: "Astronaut Zorblax _____ space suits daily."',
                    options: ['wear', 'wears', 'wearing'],
                    correctIndex: 1,
                    explanation: 'Third-person singular ("Zorblax") requires "wears" in the simple present.'
                  },
                  {
                    id: 'q3',
                    prompt: 'Complete the temporal loop: "Light _____ at 300,000 km per second in a vacuum."',
                    options: ['travels', 'traveled', 'is travel'],
                    correctIndex: 0,
                    explanation: 'Scientific constants always take the simple present form.'
                  }
                ]
              },
              {
                id: 'p1_l2',
                title: 'Past Simple Orbit Records',
                description: 'Record historical space exploration milestones.',
                xpReward: 120,
                stardustReward: 25,
                questions: [
                  {
                    id: 'q4',
                    prompt: 'Which verb correctly completes: "Apollo 11 _____ on the Moon in 1969."',
                    options: ['landed', 'lands', 'had land'],
                    correctIndex: 0,
                    explanation: 'Specific completed historical actions use the past simple ("landed").'
                  },
                  {
                    id: 'q5',
                    prompt: 'Identify the irregular past tense form of "fly":',
                    options: ['flied', 'flew', 'flown'],
                    correctIndex: 1,
                    explanation: 'The past simple of "fly" is "flew".'
                  }
                ]
              }
            ]
          },
          {
            id: 'planet_2',
            number: 2,
            title: 'Complex Sentences Planet',
            category: 'Syntax Realm',
            description: 'Synthesize dependent and independent orbital paths.',
            lore: 'A glowing purple gas giant shrouded in luminous auroras and plasma rings.',
            type: 'gas_giant',
            colorPrimary: '#8B5CF6',
            colorSecondary: '#6D28D9',
            hasRings: true,
            hasMoons: true,
            moonCount: 2,
            position: { x: 75 },
            prerequisiteId: 'planet_1',
            lessons: [
              {
                id: 'p2_l1',
                title: 'Subordinating Conjunction Thrusters',
                description: 'Connect clauses with powerful space conjunctions.',
                xpReward: 150,
                stardustReward: 30,
                questions: [
                  {
                    id: 'q6',
                    prompt: 'Which conjunction introduces a cause in: "The rover deployed, _____ the surface was stable."',
                    options: ['although', 'because', 'unless'],
                    correctIndex: 1,
                    explanation: '"Because" establishes the causal link between rover deployment and surface stability.'
                  },
                  {
                    id: 'q7',
                    prompt: 'Identify the complex sentence:',
                    options: [
                      'The rocket launched and the crowd cheered.',
                      'Although fuel was low, the vessel reached orbit successfully.',
                      'Astronauts sleep in zero gravity.'
                    ],
                    correctIndex: 1,
                    explanation: 'Contains an independent clause joined with a dependent clause starting with "Although".'
                  },
                  {
                    id: 'q8',
                    prompt: 'Choose the correct relative pronoun: "The star _____ shone brightest was a supergiant."',
                    options: ['which', 'whom', 'whose'],
                    correctIndex: 0,
                    explanation: 'Use "which" or "that" when referring to non-human cosmic objects like stars.'
                  }
                ]
              }
            ]
          },
          {
            id: 'planet_3',
            number: 3,
            title: 'Adjectives & Prepositions',
            category: 'Modifier World',
            description: 'Calibrate precision spatial modifiers and stellar qualities.',
            lore: 'A mysterious lavender ice-crusted planet floating in soft nebula mist.',
            type: 'ice_world',
            colorPrimary: '#A78BFA',
            colorSecondary: '#4C1D95',
            hasRings: false,
            hasMoons: true,
            moonCount: 1,
            position: { x: 40 },
            prerequisiteId: 'planet_2',
            lessons: [
              {
                id: 'p3_l1',
                title: 'Spatial Prepositions of Cosmos',
                description: 'Pinpoint coordinates in deep space using prepositions.',
                xpReward: 180,
                stardustReward: 35,
                questions: [
                  {
                    id: 'q9',
                    prompt: 'Select the preposition of location: "The satellite orbits _____ Jupiter."',
                    options: ['around', 'during', 'since'],
                    correctIndex: 0,
                    explanation: '"Around" indicates orbital path relative to Jupiter.'
                  },
                  {
                    id: 'q10',
                    prompt: 'Correct order of adjectives: "A _____ space telescope."',
                    options: [
                      'massive silver optical',
                      'optical silver massive',
                      'silver optical massive'
                    ],
                    correctIndex: 0,
                    explanation: 'Standard adjective order: Size (massive) -> Color (silver) -> Purpose (optical).'
                  }
                ]
              }
            ]
          },
          {
            id: 'planet_4',
            number: 4,
            title: 'Passive Voice Core',
            category: 'Action Matrix',
            description: 'Shift focus from galactic agents to affected cosmic events.',
            lore: 'A fiery volcanic planet with molten lava rivers burning brightly in deep space.',
            type: 'lava_planet',
            colorPrimary: '#F59E0B',
            colorSecondary: '#B45309',
            hasRings: false,
            hasMoons: false,
            position: { x: 20 },
            prerequisiteId: 'planet_3',
            lessons: [
              {
                id: 'p4_l1',
                title: 'Passive Transformation Beams',
                description: 'Transform active galactic transmissions into passive telemetry.',
                xpReward: 200,
                stardustReward: 40,
                questions: [
                  {
                    id: 'q11',
                    prompt: 'Active: "The station detected a signal." -> Passive form:',
                    options: [
                      'A signal was detected by the station.',
                      'A signal is detecting the station.',
                      'The station had been detected a signal.'
                    ],
                    correctIndex: 0,
                    explanation: 'Simple past passive takes "was/were + past participle" (was detected).'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'sector_2',
        title: 'Sector II: Vocabulary Nebula',
        subtitle: 'Advanced Lexical Horizons',
        color: '#EC4899', // Pinkish magenta
        planets: [
          {
            id: 'planet_5',
            number: 5,
            title: 'Idioms & Metaphors',
            category: 'Figurative Cosmos',
            description: 'Decipher alien idioms and figurative warp language.',
            lore: 'A shimmering crystal moon that refracts stardust into vibrant color spectrums.',
            type: 'crystal_moon',
            colorPrimary: '#EC4899',
            colorSecondary: '#BE185D',
            hasRings: true,
            hasMoons: false,
            position: { x: 50 },
            prerequisiteId: 'planet_4',
            lessons: [
              {
                id: 'p5_l1',
                title: 'Celestial Idioms',
                description: 'Learn space-inspired figures of speech.',
                xpReward: 220,
                stardustReward: 45,
                questions: [
                  {
                    id: 'q12',
                    prompt: 'What does "Once in a blue moon" mean?',
                    options: ['Every month', 'Very rarely', 'Immediately'],
                    correctIndex: 1,
                    explanation: '"Once in a blue moon" signifies an event that happens extremely rarely.'
                  }
                ]
              }
            ]
          },
          {
            id: 'planet_6',
            number: 6,
            title: 'Supernova Rhetoric',
            category: 'Persuasion Nexus',
            description: 'Harness high-impact communication for interstellar speeches.',
            lore: 'A dazzling supernova remnant glowing with pure plasma energy.',
            type: 'nebula_core',
            colorPrimary: '#06B6D4',
            colorSecondary: '#0E7490',
            hasRings: true,
            hasMoons: true,
            moonCount: 3,
            position: { x: 80 },
            prerequisiteId: 'planet_5',
            lessons: [
              {
                id: 'p6_l1',
                title: 'Rhetorical Devices',
                description: 'Master ethos, pathos, and logos across galactic frontiers.',
                xpReward: 250,
                stardustReward: 50,
                questions: [
                  {
                    id: 'q13',
                    prompt: 'Which literary device repeats initial consonant sounds?',
                    options: ['Alliteration', 'Hyperbole', 'Oxymoron'],
                    correctIndex: 0,
                    explanation: 'Alliteration is the repetition of initial consonant sounds (e.g., "Silent stellar stars").'
                  }
                ]
              }
            ]
          },
          {
            id: 'planet_7',
            number: 7,
            title: 'Black Hole Lexicon',
            category: 'Ultimate Mastery',
            description: 'Survive the gravitational pull of hyper-advanced vocabulary.',
            lore: 'A daunting event horizon pulsing with intense gravitational energy and unknown wisdom.',
            type: 'black_hole',
            colorPrimary: '#6366F1',
            colorSecondary: '#312E81',
            hasRings: true,
            hasMoons: true,
            moonCount: 4,
            position: { x: 30 },
            prerequisiteId: 'planet_6',
            lessons: [
              {
                id: 'p7_l1',
                title: 'Event Horizon Challenge',
                description: 'Synthesize all previous lexical powers to escape the void!',
                xpReward: 300,
                stardustReward: 75,
                questions: [
                  {
                    id: 'q14',
                    prompt: 'Choose the word that means "existing everywhere at once":',
                    options: ['Ubiquitous', 'Ephemeral', 'Esoteric'],
                    correctIndex: 0,
                    explanation: '"Ubiquitous" means present, appearing, or found everywhere.'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'python_cosmos',
    title: 'Python Space Odyssey',
    iconName: 'Code',
    description: 'Program planetary orbits, autonomous space probes, and cosmic AI algorithms.',
    sectors: [
      {
        id: 'py_sector_1',
        title: 'Sector I: Syntax Solar System',
        subtitle: 'Code Command & Variables',
        color: '#3B82F6',
        planets: [
          {
            id: 'py_p1',
            number: 1,
            title: 'Variable Orbit',
            category: 'Core Types',
            description: 'Store telemetry data in Python integers, strings, and floats.',
            lore: 'An azure oceanic planet with glowing data currents visible from space.',
            type: 'terrestrial',
            colorPrimary: '#3B82F6',
            colorSecondary: '#1D4ED8',
            hasRings: false,
            hasMoons: true,
            position: { x: 50 },
            lessons: [
              {
                id: 'py1_l1',
                title: 'Data Type Allocation',
                description: 'Initialize spacecraft telemetry variables.',
                xpReward: 100,
                stardustReward: 20,
                questions: [
                  {
                    id: 'py_q1',
                    prompt: 'Which line correctly assigns string data in Python?',
                    options: [
                      'planet_name = "Alpha Centauri"',
                      'string planet_name = "Alpha Centauri"',
                      'val planet_name = "Alpha Centauri"'
                    ],
                    correctIndex: 0,
                    explanation: 'Python uses dynamic typing; variables are defined with standard assignment (`=`).'
                  }
                ]
              }
            ]
          },
          {
            id: 'py_p2',
            number: 2,
            title: 'Control Flow Moons',
            category: 'Logic Gates',
            description: 'Guide rover navigation with if-else conditionals and loops.',
            lore: 'A cratered moon with neon logic lights spanning across its rocky ridges.',
            type: 'crystal_moon',
            colorPrimary: '#8B5CF6',
            colorSecondary: '#5B21B6',
            hasRings: true,
            hasMoons: false,
            position: { x: 70 },
            prerequisiteId: 'py_p1',
            lessons: [
              {
                id: 'py2_l1',
                title: 'Autonomous Navigation Logic',
                description: 'Write loops to scan obstacle fields.',
                xpReward: 150,
                stardustReward: 30,
                questions: [
                  {
                    id: 'py_q2',
                    prompt: 'What keyword starts a loop over a sequence in Python?',
                    options: ['for', 'foreach', 'loop'],
                    correctIndex: 0,
                    explanation: 'Python uses `for item in sequence:` syntax.'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

export const AVATARS = [
  {
    id: 'zorblax',
    name: 'Zorblax the Space Elephant',
    description: 'The beloved purple galactic explorer with cosmic ears!',
    color: '#8B5CF6',
    unlockedByDefault: true,
    cost: 0,
    svgPath: 'elephant'
  },
  {
    id: 'astro_bunny',
    name: 'Astro Bunny',
    description: 'Agile space jumper with glowing neon whiskers.',
    color: '#EC4899',
    unlockedByDefault: false,
    cost: 100,
    svgPath: 'bunny'
  },
  {
    id: 'captain_nova',
    name: 'Captain Nova Robot',
    description: 'High-precision AI Android pilot.',
    color: '#06B6D4',
    unlockedByDefault: false,
    cost: 200,
    svgPath: 'robot'
  },
  {
    id: 'cosmic_kitty',
    name: 'Cosmic Kitty',
    description: 'Purr-fect zero-gravity specialist.',
    color: '#F59E0B',
    unlockedByDefault: false,
    cost: 300,
    svgPath: 'cat'
  }
];

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'hat_helmet',
    name: 'Gold Astronaut Helmet',
    category: 'hat',
    cost: 80,
    icon: 'Shield',
    description: 'Protects your explorer with reflective solar gold.',
    previewColor: '#F59E0B'
  },
  {
    id: 'hat_crown',
    name: 'Galactic Star Crown',
    category: 'hat',
    cost: 150,
    icon: 'Crown',
    description: 'Forged in the heart of a dying supergiant.',
    previewColor: '#FACC15'
  },
  {
    id: 'trail_stardust',
    name: 'Stardust Aura Trail',
    category: 'trail',
    cost: 120,
    icon: 'Sparkles',
    description: 'Leaves a trailing rainbow stardust path as you hop between planets.',
    previewColor: '#EC4899'
  }
];
