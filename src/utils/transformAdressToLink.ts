export const transformAddressToGoogleMapsLink = (address: string) => {
    const googleMapsBaseUrl = "https://www.google.com/maps/search/?api=1&loading=async&query=";

    const transformedAddress = address.split(" ").join("+").split("\n").join("+").split(",").join("%2C");
    return googleMapsBaseUrl + transformedAddress;
};
