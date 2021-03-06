ChartOverlay.prototype = Object.create(MapOverlay.prototype);
ChartOverlay.prototype.constructor = MapOverlay;

function ChartOverlay (map, chart, options, dataSourceOptions){
	MapOverlay.apply(this, [map, chart, options]);

	this.dataSourceOptions = dataSourceOptions || {};
	this.dataSourceOptions.interval = this.dataSourceOptions.interval || 30000;
	this.dataSourceOptions.method = this.dataSourceOptions.method || "GET";
	this.dataSourceOptions.selector = this.dataSourceOptions.selector || "";
	this.dataSourceOptions.url = this.dataSourceOptions.url || "";

	this._pollHandle = null;
}

ChartOverlay.prototype.onAdd = function () {
	this.targetLatLng = this.map.getBounds().getCenter();

	var mouseLayer = d3.select(this.getPanes().overlayMouseTarget);
	var chartLayer = mouseLayer.append("div")
		.attr("class", "chart-overlay");

	this.contents.attachTo(chartLayer);
	//this.contents.attachChart(mouseLayer); // use this layer if you wanted mouse events on chart
};

ChartOverlay.prototype.draw = function () {
	MapOverlay.prototype.draw.call(this);
	this.contents.draw();
}

//remove container and any listeners
ChartOverlay.prototype.onRemove = function () {
	this.stopPolling();
};

ChartOverlay.prototype.poll = function() {
	if(this._pollHandle!==null || this.dataSourceOptions.url==="" || this.dataSourceOptions.interval<=0){ return; }

	var self = this;
	// Essentially the same as setInterval(fn, wait) but this
	// invokes immediately then is invoked as setInterval would
	(function interval(){
		var updateLiveData = function(data, keyProp="key", valueProp="value"){
			self._pollHandle = setTimeout(interval, self.dataSourceOptions.interval);

			var mappedData = data.map(function(d,index){
				var key = (keyProp==="*") ? ""+index : ""+d[keyProp];
				var value = (valueProp==="*") ? d : d[valueProp];
				return {key:key, value:value};
			});

			if(mappedData===undefined){ console.warn("Invalid data"); return; }
			self.contents.data(mappedData).draw();
		};
		JSONRequest({path:self.dataSourceOptions.url, method:self.dataSourceOptions.method}, function(json){
			var selectors = self.dataSourceOptions.selector
				.split(".")
				.filter(function(s){ return s!==""; });
			var key = self.dataSourceOptions.key_property;
			var value = self.dataSourceOptions.value_property;

			if(selectors.length===0){ return updateLiveData(json, key, value); }
			if(selectors.length===1){ return updateLiveData(json[selectors[0]], key, value); }
			// Multiple selectors
			var result = selectors.reduce(function(data,prop){
				return data[prop];
			}, json);
			return updateLiveData(result, key, value);
		});
	})();
}

ChartOverlay.prototype.stopPolling = function() {
	clearInterval(this._pollHandle);
	this._pollHandle = null;
};

// Copied from index.js
function JSONRequest({path:path, method:method}, callback) {
	method = method || "GET";
	var xobj = new XMLHttpRequest();
	xobj.overrideMimeType("application/json");
	xobj.open(method, path, true);
	xobj.onreadystatechange = function() {
		if(xobj.readyState == 4 && xobj.status == "200" ){
			callback(JSON.parse(xobj.responseText));
		}
	};
	xobj.send(null);
}
