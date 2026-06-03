# Extracteur de Relevés – La Banque Postale

Application web permettant d'extraire automatiquement les opérations bancaires à partir des **relevés PDF de La Banque Postale**, et d'exporter les données en **JSON, CSV ou XLSX**.

> **Aucune installation requise.** L'outil fonctionne directement dans le navigateur, sans serveur ni dépendance système.

---

## Pourquoi cet outil ?

Les relevés PDF de La Banque Postale sont difficiles à exploiter :
- impossible de copier-coller proprement les tableaux d'opérations
- pas d'export natif vers Excel ou CSV
- la consultation en ligne (site La Banque Postale) ne permet pas non plus d'exporter les données

Cette application résout ce problème en analysant le PDF **directement dans le navigateur**, sans jamais envoyer de données sur un serveur.

---

## 100 % confidentiel – rien ne quitte votre ordinateur

- Le fichier PDF est lu **localement** par le navigateur
- Aucune donnée n'est transmise à un serveur
- Aucune connexion externe n'est nécessaire

---

## Fonctionnalités

- **Upload simple** : glissez-déposez un PDF de relevé LBP
- **Extraction automatique** :
  - Informations du relevé (numéro, date d'édition)
  - Situation des comptes
  - Compte Courant Postal (ancien solde, opérations, totaux, nouveau solde)
  - Livrets d'épargne (Livret A, Livret Jeune Swing, Livret d'Épargne Populaire)
- **Contrôle de cohérence** : vérification automatique que les soldes et totaux sont cohérents
- **Exports** :
  - **JSON** – structure complète, prête pour une intégration technique
  - **CSV** – format tableur universel (séparateur `;`)
  - **XLSX** – fichier Excel avec feuilles "Opérations" et "Résumé", mise en forme et volets figés
- **Responsive** : utilisable sur ordinateur comme sur mobile

---

## Stack technique

| Couche        | Technologie                                              |
|---------------|----------------------------------------------------------|
| Framework     | [TanStack Start](https://tanstack.com/start) (React 19)  |
| Langage       | TypeScript                                               |
| Styling       | Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com)     |
| Parsing PDF   | [pdfjs-dist](https://github.com/mozilla/pdf.js) (Mozilla)|
| Export XLSX   | [ExcelJS](https://github.com/exceljs/exceljs)            |
| Icônes        | Lucide React                                             |

### Architecture choisie : parsing 100 % navigateur

Le projet a initialement été conçu avec un backend Python/FastAPI utilisant `pdftotext` (Poppler). Cependant, l'environnement de déploiement (Cloudflare Workers / edge runtime) ne permet pas l'exécution de binaires système. Le parser a donc été **entièrement porté en TypeScript** et s'exécute dans le navigateur via `pdfjs-dist`.

Avantages de cette architecture :
- Aucun serveur nécessaire
- Confidentialité maximale (le PDF ne quitte jamais l'appareil de l'utilisateur)
- Déploiement simplifié

---

## Utilisation

1. Ouvrez l'application dans votre navigateur
2. Glissez-déposez (ou sélectionnez) un **relevé PDF de La Banque Postale**
3. Les opérations sont extraites et affichées en tableau
4. Téléchargez le résultat au format souhaité (JSON, CSV ou XLSX)

---

## Portée du parser

Cet outil est conçu pour les **relevés mensuels de La Banque Postale** au format PDF.

Les éléments reconnus :
- En-tête du relevé (numéro, date d'édition)
- Section "Situation de vos comptes"
- Section "Compte Courant Postal" (ancien solde, opérations, totaux, nouveau solde)
- Sections "Comptes d'Épargne" (Livret A, Livret Jeune Swing, Livret d'Épargne Populaire)
- Format des montants avec séparateur de milliers et virgule décimale

> **Attention** : le parser est spécifique à la mise en page des relevés La Banque Postale. Il ne fonctionnera pas avec d'autres banques ou d'autres formats de relevés.

---

## Limites connues

- Le parsing repose sur la reconstruction d'une mise en page fixe à partir des coordonnées textuelles du PDF. Certains relevés avec des mises en page inhabituelles peuvent donner des résultats imprécis.
- Les colonnes `Débit` et `Crédit` sont identifiées par leur position horizontale dans le document. Sur mobile, ces colonnes sont fusionnées en une colonne "Montant" avec signe.
- Le contrôle de cohérence signale un écart si les soldes et totaux ne correspondent pas exactement (tolerance < 0,01 €).

---

## Développement local

```bash
# Installer les dépendances
bun install

# Lancer le serveur de développement
bun run dev
```

---

## Licence

MIT
