function HistogramGraph(modalDivID,data,X,Y,title,labelX,labelY) {
						//"#graphModal",degreeDist,"x","y","degree distribution","k(in)","p(k)"
    this.data = data;
    this.labelX = labelX;
    this.labelY = labelY;
	this.X = X;
    this.Y = Y;
	this.title = title
	this.modalDivID = modalDivID;
	this.svg = $(modalDivID+" svg");
	this.header = $(modalDivID+" .modal-header h4");
	this.header.html(title);
	this.footer = $(modalDivID+" .modal-footer");
    this.plot = function() {
		var parent = this;
		//$(this.modalDivID+" svg").empty();
		var margin = {top: 40, right: 20, bottom: 40, left: 50},
					width = 600 - margin.left - margin.right - 40,
					height = 510 - margin.top - margin.bottom - 40;
		var svg = d3.select(this.modalDivID+" .modal-body").append("svg")//d3.select(this.modalDivID+" svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform",
				  "translate(" + margin.left + "," + margin.top + ")");
		var x = d3.scaleLinear()
			.range([0, width]);
		var y = d3.scaleLinear()
			.range([height, 0]);

		x.domain(d3.extent(data, function(d) { return d[parent.X]; }));
		y.domain([0, d3.max(data, function(d) { return d[parent.Y]; })]);
		
		// Add the scatterplot
		svg.selectAll("dot")
			.data(data)
			.enter().append("circle")
			.attr("r", 5)
			.attr("cx", function(d) { return x(d[parent.X]); })
			.attr("cy", function(d) { return y(d[parent.Y]); });

		// Add the X Axis
		svg.append("g")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(x));
		// text label for the x axis
		svg.append("text").attr("transform",
							"translate(" + (width/2) + " ," + (height + margin.top - 10) + ")")
			.style("text-anchor", "middle")
			.text(parent.labelX);
		svg.append("text").attr("transform",
							"translate(" + (width/2) + " ," + (-20) + ")")
			.style("text-anchor", "middle")
			.text(parent.title);
		// Add the Y Axis
		svg.append("g")
			.call(d3.axisLeft(y));
		// text label for the y axis
		svg.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 0 - margin.left)
			.attr("x",0 - (height / 2))
			.attr("dy", "1em")
			.style("text-anchor", "middle")
			.text(parent.labelY); 
	};
}