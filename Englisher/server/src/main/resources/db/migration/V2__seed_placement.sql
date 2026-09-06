-- Placement test content, ported verbatim from PlacementTest.tsx's QUESTIONS,
-- STAGE_NAMES and STAGE_MESSAGES module constants.
--
-- NOTE ON THE STAGE NAMES BELOW: they are copied exactly as the frontend has
-- them, which means they carry that file's existing drift from
-- CURRICULUM_DEFAULT -- "Adjectives & Prepositions" vs the curriculum's
-- "Adjectives, Adverbs & Prepositions", and "Everyday Translation" vs
-- "Sinhala-English Translation". Seeding the corrected strings here would
-- silently change copy the React app still renders from its own constants, so
-- the port stays faithful and the fix stays a deliberate, separate migration.
-- See SPRINGBOOT-MIGRATION.md section 7, rule 6.

insert into placement_questions (ord, stage, type, prompt, options, correct, sinhala) values
  (1, 1, 'choice',    'Which sentence is correct?',
   '["I eat rice", "I rice eat"]'::jsonb, 'I eat rice', null),
  (2, 1, 'choice',    'Fill the blank: "She ___ to school every day."',
   '["go", "goes"]'::jsonb, 'goes', null),
  (3, 2, 'choice',    'Which sentence uses "because" correctly?',
   '["I was late because traffic.", "I was late because the traffic was heavy."]'::jsonb,
   'I was late because the traffic was heavy.', null),
  (4, 3, 'choice',    'Fill the blank: "The book is ___ the table."',
   '["on", "in"]'::jsonb, 'on', null),
  (5, 4, 'choice',    'Which sentence is passive voice?',
   '["The chef cooked the meal.", "The meal was cooked by the chef."]'::jsonb,
   'The meal was cooked by the chef.', null),
  (6, 5, 'translate', 'Translate this into English:',
   null, null, 'මම පාසැලට යනවා');

insert into placement_stage_copy (stage, name, message) values
  (1, 'Tenses',
   'You''re ready to start at Stage 1 — Tenses. Everyone starts somewhere. This is exactly where you''ll build the strongest foundation.'),
  (2, 'Complex Sentences',
   'You''re ready to start at Stage 2 — Complex Sentences. You''ve already got the basics of word order down. Let''s build from there.'),
  (3, 'Adjectives & Prepositions',
   'You''re ready to start at Stage 3 — Adjectives & Prepositions. You''re already forming full sentences with the right tenses. Time to sharpen the details.'),
  (4, 'Passive Voice',
   'You''re ready to start at Stage 4 — Passive Voice. You''re handling complex sentence structure well. Let''s build on that.'),
  (5, 'Everyday Translation',
   'You''re ready to start at Stage 5 — Everyday Translation. You''re translating between languages naturally already. Let''s put that to work.');
