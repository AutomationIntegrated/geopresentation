// Extend MapOverlay
TextOverlay.prototype = Object.create(MapOverlay.prototype);
TextOverlay.prototype.constructor = MapOverlay;

function TextOverlay(map, textContent, options){
	MapOverlay.apply(this, [map, textContent, options]);
}

TextOverlay.prototype.onAdd = function () {
	this.targetLatLng = this.map.getBounds().getCenter();

	var mouseLayer = d3.select(this.getPanes().overlayMouseTarget);
	var imageLayer = mouseLayer.append("div")
		.attr("class", "text-overlay");

	this.contents.attachTo(imageLayer);
	//this.contents.attachTo(mouseLayer); // use this layer if you wanted mouse events on contents
};

// Extend OverlayContents
TextContents.prototype = Object.create(OverlayContents.prototype);
TextContents.prototype.constructor = OverlayContents;
TextContents.TYPE = "text";

function TextContents(latLng, width, height, text, options) {
	OverlayContents.apply(this, [latLng, width, height, TextContents.TYPE, options]);
	this.text = text;
	this.size = options.size || 16;
}

TextContents.prototype.attachTo = function(selector) {
	this.svg = selector.append("g")
			.attr("width", this.outerWidth)
			.attr("height", this.outerHeight)
			.attr("class", "text-content")
		.append("text")
			.attr("x", 0)
			.attr("font-size", this.size)
			.text(this.text)
			.call(wrap, this.outerWidth);
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
