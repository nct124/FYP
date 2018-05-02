
;(function ($) {
    var pluginName = "GraphVisualizer",
        dataKey = "plugin_" + pluginName;
    function Plugin(element, options) {
		//set default options
        this.element = element;
		var parent = this;
        this.options = {
            colorGroup:'@class',
			nodeLabel:{},
			edgeLabel:{},
			weight:{},
			edgeUsed:"E",
			IDlink:"@rid",
			schemaURL:"http://localhost:2480/function/Testing/classProperty/",
			rdy:function(){},
			radius:20,
			distance:1000,
			nodeClick:function(node){},
			edgeClick:function(edge){},
			clusteringMethod:"off",
			hiearchicalClusteringThreshold:1,//hiearchicalClustering
			hiearchicalClusteringLinkageCriteria:"min",//hiearchicalClustering//min,max,avg
			hiearchicalClusteringDirection:"both",//hiearchicalClustering//both,in,out
			noOfCluster:10,//kmeans,spectral
			spectralClusteringDirection:"both",
			clusteringClassAttribute:{},//attribute
			filterType : "off",
			filterCondition : 0
        };
		$.extend(this.options, options);
		this.nodes = [];
		this.clusterMap = {};
		this.links = [];
		this.deleted = {};
		this.deleted.nodes = [];
		this.deleted.links = [];
		this.directed = false;
		this.nodeMap = {};
		this.edgeMap = {};
		this.neighborMap = {};
		this.db = "Testing";
		var edgeSchema = [{name:"E",properties:[]}];
		var vertexSchema = [{name:"V",properties:[]}];
		this.schemas = {edge:edgeSchema,vertex:vertexSchema}
        this.init(options);
		enableAnimation();
    };
	
    Plugin.prototype = {
        init: function (options) {
			//init and overwrite the functions
			var parent = this;
			this.svg = d3.select("#"+$(this.element).attr('id'));
			$.extend(this.options, options);
			var width = $(this.svg._groups[0][0]).parent().width()
			var height = $(this.svg._groups[0][0]).parent().height()
			var rect = this.svg.append("rect")
			.attr("width", width)
			.attr("height", height)
			.style("fill", "none")
			.style("pointer-events", "all")
			.on("click", function(){
				parent.drawline = false;
				$("#drawline").remove();
			});
			this.svg.append("g")
			.attr("class","wrapper");
			rect = this.initZoom(rect);
			rect = this.initMouseMove(rect);
			//this.color = d3.scaleOrdinal(d3.schemeCategory10);
			//this.color = d3.scaleOrdinal(d3.schemeCategory20);
			//this.color = d3.scaleOrdinal(d3.schemeCategory20b);
			//this.color = d3.scaleOrdinal(d3.schemeCategory20c);
			this.nodeColor = d3.scaleOrdinal(d3.schemeCategory20b);
			this.edgeColor = d3.scaleOrdinal(d3.schemeCategory10);
			
			//.gravity, .charge, .linkDistance and maybe also .linkStrength
			this.simulation = d3.forceSimulation()
			.force("link", d3.forceLink().id(function(d) { return d[parent.options.IDlink]; })
			//.distance((parent.options.distance)/3)
			.distance(function(d){
				if(d.source.cluster==undefined || d.source.cluster==undefined){
					return (parent.options.distance)/3;
				}else if(d.source.cluster==d.target.cluster){
					return (parent.options.distance)/6;
				}else{
					return (parent.options.distance)/3;
				}
				
			})
			.strength(1))
			.force("collide",d3.forceCollide( function(d){return d.r + 0 }).iterations(16) )
			.force("charge", d3.forceManyBody())
			//.force("charge", function(d){return -30000})
			.force("center", d3.forceCenter(width / 2, height / 2))
			.force("y", d3.forceY(0))
            .force("x", d3.forceX(0))
			
			// define arrow markers for graph links
			var defs = this.svg.append('svg:defs');
			defs.append('svg:marker')
				.attr('id', 'endarrow')
				.attr('viewBox', '0 -5 10 10')
				.attr('refX', (parent.options.radius+10)+"px")
				.attr('refY', "0px")
				.attr('markerWidth', 5)
				.attr('markerHeight', 5)
				.attr('orient', 'auto')
			  .append('svg:path')
				.attr('d', 'M0,-5L10,0L0,5')
				.attr('fill', '#000');
			//this.options.rdy();
        },
		clearGraph: function () {
			this.nodes = [];
			this.links = [];
			this.displayNodes = [];
			this.displayLinks = [];
			this.clusters = undefined;
			this.deleted = {};
			this.clusterMap = {};
			this.deleted.nodes = [];
			this.deleted.links = [];
			this.neighborMap = {};
			this.nodeMap = {};
			this.edgeMap = {};
			this.svg.selectAll("*").remove();
			var edgeSchema = [{name:"E",properties:[]}];
			var vertexSchema = [{name:"V",properties:[]}];
			this.schemas = {edge:edgeSchema,vertex:vertexSchema}
			this.init();
		},
		loadData: function () {
			//load network into plugin
			this.displayNodes = [];
			this.displayLinks = [];
			this.nodes = [];
			this.clusterMap = {};
			this.links = [];
			this.deleted = {};
			this.deleted.nodes = [];
			this.deleted.links = [];
			this.neighborMap = {};
			this.nodeMap = {};
			this.edgeMap = {};
			var data = this.data.result;
			for(var i=0;i<data.length;i++){
				var checkVertex = false;
				for(var j=0;j<this.schemas.vertex.length;j++){
					if(data[i]['@class']==this.schemas.vertex[j].name){
						checkVertex = true;
						break;
					}
				}
				if(checkVertex){
					data[i].weight = 0;
					this.nodes.push(data[i]);
					this.nodeMap[(data[i]['@rid']).toString()] = data[i];
				}else{
					data[i].source = data[i].out;
					data[i].target = data[i].in;
					this.links.push(data[i]);
					this.edgeMap[data[i]['@rid']] = data[i];
					if(this.directed){
						if(this.neighborMap[data[i]['@class']+"_"+data[i]['out']]==undefined){
							this.neighborMap[data[i]['@class']+"_"+data[i]['out']]=[];
						}
						this.neighborMap[data[i]['@class']+"_"+data[i]['out']].push(data[i]['in']);
					}else{
						if(this.neighborMap[data[i]['@class']+"_"+data[i]['out']]==undefined){
							this.neighborMap[data[i]['@class']+"_"+data[i]['out']]=[];
						}
						if(this.neighborMap[data[i]['@class']+"_"+data[i]['out']].indexOf(data[i]['in'])==-1){
							this.neighborMap[data[i]['@class']+"_"+data[i]['out']].push(data[i]['in']);
						}
						if(this.neighborMap[data[i]['@class']+"_"+data[i]['in']]==undefined){
							this.neighborMap[data[i]['@class']+"_"+data[i]['in']]=[];
						}
						if(this.neighborMap[data[i]['@class']+"_"+data[i]['in']].indexOf(data[i]['out'])==-1){
							this.neighborMap[data[i]['@class']+"_"+data[i]['in']].push(data[i]['out']);
						}
					}
				}
			}
			this.findDuplicateLinks();
        },
		toggleDirected:function(directed){//directed
			this.directed = directed;
			this.clusters = undefined;
			this.clusterMap={};
			this.updateMapping();
			this.resetGraph();
			var property = this.loadBasicNetworkProperties();
			$("#NetD .properties").html("<div class='table-responsive'>"+
											"<table class='table'><tbody></tbody></table>"+
										"</div>");
			var table = $("#NetD .properties table tbody")
			for(i in property){
				table.append("<tr><td>"+i+"</td><td>"+property[i]+"</td></tr>");
			}
		},
		getNeighborMapping:function(nodes,edges,direction){
			//direction = both,in,out
			//how to know which edge to include? becos of filtering
			var nodeMap = {};
			for(i in nodes){
				var node = nodes[i];
				nodeMap[node["@rid"]] = true;
			}
			var neighborMap = {};
			for(i in edges){
				var edge = edges[i];
				if(edge["@class"]!=undefined){
					if(direction=="both"||direction=="out"){
						if(neighborMap[edge['@class']+"_"+edge.out]==undefined){
							neighborMap[edge['@class']+"_"+edge.out] = [];
						}
						if(neighborMap[edge['@class']+"_"+edge.out].indexOf(edge.in)==-1){
							neighborMap[edge['@class']+"_"+edge.out].push(edge.in);
						}
					}
					if(direction=="both"||direction=="in"){
						if(neighborMap[edge['@class']+"_"+edge.in]==undefined){
							neighborMap[edge['@class']+"_"+edge.in] = [];
						}
						if(neighborMap[edge['@class']+"_"+edge.in].indexOf(edge.out)==-1){
							neighborMap[edge['@class']+"_"+edge.in].push(edge.out);
						}
					}
				}
			}
			return neighborMap;
		},
		updateMapping:function(){
			//clear mapping
			this.neighborMap = {};
			//add back mapping
			for(edgeID in this.edgeMap){
				var edge = this.edgeMap[edgeID];
				if(this.neighborMap[edge['@class']+"_"+edge.out]==undefined){
					this.neighborMap[edge['@class']+"_"+edge.out] = [];
				}
				if(this.neighborMap[edge['@class']+"_"+edge.out].indexOf(edge.in)==-1){
					this.neighborMap[edge['@class']+"_"+edge.out].push(edge.in);
				}
				if(this.directed==false){
					if(this.neighborMap[edge['@class']+"_"+edge.in]==undefined){
						this.neighborMap[edge['@class']+"_"+edge.in] = [];
					}
					if(this.neighborMap[edge['@class']+"_"+edge.in].indexOf(edge.out)==-1){
						this.neighborMap[edge['@class']+"_"+edge.in].push(edge.out);
					}
				}
			}
		},
		findDuplicateLinks: function () {
			var linkHashMap = {};
			for(var i=0;i<this.displayLinks.length;i++){
				var link = this.displayLinks[i];
				var key = link.out+"_"+link.in;
				if(linkHashMap[key]==undefined){
					linkHashMap[key]=1;
					link.linknum=1;
				}else{
					linkHashMap[key]++;
					link.linknum=linkHashMap[key];
				}
			}
		},
		shortestPath: function(startRID,edgeType){//public
			var dist = {};
			var pres = {};
			var visited = {};
			var queue = new BinaryHeap(
			  function(element) { return element.weight; },
			  function(element) { return element.rid; },
			  'weight'
			);
			var longestDistance = 0;
			var longestDistanceNode = "";
			dist[startRID] = 0;
			queue.push({rid:startRID,weight:dist[startRID]})
			while(queue.size()>0){
				//dequeue smallest node
				var current = queue.pop().rid;
				visited[current] = true;
				var neighbor = this.neighborMap[edgeType+"_"+current];
				for(n in neighbor){
					var ne = neighbor[n];
					var weight = 1;
					if(this.options.weight[edgeType]!=undefined && this.options.weight[edgeType]!=""){
						var edge = getEdge(current,ne,edgeType,this.nodeMap,this.edgeMap,this.directed)
						weight = parseInt(edge[this.options.weight[edgeType]]);
					}
					if(visited[ne]==undefined && ( dist[ne]==undefined || (dist[ne]> (dist[current]+weight)))){
						dist[ne] = dist[current]+weight;
						if(dist[ne]>longestDistance){
							longestDistance = dist[ne];
							longestDistanceNode = ne;
						}
						pres[ne] = current;
						//update neighbor node priority ie remove and add neighbor with new weightage
						queue.decreaseKey(ne,dist[ne]);
					}else if(dist[ne]==(dist[current]+weight)){
						//when u find another shortest path
						if(Array.isArray(pres[ne])){
							pres[ne].push(current)
						}else{
							pres[ne] = [pres[ne]]
							pres[ne].push(current)
						}
					}
				}
			}
			var json = {dist:dist,pres:pres,longestDistance:{dist:longestDistance,node:longestDistanceNode}};
			return json;
		},
		BFS: function(startRID,edgeType){
			var visited = {};
			visited[startRID] = true;
			var queue = [];
			queue.push(startRID);
			while(queue.length>0){
				var current = queue.shift();
				//add neighbor into queue
				var neighbors = this.neighborMap[edgeType+"_"+current];
				if(neighbors!=undefined){
					for(var i=0;i<neighbors.length;i++){
						if(visited[neighbors[i]]==undefined){
							visited[neighbors[i]] = true;
							queue.push(neighbors[i]);
						}
					}
				}
			}
			return visited;
		},
        displayGraph: function () {
			//display network in SVG
			var parent = this;
			//links
			this.link = this.svg.select(".wrapper").append("g")
			.attr("class", "links")
			.selectAll("path")
			.data(this.displayLinks)
			.enter().append("path")
			.attr("stroke", function(d) { return parent.edgeColor(d["@class"]); })
			.attr("fromto",function(d){
				return d["out"]+" "+d["in"];
			})
			.attr("id",function(d){
				return d['@rid'];
			})
			.attr("stroke-width", function(d) { 
				return 2;
			});
			if(this.directed){
				this.link.style('marker-end', function(d) { return 'url(#endarrow)'; });
			}
			this.link = this.initEdgeClick(this.link)
			//nodes
			this.node = this.svg.select(".wrapper").append("g")
			.attr("class", "nodes")
			.selectAll("circle")
			.data(this.displayNodes)
			.enter().append("circle")
			.attr("r", function(d){
				if(d["@rid"].indexOf("cluster")==-1){
					return (parent.options.radius+(parent.options.radius*d.weight));
				}else{
					return (parent.options.radius+(d.nodes.length));
				}
			})
			.attr("rid",function(d) { return d["@rid"]})
			.attr("fill", function(d) { return parent.nodeColor(d[parent.options.colorGroup]); })
			.attr("stroke","black")
			.attr("stroke-width","1px")
			.call(d3.drag()
				.on("start", function(d){
					if (!d3.event.active) parent.simulation.alphaTarget(0.3).restart();
					d.fx = d.x;
					d.fy = d.y;
				})
				.on("drag", function(d){
					d.fx = d3.event.x;
					d.fy = d3.event.y;
				})
				.on("end", function(d){
					if (!d3.event.active) parent.simulation.alphaTarget(0);
					d.fx = null;
					d.fy = null;
				}))
			.on("mouseover",this.mouseover)
			.on("mouseout",this.mouseout);
			this.node = this.initNodeClick(this.node);
			
			//hover points on nodes
			this.hoverPoints = this.svg.select(".wrapper").append("g")
			.attr("class", "hover")
			.selectAll("circle")
			.data(this.displayNodes)
			.enter().append("circle")
			.attr("r",parent.options.radius/4)
			.attr("ridhover",function(d) { return d["@rid"]})
			.attr("visibility","hidden")
			.attr("fill", "black")
			.on("mouseover",this.mouseover)
			.on("mouseout",this.mouseout);
			this.hoverPoints= this.initHoverClick(this.hoverPoints)
			
			//node labels
			this.nodeText = this.svg.select(".wrapper").append("g").attr("class", "nodeLabels").selectAll("g")
			.data(this.displayNodes)
			.enter().append("text")
			.attr("x", 0)
			.attr("y", 0)
			.attr("fill","white")
			.attr("ridnlabel",function(d) { return d["@rid"]})
			.style("font-family", "sans-serif")
			.style("font-size", "0.7em")
			.on("mouseover",this.mouseover)
			.on("mouseout",this.mouseout)
			.text(function(d) {
				if(parent.options.nodeLabel[d['@class']]!=undefined&&parent.options.nodeLabel[d['@class']]!=""){
					return d[parent.options.nodeLabel[d['@class']]]; 
				}else if(parent.options.clusteringMethod=="attribute"&&d["@rid"].indexOf("cluster")>-1){
					return d["@rid"];
				}else{
					return "";
				}
			});
			
			//edge labels
			this.edgeText = this.svg.select(".wrapper").append("g").attr("class", "edgeLabels").selectAll("g")
			.data(this.displayLinks)
			.enter().append("text")
			.attr("dx","100px")
			.attr("dy", "-7px")
			.style("font-family", "sans-serif")
			.style("font-size", "14px")
			.on("mouseover",this.mouseover)
			.on("mouseout",this.mouseout)
			
			this.edgeText.append('textPath')
				.attr('xlink:href',function(d,i) {return "#"+d['@rid']})
				.style("pointer-events", "none")
				.text(function(d) { if(parent.options.edgeLabel[d['@class']]!=""){return d[parent.options.edgeLabel[d['@class']]]; }else{ return "";}});
			
			this.simulation
			.nodes(this.displayNodes)
			.on("tick", function(){
				if(parent.animate == true){
					parent.link.attr("d", function(d) {
						var r = parent.options.distance;
						var dr = r/d.linknum;  //linknum is defined above
						return "M" + d.source.x + "," + d.source.y + 
						 "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
						//A rx,ry xAxisRotate LargeArcFlag,SweepFlag x,y"
					});
					parent.node
					.attr("cx", function(d) { return d.x; })
					.attr("cy", function(d) { return d.y; });
					parent.nodeText
					.attr("x", function(d) { return (d.x-10); })
					.attr("y", function(d) { return (d.y+2); });
					parent.hoverPoints
					.attr("cx", function(d) { return d.x; })
					.attr("cy", function(d) { return d.y+(parent.options.radius+(parent.options.radius*d.weight)) });
					parent.animate = false;
				}
			});
			this.simulation.force("link")
			.links(this.displayLinks);
			
			this.hull = this.svg.select(".wrapper").insert("g", ":first-child").attr("class", "expandedNode").selectAll("g")
			.data(convexHulls(this.clusterMap,this.nodeMap,(this.options.distance)/15))
			.enter().append("path")
			.attr("class", "hull")
			.attr("d", function(d){
				var curve = d3.line().curve(d3.curveCardinalClosed)
				return curve(d.path);
			})
			.style("fill", function(d) {var fill = d3.scaleOrdinal(d3.schemeCategory10); return fill(d.group); })
			.on("click", function(d) {
				for(cid in parent.clusterMap){
					parent.clusterMap[cid].expand.P = parent.clusterMap[cid].expand.C
				}
				parent.clusterMap["cluster"+d.group].expand.C = false;
				parent.resetGraph();
			});
			this.simulation
			.nodes(this.displayNodes)
			.on("tick", function(){
				if(parent.animate == true){
					parent.hull.data(convexHulls(parent.clusterMap,parent.nodeMap, (parent.options.distance)/40))
					.style("fill-opacity",0.3)
					.attr("d", function(d){
						var curve = d3.line().curve(d3.curveCardinalClosed);
						return curve(d.path);
					});
					parent.link.attr("d", function(d) {
						var r = parent.options.distance;
						var dr = r/d.linknum;  //linknum is defined above
						return "M" + d.source.x + "," + d.source.y + 
						 "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
						//A rx,ry xAxisRotate LargeArcFlag,SweepFlag x,y"
					});
					parent.node
					.attr("cx", function(d) { return d.x; })
					.attr("cy", function(d) { return d.y; });
					parent.nodeText
					.attr("x", function(d) { return (d.x-10); })
					.attr("y", function(d) { return (d.y+2); });
					parent.hoverPoints
					.attr("cx", function(d) { return d.x; })
					.attr("cy", function(d) { return d.y+(parent.options.radius+(parent.options.radius*d.weight)) });
					parent.animate = false;
				}
			});
        },
		initZoom: function (rect) {
			var parent = this;
			parent.prevZoom = 1;
			var zoom = rect.call(d3.zoom()
				.scaleExtent([1, 5])
				.on("zoom", function(){
					if(d3.event.transform.k>2){
						if(parent.prevZoom<2){
							
						}
					}else{//d3.event.transform.k<2
						if(parent.prevZoom>2){
							//parent.resetGraph();
						}
					}
					var xfrom  = (d3.event.transform.x*-1)/d3.event.transform.k
					var xto = xfrom+(parseInt(rect.attr("width"))/d3.event.transform.k)
					var yfrom  = (d3.event.transform.y*-1)/d3.event.transform.k
					var yto = yfrom+(parseInt(rect.attr("height"))/d3.event.transform.k)
					for(i in parent.node["_groups"][0]){
						var node = $(parent.node["_groups"][0][i]);
						var x  = node.attr("cx");
						var y = node.attr("cy");
						if(x<xfrom || x>xto ||y<yfrom || y>yto){
							$("text[ridnlabel='"+node.attr("rid")+"'],circle[rid='"+node.attr("rid")+"']").css("display","none");
							$(".links path[fromto~='"+node.attr("rid")+"']").css("display","none");
						}else{
							$("text[ridnlabel='"+node.attr("rid")+"'],circle[rid='"+node.attr("rid")+"']").css("display","block");
							$(".links path[fromto~='"+node.attr("rid")+"']").css("display","block");
						}
					}
					parent.link.attr("transform", d3.event.transform);
					parent.node.attr("transform", d3.event.transform);
					parent.nodeText.attr("transform", d3.event.transform);
					parent.hoverPoints.attr("transform", d3.event.transform);
					parent.hull.attr("transform", d3.event.transform);
					$("#drawline").attr("transform",d3.event.transform);
					parent.prevZoom = d3.event.transform.k;
				})
			)
			return rect;
		},
		initMouseMove: function (rect) {
			//handle edge creating
			var parent = this;
			rect.on("mousemove", function(){
				if(parent.drawline){
					parent.linexy1 = d3.mouse(this)[0]+" "+d3.mouse(this)[1];
					var point = $(".hover circle[ridhover='"+parent.linexy0+"']");
					$("#drawline")
					.attr("x1",point.attr("cx"))
					.attr("y1",point.attr("cy"))
					.attr("x2",d3.mouse(this)[0])
					.attr("y2",d3.mouse(this)[1]);
				}
			});
			return rect;
		},
		mouseover: function (node,index){
			var x = $(this).attr("cx")
			if (typeof x === typeof undefined || x === false) {
				x = $(this).attr("x")
			}
			$(".hover circle[cx='"+x+"']").attr("visibility","visible");
			
			
		},
		mouseout: function (node,index){
			var x = $(this).attr("cx")
			if (typeof x === typeof undefined || x === false) {
				x = $(this).attr("x")
			}
			$(".hover circle[cx='"+x+"']").attr("visibility","hidden");
		},
		initHoverClick: function (node){
			var parent = this;
			node.on("click",function(node,index){
				parent.drawline = true;
				parent.linexy0 = $(this).attr("ridhover");
				
				parent.svg.append("line")
				.attr("id","drawline")
				.attr("stroke","rgb(0,0,0)")
				.attr("stroke-width", 1);
			});
			return node;
		},
		//to be editted to remove manipulating UI in plugin
		initEdgeClick: function (edges){
			var parent = this;
			edges.on("click",function(edge,index){
				parent.options.edgeClick(edge);
				//connected graph
				for(var key in parent.visited){
					//set back previously editted nodes
					if(parent.nodeMap[key]){
						$("circle[rid='"+key+"']").attr("fill",parent.nodeColor(parent.nodeMap[key][parent.options.colorGroup]));
					}
				}
			});
			return edges;
		},
		recursivePath:function(pres,srcID,prev,current){
			if(current==srcID){
				return;
			}else{
				if(Array.isArray(current)){
					if(this.path.length<=10){
						for(var i=0;i<this.path.length;i++){
							if(this.path[i][0]==prev){
								var originalpath = this.path[i].slice();
								this.path[i].unshift(current[0]);
								this.recursivePath(pres,srcID,current[0],pres[current[0]]);
								for(var j=1;j<current.length;j++){
									var newpath = originalpath.slice();//this.path[p].slice();
									newpath.unshift(current[j]);
									this.path.unshift(newpath);
									i++;
									this.recursivePath(pres,srcID,current[j],pres[current[j]]);
								}
							}
						}
					}else{
						for(p in this.path){
							if(this.path[p][0]==prev){
								this.path[p].unshift(current[0]);
							}
						}
						this.recursivePath(pres,srcID,current,pres[current[0]]);
					}
				}else{
					for(p in this.path){
						if(this.path[p][0]==prev){
							this.path[p].unshift(current);
						}
					}
					this.recursivePath(pres,srcID,current,pres[current]);
				}
			}
		},
		//to be editted to remove manipulating UI in plugin
		initNodeClick: function (nodes){
			var parent = this;
			nodes.on("click",function(node,index){
				if(parent.drawline){
					if(parent.linexy0 != node['@rid']){
						var newlink = {"@class":"",in:node["@rid"],out:parent.linexy0,source:parent.linexy0,target:node["@rid"],'@rid':Math.floor(Math.random() * (100000 - 1) + 1).toString()};
						parent.drawline = false;
						$("#drawline").remove();
						var newGraph = {nodes:[],links:[newlink]}
						var removeGraph = {nodes:[],links:[]}
						parent.updateGraph(newGraph,removeGraph);
					}
				}else if(d3.event.ctrlKey){
					var srcID = parent.clickedNode["source"];
					var destID = node["@rid"];
					var allDistance = parent.shortestPath(srcID,parent.options.edgeUsed);
					var distance = allDistance["dist"][destID];
					if(distance!=undefined){
						$(".distance").empty();
						$(".distance").append("<li class='list-group-item'>Distance:"+distance+"</li>");
						parent.path = [[destID]];
						parent.recursivePath(allDistance["pres"],srcID,destID,allDistance["pres"][destID])
						for(p in parent.path){
							var path ="";
							for(n in parent.path[p]){
								var nid = parent.path[p][n];
								$("circle[rid='"+nid+"']").attr("fill","red");
								path+="->"+nid;
							}
							path =srcID+path;
							$(".distance").append("<li class='list-group-item'>Path ("+(parseInt(p)+1)+"):<br/>"+path+"</li>");
						}
						$("circle[rid='"+destID+"']").attr("fill","green");
						$("circle[rid='"+srcID+"']").attr("fill","green");
						$("a[href='#NetD']").tab("show");
					}else{
						$(".distance").empty();
						$(".distance").append("<li class='list-group-item'>Selected node is not reachable.</li>");
						$("a[href='#NetD']").tab("show");
					}
				}else if(node["@rid"].indexOf("cluster")>-1){
					for(cid in parent.clusterMap){
						parent.clusterMap[cid].expand.P = parent.clusterMap[cid].expand.C
					}
					parent.clusterMap[node["@rid"]].expand.C = true;
					parent.resetGraph();
				}else{
					parent.options.nodeClick(node);
					//connected graph
					for(var key in parent.visited){
						//set back previously editted nodes
						if(parent.nodeMap[key]){
							$("circle[rid='"+key+"']").attr("fill",parent.nodeColor(parent.nodeMap[key][parent.options.colorGroup]));
						}
					}
					parent.visited = parent.BFS(node['@rid'],parent.options.edgeUsed);
					for(var key in parent.visited){
						//highlight new nodes
						if(parent.nodeMap[key]){
							$("circle[rid='"+key+"']").attr("fill","orange");
						}
					}
					$("circle[rid='"+node["@rid"]+"']").attr("fill","green");
					//distance
					parent.clickedNode = {source:node['@rid']};
				}
			});
			return nodes;
		},
		getBetweenness: function(edgeType,callback){//public
			var json = {neighborMap:this.neighborMap,
						nodeMap:this.nodeMap,edgeMap:this.edgeMap,
						directed:this.directed,edgeType:this.options.edgeUsed,
			weightAttribute:this.options.weight[this.options.edgeUsed]};
			var functionURL = "http://localhost:8080/getBetweenness";
			ajaxServer(functionURL,json,function(result){
				callback(result);
			},function(error){
				console.log("Betweenness error");
			});
		},
		getCloseness: function(edgeType,callback){//public
			var json = {neighborMap:this.neighborMap,
						nodeMap:this.nodeMap,edgeMap:this.edgeMap,
						directed:this.directed,edgeType:this.options.edgeUsed,
			weightAttribute:this.options.weight[this.options.edgeUsed]};
			var functionURL = "http://localhost:8080/getCloseness";
			ajaxServer(functionURL,json,function(result){
				callback(result);
			},function(error){
				console.log("Closeness error");
			});
		},
		getMaxDegree: function(edgeType){//public
			var maxDegree = 0;
			for(i in this.neighborMap){
				if(i.indexOf(edgeType)>-1){
					if(maxDegree<this.neighborMap[i].length){
						maxDegree = this.neighborMap[i].length;
					}
				}
			}
			return maxDegree;
		},
		getMinDegree: function(edgeType){//public
			var minDegree = Number.MAX_SAFE_INTEGER;
			for(i in this.nodeMap){
				if(this.neighborMap[edgeType+"_"+i]!=undefined){
					if(minDegree>this.neighborMap[edgeType+"_"+i].length){
						minDegree = this.neighborMap[edgeType+"_"+i].length;
					}
				}else{
					minDegree = 0;
					break;
				}
			}
			return minDegree;
		},
		getAvgDegree: function(edgeType){//public
			var n = this.nodes.length;
			var sumDegree = 0
			for(i in this.nodeMap){
				if(this.neighborMap[edgeType+"_"+i]!=undefined){
					sumDegree+=this.neighborMap[edgeType+"_"+i].length
				}
			}
			return sumDegree/n;
		},
		getGamma: function(edgeType){//public
			var n = this.nodes.length;
			var x = this.getMaxDegree(edgeType)/this.getMinDegree(edgeType)
			var gamma = (Math.log(n)/(Math.log(x)+1));
			return gamma;
		},
		getCCDistribution: function(edgeType,callback){//public
			var json = {nodeMap:this.nodeMap,neighborMap:this.neighborMap,edgeType:edgeType,directed:this.directed};
			var functionURL = "http://localhost:8080/getCCDistribution";
			ajaxServer(functionURL,json,function(result){
				callback(result);
			},function(error){
				console.log("CC error");
			});
		},
		getDiameter: function(edgeType,callback){//public
			var json = {neighborMap:this.neighborMap,
						nodeMap:this.nodeMap,edgeMap:this.edgeMap,
						directed:this.directed,edgeType:this.options.edgeUsed,
			weightAttribute:this.options.weight[this.options.edgeUsed]};
			var functionURL = "http://localhost:8080/getDiameter";
			ajaxServer(functionURL,json,function(result){
				callback(result);
			},function(error){
				console.log("Diameter error");
				displayErrorMsg("Error might be due to a directed network is shown to be a undirected network")
			});
		},
		getPageRank: function(edgeType,callback){//public
			var json = {neighborMap:this.neighborMap,
						nodeMap:this.nodeMap,edgeMap:this.edgeMap,
						directed:this.directed,edgeType:this.options.edgeUsed};
			var functionURL = "http://localhost:8080/getPageRank";
			ajaxServer(functionURL,json,function(result){
				callback(result);
			},function(error){
				console.log("getPageRank error");
			});
		},
		getDegreeDistribution: function(edgeType,directed,callback){//public
			var json = {nodeMap:this.nodeMap,"directed":directed,"edgeType":edgeType};
			var functionURL = "http://localhost:8080/getDegreeDistribution";
			ajaxServer(functionURL,json,function(result){
				callback(result);
			},function(error){
				console.log("Degree error");
			});
		},
		calCC: function(node,edgeType){//public
			var cc = 0;
			var neighbor = this.neighborMap[edgeType+"_"+node['@rid']];
			var Nv = 0;
			//find num of neighbors who are neighbors of each other
			if(neighbor!=undefined &&neighbor.length>1){
				for(var i=0;i<neighbor.length;i++){
					for(var j=0;j<neighbor.length;j++){
						//if its not itself
						if(neighbor[i]!=neighbor[j]){
							var arrA = this.neighborMap[edgeType+"_"+neighbor[i]];
							if(arrA!=undefined){
								if(arrA.indexOf(neighbor[j])>-1){
									Nv++;
								}
							}
							
						}
					}
				}
				if(this.directed){
					cc = Nv/((neighbor.length)*(neighbor.length-1));
				}else{
					cc = Nv/((neighbor.length)*(neighbor.length-1));
				}
			}
			return cc;
		},
		updateGraph: function (newGraph,removeGraph) {
			//refresh network in SVG
			for(var i=0;i<this.nodes.length;i++){
				for(var j=0;j<removeGraph.nodes.length;j++){
					if(this.nodes[i]["@rid"]==removeGraph.nodes[j]['@rid']){
						this.nodes.splice(i,1);
					}
				}
			}
			for(var i=0;i<this.links.length;i++){
				this.links[i]['source'] = this.links[i]["out"];//this.links[i]['source']['@rid'];
				this.links[i]['target'] = this.links[i]["in"];//this.links[i]['target']['@rid'];
				for(var j=0;j<removeGraph.links.length;j++){
					if(this.links[i]["@rid"]==removeGraph.links[j]['@rid']){
						this.links.splice(i,1);
					}
				}
			}
			this.nodes = this.nodes.concat(newGraph.nodes);
			this.links = this.links.concat(newGraph.links);
			this.resetGraph();
		},
		resetGraph:function(){
			this.svg.selectAll("*").remove();
			var nodes = jQuery.extend(true, [], this.nodes);
			var links = jQuery.extend(true, [], this.links);
			//filtering
			if(this.options.filterType!="off"){
				var net = this.filterNetworkBasedOnAttribute(nodes,links,this.options.edgeUsed);
				this.displayNodes = net.nodes;
				this.displayLinks = net.edges;
			}else{
				this.displayNodes = nodes;
				this.displayLinks = links;
			}
			//clustering
			if(this.options.clusteringMethod=="kmeansClustering"){
				if(this.clusters==undefined){
					this.clusters = this.kmeansClustering(this.displayNodes,this.displayLinks,this.options.edgeUsed,this.options.noOfCluster);
				}
				var net = this.createClusters(this.displayNodes,this.displayLinks,this.clusters);
				this.displayNodes = net.nodes;
				this.displayLinks = net.links;
				this.checkExpand();
			}else if(this.options.clusteringMethod=="attribute"){
				if(this.clusters==undefined){
					this.clusters = this.attributeClustering(this.displayNodes,this.displayLinks,this.options.edgeUsed,this.options.clusteringClassAttribute);
				}
				var net = this.createClusters(this.displayNodes,this.displayLinks,this.clusters);
				this.displayNodes = net.nodes;
				this.displayLinks = net.links;
				this.checkExpand();
			}else if(this.options.clusteringMethod=="hiearchicalClustering"){
				if(this.clusters==undefined){
					this.clusters = this.hiearchicalClustering(this.displayNodes,this.displayLinks,this.options.edgeUsed,
																this.options.hiearchicalClusteringThreshold,
																this.options.hiearchicalClusteringLinkageCriteria,
																this.options.hiearchicalClusteringDirection);
				}
				var net = this.createClusters(this.displayNodes,this.displayLinks,this.clusters);
				this.displayNodes = net.nodes;
				this.displayLinks = net.links;
				this.checkExpand();
			}else if(this.options.clusteringMethod=="spectralClustering"){
				if(this.clusters==undefined){
					this.clusters = this.spectralGraphPartition(this.displayNodes,this.displayLinks,this.options.edgeUsed,this.options.noOfCluster,this.options.spectralClusteringDirection);
				}
				var net = this.createClusters(this.displayNodes,this.displayLinks,this.clusters);
				this.displayNodes = net.nodes;
				this.displayLinks = net.links;
				this.checkExpand();
			}else{
				for(i in this.displayNodes){
					this.displayNodes[i].cluster = undefined;
				}
			}
			
			this.init();
			this.findDuplicateLinks();
			this.displayGraph();
			this.simulation.alpha(0.3).restart();
			var property = this.loadBasicNetworkProperties();
			displayBasicNetworkProperties(property);
		},
		getClass: function (vertex){
			if(vertex){
				return this.schemas.vertex;
			}else{
				return this.schemas.edge;
			}
		},
		deleteNodeinNetwork: function(rid,classType){//public
			if(rid.charAt(0)=='#'){
				var json = {};
				json['@rid'] = rid;
				json['@class'] = classType;
				this.deleted.nodes.push(json);
			}
			var newGraph = {nodes:[],links:[]};
			var connectedLinks = deleteAssociatedEdge(json,this.links);
			//update maps
			var schema = this.schemas;
			for(var i=0;i<schema.edge.length;i++){
				for(edge in this.nodeMap[rid]["in_"+schema.edge[i].name]){
					//delete node's neighbor of the deleted edge
					var out_id = this.edgeMap[this.nodeMap[rid]["in_"+schema.edge[i].name][edge]]['out'];
					var index = this.nodeMap[out_id]["out_"+schema.edge[i].name].indexOf(this.nodeMap[rid]["in_"+schema.edge[i].name][edge]);
					this.nodeMap[out_id]["out_"+schema.edge[i].name].splice(index,1);
					//delete neighbor in neighborMap
					delete this.neighborMap[schema.edge[i].name+"_"+rid];
					if(this.neighborMap[schema.edge[i].name+"_"+out_id]!=undefined){
						index = this.neighborMap[schema.edge[i].name+"_"+out_id].indexOf(rid);
						if(index>-1){
							this.neighborMap[schema.edge[i].name+"_"+out_id].splice(index,1)
						}
					}
					//delete edge in edge map
					delete this.edgeMap[this.nodeMap[rid]["in_"+schema.edge[i].name][edge]]
				}
				for(edge in this.nodeMap[rid]["out_"+schema.edge[i].name]){
					//delete node's neighbor of the deleted edge
					var in_id = this.edgeMap[this.nodeMap[rid]["out_"+schema.edge[i].name][edge]]['in'];
					var index = this.nodeMap[in_id]["in_"+schema.edge[i].name].indexOf(this.nodeMap[rid]["out_"+schema.edge[i].name][edge]);
					this.nodeMap[in_id]["in_"+schema.edge[i].name].splice(index,1);
					//delete neighbor in neighborMap
					delete this.neighborMap[schema.edge[i].name+"_"+rid];
					if(this.neighborMap[schema.edge[i].name+"_"+in_id]!=undefined){
						index = this.neighborMap[schema.edge[i].name+"_"+in_id].indexOf(rid);
						if(index>-1){
							this.neighborMap[schema.edge[i].name+"_"+in_id].splice(index,1)
						}
					}
					//delete edge in edge map
					delete this.edgeMap[this.nodeMap[rid]["out_"+schema.edge[i].name][edge]]
				}
			}
			//delete node itself
			delete this.nodeMap[rid]
				
			var removeGraph = {nodes:[{"@rid":rid}],links:connectedLinks};
			this.updateGraph(newGraph,removeGraph)
		},
		attributeClustering:function(nodes,links,edgeType,clusteringClassAttribute){
			var clusters = {};
			for(i in nodes){
				var node = nodes[i];
				var groupAttr = clusteringClassAttribute[node["@class"]];
				var groupAttrVal = node[groupAttr];
				if(clusters[groupAttrVal]==undefined){
					clusters[groupAttrVal] = {nodes:[]};
				}
				clusters[groupAttrVal].nodes.push(node["@rid"]);
			}
			return clusters;
		},
		getEigenValues:function(lmatrix,callback){
			var functionURL = "http://localhost:8080/getEigenValues";
			var json = {lmatrix:lmatrix}
			ajaxServer(functionURL,json,function(result){
				callback(result);
			},function(error){
				console.log("EigenValues error");
			});
		},
		getLMatrix:function(nodes,links,edgeType,direction){
			var lmatrix = new Array(nodes.length);
			var dmatrix = new Array(nodes.length);
			var nodemap = {};
			var neighborMap = this.getNeighborMapping(nodes,links,direction);
			for(i in nodes){
				nodemap[nodes[i]["@rid"]] = i;
				var innerArr = new Array(nodes.length);
				var innerArr2 = new Array(nodes.length);
				for(var j=0;j<innerArr.length;j++){
					innerArr[j] = 0;
					innerArr2[j] = 0;
				}
				if(neighborMap[edgeType+"_"+nodes[i]["@rid"]]!=undefined){
					innerArr[i] = neighborMap[edgeType+"_"+nodes[i]["@rid"]].length;
					innerArr2[i] = Math.pow(neighborMap[edgeType+"_"+nodes[i]["@rid"]].length,(-1/2));
				}else{
					innerArr[i] = 0;
					innerArr2[i] = 0;
				}
				lmatrix[i] = innerArr;
				dmatrix[i] = innerArr2;
			}
			for(i in neighborMap){
				var id = i.split("_")[1];
				var index = nodemap[id]
				var neArr = neighborMap[i];
				for(j in neArr){
					var index2 = nodemap[neArr[j]];
					lmatrix[index][index2] = -1;
				}
			}
			var lmatrix2 = matrixMult(dmatrix,lmatrix);
			var finalLmatrix = matrixMult(lmatrix2,dmatrix);
			return {nodemap:nodemap,lmatrix:lmatrix};
		},
		spectralGraphPartition:function(nodes,links,edgeType,k,direction){
			var lmatrix = this.getLMatrix(nodes,links,edgeType,direction);
			var centroids = [];
			var parent = this;
			this.getEigenValues(lmatrix.lmatrix,function(eigenvalues){
				var eigenvaluesMatterOriginal = [];
				
				//take smallest 3
				var lambda = eigenvalues.num.lambda.x.slice();
				for(i in lambda){
					lambda[i] = parseFloat(lambda[i]);
				}
				lambda.sort(function(a,b){return a-b;});
				var index = new Array(k);
				for(var j=0;j<k;j++){
					for(var i=0;i<eigenvalues.num.lambda.x.length;i++){
						if(eigenvalues.num.lambda.x[i]==lambda[j]){
							index[j] = i;
							break;
						}
					}
				}
				for(j in index){
					var arr = [];
					for(i in eigenvalues.num.E.x){
						arr.push(eigenvalues.num.E.x[i][index[j]]);
					}
					eigenvaluesMatterOriginal.push(arr);
				}
				
				/*//take 1st k
				for(var j=0;j<k;j++){
					var arr = [];
					for(i in eigenvalues.num.E.x){
						arr.push(eigenvalues.num.E.x[i][j]);
					}
					eigenvaluesMatterOriginal.push(arr);
				}*/
				//normalizing
				for(j in eigenvaluesMatterOriginal){
					var sum = 0;
					for(i in eigenvaluesMatterOriginal[j]){
						sum+=(eigenvaluesMatterOriginal[j][i]*eigenvaluesMatterOriginal[j][i]);
					}
					sum = Math.sqrt(sum);
					for(i in eigenvaluesMatterOriginal[j]){
						eigenvaluesMatterOriginal[j][i] = (eigenvaluesMatterOriginal[j][i]/sum);
					}
				}
				centroids = parent.kmeansClustering(eigenvaluesMatterOriginal,k);
				for(i in centroids){
					for(n in centroids[i].nodes){
						var index = centroids[i].nodes[n];
						var rid;
						for(j in lmatrix.nodemap){
							if(lmatrix.nodemap[j]==index){
								rid = j;
							}
						}
						centroids[i].nodes[n] = rid;
					}
				}
				/*//when splitting to 2 equalsize graph
				var lambda = eigenvalues.num.lambda.x.slice();
				for(i in lambda){
					lambda[i] = parseFloat(lambda[i]);
				}
				lambda.sort(function(a,b){return a-b;});
				console.log(eigenvalues.num.lambda.x);
				console.log(lambda);
				var index = -1;
				for(i in eigenvalues.num.lambda.x){
					if(eigenvalues.num.lambda.x[i]==lambda[1]){
						index = i;
						break;
					}
				}
				console.log(index);
				var eigenvaluesMatter = [];
				for(i in eigenvalues.num.E.x[index]){
					eigenvaluesMatter.push(eigenvalues.num.E.x[i][index]);
				}
				
				var eigenvaluesMatterOriginal = eigenvaluesMatter.slice();
				eigenvaluesMatter.sort(function(a,b){return a-b;});
				
				console.log(eigenvalues.num.E.x);
				console.log(eigenvaluesMatterOriginal);
				console.log(eigenvaluesMatter);
				var median = 0;
				if(eigenvaluesMatter.length%2==1){//odd
					console.log(Math.floor(eigenvaluesMatter.length/2));
					median = eigenvaluesMatter[Math.floor(eigenvaluesMatter.length/2)];
				}else{//even
					console.log((Math.floor(eigenvaluesMatter.length/2)));
					console.log((Math.floor(eigenvaluesMatter.length/2))-1);
					var val1 = eigenvaluesMatter[(Math.floor(eigenvaluesMatter.length/2))-1];
					var val2 = eigenvaluesMatter[(Math.floor(eigenvaluesMatter.length/2))];
					median = (val1+val2)/2;
				}
				console.log(median);
				var A = {nodes:[]};
				var B = {nodes:[]};
				for(i in eigenvaluesMatterOriginal){
					var rid;
					for(j in lmatrix.nodemap){
						if(lmatrix.nodemap[j]==i){
							rid = j;
							break;
						}
					}
					console.log(eigenvaluesMatterOriginal[i]+">="+median);
					console.log(eigenvaluesMatterOriginal[i]>=median);
					console.log(rid);
					if(eigenvaluesMatterOriginal[i]>=median){
						A.nodes.push(rid);
					}else{
						
						B.nodes.push(rid);
					}
				}
				centroids.push(A);
				centroids.push(B);
				console.log(centroids);*/
			});
			return centroids;
		},
		hiearchicalClustering:function(nodes,links,edgeType,threshold,linkageCriteria,direction){
			var CS = this.similarityCalculation(nodes,links,edgeType,direction);
			var highest = 1;
			var centroids = [];
			var queue = new BinaryHeap(
				function(element) {return element.CS;},
				function(element) {return element.rid;},
				'CS'
			);
			for(i in CS){
				for(j in CS[i]){
					var obj = {rid:i+"TO"+j,CS:(-1*CS[i][j])};
					queue.push(obj);
				}
			}
			
			while(highest>=threshold){
				if(Object.keys(CS[Object.keys(CS)[0]]).length==0){
					break;
				}
				var localhighest = 0;
				var index1=-1,index2=-1;
				//find the most similar nodes
				var obj = queue.pop();
				localhighest = -1*obj.CS;
				index1 = obj.rid.split("TO")[0];
				index2 = obj.rid.split("TO")[1];
				if(localhighest>=threshold){
					for(i in CS){
						if(i!=index1 && i!=index2){
							var value1;var value2;var finalvalue;
							//remove the merged cluster
							for(j in CS[i]){
								if(j==index1){value1=CS[i][j]; delete CS[i][j]; queue.decreaseKey(i+"TO"+j,1)}
								if(j==index2){value2=CS[i][j]; delete CS[i][j]; queue.decreaseKey(i+"TO"+j,1)}
							}
							//linkageCriteria
							if(linkageCriteria="min"){
								if(value1>=value2){finalvalue = value1;}
								else{finalvalue = value2;}
							}else if(linkageCriteria="max"){
								if(value1<value2){finalvalue = value1;}
								else{finalvalue = value2;}
							}else if(linkageCriteria="avg"){
								finalvalue = (value1+value2)/2;
							}

							//create new merged cluster
							if(CS[index1+"AND"+index2]==undefined){
								CS[index1+"AND"+index2]={};
							}
							CS[i][index1+"AND"+index2] = finalvalue;
							CS[index1+"AND"+index2][i] = finalvalue;
							
							var mergedRID = index1+"AND"+index2+"TO"+i;
							var obj = {rid:mergedRID,CS:(-1*finalvalue)};
							queue.push(obj);
							var mergedRID2 = i+"TO"+index1+"AND"+index2;
							var obj2 = {rid:mergedRID2,CS:(-1*finalvalue)};
							queue.push(obj2);
						}
					}
					for(i in CS[index1]){
						if(i!=index2){
							queue.decreaseKey(index1+"TO"+i,1)
						}
					}
					for(i in CS[index2]){
						queue.decreaseKey(index2+"TO"+i,1)
					}
					delete CS[index1]
					delete CS[index2]
				}else{
					break;
				}
				if(Object.keys(CS).length==0){
					break;
				}
				highest = localhighest;
			}
			/*
			while(highest>=threshold){
				if(Object.keys(CS[Object.keys(CS)[0]]).length==0){
					break;
				}
				var localhighest = 0;
				var index1=-1,index2=-1;
				//find the most similar nodes
				for(i in CS){
					for(j in CS[i]){
						if(CS[i][j]>=localhighest){
							localhighest = CS[i][j];
							index1 = i;
							index2 = j;
						}
					}
				}
				if(localhighest>=threshold){
					for(i in CS){
						if(i!=index1 && i!=index2){
							var value1;
							var value2;
							var finalvalue;
							//remove the merged cluster
							for(j in CS[i]){
								if(j==index1){value1=CS[i][j]; delete CS[i][j]}
								if(j==index2){value2=CS[i][j]; delete CS[i][j]}
							}
							//min
							if(linkageCriteria="min"){
								if(value1>=value2){finalvalue = value1;}
								else{finalvalue = value2;}
							}else if(linkageCriteria="max"){
								if(value1<value2){finalvalue = value1;}
								else{finalvalue = value2;}
							}else if(linkageCriteria="avg"){
								finalvalue = (value1+value2)/2;
							}

							//create new merged cluster
							if(CS[index1+"AND"+index2]==undefined){
								CS[index1+"AND"+index2]={};
							}
							CS[i][index1+"AND"+index2] = finalvalue;
							CS[index1+"AND"+index2][i] = finalvalue;
						}
					}
					delete CS[index1]
					delete CS[index2]
				}
				if(Object.keys(CS).length==0){
					break;
				}
				highest = localhighest;
			}*/
			if(Object.keys(CS).length==0){
				var C = {nodes:[]};
				for(i in nodes){
					C.nodes.push(nodes[i]["@rid"]);
				}
				centroids.push(C);
			}else if(Object.keys(CS[Object.keys(CS)[0]]).length==0){
				
			}else{
				for(i in CS){
					var C = {nodes:[]};
					var cnodes = i.split("AND");
					for(j in cnodes){
						C.nodes.push(cnodes[j]);
					}
					centroids.push(C);
				}
			}
			return centroids;
		},
		kmeansClustering:function(vectors,k){
			//what is needed: value of k
			//1 randomly select k data points to act as centroids
			//2 calculate eucidean distance between each data point and each centroid.
			//3 assign each data point to the cluster with which it has the *smallest* distance
			//4 calculate the average of each cluster to get new centroids
			var centroids = [];
			var centroidsB = [];
			if(k<=vectors[0].length){
				var used = {};
				//getting k points
				var centroidPoints = [];
				//get 1st point at random
				var node = (Math.floor(Math.random() * (vectors[0].length)));
				centroidPoints.push(node.toString());
				var vector = [];
				for(var j=0;j<k;j++){
					vector.push(vectors[j][node]);
				}
				centroids.push({vector:vector,nodes:[node.toString()]});
				used[node] = true;
				//do for k-1
				for(var i=0; i<(k-1); i++){
					var potentialPoint;
					var largestDist = 0;
					//find largest distance between centroid and the other points that is not yet clustered;
					for(j in vectors[0]){
						var totalDist = 0;
						var vectorUnclustered = [];
						for(n in vectors){
							vectorUnclustered.push(vectors[n][j]);
						}
						for(n in centroidPoints){
							if(centroidPoints[n]!=j){
								var vectorclustered = [];
								for(m in vectors){
									vectorclustered.push(vectors[m][centroidPoints[n]]);
								}
								var dist = EDist(vectorUnclustered,vectorclustered);
								totalDist+=dist;
							}
						}
						if(totalDist>largestDist){
							largestDist = totalDist;
							potentialPoint = j;
						}
					}
					centroidPoints.push(potentialPoint);
					var vector = [];
					for(var j=0;j<k;j++){
						vector.push(vectors[j][potentialPoint]);
					}
					centroids.push({vector:vector,nodes:[potentialPoint]});
				}
				var updated = true;
				var first = true;
				//converge
				while(updated==true){
					updated = false;
					//find and allocate the nodes to the nearest centroid
					for(i in vectors[0]){//i is the index of the nodes
						var iStr = i.toString();
						var num = i;
						var closest = -1;
						var closestD = 999;
						var inside = false;
						var vectorNode = [];
						for(var j=0;j<k;j++){
							vectorNode.push(vectors[j][num]);
						}
						for(c in centroids){
							if(centroids[c].nodes.indexOf(iStr)==-1){
								var vectorC = centroids[c].vector;
								var dist = EDist(vectorC,vectorNode);
								if(closestD>dist){
									closest = c;
									closestD = dist;
								}
							}else{
								inside=true;
								break;
							}
						}
						if(inside==false){
							centroids[closest].nodes.push(iStr);
						}
					}
					//check if any centroids are empty
					for(c in centroids){
						if(centroids[c].nodes.length==0){
							//find largest SSE Node
							var SSE = findLargestSSED(vectors,centroids)
							centroids[c].nodes.push(SSE.node);
							var index = centroids[SSE.centroidIndex].nodes.indexOf(SSE.node);
							centroids[SSE.centroidIndex].nodes.splice(index,1);
						}
					}
					//check if its changed
					if(first==true){
						first=false; updated = true;
					}else{
						for(i in centroids){
							if(centroids[i].nodes.length!=centroids[i].pnodes.length){
								updated = true; break;
							}
							var nodes1; var nodes2;
							if(centroids[i].nodes.length>=centroids[i].pnodes.length){nodes1=centroids[i].nodes; nodes2=centroids[i].pnodes;
							}else{nodes2=centroids[i].nodes; nodes1=centroids[i].pnodes;}
							for(j in nodes1){
								if(nodes2.indexOf(nodes1[j])==-1){
									updated = true; break;
								}
							}
						}
					}
					//check if updated then update centroid CS
					if(updated==true){
						//update centroid CS
						for(i in centroids){
							var sum = 0;
							var vectorC = [];
							for(n in vectors){
								var sum = 0;
								for(j in centroids[i].nodes){
									sum+=vectors[n][centroids[i].nodes[j]];
								}
								vectorC.push((sum/centroids[i].nodes.length));
							}
							centroids[i].vector = vectorC;
							centroids[i].pnodes = centroids[i].nodes;
							centroids[i].nodes = [];
						}
					}
				}
			}
			return centroids;
		},
		similarityCalculation:function(nodes,edges,edgeType,direction){//public
			//return a hashmap containing the cosineSimilarity of each node
			//cosinesimilarity(d1,d2) = (d1 . d2) /(|d1| * |d2|)
			//using the links to calculate the CS
			//direction:in,out,both
			var CS = {};
			var neighborMap = this.getNeighborMapping(nodes,edges,direction);
			for(i in nodes){
				var nodeID1 = nodes[i]["@rid"];
				CS[nodeID1] = {};
				for(j in nodes){
					var nodeID2 = nodes[j]["@rid"];
					var dotproduct = 0;
					var neighbor1 = neighborMap[edgeType+"_"+nodeID1];
					var neighbor2 = neighborMap[edgeType+"_"+nodeID2];
					if(nodeID1!=nodeID2&&neighbor1!=undefined && neighbor2!=undefined){//if both nodes have neighbors
						for(ne1 in neighbor1){
							if(neighbor2.indexOf(neighbor1[ne1])>-1){
								dotproduct++;
							}
						}
						var dd1 =  Math.sqrt(neighbor1.length);
						var dd2 =  Math.sqrt(neighbor2.length);
						CS[nodeID1][nodeID2] = dotproduct/(dd1*dd2);
					}
				}
			}
			return CS;
		},
		deleteEdgeinNetwork: function(rid,classType){//public
			if(rid.charAt(0)=='#'){
				var json = {};
				json['@rid'] = rid;
				json['@class'] = classType;
				this.deleted.links.push(json);
			}
			//update map
			//delete neighbor in nodeMap
			var index = this.nodeMap[this.edgeMap[rid].in]["in_"+this.edgeMap[rid]['@class']].indexOf(rid);
			if(index>-1){
				this.nodeMap[this.edgeMap[rid].in]["in_"+this.edgeMap[rid]['@class']].splice(index,1);
			}
			index = this.nodeMap[this.edgeMap[rid].out]["out_"+this.edgeMap[rid]['@class']].indexOf(rid);
			if(index>-1){
				this.nodeMap[this.edgeMap[rid].out]["out_"+this.edgeMap[rid]['@class']].splice(index,1);
			}
			//delete neighbor in neighborMap
			index = this.neighborMap[this.edgeMap[rid]['@class']+"_"+this.edgeMap[rid].out].indexOf(this.edgeMap[rid].in)
			if(index>-1){
				this.neighborMap[this.edgeMap[rid]['@class']+"_"+this.edgeMap[rid].out].splice(index,1);
			}
			if(this.directed==false){
				index = this.neighborMap[this.edgeMap[rid]['@class']+"_"+this.edgeMap[rid].in].indexOf(this.edgeMap[rid].out)
				if(index>-1){
					this.neighborMap[this.edgeMap[rid]['@class']+"_"+this.edgeMap[rid].in].splice(index,1);
				}
			}
			//delete edge itself
			delete this.edgeMap[rid]
				
			var newGraph = {nodes:[],links:[]}
			var removeGraph = {nodes:[],links:[{"@rid":rid}]};
			this.updateGraph(newGraph,removeGraph)
		},
		loadBasicNetworkProperties:function(){//public
			var edgeType = active.options.edgeUsed;
			//num of node/edge
			var noOfNodes = 0;
			var noOfEdges = 0;
			//number of components
			var components = 0;
			var cMap = {};
			for(i in this.edgeMap){
				noOfEdges++;
			}
			for(i in this.nodeMap){
				noOfNodes++;
				if(cMap[i]==undefined){
					var visited = this.BFS(i,this.options.edgeUsed);
					for(j in visited){
						cMap[j] = true;
					}
					components++;
				}
			}
			//density
			var density = 0;
			if(this.directed==true){
				density = (noOfEdges)/(noOfNodes*(noOfNodes-1))
			}else{
				density = (2*noOfEdges)/(noOfNodes*(noOfNodes-1))
			}
			var ret = {components:components,density:density,nodes:noOfNodes,edges:noOfEdges}
			return ret;
		},
		createNodeinNetwork: function(rid,classType,properties,callback){//public
			var parent = this;
			var json = {};
			for (var key in properties) {
				json[key] = properties[key]
			}
			json['@rid'] = rid;
			json['@class'] = classType;
			if(json['@rid'].charAt(0)=="#"){
				json['updated'] = true;
			}
			
			json['weight'] = 0
			
			//get all the edges 
			if(this.nodeMap[rid]!=undefined){
				for(i in this.schemas.edge){
					var node = this.nodeMap[rid];
					if(node["in_"+this.schemas.edge[i].name]!=undefined){
						json["in_"+this.schemas.edge[i].name] = node["in_"+this.schemas.edge[i].name];
					}
					if(node["out_"+this.schemas.edge[i].name]!=undefined){
						json["out_"+this.schemas.edge[i].name] = node["out_"+this.schemas.edge[i].name];
					}
				}
			}
			
			var newGraph = {nodes:[json],links:[]}
			var removeGraph = {nodes:[{"@rid":rid}],links:[]};
			//update map before reseting graph
			
			this.nodeMap[rid] = json;
			this.updateGraph(newGraph,removeGraph)
			callback(json,classType);
		},
		createEdgeinNetwork: function(rid,classType,ridfrom,ridto,properties,callback){//public
			var parent = this;
			var json = {};
			for (var key in properties) {
				json[key] = properties[key]
			}
			json['@rid'] = rid;
			json['@class'] = classType;
			if(json['@rid'].charAt(0)=="#"){
				json['updated'] = true;
			}
			if(this.nodeMap[ridfrom]!=undefined && this.nodeMap[ridto]!=undefined){
				json['source'] = ridfrom;
				json['target'] = ridto;
				json['in'] = ridto;
				json['out'] = ridfrom;
				var newGraph = {nodes:[],links:[json]};
				var removeGraph = {nodes:[],links:[{"@rid":rid}]};
				//update map before reseting graph
				this.edgeMap[rid] = json;
				this.updateGraph(newGraph,removeGraph);
				
				//nodemap
				if(this.nodeMap[ridfrom]['out_'+classType]==undefined){
					this.nodeMap[ridfrom]['out_'+classType] = [];
				}
				this.nodeMap[ridfrom]['out_'+classType].push(rid);
				if(this.nodeMap[ridto]['in_'+classType]==undefined){
					this.nodeMap[ridto]['in_'+classType] = [];
				}
				this.nodeMap[ridto]['in_'+classType].push(rid);
				//neighborMap
				if(this.neighborMap[classType+"_"+ridfrom]==undefined){
					this.neighborMap[classType+"_"+ridfrom] = [];
				}
				if(this.neighborMap[classType+"_"+ridfrom].indexOf(ridto)==-1){
					this.neighborMap[classType+"_"+ridfrom].push(ridto);
				}
				if(this.directed==false){
					if(this.neighborMap[classType+"_"+ridto]==undefined){
						this.neighborMap[classType+"_"+ridto] = [];
					}
					if(this.neighborMap[classType+"_"+ridto].indexOf(ridfrom)==-1){
						this.neighborMap[classType+"_"+ridto].push(ridfrom);
					}	
				}
				callback(json,classType);
			}else{
				throw "Please create the nodes first.";
			}
		},
		saveNetwork: function(){//public
			var parent = this;
			var vertex;
			var functionURL = "http://localhost:2480/function/"+this.db+"/saveNetwork";
			var jsonArray = {jsonString:{nodes:[],links:[],deleted:this.deleted}};
			var nodes = jQuery.extend(true, [], this.nodes);
			var links = jQuery.extend(true, [], this.links);
			var property = {name:""};
			for(var i=0;i<this.nodes.length;i++){
				var pnode = this.nodes[i];
				//save if only in the database and is editted.
				if(pnode['@rid'].charAt(0)!="#" || (pnode['@rid'].charAt(0)=="#"&&pnode['updated']==true)){
					//find schema of the updated node
					if(property.name!=pnode['@class']){
						for(var j=0;j<parent.schemas.vertex.length;j++){
							if(pnode['@class']==parent.schemas.vertex[j].name){
								property = parent.schemas.vertex[j];
								break;
							}
						}	
					}
					var rnode = {};
					rnode['@rid'] = pnode['@rid'];
					rnode['@class'] = pnode['@class'];
					//get the updated details based on the properties.
					for(var j=0;j<property.properties.length;j++){
						rnode[property.properties[j].name] = pnode[property.properties[j].name];
					}
					jsonArray.jsonString.nodes.push(rnode);
				}
			}
			property = {name:""};
			for(var i=0;i<this.links.length;i++){
				var plink = this.links[i];
				//save if only in the database and is editted.
				if(plink['@rid'].charAt(0)!="#" || (plink['@rid'].charAt(0)=="#"&&plink['updated']==true)){
					//find schema of the updated edge
					if(property.name!=plink['@class']){
						for(var j=0;j<parent.schemas.edge.length;j++){
							if(plink['@class']==parent.schemas.edge[j].name){
								property = parent.schemas.edge[j];
								break;
							}
						}	
					}
					var rlink = {};
					rlink['@rid'] = plink['@rid'];
					rlink['@class'] = plink['@class'];
					rlink['source'] = plink["out"];//plink['source']['@rid'];
					rlink['target'] = plink["in"];//plink['target']['@rid'];
					//get the updated details based on the properties.
					for(var j=0;j<property.properties.length;j++){
						rlink[property.properties[j].name] = plink[property.properties[j].name];
					}
					jsonArray.jsonString.links.push(rlink);
				}
			}
			var str = JSON.stringify(jsonArray);
			ajax(functionURL,str,function(result){
				parent.updateNetworkMap(result);
			});
		},
		updateNetworkMap: function(result){
			var parent = this;
			var schema = parent.schemas;
			//update UI after updating the database
			var nodeID = result.result[0]["createdNodeRID"];
			var linkID = result.result[0]["createdLinkRID"];
			var newNodes = [];
			var newLinks = [];
			var removeNodes = [];
			var removeLinks = [];
			
			//var tempneighborMap = {};
			for(var i=0;i<parent.nodes.length;i++){
				var pnode = parent.nodes[i];
				if(nodeID[pnode['@rid']]){
					var nnode = jQuery.extend(true, {}, pnode);
					nnode['@rid'] = nodeID[pnode['@rid']];
					newNodes.push(nnode);
					removeNodes.push({"@rid":pnode['@rid']});
					//update map
					parent.nodeMap[nnode['@rid']] = nnode;
					delete parent.nodeMap[pnode['@rid']];
				}
			}
			for(var i=0;i<parent.links.length;i++){
				var plink = parent.links[i];
				if(linkID[plink['@rid']]){
					var nlink = jQuery.extend(true, {}, plink);
					nlink['@rid'] = linkID[plink['@rid']][0];
					if(nlink['out'].charAt(0)!='#'){
						//update map
						if(parent.neighborMap[nlink["@class"]+"_"+nlink['out']]!=undefined){
							var index = parent.neighborMap[nlink["@class"]+"_"+nlink['out']].indexOf(nlink["in"]);
							if(index>-1){
								//update neighborMap
								parent.neighborMap[nlink["@class"]+"_"+nlink['out']].splice(index,1);
								//parent.neighborMap[nlink["@class"]+"_"+nlink['source']['@rid']].push(nodeID[nlink['target']['@rid']]);
								parent.neighborMap[nlink["@class"]+"_"+nlink['out']].push(nlink["in"]);
								//update inner nodeMap linking
								index = parent.nodeMap[nodeID[nlink['out']]]['out_'+nlink["@class"]].indexOf(plink['@rid']);
								parent.nodeMap[nodeID[nlink['out']]]['out_'+nlink["@class"]].splice(index,1);
								parent.nodeMap[nodeID[nlink['out']]]['out_'+nlink["@class"]].push(nlink['@rid']);
								//index = parent.nodeMap[nodeID[nlink['target']['@rid']]]['in_'+nlink["@class"]].indexOf(plink['@rid']);
								index = parent.nodeMap[nlink["in"]]['in_'+nlink["@class"]].indexOf(plink['@rid']);
								parent.nodeMap[nlink["in"]]['in_'+nlink["@class"]].splice(index,1);
								parent.nodeMap[nlink["in"]]['in_'+nlink["@class"]].push(nlink['@rid']);
							}
							parent.neighborMap[nlink["@class"]+"_"+nodeID[nlink['out']]] = parent.neighborMap[nlink["@class"]+"_"+nlink['out']];
							delete parent.neighborMap[nlink["@class"]+"_"+nlink['out']];
						}
						nlink['source'] = nodeID[nlink['out']];
						nlink['out'] = nodeID[nlink['out']];
					}else{
						nlink['source'] = nlink['out'];
					}
					if(nlink["in"].charAt(0)!='#'){
						//update map
						if(parent.neighborMap[nlink["@class"]+"_"+nlink["in"]]!=undefined){
							var index = parent.neighborMap[nlink["@class"]+"_"+nlink["in"]].indexOf(nlink['out']);
							if(index>-1){
								//update neighborMap
								parent.neighborMap[nlink["@class"]+"_"+nlink["in"]].splice(index,1);
								parent.neighborMap[nlink["@class"]+"_"+nlink["in"]].push(nodeID[nlink['out']]);
								//update inner nodeMap linking
								index = parent.nodeMap[nodeID[nlink["in"]]]['in_'+nlink["@class"]].indexOf(plink['@rid']);
								parent.nodeMap[nodeID[nlink["in"]]]['in_'+nlink["@class"]].splice(index,1);
								parent.nodeMap[nodeID[nlink["in"]]]['in_'+nlink["@class"]].push(nlink['@rid']);
								index = parent.nodeMap[nodeID[nlink['out']]]['out_'+nlink["@class"]].indexOf(plink['@rid']);
								parent.nodeMap[nodeID[nlink['out']]]['out_'+nlink["@class"]].splice(index,1);
								parent.nodeMap[nodeID[nlink['out']]]['out_'+nlink["@class"]].push(nlink['@rid']);
							}
							parent.neighborMap[nlink["@class"]+"_"+nodeID[nlink["in"]]] = parent.neighborMap[nlink["@class"]+"_"+nlink['out']];
							delete parent.neighborMap[nlink["@class"]+"_"+nlink["in"]];
						}
						nlink['target'] = nodeID[nlink["in"]];
						nlink['in'] = nodeID[nlink["in"]];
					}else{
						nlink['target'] = nlink["in"];
					}
					
					newLinks.push(nlink);
					removeLinks.push({"@rid":plink['@rid']});
					//update map
					parent.edgeMap[nlink['@rid']] = nlink;
					delete parent.edgeMap[plink['@rid']];
				}
			}
			var newGraph = {nodes:newNodes,links:newLinks}
			var removeGraph = {nodes:removeNodes,links:removeLinks};
			parent.updateGraph(newGraph,removeGraph);
			parent.deleted.nodes = [];
			parent.deleted.links = [];
		},
		queryDatabase: function(query,callback){//public
			var functionURL = "http://localhost:2480/function/"+this.db+"/ask";
			var json = {query:query};
			var str = JSON.stringify(json);
			this.clearGraph();
			var parent = this;
			ajax(parent.options.schemaURL,"",function(result){
				parent.schemas = result.result[0];
				ajax(functionURL,str,function(data1){
					parent.svg.select(".wrapper").selectAll("*").remove();
					parent.data = data1;
					parent.loadData();
					parent.options.rdy();
					//parent.resetGraph();
					callback();
				},function(){
					console.log("error in query");
					displayErrorMsg("error in query")
				});
			},function(){
				console.log("error getting schema");
				displayErrorMsg("error getting schema")
			})
			
		},
		exportNetwork: function(a){//public
			if((this.displayNodes&&this.displayLinks)&&(this.displayNodes.length>0)){
				var textExport = "";
				var nodesExport = "";
				var linksExport = "";
				var linksPropertyExport = "";
				var schemaExportV = "";
				var schemaUsedV = {};
				var schemaExportE = "";
				var schemaUsedE = {};
				for(i in this.displayLinks){
					var link = this.displayLinks[i];
					linksExport+="\n"+(link.out+"to"+link.in).replace(new RegExp("#", 'g'),"");
					if(schemaUsedE[link["@class"]]==undefined){
						for(j in this.schemas.edge){
							var schema = this.schemas.edge[j];
							if(schema.name==link["@class"]){
								schemaUsedE[link["@class"]] = schema;
							}
						}
					}
					linksPropertyExport+="\n";
					linksPropertyExport+= (link.out+"to"+link.in).replace(new RegExp("#", 'g'),"");
					linksPropertyExport+= " "+link["@class"];
					for(j in schemaUsedE[link["@class"]].properties){
						var property = schemaUsedE[link["@class"]].properties[j].name;
						linksPropertyExport+=" "+link[property];
					}
				}
				for(i in this.displayNodes){
					var node = this.displayNodes[i];
					if(schemaUsedV[node["@class"]]==undefined){
						for(j in this.schemas.vertex){
							var schema = this.schemas.vertex[j];
							if(schema.name==node["@class"]){
								schemaUsedV[node["@class"]] = schema;
							}
						}
					}
					nodesExport+="\n";
					nodesExport+= node["@rid"].replace(new RegExp("#", 'g'),"");
					nodesExport+= " "+node["@class"];
					for(j in schemaUsedV[node["@class"]].properties){
						var property = schemaUsedV[node["@class"]].properties[j].name;
						nodesExport+=" "+node[property];
					}
					
				}
				for(j in schemaUsedV){
					schemaExportV+="\n";
					schemaExportV+=schemaUsedV[j].name;
					for(k in schemaUsedV[j].properties){
						var property = schemaUsedV[j].properties[k].name;
						schemaExportV+=" "+property
					}
				}
				for(j in schemaUsedE){
					schemaExportE+="\n";
					schemaExportE+=schemaUsedE[j].name;
					for(k in schemaUsedE[j].properties){
						var property = schemaUsedE[j].properties[k].name;
						schemaExportE+=" "+property
					}
				}
				
				textExport += "#nodes property";
				textExport += nodesExport
				textExport += "\n#links property";
				textExport += linksPropertyExport
				textExport += "\n#links";
				textExport += linksExport
				textExport += "\n#schema";
				textExport += schemaExportV
				textExport += "\n#divide";
				textExport += schemaExportE
				
				var type="text/plain"
				var file = new Blob([textExport], {type: type});
				a.href = URL.createObjectURL(file);
				a.download = name;
			}else{
				displayErrorMsg("No network has been found");
			}
		},
		checkExpand:function(){
			for(var i=0;i<this.displayLinks.length;i++){
				var edge = this.displayLinks[i];
				var eout = edge.out;
				var ein = edge.in;
				var splice = false;
				if(eout.indexOf("cluster")>-1&&ein.indexOf("cluster")>-1){
					// cluster to cluster,
					for(j in edge.edges){
						var ce = edge.edges[j];
						if(this.clusterMap[eout].expand.C==true){
							ce.source = ce.out;
							splice = true;
						}
						if(this.clusterMap[ein].expand.C==true){
							ce.target = ce.in;
							splice = true;
						}
						if(splice==true){
							this.displayLinks.push(ce);
						}
					}
				}else if(eout.indexOf("cluster")>-1){
					//cluster to node,
					if(this.clusterMap[eout].expand.C==true){
						for(j in edge.edges){
							var ce = edge.edges[j];
							ce.source = ce.out;
							this.displayLinks.push(ce);
						}
						splice = true;
					}
				}else if(ein.indexOf("cluster")>-1){
					//node to cluster
					if(this.clusterMap[ein].expand.C==true){
						for(j in edge.edges){
							var ce = edge.edges[j];
							ce.target = ce.in;
							this.displayLinks.push(ce);
						}
						splice = true;
					}
				}
				if(splice==true){
					this.displayLinks.splice(i,1);
					i--;
				}
			}
			for(var i=0;i<this.displayNodes.length;i++){
				var node = this.displayNodes[i];
				if(this.clusterMap[node["@rid"]]!=undefined){
					var clusterNode = this.clusterMap[node["@rid"]];
					if(clusterNode.expand.C==true){
						//expand
						for(j in clusterNode.nodes){//add back the nodes within the cluster
							this.displayNodes.push(clusterNode.nodes[j]);
						}
						for(j in clusterNode.edges){//add back the edges within the cluster
							clusterNode.edges[j]["source"] = clusterNode.edges[j]["out"]
							clusterNode.edges[j]["target"] = clusterNode.edges[j]["in"]
							this.displayLinks.push(clusterNode.edges[j]);
						}
						this.displayNodes.splice(i,1);
						i--;
					}
				}
			}
		},
		filterNetworkBasedOnAttribute:function(nodes,edges,edgeType){
			var network = {};
			network.nodes = [];
			network.edges = [];
			if(this.options.filterType=="off"){
				network.nodes = nodes;
				network.edges = edges;
			}else{
				var filterType = this.options.filterType;
				var filterCondition = this.options.filterCondition;
				var CCs;
				if(filterType=="closeness"){
					this.getCloseness(edgeType,function(closeness){
						CCs = closeness;
					});
				}
				//edgemap for normal edges
				var nm = jQuery.extend(true, {}, this.edgeMap);
				for(i in edges){
					var edge = edges[i];
					if(nm[edge["@rid"]]==undefined){
						nm[edge["@rid"]] = edge;
					}
				}
				for(i in nodes){
					var node = nodes[i];
					var attribute = 0;
					if(filterType=="degree"){
						if(node["out_"+edgeType]!=undefined){
							attribute = node["out_"+edgeType].length;
						}
						if(this.directed==false){
							if(node["in_"+edgeType]!=undefined){
								attribute += node["in_"+edgeType].length;
							}
						}
					}else if(filterType=="CC"){
						attribute = this.calCC(node,edgeType);
					}else if(filterType=="closeness"){
						attribute = CCs[node["@rid"]];
					}
					if(attribute>=filterCondition){
						network.nodes.push(node);
					}else{
						for(j in this.schemas.edge){
							var edgeClass = this.schemas.edge[j].name;
							if(node["out_"+edgeClass]!=undefined){
								for(k in node["out_"+edgeClass]){
									var edgeID = node["out_"+edgeClass][k];
									delete nm[edgeID];
								}
							}
							if(node["in_"+edgeClass]!=undefined){
								for(k in node["in_"+edgeClass]){
									var edgeID = node["in_"+edgeClass][k];
									delete nm[edgeID];
								}
							}
						}
					}
				}
				if(network.nodes.length>1){
					for (i in nm){
						nm[i].source = nm[i].out;
						nm[i].target = nm[i].in;
						network.edges.push(nm[i]);
					}
				}
			}
			return network;
		},
		createClusters:function(nodes,links,clusters){
			var finalNodes = [];
			var finalLinks = [];
			var clusterLinks = {};//add
			var nodeMap = {};
			for(i in nodes){
				nodeMap[nodes[i]["@rid"]] = nodes[i]
			}
			var edgeMap = {};
			for(i in links){
				edgeMap[links[i]["@rid"]] = links[i]
			}
			for(i in clusters){
				if(clusters[i].nodes.length>1){
					var cluster;
					if(this.clusterMap["cluster"+i]!=undefined){
						cluster = {"@rid":"cluster"+i,nodes:[],edges:[],weight:0,expand:this.clusterMap["cluster"+i]["expand"],clusterEdgeB:[]};
					}else{
						cluster = {"@rid":"cluster"+i,nodes:[],edges:[],weight:0,expand:{P:false,C:false},clusterEdgeB:[]};
					}
					this.clusterMap[cluster["@rid"]] = cluster;
					for(j in clusters[i].nodes){
						var cnode = nodeMap[clusters[i].nodes[j]];
						cnode.cluster = i;
						cluster.nodes.push(cnode);
					}
				}else{
					finalNodes.push(nodeMap[clusters[i].nodes[0]]);
				}
			}
			
			for(i in edgeMap){
				var edge = edgeMap[i];
				var innode=nodeMap[edge.in]; var outnode = nodeMap[edge.out];
				if(innode.cluster!=undefined && outnode.cluster!=undefined && innode.cluster==outnode.cluster){
					//check for edges within the cluster
					this.clusterMap["cluster"+innode.cluster].edges.push(edge);
				}else if(innode.cluster!=undefined && outnode.cluster!=undefined){
					//check for edges between clusters
					var rid = "cluster"+outnode.cluster+"_cluster"+innode.cluster;
					edge.source = "cluster"+outnode.cluster; edge.target = "cluster"+innode.cluster;
					var clusterLink = clusterLinks[rid];
					if(clusterLinks[rid]==undefined){
						clusterLink = {in:"cluster"+innode.cluster,
										out:"cluster"+outnode.cluster,
										"@rid":rid,
										edges:[],
										source:"cluster"+outnode.cluster,
										target:"cluster"+innode.cluster};
						clusterLinks[rid] = clusterLink;
						
					}
					this.clusterMap["cluster"+innode.cluster].clusterEdgeB.push(edge);
					this.clusterMap["cluster"+outnode.cluster].clusterEdgeB.push(edge);
					clusterLink.edges.push(edge);
				}else if(innode.cluster==undefined && outnode.cluster!=undefined){
					//check for edges between clusters and normal nodes
					var rid = "cluster"+outnode.cluster+"_"+innode["@rid"];
					edge.source = "cluster"+outnode.cluster;
					var clusterLink = clusterLinks[rid];
					if(clusterLinks[rid]==undefined){
						clusterLink = {in:innode["@rid"],
										out:"cluster"+outnode.cluster,
										"@rid":rid,
										edges:[],
										source:"cluster"+outnode.cluster,
										target:innode["@rid"]};
						clusterLinks[rid] = clusterLink;
					}
					this.clusterMap["cluster"+outnode.cluster].clusterEdgeB.push(edge);
					clusterLink.edges.push(edge);
				}else if(innode.cluster!=undefined && outnode.cluster==undefined){
					//check for edges between clusters and normal nodes
					var rid = outnode["@rid"]+"_cluster"+innode.cluster;
					edge.target = "cluster"+innode.cluster;
					var clusterLink = clusterLinks[rid];
					if(clusterLinks[rid]==undefined){
						clusterLink = {in:"cluster"+innode.cluster,
										out:outnode["@rid"],
										"@rid":rid,
										edges:[],
										source:outnode["@rid"],
										target:"cluster"+innode.cluster};
						clusterLinks[rid] = clusterLink;
					}
					this.clusterMap["cluster"+innode.cluster].clusterEdgeB.push(edge);
					clusterLink.edges.push(edge);
				}else if(innode.cluster==undefined && outnode.cluster==undefined){
					//edge between normal nodes
					finalLinks.push(edge);
				}				
			}
			for(i in this.clusterMap){
				finalNodes.push(this.clusterMap[i]);
			}
			for(i in clusterLinks){
				finalLinks.push(clusterLinks[i]);
			}
			if(finalNodes.length==0){
				for(i in nodes){
					finalNodes.push(nodes[i]);
				}
			}
			return {nodes:finalNodes,links:finalLinks};
		},
		uploadNetwork: function(json,schemas,callback){//public
			this.clearGraph();
			this.schemas = schemas;
			this.data = json;
			this.loadData();
			this.options.rdy();
			
			callback();
		},
		changeNodeLabel: function(label,nodeClass){//public
			this.options.nodeLabel[nodeClass] = label;
			this.resetGraph();
		},
		offClusteringMethod: function(){//public
			this.options.clusteringMethod = "off";
			this.clusters = undefined;
			this.clusterMap={};
			this.resetGraph();
		},
		setKmeansClusteringSettings:function(noOfCluster){
			this.options.clusteringMethod = "kmeansClustering";
			this.options.noOfCluster = noOfCluster;
			this.clusters = undefined;
			this.clusterMap={};
			this.resetGraph();
		},
		setSpectralClusteringSettings:function(noOfCluster,direction){
			this.options.clusteringMethod = "spectralClustering";
			this.options.noOfCluster = noOfCluster;
			this.options.spectralClusteringDirection = direction;
			this.clusters = undefined;
			this.clusterMap={};
			this.resetGraph();
		},
		setHiearchicalClusteringSettings:function(threshold,linkageCriteria,direction){
			this.options.clusteringMethod = "hiearchicalClustering";
			this.options.hiearchicalClusteringThreshold = threshold;
			this.options.hiearchicalClusteringLinkageCriteria = linkageCriteria;
			this.options.hiearchicalClusteringDirection = direction;
			this.clusters = undefined;
			this.clusterMap={};
			this.resetGraph();
		},
		setClusteringClassAttribute: function(classType,attribute){//public
			this.options.clusteringMethod = "attribute";
			this.options.clusteringClassAttribute[classType] = attribute;
			this.clusters = undefined;
			this.clusterMap={};
			this.resetGraph();
		},
		changeEdgeLabel: function(label,edgeClass){//public
			this.options.edgeLabel[edgeClass] = label;
			this.resetGraph();
		},
		changeWeightageAttribute: function(attribute,edgeClass){//public
			this.options.weight[edgeClass] = attribute;
			this.resetGraph();
		},
		changeFilteringCondition: function(property,condition){//public
			this.clusters=undefined;
			this.clusterMap={};
			this.options.filterType = property,
			this.options.filterCondition = condition;
			this.resetGraph();
		},
		changeOverallEdgeClass: function(edgeClass){//public
			this.options.edgeUsed = edgeClass
			this.resetGraph();
		},
		changeNodeSizeProperty: function(property){//public
			var parent = this;
			var edgeType = this.options.edgeUsed;
			if(edgeType!=""){
				if(property==""){
					for(i in this.nodes){
						this.nodes[i].weight = 0;
					}
					this.resetGraph();
				}else if(property=="CC"){
					for(i in this.nodes){
						this.nodes[i].weight = this.calCC(this.nodes[i],edgeType);
					}
					this.resetGraph();
				}else if(property=="betweeness"){
					this.getBetweenness(edgeType,function(betweenness){
						for(i in betweenness){
							parent.nodeMap[i].weight = betweenness[i];
						}
						parent.resetGraph();
					});
				}else if(property=="closeness"){
					this.getCloseness(edgeType,function(closeness){
						for(i in closeness){
							parent.nodeMap[i].weight = closeness[i];
						}
						parent.resetGraph();
					});
				}else if(property=="degree"){
					var max = this.getMaxDegree(edgeType);
					var min = this.getMinDegree(edgeType);
					var bottom = max-min;
					if(bottom>0){
						for(i in this.nodeMap){
							var degree = 0;
							if(this.neighborMap[edgeType+"_"+i]!=undefined){
								degree = this.neighborMap[edgeType+"_"+i].length;
							}
							var weight = (degree-min)/(max-min)
							this.nodeMap[i].weight = weight;
						}
					}else{
						for(i in this.nodes){
							this.nodes[i].weight = 0;
						}
					}
					this.resetGraph();
				}else if(property=="pagerank"){
					this.getPageRank(edgeType,function(pagerank){
						for(i in pagerank){
							parent.nodeMap[i].weight = pagerank[i].C;
						}
						parent.resetGraph();
					});
				}
			}
		}		
    };
	function ajaxServer(url,jsonString,callback,error){
		$(".loaderDiv").css("display","block");
		$.ajax({
			url: url,
			crossDomain: true,
			data:jsonString,
			method : "POST",
			async:false
		}).success(function(result){
			$(".loaderDiv").css("display","none");
			callback(result)
		})
		.error(function(result){
			$(".loaderDiv").css("display","none");
			error(result)
		});
	}
	function ajaxServerAsync(url,jsonString,callback,error){
		$(".loaderDiv").css("display","block");
		$.ajax({
			url: url,
			crossDomain: true,
			data:jsonString,
			method : "POST",
		}).success(function(result){
			$(".loaderDiv").css("display","none");
			callback(result)
		})
		.error(function(result){
			$(".loaderDiv").css("display","none");
			error(result)
		});
	}
	function ajax(url,jsonString,callback,error){
		$.ajax({
			url: url,
			crossDomain: true,
			data:jsonString,
			method : "POST",
			contentType: "application/json",
			headers: {
				'Authorization':'Basic cm9vdDpwYXNzd29yZA=='
			},
			dataType: 'json',
		}).success(callback)
		.error(error);
	}
	function dragstarted(d) {
		if (!d3.event.active) this.simulation.alphaTarget(0.3).restart();
		d.fx = d.x;
		d.fy = d.y;
	}
	function convexHulls(cluster,nodeMap,offset) {
		var hulls = {};
		// create point sets
		for(i in cluster){
			if(cluster[i].expand.C==true){
				var nodes = cluster[i].nodes;
				for (var k=0; k<nodes.length; ++k) {
					var n = nodes[k];//nodeMap[nodes[k]["@rid"]];
					if (n.size) continue;
					var i = n.cluster;
					l = hulls[i] || (hulls[i] = []);
					l.push([n.x-(offset+nodes.length), n.y-(offset+nodes.length)]);
					l.push([n.x-(offset+nodes.length), n.y+(offset+nodes.length)]);
					l.push([n.x+(offset+nodes.length), n.y-(offset+nodes.length)]);
					l.push([n.x+(offset+nodes.length), n.y+(offset+nodes.length)]);
				}
			}
		}
		// create convex hulls
		var hullset = [];
		for (i in hulls) {
			hullset.push({group: i, path: d3.polygonHull(hulls[i])});
		}
		return hullset;
	}
	function dragged(d) {
		d.fx = d3.event.x;
		d.fy = d3.event.y;
	}
	function dragended(d) {
		if (!d3.event.active) this.simulation.alphaTarget(0);
		d.fx = null;
		d.fy = null;
	}
	function isEmpty(obj){
		for(i in obj){
			return false;
		}
		return true;
	}
	function getEdge(srid,drid,edgeType,nodeMap,edgeMap,directed) {
		var edges = [];
		if(nodeMap[srid]["out_"+edgeType]!=undefined){
			edges = nodeMap[srid]["out_"+edgeType];
		}
		if(directed==false){
			if(nodeMap[srid]["in_"+edgeType]!=undefined){
				edges = edges.concat(nodeMap[srid]["in_"+edgeType]);
			}
		}
		for(e in edges){
			var edge = edgeMap[edges[e]];
			if(edge['in']==drid){
				return edge;
			}
			if(!directed){
				if(edge['out']==drid){
					return edge;
				}
			}
		}
		console.log("cant find");
		return undefined;
	}
	function selectRandom(obj,list){
		var keys = Object.keys(obj)
		var key;
		var dupl = true;
		while(dupl==true){
			dupl = false;
			key = keys[ keys.length * Math.random() << 0];//index of obj
			if(list.indexOf(obj[key]["@rid"])>-1){
				dupl=true;
			}
		}
		return obj[key];
	}
	function findLargestSSED(vectors,centroids){
		var centroidIndex;
		var largest;
		var largestCS = 0;
		for(i in centroids){
			var vectorC = centroids[i].vector;
			for(j in centroids[i].nodes){
				var vectorNode = []; var index = centroids[i].nodes[j];
				for(var n=0;n<vectors.length;n++){
					vectorNode.push(vectors[n][index]);
				}
				var diff = EDist(vectorC,vectorNode);
				if(largestCS<=diff){
					centroidIndex = i;
					largestCS = diff;
					largest = centroids[i].nodes[j];
				}
			}
		}
		return {node:largest,centroidIndex:centroidIndex};
	}
	function findLargestSSE(CS,centroids){
		var centroidIndex;
		var largest;
		var largestCS = 0;
		for(i in centroids){
			var ccs = centroids[i].CS;
			for(j in centroids[i].nodes){
				var diff = Math.abs(CS[centroids[i].nodes[j]] - ccs);
				if(largestCS<=diff){
					centroidIndex = i;
					largestCS = diff;
					largest = centroids[i].nodes[j];
				}
			}
		}
		return {node:largest,centroidIndex:centroidIndex};
	}
	function EDist(vectorC,vectorNode){
		var sum = 0;
		for(i in vectorC){
			sum +=Math.pow((vectorC[i]-vectorNode[i]),2);
		}
		sum = Math.sqrt(sum);
		return sum;
	}
	function deleteAssociatedEdge(node,edges){
		var connectedLinks = [];
		var rid = node["@rid"];
		for(var i=0;i<edges.length;i++){
			var connectedLink = edges[i]
			if(connectedLink.out==rid || connectedLink.in==rid){
				connectedLinks.push({"@rid":connectedLink['@rid']});
			}
		}
		return connectedLinks;
	}
	function matrixMult(matrix1,matrix2){
		var finalmatrix = jQuery.extend(true, [], matrix1);
		for(i in matrix1){
			for(j in matrix1[i]){
				var sum = 0;
				for(k in matrix1){
					sum += matrix1[i][k]*matrix2[k][j];
				}
				finalmatrix[i][j] = sum;
			}
		}
		return finalmatrix;
	}
	function enableAnimation(){
		setTimeout(function(){ active.animate=true;enableAnimation(); }, 5);
	}
    /*
     * Plugin wrapper, preventing against multiple instantiations and
     * return plugin instance.
     */
	
    $.fn[pluginName] = function (options) {
        var plugin = this.data(dataKey);
        // has plugin instantiated ?
        if (plugin instanceof Plugin) {
            // if have options arguments, call plugin.init() again
            if (typeof options !== 'undefined') {
                plugin.init(options);
            }
        } else {
            plugin = new Plugin(this, options);
            this.data(dataKey, plugin);
        }
        
        return plugin;
    };
}(jQuery, window, document));