function loadJSON({path:path, method:method}, callback) {
	method = method || "GET";
	var xobj = new XMLHttpRequest();
	xobj.overrideMimeType("application/json");
	xobj.open("GET", path, true);
	xobj.onreadystatechange = function() {
		if(xobj.readyState == 4 && xobj.status == "200" ){
			callback(JSON.parse(xobj.responseText));
		}
	};
	xobj.send(null);
}


// should only be called when gmaps is loaded
window.initMap = function() {
	function initialize(config){
		var el = document.querySelector('#map');
		var google = window.google;

		var center = new google.maps.LatLng(config.starting_location.lat, config.starting_location.long);
		var map = new google.maps.Map(el, {
			center: center,
			zoom: 12,
			disableDefaultUI: true,
			mapTypeId: google.maps.MapTypeId.SATELLITE,
		});


		var defaults = {
			content: {
				width: config.overlay_defaults.width || 1200, 
				height: config.overlay_defaults.height || 750, 
				margins: config.overlay_defaults.margins || {bottom:25},
				padding: config.overlay_defaults.padding || {top:45, right:30, bottom:30, left:100},
				zoomNear: config.map_zoom.near || 16, 
				zoomFar: config.map_zoom.far || 12
			},
			cycle: {
				timings: config.overlay_defaults.timings || {panning:5000, zooming:500, viewing:30000 },
			}
		};

		var cycleOptions = {
			panTime:defaults.cycle.timings.panning,
			zoomSpeed:defaults.cycle.timings.zooming,
			viewTime:defaults.cycle.timings.viewing,
				zoomNear: config.map_zoom.near || 16, 
				zoomFar: config.map_zoom.far || 12
		};

		var overlayDefs = [
			config.overlays.find(function(def){
				return def.type==="bar-chart";
			}),
			config.overlays.find(function(def){
				return def.type==="image";
			}),
		];

		var overlays = createCharts(/*config.overlays*/overlayDefs, {center:center, map:map, defaults:defaults});
		overlays.filter(function(o){
			return o.contents.type===BarChart.TYPE;
		}).forEach(function(o){ o.poll(); });

		var cycleInterval = zoomPanCycle(map, overlays.reverse(), cycleOptions);//TODO remove reverse


		d3.select("body").on("keyup", function(){
			switch(d3.event.key){
				case "1": // fallthrough
				case "2": // fallthrough
				case "3": overlays[(+d3.event.key)-1].focus(); break;
				case "ArrowRight": break;
				case "ArrowLeft": break;
				case "Escape":
				case "c": 
					if(cycleInterval!==undefined){
						clearInterval(cycleInterval.handle);
						cycleInterval = undefined;
					}
					break;
				case "t": // currently smoothly pans and zooms 
					if(cycleInterval===undefined){
						cycleInterval = zoomPanCycle(map, overlays, cycleOptions);
					}
					break;
			}
		});

	}
	//window.onload = initialize;
	window.onload = function() {
		loadJSON({path:"/config.json"}, initialize);
	};
};

// TODO Convert to class so we can track the timeout handle in a cleaner manner
function zoomPanCycle(map, overlays, options){
	options = options || {};

	var zoomNear = options.zoomNear;
	var zoomFar = options.zoomFar;

	var startTime;

	function getPanTime(overlay){ return overlay.timings.panning; }
	function getZoomTime(overlay){ return overlay.timings.zooming; }
	function getViewTime(overlay){ return overlay.timings.viewing + getPanTime(overlay) + getZoomTime(overlay); }

	var index = options.start || 0;
	console.log(index, overlays);
	if(index>=overlays.length){ index = overlays.length - 1; }
	overlays[index].activate();

	function getPanEasingAnimator(overlay){
		var panTime = getPanTime(overlay);
		return EasingAnimator.makeFromCallback(function(latLng){
			map.setCenter(latLng);
		}, {duration:panTime});
	}

	function smoothPan(overlay){
		var point = map.getCenter();
		getPanEasingAnimator(overlay).easeProp({
			lat: point.lat(),
			lng: point.lng(),
		}, {
			lat: overlay.latLng().lat(),
			lng: overlay.latLng().lng(),
		}, function(){
			map.setZoom(zoomNear);								
		});
	}

	// Zooms out. Calls callback when done
	function smoothZoomOut(callback){
		map.setZoom(zoomFar);
		var zoomTime = getZoomTime(overlays[index]);
		var handle = setTimeout(function(){
			if(map.getZoom()===zoomFar){
				clearTimeout(handle);
				if(callback){ callback(); }
			}
		}, zoomTime); // interval same as chart svg transform transition duration
	}

	var self = this;
	// Cycles through overlays on an interval
	(function interval(){
		overlays[index].deactivate();
		index = ++index % overlays.length; // clamp from 0-overlays.length-1
		overlays[index].activate();

		smoothZoomOut(function(){
			smoothPan(overlays[index]);
			clearTimeout(self.handle);
			var viewTime = getViewTime(overlays[index]);
			self.handle = setTimeout(interval, viewTime);
		});

	})();
	return this;
}

function createCharts(overlayDefs, options) {
	var center = options.center;
	var map = options.map;
	var defaults = options.defaults;
	var overlays = [];

	function filterInvalidTypes(def){
		return [BarChart.TYPE,ImageContents.TYPE].includes(def.type);
	}

	/**
	 * Builds settings for content.
	 * @param def definition from config file
	 * @param defaults default values
	 */
	function buildContentSettings(def, defaults){
		var settings = {
			width: def.width || defaults.content.width,
			height: def.height || defaults.content.height,
			options: {
				margins: def.margins || defaults.content.margins,
				padding: def.padding || defaults.content.padding,
				zoomNear: def.zoomNear || defaults.content.zoomNear,
				zoomFar: def.zoomFar || defaults.content.zoomFar,
			}
		};
		return settings;
	}

	overlays = overlayDefs.filter(filterInvalidTypes).map(function(def){
		var settings = buildContentSettings(def, defaults);
		var overlayTimings = Object.assign({}, defaults.cycle.timings, def.timings);
		switch(def.type){
			case BarChart.TYPE: return new ChartOverlay(
				map,
				new BarChart(
					new google.maps.LatLng(def.location.lat, def.location.long),
					settings.width,
					settings.height,
					def.data || [],
					settings.options,
				),
				{timings:overlayTimings},
				def.live_data
			);
			case ImageContents.TYPE: return new ImageOverlay(
				map,
				new ImageContents(
					new google.maps.LatLng(def.location.lat, def.location.long),
					settings.width,
					settings.height,
					settings.options,
				),
				{timings:overlayTimings}
			);
		}
	}).filter(function(overlay){ return overlay!==undefined; }); // undefined overlays shouldnt happen

	return overlays;
}
