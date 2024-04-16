export const transformPrice = (priceString: string): number | null => {
    const regex = /(\d{1,3}(\.\d{3})*,\d+)/; // Regex to match number with comma and optional dots

    const match = priceString.match(regex);

    if (match) {
        const numberString = match[0].replace(/\./g, "").replace(",", "."); // Replace dots and comma

        const numberValue = parseFloat(numberString);

        if (!isNaN(numberValue)) {
            return numberValue;
        }
    }

    return null;
};
