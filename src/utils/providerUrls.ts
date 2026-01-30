import { config } from "@/config";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

// Provider URLs - safe to import in client components
export const wbmUrl = "https://www.wbm.de/wohnungen-berlin/angebote/";

export const friedrichsheimUrl = "https://www.friedrichsheim-eg.de/category/wohnungsangebote-fuer-alle/";

export const gewobagUrl = `https://www.gewobag.de/fuer-mietinteressentinnen/mietangebote/?bezirke_all=1&bezirke%5B%5D=charlottenburg-wilmersdorf&bezirke%5B%5D=charlottenburg-wilmersdorf-charlottenburg&bezirke%5B%5D=charlottenburg-wilmersdorf-nord&bezirke%5B%5D=charlottenburg-wilmersdorf-grunewald&bezirke%5B%5D=charlottenburg-wilmersdorf-schmargendorf&bezirke%5B%5D=charlottenburg-wilmersdorf-wilmersdorf&bezirke%5B%5D=friedrichshain-kreuzberg&bezirke%5B%5D=friedrichshain-kreuzberg-friedrichshain&bezirke%5B%5D=friedrichshain-kreuzberg-kreuzberg&bezirke%5B%5D=lichtenberg&bezirke%5B%5D=lichtenberg-alt-hohenschoenhausen&bezirke%5B%5D=lichtenberg-falkenberg&bezirke%5B%5D=lichtenberg-fennpfuhl&bezirke%5B%5D=lichtenberg-friedrichsfelde&bezirke%5B%5D=lichtenberg-lichtenberg&bezirke%5B%5D=marzahn-hellersdorf&bezirke%5B%5D=marzahn-hellersdorf-marzahn&bezirke%5B%5D=mitte&bezirke%5B%5D=mitte-gesundbrunnen&bezirke%5B%5D=mitte-moabit&bezirke%5B%5D=mitte-wedding&bezirke%5B%5D=neukoelln&bezirke%5B%5D=neukoelln-britz&bezirke%5B%5D=neukoelln-buckow&bezirke%5B%5D=neukoelln-neukoelln&bezirke%5B%5D=neukoelln-rudow&bezirke%5B%5D=pankow&bezirke%5B%5D=pankow-pankow&bezirke%5B%5D=pankow-prenzlauer-berg&bezirke%5B%5D=pankow-weissensee&bezirke%5B%5D=reinickendorf&bezirke%5B%5D=reinickendorf-hermsdorf&bezirke%5B%5D=reinickendorf-reinickendorf&bezirke%5B%5D=reinickendorf-tegel&bezirke%5B%5D=reinickendorf-waidmannslust&bezirke%5B%5D=spandau&bezirke%5B%5D=spandau-falkenhagener-feld&bezirke%5B%5D=spandau-hakenfelde&bezirke%5B%5D=spandau-haselhorst&bezirke%5B%5D=spandau-spandau&bezirke%5B%5D=spandau-staaken&bezirke%5B%5D=spandau-wilhelmstadt&bezirke%5B%5D=steglitz-zehlendorf&bezirke%5B%5D=steglitz-zehlendorf-lichterfelde&bezirke%5B%5D=tempelhof-schoeneberg&bezirke%5B%5D=tempelhof-schoeneberg-lichtenrade&bezirke%5B%5D=tempelhof-schoeneberg-mariendorf&bezirke%5B%5D=tempelhof-schoeneberg-marienfelde&bezirke%5B%5D=tempelhof-schoeneberg-schoeneberg&bezirke%5B%5D=treptow-koepenick&bezirke%5B%5D=treptow-koepenick-adlershof&bezirke%5B%5D=treptow-koepenick-niederschoeneweide&bezirke%5B%5D=treptow-koepenick-oberschoeneweide&objekttyp%5B%5D=wohnung&gesamtmiete_von=&gesamtmiete_bis=${maxWarmRent}&gesamtflaeche_von=${minRoomSize}&gesamtflaeche_bis=&zimmer_von=${minRoomNumber}&zimmer_bis=&sort-by=`;

export const deutscheWohnenUrl = `https://www.deutsche-wohnen.com/mieten/mietangebote?city=Berlin&furnished=0&seniorFriendly=0&subsidizedHousingPermit=egal&immoType=wohnung&priceMax=${maxColdRent}&sizeMin=${minRoomSize}&minRooms=${minRoomNumber}&floor=Beliebig&bathtub=0&bathwindow=0&bathshower=0&kitchenEBK=0&toiletSeparate=0&disabilityAccess=egal&balcony=egal&rentType=miete`;

