-- Adds the "write_in_front" exercise/card type (a list of words, each with a
-- text box in front of it for the related form, e.g. singular -> plural; see
-- GradingService and domain/types.ts's WriteInFrontPayload).
alter table cards drop constraint cards_card_type_check;
alter table cards add constraint cards_card_type_check check (card_type in
              ('text', 'mcq', 'gap_fill', 'drag_order', 'match',
               'free_text', 'multi_select', 'essay', 'rubric', 'translate_si_en', 'write_in_front'));
