var defaults = {
	width: 600,
	height: 400,
	padding: {top:0, right:0, bottom:0, left:0},
	margins: {top:0, right:0, bottom:0, left:0},
};

function clamp(value, min, max){
	if(value>max){ return max; }
	if(value<min){ return min; }
	return value;
}

function BarChart(data, options){
	options = options || {};
	var width = options.width || defaults.width;
	var height = options.height || defaults.height;
	var margins = (options.margins===undefined) ? defaults.margins : {
		top: options.margins.top || defaults.margins.top,
		right: options.margins.right || defaults.margins.right,
		bottom: options.margins.bottom || defaults.margins.bottom,
		left: options.margins.left || defaults.margins.left,
	};
	var padding = (options.padding===undefined) ? defaults.padding : {
		top: options.padding.top || defaults.padding.top,
		right: options.padding.right || defaults.padding.right,
		bottom: options.padding.bottom || defaults.padding.bottom,
		left: options.padding.left || defaults.padding.left,
	};

	var _data = data;
	this.data = function(value){
		if(!arguments.length){ return _data; }
		_data = value;
		return this;
	};

	// Compute sizes for svg and chart
	this.width = {
		chart: width - margins.left - margins.right - padding.left - padding.right,
		svg: width + margins.left + margins.right - padding.left - padding.right,
	};
	this.height = {
		chart: height - margins.top - margins.bottom - padding.top - padding.bottom,
		svg: height + margins.top + margins.bottom - padding.top - padding.bottom,
	};
	this.margins = margins;
	this.padding = padding;
	
	// Initial set up of our scales
	// input => domain | output => range
	var x = d3.scaleBand()
		.rangeRound([0, this.width.chart])
		.padding(0.1);
	var y = d3.scaleLinear()
		.domain([0, this.height.chart]) // placeholder for now until we know our maximum value
		.range([0, this.height.chart]);
		
	this.scales = { x:x, y:y };

	this.svg = null;
}

// Computes the y position for a bar where 0 <= y <= chartHeight
BarChart.prototype._computeBarY = function(d){
	var computed = this.height.chart - this.scales.y(d.value);
	return clamp(computed, 0, this.height.chart);
}

// Computes bar height where 0 <= barHeight <= chartHeight
BarChart.prototype._computeBarHeight = function(d){
	var computed = this.scales.y(d.value);
	return clamp(computed, 0, this.height.chart);
}

BarChart.prototype._computeBarLabelX = function(d){
	var x = this.scales.x;
	return x(d.key)+x.bandwidth()/2;
}

BarChart.prototype._computeBarLabelY = function(d){
	var computed = this.height.chart - this.scales.y(d.value)-5;
	return clamp(computed, -5, this.height.chart-5);

}

BarChart.prototype.attachChart = function(selector){
	selector.selectAll("svg").remove();
	// Create svg element
	var svg = selector.append("svg")
		.attr("width", this.width.svg)
		.attr("height", this.height.svg)
		.attr("class", "chart bar-chart")
		.style("padding", [this.padding.top, this.padding.right, this.padding.bottom, this.padding.left].join(" "));
	svg.append("g")
		.attr("transform", "translate(" + this.margins.left + "," + this.margins.top + ")");
	this.svg = svg;

	//TODO add x and y chart labels if available
	// eg Number of people per capita

	var zoom = d3.zoom()
		.scaleExtent([1,8])
		.on("zoom", zoomed);

	function zoomed(){
		console.log("k",d3.event.transform.k);
	}
}

