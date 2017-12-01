// should only be called when gmaps is loaded
window.initMap = function() {
	function initialize(){
		var el = document.querySelector('#map');
		var google = window.google;

		var center = new google.maps.LatLng(35.4535404, -97.6020877);
		var map = new google.maps.Map(el, {
			center: center,
			zoom: 8,
			disableDefaultUI: true,
			mapTypeId: google.maps.MapTypeId.SATELLITE,
		});

		var data = HEADLINES; // from data/headlines
		var margins = {bottom:25};
		var padding = {top:45, right:30, bottom:30, left:100};
		var chartOptions = {width:1200, height:750, margins:margins, padding:padding};

		var overlays = [];
		var valueDeltas = [];

		overlays.push(new ChartOverlay(
			map, 
			new MapBarChart(center, HEADLINES, chartOptions)
		));
		valueDeltas.push(50);

		var freqData = FREQUENCY_DATA.map( d => ({
			key:d.key,
			value:d.freq.low + d.freq.mid + d.freq.high
		}) );
		overlays.push(new ChartOverlay(
			map, 
			new MapBarChart(
				new google.maps.LatLng(35.532813, -97.952580),
				freqData, 
				chartOptions),
		));
		valueDeltas.push(250);

		overlays.push(new ChartOverlay(
			map, 
			new MapBarChart(
				new google.maps.LatLng(35.544596, -97.529507),
				AGE_POPULATION_DATA, // from data/frequency
				chartOptions),
		));
		valueDeltas.push(500000);
		
		var randomHandle = setInterval(function(){
			function randomizeValue(delta){
				function randomizer(d, i){
					var min = Math.ceil(-delta);
					var max = Math.min(delta);
					return {
						key:d.key,
						value:d.value + Math.floor((Math.random() * (max-min) + min))
					};
				}
				return randomizer;
			}
			function sortDescendingValues(a, b){ return b.value - a.value; }

			overlays.forEach(function(overlay, i){
				var delta = valueDeltas[i];
				var values = overlay.chart.data().map(randomizeValue(delta));
				overlay.chart.data(values).draw();
			});
		}, 10000);


		var cycleInterval = zoomPanCycle(map, overlays, {wait:7500});

		d3.select("body").on("keyup", function(){
			switch(d3.event.key){
				case "1": // fallthrough
				case "2": // fallthrough
				case "3": overlays[(+d3.event.key)-1].focus(); break;
				case "ArrowRight": break;
				case "ArrowLeft": break;
				case "Escape":
				case "c": 
					clearInterval(cycleInterval.handle);
					cycleInterval = undefined;
					break;
				case "t": // currently smoothly pans and zooms 
					if(cycleInterval===undefined){
						cycleInterval = zoomPanCycle(map, overlays, {wait:7500});
					}
					break;
			}
		});

	}
	window.onload = initialize;
};

// TODO Convert to class so we can track the timeout handle in a cleaner manner
function zoomPanCycle(map, overlays, options){
	options = options || {};
	var wait = options.wait || 5000;
	var index = options.start || 0;
	if(index>=overlays.length){ index = overlays.length - 1; }

	var panEasingAnim = EasingAnimator.makeFromCallback(function(latLng){
		map.setCenter(latLng);
	}, {duration:1000});

	function smoothPan(overlay){
		var point = map.getCenter();
		panEasingAnim.easeProp({
			lat: point.lat(),
			lng: point.lng(),
		}, {
			lat: overlay.chart.latLng().lat(),
			lng: overlay.chart.latLng().lng(),
		}, function(){
			// currently depending on gmaps 3.31 beta renderer 
			// for smooth zoom animations
			map.setZoom(16);								
		});
	}

	function smoothZoomOut(overlay){
		// currently depending on gmaps 3.31 beta renderer 
		// for smooth zoom animations
		map.setZoom(12);
		var handle = setInterval(function(){
			if(map.getZoom()===12){
				clearInterval(handle);
				smoothPan(overlay);
			}
		}, 250); // interval same as chart svg transform transition duration
	}


	//var handle = setInterval(function(){
	//	var next = index+1;
	//	if(next>=overlays.length){ next = 0; }
	//	var overlay = overlays[next];

	//	smoothZoomOut(overlay);
	//	index = next;
	//}, wait);
	var self = this;
	// Essentially the same as setInterval(fn, wait) but this
	// invokes immediately then is invoked as setInterval would
	(function interval(){
		var next = index+1;
		if(next>=overlays.length){ next = 0; }
		var overlay = overlays[next];
		smoothZoomOut(overlay);
		index = next;

		self.handle = setTimeout(interval, wait);
		return self.handle;
		//return setTimeout(interval, wait);
	})();
	return this;
}
