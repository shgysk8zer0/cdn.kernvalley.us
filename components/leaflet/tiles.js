/* @SEE https://leaflet-extras.github.io/leaflet-providers/preview/ */
export const TILES = {
	wikimedia: {
		tileSrc: 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png',
		crossOrigin: 'anonymous',
		detectRetina: true,
		attribution: '<a part="attribution" href="https://wikimediafoundation.org/wiki/Maps_Terms_of_Use" rel="noopener noreferrer nofollow external">Wikimedia</a>'
	},
	osm: {
		tileSrc: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		crossOrigin: 'anonymous',
		detectRetina: false,
		maxZoom: 19,
		attribution: '<span part="attribution">&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer nofollow external">OpenStreetMap</a> contributors</span>',
	},
	natGeo: {
		tileSrc: 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
		crossOrigin: 'anonymous',
		detectRetina: false,
		maxZoom: 16,
		attribution: '<span part="attribution">Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC</span>',
	},
	world: {
		tileSrc: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
		crossOrigin: 'anonymous',
		detectRetina: false,
		attribution: '<span slot="attribution">Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community</span>'
	},
	usImagery: {
		tileSrc:'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
		maxZoom: 20,
		detectRetina: false,
		crossOrigin: 'anonymous',
		attribution: '<span part="attribution">Tiles courtesy of the <a href="https://usgs.gov/" rel="noopener noreferrer nofollow external">U.S. Geological Survey</a></span>'
	},
	openTopo: {
		tileSrc: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
		maxZoom: 17,
		detectRetina: false,
		crossOrigin: 'anonymous',
		attribution: '<span part="attribution">Map data: &copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer nofollow external">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org" rel="noopener noreferrer nofollow external">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
	}
};
