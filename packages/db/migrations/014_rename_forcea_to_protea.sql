-- Rename the "Forcea" tee to "Protea" at Fancourt Montagu
-- The correct name per the actual scorecard is "Protea"

UPDATE public.course_tees
SET tee_name = 'Protea'
WHERE tee_name = 'Forcea';
