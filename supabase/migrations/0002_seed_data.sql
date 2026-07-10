-- ============================================================
-- Seed: municipalities + business_types for Jersey City MVP
-- ============================================================

INSERT INTO municipalities (id, name, state, county) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Jersey City', 'NJ', 'Hudson');

INSERT INTO business_types (name, description) VALUES
  ('Restaurant', 'Full-service or fast-food dining establishments'),
  ('Retail Store', 'Physical storefront selling goods to consumers'),
  ('Service Business', 'Professional or personal services (salon, repair, consulting, etc.)'),
  ('Contractor', 'Construction, electrical, plumbing, or specialty trade contractor'),
  ('Food Truck / Mobile Vendor', 'Mobile food or retail operation'),
  ('Bar / Nightclub', 'Alcohol-primary establishment'),
  ('Healthcare / Medical', 'Medical office, dental, physical therapy, etc.'),
  ('Childcare / Education', 'Daycare, preschool, tutoring center'),
  ('Gym / Fitness', 'Fitness studio, gym, or wellness center'),
  ('Other', 'Business type not listed above');
