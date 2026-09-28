-- Catalog seed: business, professionals, services and working hours. Also applied to the remote project.
-- Stable UUIDs are shared with the demo-mode fixtures in the app. Idempotent.
insert into agendo.business (id, name, timezone, currency)
values ('00000000-0000-4000-8000-000000000001', 'Northside Barber Co.', 'America/Mexico_City', 'USD')
on conflict do nothing;

insert into agendo.professionals (id, name, bio) values
  ('00000000-0000-4000-8000-000000000101', 'Marco', 'Precision cuts and sharp beard work. Ten years behind the chair.'),
  ('00000000-0000-4000-8000-000000000102', 'Lena', 'Cuts, color and styling. Loves a good transformation.'),
  ('00000000-0000-4000-8000-000000000103', 'Sam', 'Beard specialist and old-school hot towel shaves.')
on conflict do nothing;

insert into agendo.services (id, name, description, duration_minutes, price_cents, sort_order) values
  ('00000000-0000-4000-8000-000000000201', 'Classic haircut', 'Scissor or clipper cut with a clean finish.', 30, 2000, 1),
  ('00000000-0000-4000-8000-000000000202', 'Skin fade', 'Tight fade blended to your preferred length on top.', 45, 2800, 2),
  ('00000000-0000-4000-8000-000000000203', 'Beard trim', 'Shape and line-up for your beard.', 20, 1200, 3),
  ('00000000-0000-4000-8000-000000000204', 'Haircut + beard', 'Classic haircut with a full beard trim.', 60, 3500, 4),
  ('00000000-0000-4000-8000-000000000205', 'Hot towel shave', 'Traditional straight-razor shave with hot towels.', 30, 2200, 5),
  ('00000000-0000-4000-8000-000000000206', 'Kids cut', 'Haircut for children under 12.', 25, 1500, 6)
on conflict do nothing;

insert into agendo.professional_services (professional_id, service_id) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000202'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000202'),
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000203'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000203'),
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000204'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000204'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000205'),
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000206'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000206')
on conflict do nothing;

-- Monday-Friday 09:00-13:00 and 14:00-19:00; Saturday 10:00-16:00; Sunday closed. Sam does not work Mondays.
insert into agendo.working_hours (professional_id, weekday, start_time, end_time)
select p.id, d.weekday, b.start_time, b.end_time
from agendo.professionals p
cross join generate_series(1, 5) as d(weekday)
cross join (values ('09:00'::time, '13:00'::time), ('14:00'::time, '19:00'::time)) as b(start_time, end_time)
where not (p.id = '00000000-0000-4000-8000-000000000103' and d.weekday = 1)
  and not exists (select 1 from agendo.working_hours w where w.professional_id = p.id);

insert into agendo.working_hours (professional_id, weekday, start_time, end_time)
select p.id, 6, '10:00', '16:00'
from agendo.professionals p
where not exists (select 1 from agendo.working_hours w where w.professional_id = p.id and w.weekday = 6);
