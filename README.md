# Tesco receipt analyser

A little dohickey to convert your Tesco GDPR data into a table of products, sorted by total spend.

1. Get your [Tesco JSON](https://www.tesco.com/account/data-portability/en-GB/), and put in the repo root as `data.json`.
2. `npm ci`
3. `node index`


## Categorisation

Since the raw Tesco data has no metadata about the products you've bought (or even the barcode/EAN), the app will guess the most appropriate product category for each product based on its name.

This data is incomplete and prone to error.  Any product it doesn't know about is tagged 'Groceries' by default.  If you find a miscategorisation, please submit a PR to modify `utils/guessCategory.js` accordingly.
