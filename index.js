import moment from 'moment';
import express from 'express';
import getPort from 'get-port';
import open from 'open';

import formatMoney from './utils/formatMoney.js';
import getJson from './utils/getJson.js';
import guessCategory from './utils/guessCategory.js';


/* Load receipt data */
const data = getJson('./data.json');

/* Exit if there was a problem */
if (data instanceof Error) {
	console.error(data);
	process.exit(1);
}

/*
data
	- Customer Profile And Contact Data
	- Purchase: Array of arrays
		- index 0: In-store receipts (purchase_type=IN_STORE)
		- index 1: Archived in-store receipts? (purchase_type=instore)
		- index 2: Clothing receipts? (purchase_type=FnF)
		- index 3: empty
		- index 4: empty
		- index 5: empty
		- index 6: empty
	- Order: Array of arrays
		- index 0: Online grocery order summaries (no product details)
		- index 1: Archived online grocery order summaries?
		- index 2: empty
		- index 3: empty
		- index 4: empty

*/


const products = {};

/* Go through each receipt */
data.Purchase[0].forEach(receipt => {
	/* Only process receipts for the past 12 months */
	if (moment(receipt.timeStamp).isAfter(moment().subtract(1, 'years'))) {
		/* Go through every product in the receipt */
		receipt.product.forEach(product => {
			/* Tidy up diesel name */
			const name = ['DIESEL  ', 'City Diesel'].includes(product.name) ? 'Diesel' : product.name;

			/* Normalise the price */
			/* Note fuel price is per litre, but quantity is always 1 */
			/* Taking full basket value as the total price, but this probably breaks if you bought fuel and other products on the same receipt */
			const price = receipt.storeFormat === 'Petrol' ? Number(receipt.basketValueGross) : Number(product.price);

			/* Normalise product quantity */
			const quantity = Number(product.quantity);

			/* Normalise receipt date */
			const date = moment(receipt.timeStamp);

			if (name in products) {
				/* If product exists, merge this instance */
				products[name].totalSpent += price * quantity;
				products[name].totalQuantity += quantity;
				products[name].purchases.push({
					quantity,
					price,
					date,
				});
			} else {
				/* If product is new, create new entry */
				products[name] = {
					totalSpent: price * quantity,
					totalQuantity: quantity,
					category: guessCategory(name),
					purchases: [
						{
							quantity,
							price,
							date,
						}
					]
				};
			}
		});
	}
});

/* Order purchases by date */
for (const product in products) {
	products[product].purchases.sort((a,b) => {
		return moment(b.date).format('YYYYMMDD') - moment(a.date).format('YYYYMMDD');
	});
}

/* Sort products by total spend */
const topBuys = Object.keys(products).sort((a,b) => {
	return products[b].totalSpent - products[a].totalSpent;
}).map(buy => {
	/* All prices ever paid for this product */
	const prices = products[buy].purchases.map(o => o.price);

	/* Average price paid per item */
	const totalPrices = prices.reduce((a,c) => a + c, 0);
	const averagePrice = totalPrices / prices.length;

	/* Format into table */
	return {
		product: buy,
		category: products[buy].category,
		qty: products[buy].totalQuantity,
		avgEa: formatMoney(averagePrice),
		maxEa: formatMoney(Math.max(...prices)),
		minEa: formatMoney(Math.min(...prices)),
		total: formatMoney(products[buy].totalSpent),
	};
});

/* Create server */
const app = express();

/* Respond with a table */
app.get('/', function (req, res) {
	let content = `
	<html>
	<head>
		<title>Tesco Receipt Analysis</title>
		<style>
			html {
				font-family: Inter, SF, Arial, sans-serif;
			}

			table {
				margin: 20px auto;
				border-collapse: collapse;
			}

			thead {
				position: sticky;
				top: 0;
			}

			thead th {
				vertical-align: bottom;
				background: #f7f7f7;
			}

			th, td {
				padding: 0.25em 0.5em;
				border: 1px solid #ddd;
			}
		</style>
	</head>
	<body>
	<table>
		<thead>
			<tr>
				<th rowspan="2" align="left">Product</th>
				<th rowspan="2" align="left">Category</th>
				<th rowspan="2" align="right">Qty</th>
				<th colspan="3" align="center">Price each</th>
				<th rowspan="2" align="right">Total spent</th>
			</tr>
			<tr>
				<th align="right">Minimum</th>
				<th align="right">Average</th>
				<th align="right">Maximum</th>
			</tr>
		</thead>
	<tbody>
	`;

	topBuys.forEach(t => {
		if (t.qty > 0) {
			content += `
				<tr>
					<td>${t.product}</td>
					<td>${t.category}</td>
					<td align="right">${t.qty}</td>
					<td align="right">${t.minEa}</td>
					<td align="right">${t.avgEa}</td>
					<td align="right">${t.maxEa}</td>
					<td align="right">${t.total}</td>
				</tr>
			`;
		}
	});
	
	content += `</tbody>
	</table>
	</body></html>`;
	res.send(content);
});

/* Serve and open the page */
const port = await getPort({port: 3000});
app.listen(port);

open(`http://localhost:${port}`);
