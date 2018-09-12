// Extend ChartOverlay
DetailOverlay.prototype = Object.create(ChartOverlay.prototype);
DetailOverlay.prototype.constructor = ChartOverlay;

//function DetailOverlay(map, image, options, dataSourceOptions){
//function DetailOverlay(map, latLng, size, data, contentOptions, overlayOptions){
function DetailOverlay(map, latLng, settings){
	//MapOverlay.apply(this, [map, image, options]);
	console.log("settings",settings);
	var overlayOpts = Object.assign({}, settings.chart, {timings:settings.timings});
	//ChartOverlay.apply(this, [map, null, overlayOpts, settings.chart.live_data]);
	//console.log("map",map);
	//console.log("latLng",latLng);
	//console.log("size",size);
	//console.log("data",data);
	//console.log("contentOptions",contentOptions);
	//console.log("overlayOptions",overlayOptions);


	//var details = new DetailContents(latLng, settings.width, settings.height, settings.chart.data || [], settings.chart);
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

	var chartData = [];//settings.chart.data;
	var imageUrl = settings.image.url;
	var text = settings.text.value;

	this.settings = settings;
	console.log(settings.margins);

	this.chartContents = new BarChart(latLng, width, height, chartData, options);
	this.imageContents = new ImageContents(latLng, width, height, imageUrl, options);
	//this.textContents = new TextContents(latLng, width, height, text, options);
}

DetailContents.prototype.attachTo = function(selector) {
	this.svg = selector.append("svg")
		.attr("width", this.outerWidth)
		.attr("height", this.outerHeight)
		.attr("class", "details-overlay");

	//this.chartContents.attachTo(this.svg);
	//this.imageContents.attachTo(this.svg);
	//this.textContents.attachTo(this.svg);

// overlay 1200 x 750
// inner 1140 x 690 		// 30px margins
// image 400 x 350 | pos: 0,0 with respect to inner
// text 400 x 320 | pos: 0,400 with respect to inner // 20px padding top
// chart 750 x 690 | pos: 420,30 with respec to inner // 20px padding left


	this.svg.append("svg")
		.append("g")
			.attr("transform", "translate(30, 30)")
		.append("rect")
			.attr("width", this.settings.image.width)
			.attr("height", this.settings.image.height)
			.attr("fill", "green")
	this.svg.append("g")
			.attr("transform", "translate(30, 420)")
			.attr("width", this.settings.text.width)
			.attr("height", this.settings.text.height)
			.attr("class", "text-svg")
		.append("text")
			.attr("x", 0)
			.attr("dy", 1)
			.attr("font-size", 16)
			.text(this.settings.text.value)
	this.svg.selectAll(".text-svg text").call(wrap, this.settings.text.width); // wrap text

	this.svg.append("svg")
		.append("g")
			.attr("transform", "translate(450, 30)")
		.append("rect")
			.attr("width", this.settings.chart.width)
			.attr("height", this.settings.chart.height)
			.attr("fill", "blue")
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
