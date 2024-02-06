import fs from 'node:fs';

export default (file) => {
	try {
		return JSON.parse(fs.readFileSync(file));
	} catch (error) {
		return error;
	}
};
