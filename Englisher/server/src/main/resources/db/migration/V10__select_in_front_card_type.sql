-- Adds the "select_in_front" exercise/card type (like write_in_front, but the
-- learner picks each answer from a drop-down; see GradingService and
-- domain/types.ts's SelectInFrontPayload).
alter table cards drop constraint cards_card_type_check;
alter table cards add constraint cards_card_type_check check (card_type in
              ('text', 'mcq', 'gap_fill', 'drag_order', 'match',
               'free_text', 'multi_select', 'essay', 'rubric', 'translate_si_en', 'write_in_front',
               'select_in_front'));
