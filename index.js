import fs from 'node:fs';
import moment from 'moment';
import express from 'express';
const app = express();

const data = JSON.parse(fs.readFileSync('./data.json'));

const formatMoney = function (amount) {
	const sterling = new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
	});

	return sterling.format(amount);
};

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
	if (moment(receipt.timeStamp).isAfter(moment().subtract(1, 'years'))) {
		receipt.product.forEach(product => {
			const name = product.name === 'DIESEL  ' ? 'Diesel' : product.name;
			const price = product.name === 'DIESEL  ' ? Number(receipt.basketValueGross) : Number(product.price);
			const quantity = Number(product.quantity);
			const date = moment(receipt.timeStamp);

			if (name in products) {
				products[name].totalSpent += price;
				products[name].totalQuantity += quantity;
				products[name].purchases.push({
					quantity,
					price,
					date,
				});
			} else {
				products[name] = {
					totalSpent: price,
					totalQuantity: quantity,
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

/* Get 20 most bought products */
const topBuys = Object.keys(products).sort((a,b) => {
	return products[b].totalSpent - products[a].totalSpent;
}).map(buy => {
	return {
		product: buy,
		qty: products[buy].totalQuantity,
		ea: formatMoney(Math.max(...products[buy].purchases.map(o => o.price))),
		total: formatMoney(products[buy].totalSpent)
	};
});




app.get('/', function (req, res) {
	let content = `<html><head><title>Tesco</title></head><body>
	<table border=1 cellpadding=4>
	<thead><tr><th>Product</th><th align=right>Qty</th><th align=right>Ea</th><th align=right>Total spent</th></thead>
	<tbody>`;

	topBuys.forEach(t => {
		content += `<tr><td>${t.product}</td><td align=right>${t.qty}</td><td align=right>${t.ea}</td><td align=right>${t.total}</td></tr>`;
	});
	
	content += `</tbody>
	</table>
	</body></html>`;
	res.send(content);
});

app.listen(3000);
