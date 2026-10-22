-- Données de test du carrousel de la page /models : 4 catégories et 6 modèles par catégorie.
-- Rejouable : les catégories sont mises à jour si elles existent, les modèles de test (description « [Test carrousel] ») sont recréés.
-- Lancer : docker exec -i archimeuble-postgres psql -U archimeuble -d archimeuble < scripts/seed-carousel-test-data.sql
-- Nettoyer : DELETE FROM models WHERE description LIKE '[Test carrousel]%';
--            DELETE FROM categories WHERE slug IN ('bibliotheque','meuble-tv','dressing','buffet');
-- Pas de prix renseigné (valeur par défaut) : ce ne sont pas de vraies références.

BEGIN;

INSERT INTO categories (name, slug, description, image_url, display_order, is_active) VALUES
  ('Bibliothèques', 'bibliotheque', 'Bibliothèques et étagères sur mesure', '/images/accueil image/biblio.jpg', 1, TRUE),
  ('Meubles TV', 'meuble-tv', 'Meubles TV et bancs bas sur mesure', '/images/accueil image/meubletv.jpg', 2, TRUE),
  ('Dressings', 'dressing', 'Dressings et armoires sur mesure', '/images/accueil image/dressing.jpg', 3, TRUE),
  ('Buffets', 'buffet', 'Buffets et enfilades sur mesure', '/images/accueil image/buffet.jpg', 4, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  display_order = EXCLUDED.display_order,
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP;

DELETE FROM models WHERE description LIKE '[Test carrousel]%';

INSERT INTO models (name, prompt, description, image_url, category) VALUES
  -- Bibliothèques
  ('Bibliothèque Test 01', 'M1(1800,350,2000)EFbV3(H5(,,,,),H5(,,,,),H5(,,,,))', '[Test carrousel] Bibliothèque murale 3 colonnes', '/images/accueil image/biblio.jpg', 'bibliotheque'),
  ('Bibliothèque Test 02', 'M1(1200,350,2200)EFbV2(H6(,,,,,),H6(,,,,,))', '[Test carrousel] Bibliothèque haute 2 colonnes', '/images/home/hero-bibliotheque.png', 'bibliotheque'),
  ('Bibliothèque Test 03', 'M1(2400,350,1800)EFbV4(H4(,,,),H4(,,,),H4(,,,),H4(,,,))', '[Test carrousel] Bibliothèque large 4 colonnes', '/images/accueil image/biblio.jpg', 'bibliotheque'),
  ('Bibliothèque Test 04', 'M1(900,300,1600)EFbV2(H4(,,,),H4(,,,T))', '[Test carrousel] Petite bibliothèque avec tiroir', '/images/home/hero-bibliotheque.png', 'bibliotheque'),
  ('Bibliothèque Test 05', 'M1(3000,400,2400)EFbV5(H6(,,,,,),H6(,,,,,),H6(,,,,,),H6(,,,,,),H6(,,,,,))', '[Test carrousel] Mur bibliothèque 5 colonnes', '/images/accueil image/biblio.jpg', 'bibliotheque'),
  ('Bibliothèque Test 06', 'M1(1500,350,1200)EFbV3(H3(,,),H3(,,),H3(,,))', '[Test carrousel] Bibliothèque basse 3 colonnes', '/images/home/hero-bibliotheque.png', 'bibliotheque'),
  -- Meubles TV
  ('Meuble TV Test 01', 'M1(1800,450,500)EFbV3(T,,T)', '[Test carrousel] Meuble TV 3 niches', '/images/accueil image/meubletv.jpg', 'meuble-tv'),
  ('Meuble TV Test 02', 'M1(2200,400,450)EFbV4(T,,,T)', '[Test carrousel] Banc TV long 4 niches', '/images/meuble-scandinave.jpg', 'meuble-tv'),
  ('Meuble TV Test 03', 'M1(1400,400,550)EFbV2(T,)', '[Test carrousel] Meuble TV compact', '/images/meuble-moderne.jpg', 'meuble-tv'),
  ('Meuble TV Test 04', 'M1(2600,450,500)EFbV5(T,,,,T)', '[Test carrousel] Meuble TV mural 5 niches', '/images/meuble-compact.jpg', 'meuble-tv'),
  ('Meuble TV Test 05', 'M1(1600,400,600)EFbV3(H2(,),T,H2(,))', '[Test carrousel] Meuble TV avec étagères', '/images/accueil image/meubletv.jpg', 'meuble-tv'),
  ('Meuble TV Test 06', 'M1(2000,500,400)EFbV4(,T,T,)', '[Test carrousel] Banc TV bas', '/images/meuble-scandinave.jpg', 'meuble-tv'),
  -- Dressings
  ('Dressing Test 01', 'M1(2000,600,2400)EFbV3(H4(,,,),,H4(,,,))', '[Test carrousel] Dressing 3 colonnes avec penderie', '/images/accueil image/dressing.jpg', 'dressing'),
  ('Dressing Test 02', 'M1(1200,600,2200)EFbV2(,H5(,,,,))', '[Test carrousel] Armoire 2 colonnes', '/images/photos_meuble_couleur/armoire_blanc_clair.png', 'dressing'),
  ('Dressing Test 03', 'M1(2800,600,2500)EFbV4(H5(T,,,,),,,H5(T,,,,))', '[Test carrousel] Grand dressing 4 colonnes', '/images/photos_meuble_couleur/armoire_bleu_nuit.png', 'dressing'),
  ('Dressing Test 04', 'M1(1000,600,2000)EFbV2(,)', '[Test carrousel] Penderie simple', '/images/photos_meuble_couleur/armoire_grise.png', 'dressing'),
  ('Dressing Test 05', 'M1(2400,600,2400)EFbV3(,H6(T,T,,,,),)', '[Test carrousel] Dressing avec tiroirs centraux', '/images/photos_meuble_couleur/armoire_verte.png', 'dressing'),
  ('Dressing Test 06', 'M1(1600,550,2300)EFbV2(H4(,,,),)', '[Test carrousel] Dressing étagères et penderie', '/images/photos_meuble_couleur/armoire_jaune.png', 'dressing'),
  -- Buffets
  ('Buffet Test 01', 'M1(1800,450,800)EFbV3(T,,T)', '[Test carrousel] Buffet 3 portes', '/images/accueil image/buffet.jpg', 'buffet'),
  ('Buffet Test 02', 'M1(2200,450,750)EFbV4(,T,T,)', '[Test carrousel] Enfilade 4 éléments', '/images/accueil image/buffet.jpg', 'buffet'),
  ('Buffet Test 03', 'M1(1400,450,850)EFbV2(H2(T,T),)', '[Test carrousel] Buffet compact avec tiroirs', '/images/accueil image/buffet.jpg', 'buffet'),
  ('Buffet Test 04', 'M1(2000,500,900)EFbV3(H3(T,T,T),,H3(T,T,T))', '[Test carrousel] Buffet commode', '/images/accueil image/buffet.jpg', 'buffet'),
  ('Buffet Test 05', 'M1(1600,400,700)EFbV2(,)', '[Test carrousel] Buffet bas 2 portes', '/images/accueil image/buffet.jpg', 'buffet'),
  ('Buffet Test 06', 'M1(2600,450,800)EFbV5(,T,,T,)', '[Test carrousel] Grande enfilade 5 éléments', '/images/accueil image/buffet.jpg', 'buffet');

COMMIT;

SELECT c.display_order, c.name, c.slug, COUNT(m.id) AS modeles
FROM categories c LEFT JOIN models m ON m.category = c.slug
GROUP BY c.id ORDER BY c.display_order;
