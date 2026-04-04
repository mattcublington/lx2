-- Add GPS coordinates to courses for nearby search
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

-- Seed known club coordinates
UPDATE public.courses SET lat = 51.3280, lng = -2.2530
  WHERE club ILIKE '%Cumberwell%' AND lat IS NULL;

UPDATE public.courses SET lat = -35.2975, lng = 149.1040
  WHERE club ILIKE '%Royal Canberra%' AND lat IS NULL;

UPDATE public.courses SET lat = -33.9940, lng = 22.4460
  WHERE club ILIKE '%Fancourt%' AND lat IS NULL;

UPDATE public.courses SET lat = 51.3530, lng = -0.5660
  WHERE club ILIKE '%Foxhills%' AND lat IS NULL;
