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
				timings: config.overlay_defaults.timings || {panning:5000, zooming:500, idle:30000 },
			}
		};

		var cycleOptions = {
			panTime:defaults.cycle.timings.panning,
			zoomSpeed:defaults.cycle.timings.zooming,
			idleTime:defaults.cycle.timings.idle,
				zoomNear: config.map_zoom.near || 16, 
				zoomFar: config.map_zoom.far || 12
		};

		var overlays = createCharts(config.overlays, {center:center, map:map, defaults:defaults});

		// Start polling live data links
		overlays.filter(function(o){
			return o.contents.type===BarChart.TYPE;
		}).forEach(function(o){ o.poll(); });


		if(overlays.length===0){ return; } // do nothing
		if(overlays.length===1){ // just center and zoom on the single overlay and stop
			var overlay = overlays[0];
			overlay.activate();
			map.setCenter(overlay.latLng());
			map.setZoom(overlay.contents.zoomNear);								
			return;
		}

		var cycleInterval = zoomPanCycle(map, overlays, cycleOptions);

		function stopCycling(){
			if(cycleInterval===undefined){ return; }
			clearInterval(cycleInterval.handle);
			cycleInterval = undefined;
		}
		function focusOverlay(activeIndex){
			stopCycling();
			overlays.forEach(function(o,i){
				if(i===activeIndex){
					o.activate();
					o.focus();
				}else{
					o.deactivate();
				}
			});
		}

		d3.select("body").on("keyup", function(){
			switch(d3.event.key){
				case "1": // fallthrough
				case "2": // fallthrough
				case "3": // fallthrough
				case "4": // fallthrough
				case "5": // fallthrough
				case "6": // fallthrough
				case "7": // fallthrough
				case "8": // fallthrough
				case "9": focusOverlay((+d3.event.key)-1); break;
				case "ArrowRight": break;
				case "ArrowLeft": break;
				case "Escape":
				case "c": stopCycling(); break;
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

	function getPanTime(overlay){ return overlay.timings.panning; }
	function getZoomTime(overlay){ return overlay.timings.zooming; }
	function getViewTime(overlay){ return overlay.timings.idle + getPanTime(overlay) + getZoomTime(overlay); }

	var index = options.start || 0;
	if(index>=overlays.length){ index = overlays.length - 1; }
	if(index<0){ index = 0; }
	console.log("OVERLAYS",overlays);
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
			var idleTime = getViewTime(overlays[index]);
			self.handle = setTimeout(interval, idleTime);
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
		return [BarChart.TYPE,ImageContents.TYPE,DetailContents.TYPE].includes(def.type);
	}

	/**
	 * Builds settings for content.
	 * @param def definition from config file
	 * @param defaults default values
	 */
	function buildContentSettings(def, defaults){
		var zooms = {
			near: (def.map_zoom && def.map_zoom.near) ? def.map_zoom.near : defaults.content.zoomNear,
			far: (def.map_zoom && def.map_zoom.far) ? def.map_zoom.far : defaults.content.zoomFar,
		};
		var settings = {
			width: def.width || defaults.content.width,
			height: def.height || defaults.content.height,
			options: {
				margins: def.margins || defaults.content.margins,
				padding: def.padding || defaults.content.padding,
				zoomNear: zooms.near,
				zoomFar: zooms.far,
				noBackground: def.no_background || false,
				xAxisLabel: def.x_axis_label,
				yAxisLabel: def.y_axis_label,
			}
		};
		return settings;
	}

	overlays = overlayDefs.filter(filterInvalidTypes).map(function(def){
		var settings = buildContentSettings(def, defaults);
		var overlayTimings = Object.assign({}, defaults.cycle.timings, def.timings);
		switch(def.type){
			//case BarChart.TYPE: return new ChartOverlay(
			//	map,
			//	new BarChart(
			//		new google.maps.LatLng(def.location.lat, def.location.long),
			//		settings.width,
			//		settings.height,
			//		def.data || [],
			//		settings.options,
			//	),
			//	{timings:overlayTimings},
			//	def.live_data
			//);
			//case ImageContents.TYPE: return new ImageOverlay(
			//	map,
			//	new ImageContents(
			//		new google.maps.LatLng(def.location.lat, def.location.long),
			//		settings.width,
			//		settings.height,
			//		def.url,
			//		settings.options,
			//	),
			//	{timings:overlayTimings}
			//);
			case DetailContents.TYPE: return new DetailOverlay(
				map,
				new google.maps.LatLng(def.location.lat, def.location.long),
				Object.assign({}, def, {timings:overlayTimings}),
				//{ width:settings.width, height:settings.height },
				//{ chartData:def.data || [], imageUrl:def.url, text:"YAMOTHER", dataSourceOptions:def.live_data },
				//settings.options,
				//{timings:overlayTimings},

				//new DetailContents(
				//	new google.maps.LatLng(def.location.lat, def.location.long),
				//	settings.width,
				//	settings.height,
				//	{ chartData:def.data || [], imageUrl:def.url, text:"YAMOTHER" },
				//	settings.options,
				//),
			);
		}
	}).filter(function(overlay){ return overlay!==undefined; }); // undefined overlays shouldnt happen

	return overlays;
}