BarChart.prototype.draw = function(){
	var self = this;
	var x = this.scales.x;
	var y = this.scales.y;
	var data = this.data();

	// Reset domains
	x.domain(data.map(function(d){ return d.key; }));
	y.domain([0, d3.max(data, function(d){ return d.value; })]);

	///////////
	// ENTER //
	///////////

	// Bind new data to chart bars
	
	// Create chart bars
	var bars = this.svg.selectAll("g.bar-container")
		.data(data, function(d){ return d.key; });
	var newBar = bars
		.enter()
		.append("g")
		.attr("class", "bar-container");

	// Add rectangles
	newBar.insert("rect")
		.attr("class", "bar")
		.attr("x", function(d){ return x(d.key); })
		.attr("y", function(d){ return self._computeBarY(d); })
		.attr("height", function(d){ return self._computeBarHeight(d); })
		.attr("width", x.bandwidth());

	// Add value labels
	newBar.append("text")
		.attr("class","label")
		.attr("x", function(d) { return self._computeBarLabelX(d); })
		.attr("y", function(d) { return self._computeBarLabelY(d); })
		.attr("font-size", "20px")
		.attr("text-anchor", "middle")
		.text(function(d){ return d.value; });
	

	////////////
	// UPDATE //
	////////////

	// Update bar heights
	bars.select(".bar").transition()
		.duration(300)
		.attr("y", function(d){ return self._computeBarY(d); })
		.attr("height", function(d){ return self._computeBarHeight(d); })

	// Update data labels
	var labelFormat = d3.format(",d");
	bars.select(".label").transition()
		.duration(300)
		.attr("y", function(d) { return self._computeBarLabelY(d); })
		.tween("text", function(d){
			var el = d3.select(this);
			var i = d3.interpolate(+this.textContent.replace(/\,/g,""), +d.value);
			return function(t){
				el.text(labelFormat(i(t)));
			};
		});

	//////////
	// EXIT //
	//////////
	
	// Remove elements not in the list anymore
	bars.exit().remove();

	// Add x-axis to the histogram svg.
	this.svg.select("g.x.axis").remove(); // remove old axis if it exists
	this.svg.append("g").attr("class", "x axis")
		.attr("transform", "translate(0," + self.height.chart + ")")
		.call(d3.axisBottom(x))
		.attr("font-size", "18px");

	var yInvert = y.copy()
		.domain(y.domain().reverse())
		.range(y.range());
	// Add y-axis to the chart
	this.svg.select("g.y.axis").remove(); // remove old axis if it exists
	this.svg.append("g").attr("class", "y axis")
		.attr("transform", "translate(" + self.margins.left + ",0)")
		.call(d3.axisLeft(yInvert))
		.attr("font-size", "18px");
}


MapBarChart.prototype = Object.create(BarChart.prototype);
MapBarChart.prototype.constructor = BarChart;

function MapBarChart(latLng, data, options){
	BarChart.apply(this, [data, options]);

	var _latLng = latLng;
	this.latLng = function(value){
		if(!arguments.length) return _latLng;
		_latLng = value;
		return this;
	};

	var _zoomScale = d3.scaleQuantize()
		.domain([8, 16])
		.range([0.01, 0.02, 0.03, 0.05, 0.15, 0.35, 0.45, 0.6, 0.8]);
	this.zoomScale = function(value){
		if(!arguments.length) return _zoomScale;
		_zoomScale = value;
		return this;
	};

	var _translate = {x:0,y:0};
	this.translate = function(xVal, yVal){
		if(!arguments.length) return _translate;
		_translate.x = xVal;
		_translate.y = yVal;
	};

	var _scale = 0.01;
	this.scale = function(value){
		if(!arguments.length) return _scale;
		_scale = value;
	};
}

MapBarChart.prototype.update = function(proj, mapZoom){
	var chartWidth = this.width.chart;
	var chartHeight = this.height.chart;
	var chartPadding = {
		x: this.padding.left + this.padding.right + this.margins.left + this.margins.right,
		y: this.padding.top + this.padding.bottom + this.margins.top + this.margins.bottom,
	};

	var x = proj.fromLatLngToDivPixel(this.latLng()).x;
	var y = proj.fromLatLngToDivPixel(this.latLng()).y;

	var zoomFn = this.zoomScale();
	this.scale(zoomFn(mapZoom));

	this.translate((x-chartWidth/2-chartPadding.x/2), (y-chartHeight/2-chartPadding.y/2));
	this.transform();
}

MapBarChart.prototype.transform = function(){
	var translate = "translate(" + this.translate().x + "," + this.translate().y + ")";
	var scale = "scale(" + this.scale() + ")";
	//this.svg.attr("transform", translate+scale);
	
	var transform = this.svg.attr("transform") || "";
	var oldTranslate = transform.split("scale")[0] || "";
	var oldScale = transform.split("scale")[1];
	if(oldScale===undefined){
		oldScale = "scale(1)";
	}else{
		oldScale = "scale" + oldScale;
	}

	this.svg.transition()
		.attr("transform", translate+scale)
		.duration(250)
		.attrTween("transform", function(d){
			return d3.interpolateString(translate+oldScale, translate+scale);
		});
};

MapBarChart.prototype.focus = function(){
	
};
