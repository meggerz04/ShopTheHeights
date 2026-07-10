-- Allow any authenticated or anonymous user to read reference tables.
-- These tables contain no sensitive data and must be readable to populate
-- dropdowns during onboarding (before a user session exists).

CREATE POLICY "public read business_types" ON business_types
  FOR SELECT USING (true);

CREATE POLICY "public read municipalities" ON municipalities
  FOR SELECT USING (true);
