// Extend MapOverlay
ImageOverlay.prototype = Object.create(MapOverlay.prototype);
ImageOverlay.prototype.constructor = MapOverlay;

function ImageOverlay(map, image, options/*, latLng*/){
	MapOverlay.apply(this, [map, image, options]);
}

ImageOverlay.prototype.onAdd = function () {
	this.targetLatLng = this.map.getBounds().getCenter();

	var mouseLayer = d3.select(this.getPanes().overlayMouseTarget);
	var imageLayer = mouseLayer.append("div")
		.attr("class", "images");

	this.contents.attachTo(imageLayer);
	//this.contents.attachTo(mouseLayer); // use this layer if you wanted mouse events on contents
};


// Extend OverlayContents
ImageContents.prototype = Object.create(OverlayContents.prototype);
ImageContents.prototype.constructor = OverlayContents;
ImageContents.TYPE = "image";

function ImageContents(latLng, width, height, url, options) {
	OverlayContents.apply(this, [latLng, width, height, ImageContents.TYPE, options]);
	this.noBackground = options.noBackground || false;
	this.url = url;
	this.image = null;
}

ImageContents.prototype.attachTo = function(selector) {
	this.svg = selector.append("svg")
		.attr("width", this.outerWidth)
		.attr("height", this.outerWidth)
		.attr("class", "image-overlay")
		.style("padding", [this.padding.top, this.padding.right, this.padding.bottom, this.padding.left].join(" "));
	if(this.noBackground){
		this.svg.attr("class", "no-background");
	}
	this.svg.append("g")
		.attr("transform", "translate(" + this.margins.left + "," + this.margins.top + ")")

	this.image = this.svg.append("svg:image")
		.attr("xlink:href", this.url);
};
