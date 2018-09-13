// Extend ChartOverlay
DetailOverlay.prototype = Object.create(ChartOverlay.prototype);
DetailOverlay.prototype.constructor = ChartOverlay;

function DetailOverlay(map, latLng, settings){
	var overlayOpts = Object.assign({}, settings.chart, {timings:settings.timings});
	var contentOpts = {margins:settings.margins};
	var details = new DetailContents(latLng, settings, contentOpts);
	ChartOverlay.apply(this, [map, details, overlayOpts, settings.chart.live_data]);
}

DetailOverlay.prototype.onAdd = function () {
	this.targetLatLng = this.map.getBounds().getCenter();

	var mouseLayer = d3.select(this.getPanes().overlayMouseTarget);
	var detailLayer = mouseLayer.append("div")
		.attr("class", "detail-overlay");

	this.contents.attachTo(detailLayer);
	//this.contents.attachTo(mouseLayer); // use this layer if you wanted mouse events on contents
};

// Extend OverlayContents
DetailContents.prototype = Object.create(OverlayContents.prototype);
DetailContents.prototype.constructor = OverlayContents;
DetailContents.TYPE = "detail";

function DetailContents(latLng, settings, options) {
	var width = settings.width;
	var height = settings.height;
	OverlayContents.apply(this, [latLng, width, height, DetailContents.TYPE, options]);

	this.imageSettings = settings.image;
	this.chartSettings = settings.chart;
	this.textSettings = settings.text;

	this.chartContents = this._makeChartContent(latLng, this.margins, settings.chart);
	this.imageContents = this._makeImageContent(latLng, settings);
	this.textContents = this._makeTextContent(latLng, settings.text);

	this.data = this.chartContents.data; // allows polling to work

	// Overwrite active
	var _active = false;
	this.active = function(value){
		if(!arguments.length){ return _active; }
		this.chartContents.active(value);
		this.imageContents.active(value);
		this.textContents.active(value);
		_active = value;
		return this;
	};
}

DetailContents.prototype.attachTo = function(selector) {
	this.svg = selector.append("svg")
		.attr("width", this.outerWidth)
		.attr("height", this.outerHeight)
		.attr("class", "detail-content");

	// add image
	this.innerImage = this.svg.append("g")
		.call(translateGroup, this.margins.left, this.margins.top);
	this.imageContents.attachTo(this.innerImage);

	// add text
	var textDy = this.margins.top + this.imageSettings.height + this.textSettings.padding.top;
	this.innerText = this.svg.append("g")
		.call(translateGroup, this.margins.left, textDy);
	this.textContents.attachTo(this.innerText);

	// add chart
	var chartDx = this.margins.left + this.imageSettings.width + this.chartSettings.padding.left;
	this.innerChart = this.svg.append("g")
		.call(translateGroup, chartDx, this.margins.top);
	this.chartContents.attachTo(this.innerChart);
};

DetailContents.prototype.draw = function() {
	this.chartContents.draw();
};

DetailContents.prototype._makeChartContent = function(latLng, overlayMargins, settings) {
	var width = settings.width + overlayMargins.right;
	var margins = Object.assign({}, settings.margins, {top:settings.margins.top + overlayMargins.top});
	return new BarChart(latLng, width, settings.height, settings.data || [], {
		margins:margins,
		padding:settings.padding,
		xAxisLabel:settings.x_axis_label,
		yAxisLabel:settings.y_axis_label,
		title:settings.title,
	});
};

DetailContents.prototype._makeImageContent = function(latLng, settings) {
	var url = settings.image.url;
	var width = settings.image.width + settings.margins.right;
	var height = settings.image.height + settings.margins.top;
	var margins = Object.assign({}, settings.margins, {bottom:0, right:0});
	var options = {margins:margins, padding:settings.image.padding};
	return new ImageContents(latLng, width, height, url, options);
};

DetailContents.prototype._makeTextContent = function(latLng, settings) {
	return new TextContents(latLng, settings.width, settings.height, settings.value, {size:settings.size});
};

// Cleans up the transform for each content group
function translateGroup(g, dx, dy) {
	g.attr("transform", "translate(" + dx + "," + dy + ")");
}
