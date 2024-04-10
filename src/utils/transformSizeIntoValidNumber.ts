export const transformSizeIntoValidNumber = (inputString: string) => {
    const match = inputString.match(/\b\d+(,\d+)?\b/);
    return match ? parseFloat(match[0].replace(",", ".")) : null;
};
