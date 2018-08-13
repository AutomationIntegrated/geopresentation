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

function ImageContents(latLng, width, height, options) {
	OverlayContents.apply(this, [latLng, width, height, ImageContents.TYPE, options]);
	this.image = null;
}

ImageContents.prototype.attachTo = function(selector) {
	this.svg = selector.append("svg")
		.attr("width", this.width.svg)
		.attr("height", this.height.svg)
		.attr("class", "image-overlay")
		.style("padding", [this.padding.top, this.padding.right, this.padding.bottom, this.padding.left].join(" "));
	this.svg.append("g")
		.attr("transform", "translate(" + this.margins.left + "," + this.margins.top + ")")

	this.image = this.svg.append("svg:image")
		.attr("xlink:href", "https://upload.wikimedia.org/wikipedia/en/thumb/0/00/Carl_Brutananadilewski.png/210px-Carl_Brutananadilewski.png");
}
