
;(function ($) {
    var pluginName = "GraphVisualizer",
        dataKey = "plugin_" + pluginName;
    function Plugin(element, options) {
		//set default options
        this.element = element;
		var parent = this;
        this.options = {
            colorGroup:'@class',
			nodeLabel:{"Members":"@rid"},
			edgeLabel:{},
			weight:{},
			edgeUsed:"follows",
			IDlink:"@rid",
			schemaURL:"http://localhost:2480/function/Testing/classProperty/",
			rdy:function(){},
			radius:20,
			distance:1000,
			nodeClick:function(){},
			edgeClick:function(){},
			clusteringMethod:"off",
			noOfCluster:10,
			clusteringClassAttribute:{"Members":"name"}
        };
		$.extend(this.options, options);
		this.asd=0;
		this.nodes = [];
		this.clusterMap = {};
		this.links = [];
		this.deleted = {};
		this.deleted.nodes = [];
		this.deleted.links = [];
		this.directed = true;
		this.nodeMap = {};
		this.edgeMap = {};
		this.neighborMap = {};
		this.db = "Testing";
		var edgeSchema = [{name:"E",properties:[]}];
		var vertexSchema = [{name:"V",properties:[]}];
		this.schemas = {edge:edgeSchema,vertex:vertexSchema}
        this.init(options);
		//get schema
		enableAnimation();
    };
	
    Plugin.prototype = {
        init: function (options) {
			//init and overwrite the functions
			var parent = this;
            //this.distance = 2000;
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
					return (parent.options.distance)/12;
				}else{
					return (parent.options.distance)/3;
				}
				
			})
			.strength(0.5))
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
			this.options.rdy();
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
		toggleDirected:function(directed){
			this.directed = directed;
			this.clusterMap={};
			this.updateMapping();
			this.resetGraph();
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
		shortestPath: function(startRID,edgeType){
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
			//console.log(json);
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
			.attr("r", function(d){return (parent.options.radius+(parent.options.radius*d.weight));})
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
			.text(function(d) { if(parent.options.nodeLabel[d['@class']]!=""){return d[parent.options.nodeLabel[d['@class']]]; }else{ return "";}});
			
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
			
			//hull
			//this.hull = this.svg.select(".wrapper").append("g").attr("class", "expandedNode").selectAll("g")
			
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
				parent.loadClass(false);
				var formchild = $("#NED form div:nth-child(1)");
				formchild.nextAll().remove();
				var properties = parent.schemas.edge;
				var classProperty;
				for(var i=0;i<properties.length;i++){
					if(properties[i].name==edge['@class']){
						$("#classType")[0].selectedIndex = i+1;
						classProperty = properties[i].properties;
						break;
					}
				}
				if(classProperty!=undefined){
					for(var i=0;i<classProperty.length;i++){
						formchild.after("<div class='form-group'>"+
											"<label for='class_"+classProperty[i].name+"'>"+classProperty[i].name+":</label>"+
											"<input type='text' value="+edge[classProperty[i].name]+" class='form-control' id='class_"+classProperty[i].name+"'>"+
										"</div>");
					}
				}
				$("#rid").val(edge['@rid']);
				$("#ridfrom").val(edge['source']['@rid']);
				$("#ridto").val(edge['target']['@rid']);
				if(edge['@rid'].charAt(0)=="#" || edge['@class']!=""){
					$("#CUbtn").val("Update");
					$("#deletebtn").css("display","block");
					$("#classType").attr("disabled","true");
				}else{
					$("#CUbtn").val("Create");
					$("#deletebtn").css("display","none");
					$("#classType").removeAttr("disabled");
				}
				//load metrics for the node
				var nodekey = "#NED .table";
				$(nodekey).html("");
				$(nodekey).append("<tr><td>ID</td><td>"+edge['@rid']+"</td></tr>");
				$(nodekey).append("<tr class='source'><td>Source</td><td>"+edge['out']+"</td></tr>");
				$(nodekey).append("<tr class='target'><td>Target</td><td>"+edge['in']+"</td></tr>");
				$(nodekey+" tr.source")
				.hover(function(){
					var rid = $(nodekey+" tr.source td:nth-child(2)").html();
					$(".nodes circle[rid='"+rid+"']").attr("fill", "red");
				},function(){
					var rid = $(nodekey+" tr.source td:nth-child(2)").html();
					$(".nodes circle[rid='"+rid+"']").attr("fill",parent.nodeColor(parent.nodeMap[rid][parent.options.colorGroup]));
				});
				$(nodekey+" tr.target")
				.hover(function(){
					var rid = $(nodekey+" tr.target td:nth-child(2)").html();
					$(".nodes circle[rid='"+rid+"']").attr("fill", "red");
				},function(){
					var rid = $(nodekey+" tr.target td:nth-child(2)").html();
					$(".nodes circle[rid='"+rid+"']").attr("fill",parent.nodeColor(parent.nodeMap[rid][parent.options.colorGroup]));
				});
				//connected graph
				for(var key in parent.visited){
					//set back previously editted nodes
					if(parent.nodeMap[key]){
						$("circle[rid='"+key+"']").attr("fill",parent.nodeColor(parent.nodeMap[key][parent.options.colorGroup]));
					}
				}
				$("a[href='#NED']").tab("show");
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
					//load values for editting
					parent.loadClass(true);
					var formchild = $("#NED form div:nth-child(1)");
					formchild.nextAll().remove();
					$("#classType").removeAttr("disabled");
					var properties = parent.schemas.vertex;
					var classProperty;
					for(var i=0;i<properties.length;i++){
						if(properties[i].name==node['@class']){
							$("#classType")[0].selectedIndex = i+1;
							$("#classType").attr("disabled","true");
							classProperty = properties[i].properties;
							break;
						}
					}
					if(classProperty!=undefined){
						for(var i=0;i<classProperty.length;i++){
							//table.find("tr:first-child").after("<tr><td>"+classProperty[i].name+":</td><td><input type='text' value='"+node[classProperty[i].name]+"' id='class_"+classProperty[i].name+"'></td></tr>");
							formchild.after("<div class='form-group'>"+
												"<label for='class_"+classProperty[i].name+"'>"+classProperty[i].name+":</label>"+
												"<input type='text' value="+node[classProperty[i].name]+" class='form-control' id='class_"+classProperty[i].name+"'>"+
											"</div>");
						}
					}
					$("#rid").val(node['@rid']);
					if(node['@rid'].charAt(0)=="#" || node['@class']!=""){
						$("#CUbtn").val("Update");
						$("#deletebtn").css("display","block");
					}else{
						$("#CUbtn").val("Create");
						$("#deletebtn").css("display","none");
					}					
					//load metrics for the node
					var nodekey = "#NED .table";
					$(nodekey).html("");
					$(nodekey).append("<tr><td>ID</td><td>"+node['@rid']+"</td></tr>");
					for(var i=0;i<parent.schemas.edge.length;i++){
						if(node['in_'+parent.schemas.edge[i].name]!=undefined){
							$(nodekey).append("<tr><td>"+parent.schemas.edge[i].name+" in Degree</td><td>"+node['in_'+parent.schemas.edge[i].name].length+"</td></tr>");
						}
						if(node['out_'+parent.schemas.edge[i].name]!=undefined){
							$(nodekey).append("<tr><td>"+parent.schemas.edge[i].name+" out Degree</td><td>"+node['out_'+parent.schemas.edge[i].name].length+"</td></tr>");
							$(nodekey).append("<tr><td>"+parent.schemas.edge[i].name+" CC</td><td>"+parent.calCC(node,parent.schemas.edge[i].name)+"</td></tr>");
						}
					}
					
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
					
					//distance
					parent.clickedNode = {source:node['@rid']};
					//load the NED tab
					$("a[href='#NED']").tab("show");
				}
			});
			return nodes;
		},
		getBetweenness: function(edgeType,callback){
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
		getCloseness: function(edgeType,callback){
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
		getMaxDegree: function(edgeType){
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
		getMinDegree: function(edgeType){
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
		getAvgDegree: function(edgeType){
			var n = this.nodes.length;
			var sumDegree = 0
			for(i in this.nodeMap){
				if(this.neighborMap[edgeType+"_"+i]!=undefined){
					sumDegree+=this.neighborMap[edgeType+"_"+i].length
				}
			}
			return sumDegree/n;
		},
		getGamma: function(edgeType){
			var n = this.nodes.length;
			var x = this.getMaxDegree(edgeType)/this.getMinDegree(edgeType)
			var gamma = (Math.log(n)/Math.log(x))+1;
			return gamma;
		},
		getCCDistribution: function(edgeType,callback){
			var json = {nodeMap:this.nodeMap,neighborMap:this.neighborMap,edgeType:edgeType,directed:this.directed};
			var functionURL = "http://localhost:8080/getCCDistribution";
			ajaxServer(functionURL,json,function(result){
				callback(result);
			},function(error){
				console.log("CC error");
			});
		},
		getDiameter: function(edgeType,callback){
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
		getPageRank: function(edgeType,callback){
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
		getDegreeDistribution: function(edgeType,directed,callback){
			var json = {nodeMap:this.nodeMap,directed:directed,edgeType:edgeType};
			var functionURL = "http://localhost:8080/getDegreeDistribution";
			ajaxServer(functionURL,json,function(result){
				callback(result);
			},function(error){
				console.log("Degree error");
			});
		},
		calCC: function(node,edgeType){
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
				//console.log(cc+"="+Nv+"/"+(neighbor.length)+"*"+(neighbor.length-1));
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
			if(this.options.clusteringMethod=="attribute"){
				var net = this.clusterNetworkBasedOnAttribute(this.nodes,this.links,this.options.edgeUsed);
				this.displayNodes = net.nodes;
				this.displayLinks = net.edges;
				this.checkExpand();
			}else if(this.prevZoom<2&&this.options.clusteringMethod!="off"){
				var net = this.clusterNetwork(this.nodes,this.links,this.options.edgeUsed);
				this.displayNodes = net.nodes;
				this.displayLinks = net.edges;
				this.checkExpand();
			}else{
				this.displayNodes = this.nodes;
				this.displayLinks = this.links;
			}
			this.svg.selectAll("*").remove();
			this.init();
			
			this.findDuplicateLinks();
			this.displayGraph();
			this.simulation.alpha(0.3).restart();
			var property = this.loadBasicNetworkProperties();
			$("#NetD .properties").html("<div class='table-responsive'>"+
											"<table class='table'><tbody></tbody></table>"+
										"</div>");
			var table = $("#NetD .properties table tbody")
			for(i in property){
				table.append("<tr><td>"+i+"</td><td>"+property[i]+"</td></tr>");
			}
		},
		loadClass: function (vertex){
			var select = $("#classType");
			select.html("");
			select.append("<option value=''></option>")
			if(vertex){
				var properties = this.schemas.vertex;
				for(var i=0;i<properties.length;i++){
					select.append("<option value='"+properties[i].name+"'>"+properties[i].name+"</option>");
				}
			}else{
				var properties = this.schemas.edge;
				for(var i=0;i<properties.length;i++){
					select.append("<option value='"+properties[i].name+"'>"+properties[i].name+"</option>");
				}
			}
		},
		deleteNodeinNetwork: function(rid,classType){
			if(rid.charAt(0)=='#'){
				var json = {};
				json['@rid'] = rid;
				json['@class'] = classType;
				if(vertex){
					this.deleted.nodes.push(json);
				}else{
					this.deleted.links.push(json);
				}
			}
			var newGraph = {nodes:[],links:[]};
			var connectedLinks = [];
			for(var i=0;i<this.links.length;i++){
				var connectedLink = this.links[i]
				if(connectedLink.out==rid || connectedLink.in==rid){
					connectedLinks.push({"@rid":connectedLink['@rid']});
				}
			}
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
		deleteEdgeinNetwork: function(rid,classType){
			if(rid.charAt(0)=='#'){
				var json = {};
				json['@rid'] = rid;
				json['@class'] = classType;
				if(vertex){
					this.deleted.nodes.push(json);
				}else{
					this.deleted.links.push(json);
				}
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
		deleteNEinNetwork: function(rid,classType,vertex){
			if(rid.charAt(0)=='#'){
				var json = {};
				json['@rid'] = rid;
				json['@class'] = classType;
				if(vertex){
					this.deleted.nodes.push(json);
				}else{
					this.deleted.links.push(json);
				}
			}
			if(vertex){
				var newGraph = {nodes:[],links:[]};
				var connectedLinks = [];
				for(var i=0;i<this.links.length;i++){
					var connectedLink = this.links[i]
					if(connectedLink.out==rid || connectedLink.in==rid){
						connectedLinks.push({"@rid":connectedLink['@rid']});
					}
				}
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
								
			}else{
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
			}
		},
		loadBasicNetworkProperties:function(){
			var edgeType = active.options.edgeUsed;
			//num of node/edge
			var noOfNodes = 0;
			var noOfEdges = 0;
			//gamma
			var gamma = this.getGamma(edgeType);
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
			var ret = {components:components,density:density,nodes:noOfNodes,edges:noOfEdges,gamma:gamma}
			return ret;
		},
		createNodeinNetwork: function(rid,classType,properties){
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
				
			if(rid.charAt(0)=="#" || classType!=""){
				$("#CUbtn").val("Update");
				$("#deletebtn").css("display","block");
			}else{
				$("#CUbtn").val("Create");
				$("#deletebtn").css("display","none");
			}					
			//load metrics for the node
			var nodekey = "#NED .table";
			$(nodekey).html("");
			$(nodekey).append("<tr><td>ID</td><td>"+rid+"</td></tr>");
			for(var i=0;i<this.schemas.edge.length;i++){
				if(json['in_'+this.schemas.edge[i].name]!=undefined){
					$(nodekey).append("<tr><td>"+this.schemas.edge[i].name+" in Degree</td><td>"+json['in_'+this.schemas.edge[i].name].length+"</td></tr>");
				}
				if(json['out_'+this.schemas.edge[i].name]!=undefined){
					$(nodekey).append("<tr><td>"+this.schemas.edge[i].name+" out Degree</td><td>"+json['out_'+this.schemas.edge[i].name].length+"</td></tr>");
					$(nodekey).append("<tr><td>"+this.schemas.edge[i].name+" CC</td><td>"+this.calCC(json,this.schemas.edge[i].name)+"</td></tr>");
				}
			}
		},
		createEdgeinNetwork: function(rid,classType,ridfrom,ridto,properties){
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
				if(rid.charAt(0)=="#" || classType!=""){
					$("#CUbtn").val("Update");
					$("#deletebtn").css("display","block");
					$("#classType").attr("disabled","true");
				}else{
					$("#CUbtn").val("Create");
					$("#deletebtn").css("display","none");
					$("#classType").removeAttr("disabled");
				}
				//load metrics for the node
				var nodekey = "#NED .table";
				$(nodekey).html("");
				$(nodekey).append("<tr><td>ID</td><td>"+rid+"</td></tr>");
				$(nodekey).append("<tr class='source'><td>Source</td><td>"+ridfrom+"</td></tr>");
				$(nodekey).append("<tr class='target'><td>Target</td><td>"+ridto+"</td></tr>");
				$(nodekey+" tr.source")
				.hover(function(){
					var rid = $(nodekey+" tr.source td:nth-child(2)").html();
					$(".nodes circle[rid='"+rid+"']").attr("fill", "red");
				},function(){
					var rid = $(nodekey+" tr.source td:nth-child(2)").html();
					$(".nodes circle[rid='"+rid+"']").attr("fill",parent.nodeColor(parent.nodeMap[rid][parent.options.colorGroup]));
				});
				$(nodekey+" tr.target")
				.hover(function(){
					var rid = $(nodekey+" tr.target td:nth-child(2)").html();
					$(".nodes circle[rid='"+rid+"']").attr("fill", "red");
				},function(){
					var rid = $(nodekey+" tr.target td:nth-child(2)").html();
					$(".nodes circle[rid='"+rid+"']").attr("fill",parent.nodeColor(parent.nodeMap[rid][parent.options.colorGroup]));
				});
			}else{
				throw "Please create the nodes first.";
			}
		},
		createNEinNetwork: function(rid,classType,vertex,ridfrom,ridto,properties){
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
			if(vertex){
				json['weight'] = 0
				var newGraph = {nodes:[json],links:[]}
				var removeGraph = {nodes:[{"@rid":rid}],links:[]};
				//update map before reseting graph
				this.nodeMap[rid] = json;
				this.updateGraph(newGraph,removeGraph)
				
				if(rid.charAt(0)=="#" || classType!=""){
					$("#CUbtn").val("Update");
					$("#deletebtn").css("display","block");
				}else{
					$("#CUbtn").val("Create");
					$("#deletebtn").css("display","none");
				}					
				//load metrics for the node
				var nodekey = "#NED .table";
				$(nodekey).html("");
				$(nodekey).append("<tr><td>ID</td><td>"+rid+"</td></tr>");
				for(var i=0;i<this.schemas.edge.length;i++){
					if(json['in_'+this.schemas.edge[i].name]!=undefined){
						$(nodekey).append("<tr><td>"+this.schemas.edge[i].name+" in Degree</td><td>"+json['in_'+this.schemas.edge[i].name].length+"</td></tr>");
					}
					if(json['out_'+this.schemas.edge[i].name]!=undefined){
						$(nodekey).append("<tr><td>"+this.schemas.edge[i].name+" out Degree</td><td>"+json['out_'+this.schemas.edge[i].name].length+"</td></tr>");
						$(nodekey).append("<tr><td>"+this.schemas.edge[i].name+" CC</td><td>"+this.calCC(json,this.schemas.edge[i].name)+"</td></tr>");
					}
				}
			}else{
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
					
					if(rid.charAt(0)=="#" || classType!=""){
						$("#CUbtn").val("Update");
						$("#deletebtn").css("display","block");
						$("#classType").attr("disabled","true");
					}else{
						$("#CUbtn").val("Create");
						$("#deletebtn").css("display","none");
						$("#classType").removeAttr("disabled");
					}
					//load metrics for the node
					var nodekey = "#NED .table";
					$(nodekey).html("");
					$(nodekey).append("<tr><td>ID</td><td>"+rid+"</td></tr>");
					$(nodekey).append("<tr class='source'><td>Source</td><td>"+ridfrom+"</td></tr>");
					$(nodekey).append("<tr class='target'><td>Target</td><td>"+ridto+"</td></tr>");
					$(nodekey+" tr.source")
					.hover(function(){
						var rid = $(nodekey+" tr.source td:nth-child(2)").html();
						$(".nodes circle[rid='"+rid+"']").attr("fill", "red");
					},function(){
						var rid = $(nodekey+" tr.source td:nth-child(2)").html();
						$(".nodes circle[rid='"+rid+"']").attr("fill",parent.nodeColor(parent.nodeMap[rid][parent.options.colorGroup]));
					});
					$(nodekey+" tr.target")
					.hover(function(){
						var rid = $(nodekey+" tr.target td:nth-child(2)").html();
						$(".nodes circle[rid='"+rid+"']").attr("fill", "red");
					},function(){
						var rid = $(nodekey+" tr.target td:nth-child(2)").html();
						$(".nodes circle[rid='"+rid+"']").attr("fill",parent.nodeColor(parent.nodeMap[rid][parent.options.colorGroup]));
					});
				}else{
					throw "Please create the nodes first.";
				}
			}
		},
		saveNetwork: function(){
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
			});
		},
		queryDatabase: function(query,callback){
			var functionURL = "http://localhost:2480/function/"+this.db+"/ask";
			var json = {query:query};
			var str = JSON.stringify(json);
			this.clearGraph();
			var parent = this;
			ajax(parent.options.schemaURL,"",function(result){
				parent.schemas = result.result[0];
				parent.options.rdy();
				ajax(functionURL,str,function(data1){
					parent.svg.select(".wrapper").selectAll("*").remove();
					parent.data = data1;
					parent.loadData();
					if(parent.options.clusteringMethod=="attribute"){
						var net = parent.clusterNetworkBasedOnAttribute(parent.nodes,parent.links,parent.options.edgeUsed);
						parent.displayNodes = net.nodes;
						parent.displayLinks = net.edges;
						parent.checkExpand();
					}else if(parent.prevZoom<2&&parent.options.clusteringMethod!="off"){
						var net = parent.clusterNetwork(parent.nodes,parent.links,parent.options.edgeUsed);
						parent.displayNodes = net.nodes;
						parent.displayLinks = net.edges;
					}else{
						parent.displayNodes = parent.nodes;
						parent.displayLinks = parent.links;
					}
					parent.findDuplicateLinks();
					parent.displayGraph();
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
		exportNetwork: function(a){
			if(this.nodes&&this.links){
				var nodes = jQuery.extend(true, [], this.nodes);
				var links = jQuery.extend(true, [], this.links);
				var json = {};
				var i=0;
				i=0;
				while(i<links.length){
					links[i]['source'] = links[i]['source']['@rid'];
					links[i]['target'] = links[i]['target']['@rid'];
					i++;
				}
				json.schemas=parent.schemas;
				json.nodes=nodes;
				json.links=links;
				var text=JSON.stringify(json);
				text = text.replace(new RegExp("@rid\":\"#", 'g'),"@rid\":\"");
				text = text.replace(new RegExp("out\":\"#", 'g'),"out\":\"");
				text = text.replace(new RegExp("in\":\"#", 'g'),"in\":\"");
				text = text.replace(new RegExp("source\":\"#", 'g'),"source\":\"");
				text = text.replace(new RegExp("target\":\"#", 'g'),"target\":\"");
				var type="text/plain"
				var file = new Blob([text], {type: type});
				a.href = URL.createObjectURL(file);
				a.download = name;
			}else{
				alert("no data is displayed");
			}
		},
		checkExpand:function(){
			for(var i=0;i<this.displayLinks.length;i++){
				var clusteredge = this.displayLinks[i];
				//when cluster link to cluster
				if(clusteredge["@rid"].indexOf("cluster")>-1){
					var eid = clusteredge["@rid"].split("_");
					var eout = eid[0];
					var ein = eid[1];
					var splice = false;
					for(j in clusteredge.edges){
						var edge = clusteredge.edges[j];
						if(this.clusterMap[eout].expand.C==true){
							edge.source = edge.out;
							this.displayLinks.push(edge);
							splice=true;
						}else if(this.clusterMap[ein].expand.C==true){
							edge.target = edge.in;
							this.displayLinks.push(edge);
							splice = true;
						}
					}
					if(splice==true){
						this.displayLinks.splice(i,1);
						i--;
					}
				}
				//when cluster link to node
				if(typeof clusteredge["source"] !="string" ){
					if(clusteredge["source"]["@rid"].indexOf("cluster")>-1){
						if(this.clusterMap[clusteredge["source"]["@rid"]].expand.C==true){
							if(clusteredge.out.indexOf("cluster")==-1){
								clusteredge.source = clusteredge.out;
							}
							
						}
					}
				}
				if(typeof clusteredge["target"] !="string" ){
					if(clusteredge["target"]["@rid"].indexOf("cluster")>-1){
						if(this.clusterMap[clusteredge["target"]["@rid"]].expand.C==true){
							if(clusteredge.in.indexOf("cluster")==-1){
								clusteredge.target = clusteredge.in;
							}
						}
					}
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
		clusterNetworkBasedOnAttribute:function(nodes,edges,edgeType){
			var clusterExpand = {};
			for(i in this.clusterMap){
				clusterExpand[this.clusterMap[i]["@rid"]] = this.clusterMap[i].expand;
			}
			this.clusterMap = {};
			var network = {};
			network.nodes = [];
			network.edges = [];
			
			//edgemap for normal edges
			var nm = jQuery.extend(true, {}, this.edgeMap);
			for(i in edges){
				var edge = edges[i];
				if(nm[edge["@rid"]]==undefined){
					nm[edge["@rid"]] = edge;
				}
			}
			var ce = {};
			for(i in nodes){
				var node = nodes[i];
				var groupAttr = this.options.clusteringClassAttribute[node["@class"]];
				if(groupAttr==undefined || groupAttr!=""){
					var groupAttrValue = node[groupAttr];
					var cluster;
					if(this.clusterMap["cluster"+groupAttrValue]==undefined){
						if(clusterExpand["cluster"+groupAttrValue]!=undefined){
							cluster = {"@rid":"cluster"+groupAttrValue,nodes:[],edges:[],weight:0,expand:clusterExpand["cluster"+groupAttrValue],clusterEdgeB:[]};
						}else{
							cluster = {"@rid":"cluster"+groupAttrValue,nodes:[],edges:[],weight:0,expand:{P:false,C:false},clusterEdgeB:[]};
						}
						this.clusterMap["cluster"+groupAttrValue]=cluster;
					}else{
						cluster = this.clusterMap["cluster"+groupAttrValue];
					}
					//get all edges from node
					for(j in this.schemas.edge){
						var edgeClass = this.schemas.edge[j].name;
						if(node["out_"+edgeClass]!=undefined){
							var edgeArr = node["out_"+edgeClass];
							for(k in edgeArr){
								//delete edge that is within the cluster
								if(nm[edgeArr[k]]["target"]["@rid"]=="cluster"+groupAttrValue || nm[edgeArr[k]]["source"]["@rid"]=="cluster"+groupAttrValue){
									cluster.edges.push(nm[edgeArr[k]]);
									delete nm[edgeArr[k]];
								}else{
									nm[edgeArr[k]]["source"] = cluster
								}
								//group all the links that is between clusters
								if(nm[edgeArr[k]]!=undefined && typeof nm[edgeArr[k]]["target"] !="string" && typeof nm[edgeArr[k]]["source"] !="string"){
									if(nm[edgeArr[k]]["target"]["@rid"].indexOf("cluster")>-1 
										&& nm[edgeArr[k]]["source"]["@rid"].indexOf("cluster")>-1){
										var clusterLink = nm[edgeArr[k]]["target"]["@rid"]+"_"+nm[edgeArr[k]]["source"]["@rid"];
										if(ce[clusterLink]==undefined){
											var rid = nm[edgeArr[k]]["source"]["@rid"]+"_"+nm[edgeArr[k]]["target"]["@rid"]
											ce[clusterLink] = {in:nm[edgeArr[k]]["target"]["@rid"],
																out:nm[edgeArr[k]]["source"]["@rid"],
																"@rid":rid,
																edges:[],
																source:nm[edgeArr[k]]["source"],
																target:nm[edgeArr[k]]["target"]};
										}
										//cluster.clusterEdgeB.push(nm[edgeArr[k]]);
										this.clusterMap[nm[edgeArr[k]]["source"]["@rid"]].clusterEdgeB.push(nm[edgeArr[k]]);
										this.clusterMap[nm[edgeArr[k]]["target"]["@rid"]].clusterEdgeB.push(nm[edgeArr[k]]);
										ce[clusterLink].edges.push(nm[edgeArr[k]]);
										delete nm[edgeArr[k]];
									}
								}
							}
						}
						if(node["in_"+edgeClass]!=undefined){
							var edgeArr = node["in_"+edgeClass];
							for(k in edgeArr){
								//delete edge that is within the cluster
								if(nm[edgeArr[k]]["target"]["@rid"]=="cluster"+groupAttrValue || nm[edgeArr[k]]["source"]["@rid"]=="cluster"+groupAttrValue){
									cluster.edges.push(nm[edgeArr[k]]);
									delete nm[edgeArr[k]];
								}else{
									nm[edgeArr[k]]["target"] = cluster
								}
								//group all the links that is between clusters
								if(nm[edgeArr[k]]!=undefined && typeof nm[edgeArr[k]]["target"] !="string" && typeof nm[edgeArr[k]]["source"] !="string"){
									if(nm[edgeArr[k]]["target"]["@rid"].indexOf("cluster")>-1 
										&& nm[edgeArr[k]]["source"]["@rid"].indexOf("cluster")>-1){
										var clusterLink = nm[edgeArr[k]]["target"]["@rid"]+"_"+nm[edgeArr[k]]["source"]["@rid"];
										if(ce[clusterLink]==undefined){
											var rid = nm[edgeArr[k]]["source"]["@rid"]+"_"+nm[edgeArr[k]]["target"]["@rid"]
											ce[clusterLink] = {in:nm[edgeArr[k]]["target"]["@rid"],
																out:nm[edgeArr[k]]["source"]["@rid"],
																"@rid":rid,
																edges:[],
																source:nm[edgeArr[k]]["source"],
																target:nm[edgeArr[k]]["target"]};
										}
										this.clusterMap[nm[edgeArr[k]]["source"]["@rid"]].clusterEdgeB.push(nm[edgeArr[k]]);
										this.clusterMap[nm[edgeArr[k]]["target"]["@rid"]].clusterEdgeB.push(nm[edgeArr[k]]);
										ce[clusterLink].edges.push(nm[edgeArr[k]]);
										delete nm[edgeArr[k]];
									}
								}
							}
							
						}
					}
					node["cluster"] = groupAttrValue;
					this.clusterMap["cluster"+groupAttrValue].nodes.push(node);
				}else{
					network.nodes.push(node);
				}
			}
			for(i in this.clusterMap){
				var cluster = this.clusterMap[i];
				if(cluster.nodes.length>1){
					network.nodes.push(cluster);
				}else{
					for(j in cluster.nodes){
						cluster.nodes[j].cluster = undefined;
						network.nodes.push(cluster.nodes[j]);
					}
					for(j in cluster.clusterEdgeB){						
						delete ce[cluster.clusterEdgeB[j].target["@rid"]+"_"+cluster.clusterEdgeB[j].source["@rid"]]
						if(cluster.clusterEdgeB[j].source["@rid"]==cluster["@rid"]){
							cluster.clusterEdgeB[j].source=cluster.clusterEdgeB[j].out;
						}else if(cluster.clusterEdgeB[j].target["@rid"]==cluster["@rid"]){
							cluster.clusterEdgeB[j].target=cluster.clusterEdgeB[j].in;
						}
						nm[cluster.clusterEdgeB[j]["@rid"]] = cluster.clusterEdgeB[j];
					}
					delete this.clusterMap[i];
				}
			}
			for (i in nm){
				network.edges.push(nm[i]);
			}
			for(i in ce){
				network.edges.push(ce[i]);
			}
			return network;
		},
		clusterNetwork:function(nodes,edges,edgeType){
			var metric = this.options.clusteringMethod;//"degree","CC","Closeness"
			var MaxNoOfNodes = nodes.length/3;
			var noOfNodes = nodes.length
			var noOfCluster = this.options.noOfCluster;
			var nodeArray = [];
			var network = {};
			network.nodes = [];
			network.edges = [];
			
			for(i in nodes){
				var node = nodes[i];
				node.cluster = undefined;
				var rid = node["@rid"];
				if(this.neighborMap[edgeType+"_"+rid]!=undefined){
					var CC = 0;
					if(metric=="degree"){
						CC = this.neighborMap[edgeType+"_"+rid].length;
					}else if(metric=="CC"){
						CC = this.calCC(node,edgeType);
					}else if(metric=="Closeness"){
						
					}else{
						console.log("not supported");
						CC=1;
					}
					nodeArray.push({CC:CC,rid:rid});
				}else{
					if(this.directed==false){
						network.nodes.push(node);
					}
				}
			}
			nodeArray.sort(function(a,b){return b.CC-a.CC;})
			var clusterNo = 1;
			//edgemap for normal edges
			var nm = jQuery.extend(true, {}, this.edgeMap);
			for(i in edges){
				var edge = edges[i];
				if(nm[edge["@rid"]]==undefined){
					nm[edge["@rid"]] = edge;
				}
			}
			var ce = {};
			for(i in nodeArray){
				var node = this.nodeMap[nodeArray[i].rid];
				if(node!=undefined){
					if(noOfNodes>=MaxNoOfNodes && noOfCluster>clusterNo){
						if(node.cluster==undefined){
							//centroid
							node.cluster = clusterNo;
							var neighbors = this.neighborMap[edgeType+"_"+nodeArray[i].rid];
							var cluster = {"@rid":"cluster"+clusterNo,nodes:[node],edges:[],weight:0,expand:{P:false,C:false},clusterEdgeB:[]};
							//handling the edges for the centroid
							if(node["out_"+edgeType]!=undefined){
								var edgeArr = node["out_"+edgeType];
								for(k in edgeArr){
									if(nm[edgeArr[k]]!=undefined){
										//delete edge that is within the cluster
										if(nm[edgeArr[k]]["target"]["@rid"]=="cluster"+clusterNo || nm[edgeArr[k]]["source"]["@rid"]=="cluster"+clusterNo){
											cluster.edges.push(nm[edgeArr[k]]);
											delete nm[edgeArr[k]];
										}else{
											nm[edgeArr[k]]["source"] = cluster;
										}
										//group all the links that is between clusters
										if(nm[edgeArr[k]]!=undefined && typeof nm[edgeArr[k]]["target"] !="string" && typeof nm[edgeArr[k]]["source"] !="string"){
											if(nm[edgeArr[k]]["target"]["@rid"].indexOf("cluster")>-1 
												&& nm[edgeArr[k]]["source"]["@rid"].indexOf("cluster")>-1){
												var clusterLink = nm[edgeArr[k]]["target"]["@rid"]+"_"+nm[edgeArr[k]]["source"]["@rid"];
												if(ce[clusterLink]==undefined){
													var rid = nm[edgeArr[k]]["source"]["@rid"]+"_"+nm[edgeArr[k]]["target"]["@rid"]
													ce[clusterLink] = {in:nm[edgeArr[k]]["target"]["@rid"],
																		out:nm[edgeArr[k]]["source"]["@rid"],
																		"@rid":rid,
																		edges:[],
																		source:nm[edgeArr[k]]["source"],
																		target:nm[edgeArr[k]]["target"]};
												}
												this.clusterMap[nm[edgeArr[k]]["source"]["@rid"]].clusterEdgeB.push(nm[edgeArr[k]]);
												this.clusterMap[nm[edgeArr[k]]["target"]["@rid"]].clusterEdgeB.push(nm[edgeArr[k]]);
												ce[clusterLink].edges.push(nm[edgeArr[k]]);
												delete nm[edgeArr[k]];
											}
										}
									}
								}
							}
							if(node["in_"+edgeType]!=undefined){
								var edgeArr = node["in_"+edgeType];
								for(k in edgeArr){
									if(nm[edgeArr[k]]!=undefined){
										if(nm[edgeArr[k]]["target"]["@rid"]=="cluster"+clusterNo || nm[edgeArr[k]]["source"]["@rid"]=="cluster"+clusterNo){
											cluster.edges.push(nm[edgeArr[k]]);
											delete nm[edgeArr[k]];
										}else{
											nm[edgeArr[k]]["target"] = cluster;
										}
										//group all the links that is between clusters
										if(nm[edgeArr[k]]!=undefined && typeof nm[edgeArr[k]]["target"] !="string" && typeof nm[edgeArr[k]]["source"] !="string"){
											if(nm[edgeArr[k]]["target"]["@rid"].indexOf("cluster")>-1 
												&& nm[edgeArr[k]]["source"]["@rid"].indexOf("cluster")>-1){
												var clusterLink = nm[edgeArr[k]]["target"]["@rid"]+"_"+nm[edgeArr[k]]["source"]["@rid"];
												if(ce[clusterLink]==undefined){
													var rid = nm[edgeArr[k]]["source"]["@rid"]+"_"+nm[edgeArr[k]]["target"]["@rid"]
													ce[clusterLink] = {in:nm[edgeArr[k]]["target"]["@rid"],
																		out:nm[edgeArr[k]]["source"]["@rid"],
																		"@rid":rid,
																		edges:[],
																		source:nm[edgeArr[k]]["source"],
																		target:nm[edgeArr[k]]["target"]};
												}
												this.clusterMap[nm[edgeArr[k]]["source"]["@rid"]].clusterEdgeB.push(nm[edgeArr[k]]);
												this.clusterMap[nm[edgeArr[k]]["target"]["@rid"]].clusterEdgeB.push(nm[edgeArr[k]]);
												ce[clusterLink].edges.push(nm[edgeArr[k]]);
												delete nm[edgeArr[k]];
											}
										}
									}
								}
							}
							//clustering the neighbor tgt
							for(j in neighbors){
								if(this.nodeMap[neighbors[j]].cluster==undefined){
									var ne = this.nodeMap[neighbors[j]]
									//handling the edges for the neighbor
									if(ne["out_"+edgeType]!=undefined){
										var edgeArr = ne["out_"+edgeType];
										for(k in edgeArr){
											if(nm[edgeArr[k]]!=undefined){
												//delete edge that is within the cluster
												if(nm[edgeArr[k]]["target"]["@rid"]=="cluster"+clusterNo || nm[edgeArr[k]]["source"]["@rid"]=="cluster"+clusterNo){
													cluster.edges.push(nm[edgeArr[k]]);
													delete nm[edgeArr[k]];
												}else{
													nm[edgeArr[k]]["source"] = cluster;
												}
												//group all the links that is between clusters
												if(nm[edgeArr[k]]!=undefined && typeof nm[edgeArr[k]]["target"] !="string" && typeof nm[edgeArr[k]]["source"] !="string"){
													if(nm[edgeArr[k]]["target"]["@rid"].indexOf("cluster")>-1 
														&& nm[edgeArr[k]]["source"]["@rid"].indexOf("cluster")>-1){
														var clusterLink = nm[edgeArr[k]]["target"]["@rid"]+"_"+nm[edgeArr[k]]["source"]["@rid"];
														if(ce[clusterLink]==undefined){
															var rid = nm[edgeArr[k]]["source"]["@rid"]+"_"+nm[edgeArr[k]]["target"]["@rid"]
															ce[clusterLink] = {in:nm[edgeArr[k]]["target"]["@rid"],
																		out:nm[edgeArr[k]]["source"]["@rid"],
																		"@rid":rid,
																		edges:[],
																		source:nm[edgeArr[k]]["source"],
																		target:nm[edgeArr[k]]["target"]};
														}
														this.clusterMap[nm[edgeArr[k]]["source"]["@rid"]].clusterEdgeB.push(nm[edgeArr[k]]);
														this.clusterMap[nm[edgeArr[k]]["target"]["@rid"]].clusterEdgeB.push(nm[edgeArr[k]]);
														ce[clusterLink].edges.push(nm[edgeArr[k]]);
														delete nm[edgeArr[k]];
													}
												}
											}
										}
									}
									if(ne["in_"+edgeType]!=undefined){
										var edgeArr = ne["in_"+edgeType];
										for(k in edgeArr){
											if(nm[edgeArr[k]]!=undefined){
												//delete edge that is within the cluster
												if(nm[edgeArr[k]]["target"]["@rid"]=="cluster"+clusterNo || nm[edgeArr[k]]["source"]["@rid"]=="cluster"+clusterNo){
													cluster.edges.push(nm[edgeArr[k]]);
													delete nm[edgeArr[k]];
												}else{
													nm[edgeArr[k]]["target"] = cluster;
												}
												//group all the links that is for clusters
												if(nm[edgeArr[k]]!=undefined && typeof nm[edgeArr[k]]["target"] !="string" && typeof nm[edgeArr[k]]["source"] !="string"){
													if(nm[edgeArr[k]]["target"]["@rid"].indexOf("cluster")>-1 
														&& nm[edgeArr[k]]["source"]["@rid"].indexOf("cluster")>-1){
														var clusterLink = nm[edgeArr[k]]["target"]["@rid"]+"_"+nm[edgeArr[k]]["source"]["@rid"];
														if(ce[clusterLink]==undefined){
															var rid = nm[edgeArr[k]]["source"]["@rid"]+"_"+nm[edgeArr[k]]["target"]["@rid"]
															ce[clusterLink] = {in:nm[edgeArr[k]]["target"]["@rid"],
																		out:nm[edgeArr[k]]["source"]["@rid"],
																		"@rid":rid,
																		edges:[],
																		source:nm[edgeArr[k]]["source"],
																		target:nm[edgeArr[k]]["target"]};
														}
														this.clusterMap[nm[edgeArr[k]]["source"]["@rid"]].clusterEdgeB.push(nm[edgeArr[k]]);
														this.clusterMap[nm[edgeArr[k]]["target"]["@rid"]].clusterEdgeB.push(nm[edgeArr[k]]);
														ce[clusterLink].edges.push(nm[edgeArr[k]]);
														delete nm[edgeArr[k]];
													}
												}
											}
										}
									}
									
									//add node into cluster
									this.nodeMap[neighbors[j]].cluster = clusterNo;
									cluster.nodes.push(this.nodeMap[neighbors[j]]);
									noOfNodes--;
								}
							}
							if(cluster.nodes.length>1){
								network.nodes.push(cluster);
								clusterNo++;
							}else{
								for(i in cluster.nodes){
									cluster.nodes[i].cluster = undefined;
									network.nodes.push(cluster.nodes[i]);
								}
								for(i in cluster.clusterEdgeB){
									delete ce[cluster.clusterEdgeB[i].target["@rid"]+"_"+cluster.clusterEdgeB[i].source["@rid"]]
									if(cluster.clusterEdgeB[i].source["@rid"]==cluster["@rid"]){
										cluster.clusterEdgeB[i].source=cluster.clusterEdgeB[i].out;
									}else if(cluster.clusterEdgeB[i].target["@rid"]==cluster["@rid"]){
										cluster.clusterEdgeB[i].target=cluster.clusterEdgeB[i].in;
									}
									nm[cluster.clusterEdgeB[i]["@rid"]] = cluster.clusterEdgeB[i];
								}
							}
							if(this.clusterMap[cluster["@rid"]]==undefined){
								this.clusterMap[cluster["@rid"]] = cluster;
							}else{
								cluster.expand = this.clusterMap[cluster["@rid"]].expand;
								this.clusterMap[cluster["@rid"]] = cluster;
							}
						}
					}else{
						if(node.cluster==undefined){
							network.nodes.push(node);
						}
					}
				}else{
					network.nodes.push(node);
				}
			}
			for (i in nm){
				network.edges.push(nm[i]);
			}
			for(i in ce){
				network.edges.push(ce[i]);
			}
			return network;
		},
		uploadNetwork: function(json,callback){
			this.clearGraph();
			var edgeSchema = [{name:"E",properties:[]}];
			var vertexSchema = [{name:"V",properties:[]}];
			this.schemas = {edge:edgeSchema,vertex:vertexSchema}
			this.options.rdy();
			this.data = json;
			this.loadData();
			this.resetGraph();
			callback();
		},
		changeNodeLabel: function(label,nodeClass){
			this.options.nodeLabel[nodeClass] = label;
			this.resetGraph();
		},
		changeClusteringMethod: function(method){
			this.options.clusteringMethod = method;
			if(method!="attribute"){
				this.clusterMap={};
				this.resetGraph();
			}
		},
		changeClusteringClassAttribute: function(classType,attribute){
			this.options.clusteringClassAttribute[classType] = attribute;
			if(this.options.clusteringMethod=="attribute"){
				this.clusterMap={};
				this.resetGraph();
			}
		},
		changeEdgeLabel: function(label,edgeClass){
			this.options.edgeLabel[edgeClass] = label;
			this.resetGraph();
		},
		changeWeightageAttribute: function(attribute,edgeClass){
			this.options.weight[edgeClass] = attribute;
			this.resetGraph();
		},
		changeOverallEdgeClass: function(edgeClass){
			this.options.edgeUsed = edgeClass
			//this.resetGraph();
		},
		
		changeNodeSizeAttribute: function(attribute){
			var parent = this;
			var edgeType = this.options.edgeUsed;
			if(edgeType!=""){
				if(attribute==""){
					for(i in this.nodes){
						this.nodes[i].weight = 0;
					}
					this.resetGraph();
				}else if(attribute=="CC"){
					for(i in this.nodes){
						this.nodes[i].weight = this.calCC(this.nodes[i],edgeType);
					}
					this.resetGraph();
				}else if(attribute=="betweeness"){
					this.getBetweenness(edgeType,function(betweenness){
						for(i in betweenness){
							parent.nodeMap[i].weight = betweenness[i];
						}
						parent.resetGraph();
					});
				}else if(attribute=="closeness"){
					this.getCloseness(edgeType,function(closeness){
						for(i in closeness){
							parent.nodeMap[i].weight = closeness[i];
						}
						parent.resetGraph();
					});
				}else if(attribute=="degree"){
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
				}else if(attribute=="pagerank"){
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
			method : "POST"
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
	function convexHulls(cluster,nodeMap ,offset) {
		var hulls = {};
		// create point sets
		for(i in cluster){
			if(cluster[i].expand.C==true){
				var nodes = cluster[i].nodes;
				for (var k=0; k<nodes.length; ++k) {
					var n = nodeMap[nodes[k]["@rid"]];
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