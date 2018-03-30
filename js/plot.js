function ScatterPlot(divID,data,title,labelX,labelY,avg) {
						//"#graphModal",degreeDist,"x","y","degree distribution","k(in)","p(k)"
    this.data = data;
    this.labelX = labelX;
    this.labelY = labelY;
	this.title = title
	this.divID = divID;
	this.svg = $(divID+" svg");
	this.header = $(divID+" .header h4");
	this.header.html("Average: "+avg);
	this.footer = $(divID+" .footer");
    this.plot = function() {
		var parent = this;
		var margin = {top: 40, right: 100, bottom: 40, left: 50},
					width = 858 - margin.left - margin.right - 40+47,
					height = 510 - margin.top - margin.bottom - 40;
		var svg = d3.select(this.divID+" .body").append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform",
				  "translate(" + margin.left + "," + margin.top + ")");
		var tooltip = d3.select(this.divID+" .body").append("div")
			.attr("class","tooltip").html("asd");
		var x = d3.scaleLinear()
			.range([0, width]);
		var y = d3.scaleLinear()
			.range([height, 0]);
		var z = d3.scaleOrdinal(d3.schemeCategory20);
		var seriesNames = d3.keys(data[0])
			.filter(function(d) { return d !== "x"; })
		// Map the data to an array of arrays of {x, y} tuples.
		var series = seriesNames.map(function(series) {
			return data.map(function(d) {
				return {x: +d.x, y: +d[series]};
			});
		});
		
		// Compute the scales’ domains.
		x.domain(d3.extent(d3.merge(series), function(d) { return d.x; })).nice();
		y.domain(d3.extent(d3.merge(series), function(d) { return d.y; })).nice();
		
		svg.selectAll(".series")
			.data(series)
			.enter().append("g")
			.attr("class", "series")
			.style("fill", function(d, i) { return z(i); })
			.selectAll(".point")
			.data(function(d) { return d; })
			
			.enter().append("circle")
				.attr("class", "point")
				.attr("r", 5)
				.attr("cx", function(d) { return x(d.x); })
				.attr("cy", function(d) { return y(d.y); })
				.on("mouseover", function(d) {
					tooltip.transition()
					 .duration(200)
					 .style("opacity", .9);
					tooltip.html("x:"+d.x+"<br/>y:"+d.y)
					 .style("left", (d3.event.pageX -9) + "px")
					 .style("top", (d3.event.pageY - 140) + "px");
				}).on("mouseout", function(d) {
					tooltip.transition()
					 .duration(200)
					 .style("opacity", 0);
				});

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
		var legend = svg.append("g").attr("class","legend-box").attr("transform","translate(690,0)");
		var num = 0;
		for(i in  seriesNames){
			var inner = legend.append("g").attr("class",seriesNames[i]).attr("transform","translate(0,"+(num*20)+")")
			inner.append("circle").attr("r",5).attr("x",5).attr("fill",z(num))
			inner.append("text").attr("x",15).attr("y",5).text(seriesNames[i]);
			num++;
		}
	};
}