// should only be called when gmaps is loaded
window.initMap = function() {
	function initialize(){
		var el = document.querySelector('#map');
		var google = window.google;

		var center = new google.maps.LatLng(35.4535404, -97.6020877);
		var map = new google.maps.Map(el, {
			center: center,
			zoom: 12,
			disableDefaultUI: true,
			mapTypeId: google.maps.MapTypeId.SATELLITE,
		});

		var data = HEADLINES; // from data/headlines
		var margins = {bottom:25};
		var padding = {top:45, right:30, bottom:30, left:100};
		var chartOptions = {width:1200, height:750, margins:margins, padding:padding, zoomNear:16, zoomFar:12};

		var overlays = createCharts({center:center, map:map, chartOptions:chartOptions});
		var cycleOptions = {panTime:2000,zoomSpeed:1000,viewTime:10000};
		var cycleInterval = zoomPanCycle(map, overlays, cycleOptions);

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
	window.onload = initialize;
};

// TODO Convert to class so we can track the timeout handle in a cleaner manner
function zoomPanCycle(map, overlays, options){
	options = options || {};

	var panTime = options.panTime || 5000;
	var zoomSpeed = options.zoomSpeed || 500;
	var viewTime = (options.viewTime || 10000) + panTime + zoomSpeed; // add pan and zoom times for actual view time
	var zoomNear = options.zoomNear || 16;
	var zoomFar = options.zoomFar || 12;

	var index = options.start || 0;
	if(index>=overlays.length){ index = overlays.length - 1; }
	overlays[index].activate();

	var startWait;

	var panEasingAnim = EasingAnimator.makeFromCallback(function(latLng){
		map.setCenter(latLng);
	}, {duration:panTime});

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
			map.setZoom(zoomNear);								
			startWait = Date.now();
		});
	}

	function smoothZoomOut(overlay){
		// currently depending on gmaps 3.31 beta renderer 
		// for smooth zoom animations
		map.setZoom(zoomFar);
		console.log("time waited", Date.now() - startWait);
		var handle = setInterval(function(){
			if(map.getZoom()===zoomFar){
				clearInterval(handle);
				smoothPan(overlay);
			}
		}, zoomSpeed); // interval same as chart svg transform transition duration
	}

	var self = this;
	// Essentially the same as setInterval(fn, wait) but this
	// invokes immediately then is invoked as setInterval would
	(function interval(){
		overlays[index].deactivate();
		index = ++index % overlays.length; // clamp from 0-overlays.length-1
		overlays[index].activate();

		smoothZoomOut(overlays[index]);

		self.handle = setTimeout(interval, viewTime);
		return self.handle;
	})();
	return this;
}

function createCharts(options) {
	var center = options.center;
	var map = options.map;
	var chartOptions = options.chartOptions;
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


	return overlays;
}
