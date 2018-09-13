// Extend ChartOverlay
DetailOverlay.prototype = Object.create(ChartOverlay.prototype);
DetailOverlay.prototype.constructor = ChartOverlay;

function DetailOverlay(map, latLng, settings){
	console.log("settings",settings);
	var overlayOpts = Object.assign({}, settings.chart, {timings:settings.timings});
	var contentOpts = {margins:settings.margins};
	var details = new DetailContents(latLng, settings, contentOpts);
	ChartOverlay.apply(this, [map, details, overlayOpts, settings.chart.live_data]);
	console.log("THIS",this);
}

DetailOverlay.prototype.onAdd = function () {
	this.targetLatLng = this.map.getBounds().getCenter();

	var mouseLayer = d3.select(this.getPanes().overlayMouseTarget);
	var detailLayer = mouseLayer.append("div")
		.attr("class", "details");

	this.contents.attachTo(detailLayer);
	//this.contents.attachTo(mouseLayer); // use this layer if you wanted mouse events on contents
};

//DetailOverlay.prototype.draw = function () {
//	this.chartContents.draw();
//}
//
////remove container and any listeners
//DetailOverlay.prototype.onRemove = function () {
//	this.stopPolling();
//};
//
//DetailOverlay.prototype.poll = function() {
//	this.chartContents.poll();
//}
//
//DetailOverlay.prototype.stopPolling = function() {
//	this.chartContents.stopPolling();
//};


// Extend OverlayContents
DetailContents.prototype = Object.create(OverlayContents.prototype);
DetailContents.prototype.constructor = OverlayContents;
DetailContents.TYPE = "detail";

function DetailContents(latLng, settings, options) {
	var width = settings.width;
	var height = settings.height;
	OverlayContents.apply(this, [latLng, width, height, DetailContents.TYPE, options]);
	//this.noBackground = options.noBackground || false;
	//this.url = url;
	//this.image = null;

	var chartWidth = settings.chart.width + settings.margins.right;
	var chartHeight = settings.chart.height;
	var chartMargins = Object.assign({}, settings.chart.margins, {top:settings.chart.margins.top + settings.margins.top});
	var chartPadding = Object.assign({}, settings.chart.padding);
	var chartOptions = {
		margins:chartMargins,
		padding:chartPadding,
		xAxisLabel:settings.chart.x_axis_label,
		yAxisLabel:settings.chart.y_axis_label,
		title:settings.chart.title,
	};
	var chartData = settings.chart.data;

	var imageUrl = settings.image.url;
	var imageWidth = settings.image.width + settings.margins.right;
	var imageHeight = settings.image.height + settings.margins.top;
	var imageMargins = Object.assign({}, settings.margins, {bottom:0, right:0});
	var imageOptions = {margins:imageMargins, padding:settings.image.padding};

	var text = settings.text.value;

	this.imageSettings = settings.image;
	this.chartSettings = settings.chart;
	this.textSettings = settings.text;

	this.chartContents = new BarChart(latLng, chartWidth, chartHeight, chartData, chartOptions);
	this.imageContents = new ImageContents(latLng, imageWidth, imageHeight, imageUrl, imageOptions);
	//this.textContents = new TextContents(latLng, width, height, text, options);
}

DetailContents.prototype.attachTo = function(selector) {
	this.svg = selector.append("svg")
		.attr("width", this.outerWidth)
		.attr("height", this.outerHeight)
		.attr("class", "details-overlay");

	//this.chartContents.attachTo(this.svg);
	//this.textContents.attachTo(this.svg);

// overlay 1200 x 750
// inner 1140 x 690 		// 30px margins
// image 400 x 350 | pos: 0,0 with respect to inner
// text 400 x 320 | pos: 0,400 with respect to inner // 20px padding top
// chart 750 x 690 | pos: 420,30 with respec to inner // 20px padding left

	var translateImage = "translate(" + this.margins.left + "," + this.margins.top + ")";
	var translateText = "translate(" + this.margins.left + "," + (this.margins.top + this.imageSettings.height + this.textSettings.padding.top) + ")";
	var translateChart = "translate(" + (this.margins.left + this.imageSettings.width + this.chartSettings.padding.left) + "," + this.margins.top + ")";

	// add image
	this.innerImage = this.svg.append("g").attr("transform", translateImage);
	this.imageContents.attachTo(this.innerImage);

	// add text
	this.svg.append("g")
			.attr("transform", translateText)
			.attr("width", this.textSettings.width)
			.attr("height", this.textSettings.height)
			.attr("class", "text-svg")
		.append("text")
			.attr("x", 0)
			.attr("dy", 0)
			.attr("font-size", this.textSettings.size || 16)
			.text(this.textSettings.value)
	this.svg.selectAll(".text-svg text").call(wrap, this.textSettings.width); // wrap text

	this.innerChart = this.svg.append("g").attr("transform", translateChart)
	this.chartContents.attachTo(this.innerChart);
	//this.svg.append("svg")
	//	.append("g")
	//		.attr("transform", translateChart)
	//	.append("rect")
	//		.attr("width", this.chartSettings.width)
	//		.attr("height", this.chartSettings.height)
	//		.attr("fill", "blue")
};

DetailContents.prototype.draw = function() {
	this.chartContents.draw();
};

function wrap(text, width) {
    text.each(function() {
        var text = d3.select(this),
			words = text.text().split(/\s+/).reverse(),
			word,
			line = [],
			x = text.attr("x"),
			y = text.attr("y"),
			tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", "0em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if(tspan.node().getComputedTextLength() > width){
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", "1.2em").text(word);
            }
        }
    });
}
