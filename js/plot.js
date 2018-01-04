function HistogramGraph(modalDivID, data,labelX, labelY) {
    this.data = data;
    this.labelX = labelX;
    this.labelY = labelY;
	this.modalDivID = modalDivID;
	this.svg = $(modalDivID+" svg");
	this.header = $(modalDivID+" .modal-header");
	this.footer = $(modalDivID+" .modal-footer");
    this.plot = function() {
		
		var parent = this;
		$(this.modalDivID+" svg").empty();
		var margin = {top: 20, right: 20, bottom: 30, left: 50},
					width = 600 - margin.left - margin.right - 40,
					height = 500 - margin.top - margin.bottom - 40;
		var svg = d3.select(this.modalDivID+" svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform",
				  "translate(" + margin.left + "," + margin.top + ")");
		var x = d3.scaleLinear()
			.range([0, width]);
		var y = d3.scaleLinear()
			.range([height, 0]);

		x.domain(d3.extent(data, function(d) { return d[parent.labelX]; }));
		y.domain([0, d3.max(data, function(d) { return d[parent.labelY]; })]);
		
		// Add the scatterplot
		svg.selectAll("dot")
			.data(data)
			.enter().append("circle")
			.attr("r", 5)
			.attr("cx", function(d) { return x(d[parent.labelX]); })
			.attr("cy", function(d) { return y(d[parent.labelY]); });

		// Add the X Axis
		svg.append("g")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(x));

		// Add the Y Axis
		svg.append("g")
			.call(d3.axisLeft(y));
	};
}