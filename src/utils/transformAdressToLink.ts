export const transformAddressToGoogleMapsLink = (address: string) => {
    const googleMapsBaseUrl = "https://www.google.com/maps/search/?api=1&query=";

    const transformedAddress = address.split(" ").join("+").split(",").join("%2C");
    return googleMapsBaseUrl + transformedAddress;
};
