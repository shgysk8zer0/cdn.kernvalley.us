import { loadImage } from '../..//js/std-js/loader.js';

/**
 * @SEE https://github.com/shgysk8zer0/jekyll-leaflet/blob/master/schema-icon.html
 */

export async function getSchemaIcon(place, {
	height  = 28,
	width   = 28,
	loading = 'lazy',
	slot    = 'icon',
	markers = 'https://cdn.kernvalley.us/img/markers.svg'
} = {}) {
	const url = new URL(markers);

	switch(place['@type']) {
		case 'Restaurant':
		case 'FoodEstablishment':
			url.hash = '#restaurant';
			break;

		case 'FastFoodRestaurant':
			url.hash = '#food';
			break;

		case 'BarOrPub':
			url.hash = '#beer';
			break;

		case 'CafeOrCoffeeShop':
			url.hash = '#cafe';
			break;

		case 'Store':
		case 'GroceryStore':
		case 'WholesaleStore':
			url.hash = '#shopping';
			break;

		case 'Campground':
			url.hash = '#tent';
			break;

		case 'Florist':
			url.hash = '#florist';
			break;

		case 'LodgingBusiness':
		case 'Motel':
		case 'Hotel':
		case 'Resort':
			url.hash = '#hotel';
			break;

		case 'GasStation':
			url.hash = '#gas';
			break;

		case 'Museum':
			url.hash = '#museum';
			break;

		case 'MovieTheater':
			url.hash = '#movie-roll';
			break;

		case 'AutoRepair':
			url.hash = '#engine-outline';
			break;

		case 'BowlingAlley':
			url.hash = '#bowling';
			break;

		case 'FinancialService':
		case 'BankOrCreditUnion':
		case 'AutomatedTeller':
			url.hash = '#atm';
			break;

		case 'Hospital':
			url.hash = '#hospital';
			break;

		case 'FireStation':
			url.hash = '#fire-truck';
			break;

		case 'EmergencyService':
			url.hash = '#ambulance';
			break;

		case 'PoliceStation':
			url.hash = '#police';
			break;

		case 'Pharmacy':
			url.hash = '#pharmacy';
			break;

		case 'Library':
			url.hash = '#library';
			break;

		case 'PostOffice':
			url.hash = '#mailbox';
			break;

		case 'BusStop':
			url.hash = '#bus';
			break;

		case 'Cemetery':
			url.hash = '#grave-stone';
			break;

		case 'Church':
		case 'PlaceOfWorship':
			url.hash = '#church';
			break;

		case 'ParkingFacility':
			url.hash = '#parking';
			break;

		case 'PublicToilet':
			url.hash = '#outhouse';
			break;

		case 'Park':
			url.hash = '#tree';
			break;

		case 'City':
		case 'AdministrativeArea':
			url.hash = '#city';
			break;

		case 'RadioStation':
			url.hash = '#radio-tower';
			break;

		case 'EventVenue':
			url.hash = '#event';
			break;

		case 'EducationalOrganization':
		case 'School':
		case 'Preschool':
		case 'ElementarySchool':
		case 'MidddleSchool':
		case 'HighSchool':
		case 'CollegeOrUniversity':
			url.hash = '#school';
			break;

		case 'TouristAttraction':
		case 'LandmarksOrHistoricalBuildings':
			url.hash = '#pin';
			break;

		case 'Mountain':
			url.hash = '#summit';
			break;

		default:
			url.hash = '#business';
	}

	return await loadImage(url.href, { height, width, loading, slot });
}