export const howogeUrl = `https://www.howoge.de/immobiliensuche/wohnungssuche.html?tx_howsite_json_list%5Bpage%5D=1&tx_howsite_json_list%5Blimit%5D=12&tx_howsite_json_list%5Blang%5D=&tx_howsite_json_list%5Bkiez%5D%5B%5D=Friedrichshain-Kreuzberg&tx_howsite_json_list%5Bkiez%5D%5B%5D=Mitte&tx_howsite_json_list%5Bkiez%5D%5B%5D=Lichtenberg&tx_howsite_json_list%5Bkiez%5D%5B%5D=Treptow-K%C3%B6penick&tx_howsite_json_list%5Bkiez%5D%5B%5D=Charlottenburg-Wilmersdorf&tx_howsite_json_list%5Bkiez%5D%5B%5D=Neuk%C3%B6lln&tx_howsite_json_list%5Bkiez%5D%5B%5D=Pankow&tx_howsite_json_list%5Bkiez%5D%5B%5D=Tempelhof-Sch%C3%B6neberg&tx_howsite_json_list%5Brooms%5D=${minRoomSize}`;

export const ebayKleinanzeigenUrl = `https://www.kleinanzeigen.de/s-wohnung-mieten/friedrichshain-kreuzberg/anzeige:angebote/preis:700:${maxColdRent}/c203l26918r5+wohnung_mieten.qm_d:${minRoomSize}%2C+wohnung_mieten.swap_s:nein+wohnung_mieten.zimmer_d:${minRoomNumber}%2C`;

export const dpfUrl = "https://www.dpfonline.de/interessenten/angebote/";

export const stadtUndLandUrl = `https://www.stadtundland.de/immobiliensuche.php?form=stadtundland-expose-search-1.form&sp%3Acategories%5B3352%5D%5B%5D=-&sp%3Acategories%5B3352%5D%5B%5D=__last__&sp%3AroomsFrom%5B%5D=${minRoomNumber}&sp%3AroomsTo%5B%5D=&sp%3ArentPriceFrom%5B%5D=&sp%3ArentPriceTo%5B%5D=&sp%3AareaFrom%5B%5D=${minRoomSize}&sp%3AareaTo%5B%5D=&sp%3Afeature%5B%5D=__last__&action=submit`;

export const gesobauUrl = `https://www.gesobau.de/mieten/wohnungssuche/?tx_solr[filter][]=zimmer:%27${minRoomNumber}-3%27&tx_solr[filter][]=wohnflaeche:%27${minRoomSize}-58%27&tx_solr[filter][]=warmmiete:%270-${maxWarmRent}%27`;

export const dagewoUrl = "https://www.degewo.de/immosuche#openimmo-search-result";

export const vonoviaUrl = `https://www.vonovia.de/zuhause-finden/immobilien?rentType=miete&city=Berlin&lift=0&parking=0&cellar=0&immoType=wohnung&priceMax=${maxWarmRent}&sizeMin=${minRoomSize}&minRooms=${minRoomNumber}&floor=Beliebig&bathtub=0&bathwindow=0&bathshower=0&furnished=0&kitchenEBK=0&toiletSeparate=0&disabilityAccess=egal&seniorFriendly=0&balcony=egal&garden=0&subsidizedHousingPermit=egal&scroll=true`;

export const solidariaetUrl = "https://wg-solidaritaet.de/wohnen/mietangebote/";

export const neuesBerlinUrl = "https://www.neues-berlin.de/wohnen/wohnungsangebote";

export const FriedrichshainEGUrl = "https://wgf.berlin/services/wohnung-finden/#wohnung";

export const berolinaUrl = "https://berolina.info/allgemein/wohnungssuche/";

export const vineta89Url = "https://vineta98.de/wohnungen/";

export const forumKreuzbergUrl = "https://forumkreuzberg.de/s/wohnen/wohnungsangebote/";

export const berlinovoUrl = `https://www.berlinovo.de/de/wohnungen/suche?w%5B0%5D=wohnungen_wohnflaeche%3A%28min%3A${minRoomSize}%2Cmax%3A105%2Call_min%3A${minRoomSize}%2Call_max%3A105%29&w%5B1%5D=wohungen_region%3A6`;

export const paradiesUrl = "https://abg-paradies.de/wohnungsangebote/";

export const wgVorwaertsUrl = "https://www.wg-vorwaerts.de/wohnungssuche/";

export const evmUrl = "https://www.evmberlin.de/wohnungsbestand/";

export const vaterlandUrl = "https://www.bg-vaterland.de/index.php?id=31";

export const adlergroupUrl = `https://www.adler-group.com/suche/wohnung?tx_adleropenimmo_filterbig%5Bsearch%5D%5BmaxPrice%5D=${maxWarmRent}&tx_adleropenimmo_filterbig%5Bsearch%5D%5Brooms%5D=${minRoomNumber}&tx_adleropenimmo_filterbig%5Bsearch%5D%5Bcity%5D=Berlin&tx_adleropenimmo_filterbig%5Bsearch%5D%5BminSurface%5D=${minRoomSize}`;
export const eg1892Url = "https://hpm2.immosolve.eu/immosolve_presentation/pub/modern/2145111/HP/immo.jsp";

export const immoscoutUrl =
    "https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten?enteredFrom=one_step_search";
