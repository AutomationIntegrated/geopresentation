MapOverlay.prototype = new google.maps.OverlayView();

/**
 * GMaps OverlayView implementation. Wraps an OverlayContents object for placement on a map
 * @param map Google Maps object
 * @param contents CoverlayContents object
 * @param options options object containing timings settings for cycling
 */
function MapOverlay(map, contents, options){
	this.map = map;
	this.setMap(map);
	this.contents = contents;

	this.timings = options.timings;

	this.transformer = new OverlayContentsTransformer(this.contents);
}

// Override in child. Add elements to layer
MapOverlay.prototype.onAdd = function() {};

MapOverlay.prototype.draw = function () {
	this.transformer.update(this.getProjection(), this.map.getZoom());
}

//remove container and any listeners
MapOverlay.prototype.onRemove = function() {};

MapOverlay.prototype.focus = function() {
	this.map.panTo(this.contents.latLng());
	this.map.setZoom(this.contents.zoomNear);
};

MapOverlay.prototype.activate = function() {
	this.contents.active(true);
};

MapOverlay.prototype.deactivate = function() {
	this.contents.active(false);
};

MapOverlay.prototype.latLng = function(){
	return this.contents.latLng();
};

var defaults = {
	width: 600,
	height: 400,
	padding: {top:0, right:0, bottom:0, left:0},
	margins: {top:0, right:0, bottom:0, left:0},
};

/**
 * The contents within a MapOverlay
 * @param latLng google.maps.LatLng
 * @param width width of the svg
 * @param height height of the svg
 * @param type the type of contents. Expects some unique string identifier
 * @param options options containing margins, padding, zoomFar, and zoomNear values
 */
function OverlayContents(latLng, width, height, type, options){
	options = options || {};

	this.type = type;

	this.margins = (options.margins===undefined) ? defaults.margins : {
		top: +options.margins.top || +defaults.margins.top,
		right: +options.margins.right || +defaults.margins.right,
		bottom: +options.margins.bottom || +defaults.margins.bottom,
		left: +options.margins.left || +defaults.margins.left,
	};
	this.padding = (options.padding===undefined) ? defaults.padding : {
		top: +options.padding.top || +defaults.padding.top,
		right: +options.padding.right || +defaults.padding.right,
		bottom: +options.padding.bottom || +defaults.padding.bottom,
		left: +options.padding.left || +defaults.padding.left,
	};
	this.zoomFar = options.zoomFar || 12;
	this.zoomNear = options.zoomNear || 16;

	this.svg = null;


	var margins = this.margins;
	var padding = this.padding;

	this.outerWidth = width;
	this.outerHeight = height;

	this.innerWidth = this.outerWidth - margins.left - margins.right;
	this.innerHeight = this.outerHeight - margins.top - margins.bottom;

	// Actual content area sizes
	this.width = this.innerWidth - padding.left - padding.right;
	this.height = this.innerHeight - padding.top - padding.bottom;

	var _latLng = latLng;
	this.latLng = function(value){
		if(!arguments.length) return _latLng;
		_latLng = value;
		return this;
	};

	var _active = false;
	this.active = function(value){
		if(!arguments.length){ return _active; }
		_active = value;
		return this;
	}

	var _zoomScale = d3.scaleQuantize()
		.domain([this.zoomFar, this.zoomNear])
		//.range([0.15, 0.35, 0.4, 0.45, 0.475, 0.5, 0.55, 0.6, 0.8]);
		.range([0.15, 0.35, 0.4, 0.45, 0.475, 0.5, 0.55, 0.6, 0.8,1]);//TODO REMOVE
	this.zoomScale = function(value){
		if(!arguments.length) return _zoomScale;
		_zoomScale = value;
		return this;
	};

	var _scale = 0.01;
	this.scale = function(value){
		if(!arguments.length) return _scale;
		_scale = value;
	};

	var _translate = {x:0,y:0};
	this.translate = function(xVal, yVal){
		if(!arguments.length) return _translate;
		_translate.x = xVal;
		_translate.y = yVal;
	};

}
	
OverlayContents.prototype.setScale = function(mapZoom){
	var zoomFn = this.zoomScale();
	var scale = zoomFn( this.active() ? mapZoom : this.zoomFar );
	this.scale(scale);
};


/**
 * This transforms OverlayContent types when panning and zooming on
 * it's svg element
 * @param overlayContents the contents to transform
 */
function OverlayContentsTransformer(overlayContents){
	this.entity = overlayContents;
}

OverlayContentsTransformer.prototype.update = function(proj, mapZoom){
	var contentsWidth = this.entity.width;
	var contentsHeight = this.entity.height;
	var margins = this.entity.margins;
	var padding = this.entity.padding;
	var contentsPadding = {
		x: padding.left + padding.right + margins.left + margins.right,
		y: padding.top + padding.bottom + margins.top + margins.bottom,
	};

	var x = proj.fromLatLngToDivPixel(this.entity.latLng()).x;
	var y = proj.fromLatLngToDivPixel(this.entity.latLng()).y;

	this.entity.setScale(mapZoom);

	this.entity.translate((x-contentsWidth*0.5-contentsPadding.x*0.5), (y-contentsHeight*0.5-contentsPadding.y*0.5));
	this.transform();
};

OverlayContentsTransformer.prototype.transform = function(){
	var self = this;
	var translate = "translate(" + this.entity.translate().x + "," + this.entity.translate().y + ")";
	var scale = "scale(" + this.entity.scale() + ")";
	
	var transform = this.entity.svg.attr("transform") || "";
	var oldTranslate = transform.split("scale")[0] || "";
	var oldScale = transform.split("scale")[1];
	if(oldScale===undefined){
		oldScale = scale; // initial scale
	}else{
		oldScale = "scale" + oldScale;
	}

	this.entity.svg.transition()
		.attr("transform", translate+scale)
		.duration(1000)
		.attrTween("transform", function(d){
			return d3.interpolateString(translate+oldScale, translate+scale);
		});
};
