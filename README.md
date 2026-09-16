# DPEC Buddy

Prototype d'application web de parrainage M1/M2.

## Fonctionnalités
- Questionnaire unique accessible via QR code ou URL.
- Distinction M1/M2.
- Stockage local des réponses dans le navigateur.
- Tableau organisateur.
- Matching global avec capacité maximale de 2 filleuls par M2.
- Révélation des binômes après lancement.

## Limite importante
Ce prototype stocke les données dans le navigateur (`localStorage`) : il fonctionne pour une démonstration sur un même appareil, mais n'est pas encore une application multi-utilisateur en ligne.

Pour une vraie soirée, il faudra remplacer le stockage local par une base de données partagée et déployer l'application sur un hébergeur.
