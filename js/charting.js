function clamp(value, min, max){
	if(value>max){ return max; }
	if(value<min){ return min; }
	return value;
}

// Extend OverlayContents
BarChart.prototype = Object.create(OverlayContents.prototype);
BarChart.prototype.constructor = OverlayContents;
BarChart.TYPE = "bar-chart";

function BarChart(latLng, width, height, data, options){
	OverlayContents.apply(this, [latLng, width, height, BarChart.TYPE, options]);
	options = options || {};

	this.xAxisLabel = options.xAxisLabel || "";
	this.yAxisLabel = options.yAxisLabel || "";
	this.title = options.title || "";

	this.hasTitle = false;

	var _data = data;
	this.data = function(value){
		if(!arguments.length){ return _data; }
		_data = value;
		return this;
	};

	// Initial set up of our scales
	// input => domain | output => range
	var x = d3.scaleBand()
		.rangeRound([0, this.width])
		.padding(0.1);
	var y = d3.scaleLinear()
		.domain([0, this.height]) // placeholder for now until we know our maximum value
		.range([0, this.height]);
		
	this.scales = { x:x, y:y };
}

// Computes the y position for a bar where 0 <= y <= chartHeight
BarChart.prototype._computeBarY = function(d){
	var computed = this.height - this.scales.y(d.value);
	return clamp(computed, 0, this.height);
}

// Computes bar height where 0 <= barHeight <= chartHeight
BarChart.prototype._computeBarHeight = function(d){
	var computed = this.scales.y(d.value);
	return clamp(computed, 0, this.height);
}

BarChart.prototype._computeBarLabelX = function(d){
	var x = this.scales.x;
	return x(d.key)+x.bandwidth()*0.5;
}

BarChart.prototype._computeBarLabelY = function(d){
	var computed = this.height - this.scales.y(d.value)-5;
	return clamp(computed, -5, this.height-5);
}

BarChart.prototype.attachTo = function(selector){
	selector.selectAll("svg").remove();
	// Create svg element
	this.svg = selector.append("svg")
		.attr("width", this.outerWidth)
		.attr("height", this.outerHeight)
		.attr("class", "chart bar-chart chart-content");

	this.svgInner = this.svg.append("g")
		.attr("transform", "translate(" + this.margins.left + "," + this.margins.top + ")");

	// Draw initial chart
	this.draw(true);
}

BarChart.prototype.draw = function(forceDraw=false){
	if(this.svg===null){ return; } // we're not ready to draw yet
	if(!forceDraw && !this.active()){ return; } // only draw when the chart is active or we're forcing a draw call

	var self = this;
	var x = this.scales.x;
	var y = this.scales.y;
	var data = this.data();

	// Reset domains
	x.domain(data.map(function(d){ return d.key; }));
	y.domain([0, d3.max(data, function(d){ return d.value; })]);

	// Enter Phase. Bind new data to chart bars.
	var bars = this._createBars(x, y, data);

	// Update Phase. Update bar heights, etc.
	this._updateBars(bars);

	// Exit Phase. Remove elements not in the list anymore.
	bars.exit().remove();

	this._addTitle();
	this._drawXAxis(x);
	this._drawYAxis(y);
}

BarChart.prototype._createBars = function(x, y, data){
	var self = this;
	// Create chart bars
	var bars = this.svgInner.selectAll("g.bar-container")
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

	return bars;
}

BarChart.prototype._updateBars = function(bars){
	var self = this;

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
}

BarChart.prototype._addTitle = function() {
	if(!this.title || this.hasTitle){ return; }
	var self = this;
	this.svg.append("g").attr("class", "x axis-title")
		.append("text")
		.attr("transform", 
			"translate(" + (self.margins.left + self.width*0.5) + "," + (15) + ")")
		.style("text-anchor", "middle")
		.attr("font-size", "18px")
		.text(self.title);
	this.hasTitle = true;
};

BarChart.prototype._drawXAxis = function(x){
	if(!this.xAxisLabel){ return; }
	var self = this;
	this.svg.select("g.x.axis").remove(); // remove old axis if it exists
	this.svg.append("g").attr("class", "x axis")
		.attr("transform", "translate(" + self.margins.left + "," + (self.height+self.margins.top) + ")")
		.call(d3.axisBottom(x))
		.attr("font-size", "18px");

	this.svg.select("g.x.axis-label").remove();
	this.svg.append("g").attr("class", "x axis-label")
		.append("text")
		.attr("transform", 
			"translate(" + (self.margins.left + self.width*0.5) + "," + (self.outerHeight - 15) + ")")
		.style("text-anchor", "middle")
		.attr("font-size", "18px")
		.text(self.xAxisLabel);
};

BarChart.prototype._drawYAxis = function(y){
	if(!this.yAxisLabel){ return; }
	var self = this;
	var yInvert = y.copy()
		.domain(y.domain().reverse())
		.range(y.range());

	this.svg.select("g.y.axis").remove(); // remove old axis if it exists
	this.svg.append("g").attr("class", "y axis")
		.attr("transform", "translate(" + self.margins.left + "," + self.margins.top + ")")
		.call(d3.axisLeft(yInvert))
		.attr("font-size", "18px");
	
	this.svg.select("g.y.axis-label").remove();
	this.svg.append("g").attr("class", "y axis-label")
		.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 15)
		.attr("x", 0 - (self.height * 0.5))
		.attr("dy", "1em")
		.style("text-anchor", "middle")
		.attr("font-size", "18px")
		.text(self.yAxisLabel);
};
