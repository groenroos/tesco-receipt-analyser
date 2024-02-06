export default function (amount) {
	const sterling = new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
	});

	return sterling.format(amount);
};
