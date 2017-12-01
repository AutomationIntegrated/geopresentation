function ChartOverlay (map, chart) {
	this.map = map;
	this.setMap(map);
	this.chart = chart;
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
};

ChartOverlay.prototype.focus = function(){
	//this.map.setZoom(12);
	this.map.panTo(this.chart.latLng());
};
