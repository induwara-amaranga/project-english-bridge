-- Adds the "translate_si_en" exercise/card type (a Sinhala sentence the
-- learner translates to English, graded against any number of admin-authored
-- accepted translations — see GradingService and domain/types.ts's
-- TranslateSiEnPayload). cards.card_type is the only place the list of known
-- types is enforced at the DB level (V1__init.sql); exercises.type has no
-- matching constraint.
alter table cards drop constraint cards_card_type_check;
alter table cards add constraint cards_card_type_check check (card_type in
              ('text', 'mcq', 'gap_fill', 'drag_order', 'match',
               'free_text', 'multi_select', 'essay', 'rubric', 'translate_si_en'));
