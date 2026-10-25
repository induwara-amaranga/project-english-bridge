-- Adds the "sentence_build" exercise/card type (the learner builds an English
-- sentence from a Sinhala one in subject / verb / object / rest boxes; see
-- GradingService and domain/types.ts's SentenceBuildPayload).
alter table cards drop constraint cards_card_type_check;
alter table cards add constraint cards_card_type_check check (card_type in
              ('text', 'mcq', 'gap_fill', 'drag_order', 'match',
               'free_text', 'multi_select', 'essay', 'rubric', 'translate_si_en', 'write_in_front',
               'select_in_front', 'sentence_build'));
