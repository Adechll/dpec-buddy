# DPEC Buddy — version Supabase

Cette version connecte le questionnaire à la base Supabase du projet DPEC buddy.

## Fichiers

- `index.html` : interface
- `style.css` : mise en forme
- `app.js` : enregistrement, matching et affichage des résultats
- `config.js` : URL et clé publique Supabase
- `migration.sql` : règles SQL complémentaires à exécuter

## Installation

1. Téléverser les fichiers dans le dépôt GitHub.
2. Dans Supabase > SQL Editor, exécuter `migration.sql`.
3. Activer GitHub Pages sur le dépôt.
4. Tester avec un faux M1 et un faux M2 avant la soirée.

## Important

Cette version utilise temporairement un code organisateur côté navigateur et des politiques anonymes pour faciliter le test. Ce n'est pas une sécurité forte : avant une utilisation avec des données personnelles, il faut remplacer ce mécanisme par une authentification Supabase et des règles RLS plus strictes.
