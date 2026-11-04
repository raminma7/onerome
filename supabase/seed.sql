-- Editorial selection of well-known public places in Rome suitable for a first
-- meeting. No partnership, discount or booking integration is implied:
-- is_partner = false and booking_mode = 'none' until a real agreement exists
-- (configure from the admin panel).
insert into public.venues (slug, name, category, neighborhood, address, description_it, description_en, price_level, booking_mode)
values
  ('sant-eustachio-il-caffe', 'Sant''Eustachio Il Caffè', 'cafe', 'centro-storico', 'Piazza di Sant''Eustachio 82, Roma',
   'Storica torrefazione a due passi dal Pantheon: un espresso al banco è il primo incontro perfetto.',
   'Historic coffee roaster near the Pantheon: an espresso at the counter is the perfect first meeting.', 1, 'none'),
  ('roscioli-caffe', 'Roscioli Caffè', 'cafe', 'centro-storico', 'Piazza Benedetto Cairoli 16, Roma',
   'Caffè e pasticceria vicino a Campo de'' Fiori, ideale per una colazione o un aperitivo leggero.',
   'Coffee and pastries near Campo de'' Fiori, ideal for breakfast or a light aperitivo.', 2, 'none'),
  ('il-goccetto', 'Il Goccetto', 'wine_bar', 'centro-storico', 'Via dei Banchi Vecchi 14, Roma',
   'Enoteca intima con una lunga carta di vini al calice.',
   'Intimate wine bar with a long list of wines by the glass.', 2, 'none'),
  ('litro', 'Litro', 'wine_bar', 'monteverde', 'Via Fratelli Bonnet 5, Roma',
   'Vini naturali e piatti da condividere in un angolo tranquillo di Monteverde.',
   'Natural wines and sharing plates in a quiet corner of Monteverde.', 2, 'none'),
  ('da-enzo-al-29', 'Da Enzo al 29', 'restaurant', 'trastevere', 'Via dei Vascellari 29, Roma',
   'Trattoria romana tradizionale a Trastevere: carbonara, cacio e pepe e atmosfera di quartiere.',
   'Traditional Roman trattoria in Trastevere: carbonara, cacio e pepe and a neighbourhood feel.', 2, 'none'),
  ('fatamorgana-monti', 'Fatamorgana Monti', 'gelateria', 'monti', 'Piazza degli Zingari 5, Roma',
   'Gelato artigianale con gusti originali, da gustare passeggiando per Monti.',
   'Artisan gelato with original flavours, to enjoy while strolling through Monti.', 1, 'none'),
  ('galleria-borghese', 'Galleria Borghese', 'culture', 'pinciano', 'Piazzale Scipione Borghese 5, Roma',
   'Bernini e Caravaggio in una villa nel parco. Ingresso su prenotazione tramite il sito ufficiale.',
   'Bernini and Caravaggio in a villa inside the park. Entry by reservation via the official website.', 2, 'none'),
  ('musei-capitolini', 'Musei Capitolini', 'culture', 'centro-storico', 'Piazza del Campidoglio 1, Roma',
   'Il museo pubblico più antico del mondo, con una vista sui Fori che vale da sola la visita.',
   'The world''s oldest public museum, with a view over the Forums that is worth the visit alone.', 2, 'none'),
  ('giardino-degli-aranci', 'Giardino degli Aranci', 'park', 'aventino', 'Piazza Pietro d''Illiria, Roma',
   'Un giardino all''Aventino con una delle terrazze più romantiche sulla città.',
   'A garden on the Aventine with one of the most romantic terraces over the city.', 1, 'none'),
  ('laghetto-villa-borghese', 'Laghetto di Villa Borghese', 'experience', 'pinciano', 'Viale del Lago, Villa Borghese, Roma',
   'Una gita in barca a remi sul laghetto del Tempio di Esculapio.',
   'A rowing-boat ride on the lake by the Temple of Asclepius.', 1, 'none')
on conflict (slug) do nothing;
