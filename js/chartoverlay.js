function ChartOverlay (map, chart, overlayOptions, dataSourceOptions){
	this.map = map;
	this.setMap(map);
	this.chart = chart;

	this.timings = overlayOptions.timings;

	this.dataSourceOptions = dataSourceOptions || {};
	this.dataSourceOptions.interval = this.dataSourceOptions.interval || 30000;
	this.dataSourceOptions.method = this.dataSourceOptions.method || "GET";
	this.dataSourceOptions.selector = this.dataSourceOptions.selector || "";
	this.dataSourceOptions.url = this.dataSourceOptions.url || "";

	this._pollHandle = null;
}

ChartOverlay.prototype = new google.maps.OverlayView();

ChartOverlay.prototype.onAdd = function () {
	this.rectTarget = this.map.getBounds().getCenter();
	this.targetLatLng = this.map.getBounds().getCenter();
	this.chartTarget = new google.maps.LatLng(35.4535404, -97.6020877);

	var mouseLayer = d3.select(this.getPanes().overlayMouseTarget);
	var chartLayer = mouseLayer.append("div")
		.attr("class", "charts");

	this.chart.attachChart(chartLayer);
	//this.chart.attachChart(mouseLayer); // use this layer if you wanted mouse events on chart
};

ChartOverlay.prototype.draw = function () {
	this.chart.update(this.getProjection(), this.map.getZoom());
	this.chart.draw();
}

ChartOverlay.prototype.onRemove = function () {
	//TODO remove container and any listeners
	this.stopPolling();
};

ChartOverlay.prototype.focus = function() {
	//this.map.setZoom(12);
	this.map.panTo(this.chart.latLng());
};

ChartOverlay.prototype.activate = function() {
	this.chart.activate();
}

ChartOverlay.prototype.deactivate = function() {
	this.chart.deactivate();
}

ChartOverlay.prototype.poll = function() {
	if(this._pollHandle!==null || this.dataSourceOptions.url==="" || this.dataSourceOptions.interval<=0){ return; }

	var self = this;
	// Essentially the same as setInterval(fn, wait) but this
	// invokes immediately then is invoked as setInterval would
	(function interval(){
		var updateLiveData = function(data){
			self._pollHandle = setTimeout(interval, self.dataSourceOptions.interval);

			if(data===undefined){ console.warn("Invalid data"); return; }
			self.chart.data(data).draw();
		};
		JSONRequest({path:self.dataSourceOptions.url, method:self.dataSourceOptions.method}, function(json){
			var selectors = self.dataSourceOptions.selector
				.split(".")
				.filter(function(s){ return s!==""; });

			if(selectors.length===0){ return updateLiveData(json); }
			if(selectors.length===1){ return updateLiveData(json[selectors[0]]); }
			// Multiple selectors
			var result = selectors.reduce(function(data,prop){
				return data[prop];
			}, json);
			return updateLiveData(result);
		});
	})();
}

ChartOverlay.prototype.stopPolling = function() {
	clearInterval(this._pollHandle);
	this._pollHandle = null;
}

// Copied from index.js
function JSONRequest({path:path, method:method}, callback) {
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

