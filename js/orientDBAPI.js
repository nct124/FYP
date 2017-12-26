
;(function ($) {
    var pluginName = "GraphVisualizer",
        dataKey = "plugin_" + pluginName;
    function Plugin(element, options) {
		//set default options
        this.element = element;
		parent = this;
        this.options = {
            colorGroup:'@class',
			label:"name",
			IDlink:"@rid"
        };
		this.nodes = [];
		this.links = [];
		this.deleted = {};
		this.deleted.nodes = [];
		this.deleted.links = [];
		this.directed = true;
		this.nodeMap = {};
		this.edgeMap = {};
		this.neighborMap = {};
		this.db = "Testing";
        this.init(options);
    };
	
    Plugin.prototype = {
        init: function (options) {
			//init and overwrite the functions
			var parent = this;
            $.extend(this.options, options);
			this.svg = d3.select("#"+$(this.element).attr('id'));
			
			var width = $(this.svg._groups[0][0]).parent().width()//this.svg.attr("width");
			var height = $(this.svg._groups[0][0]).parent().height()//this.svg.attr("height");
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
			this.color = d3.scaleOrdinal(d3.schemeCategory20);

			this.simulation = d3.forceSimulation()
			.force("link", d3.forceLink().id(function(d) { return d[parent.options.IDlink]; }).distance(100).strength(1))
			.force("charge", d3.forceManyBody())
			.force("center", d3.forceCenter(width / 2, height / 2));
			
			// define arrow markers for graph links
			var defs = this.svg.append('svg:defs');
			defs.append('svg:marker')
				.attr('id', 'endarrow')
				.attr('viewBox', '0 -5 10 10')
				.attr('refX', "28px")
				.attr('refY', "-3px")
				.attr('markerWidth', 5)
				.attr('markerHeight', 5)
				.attr('orient', 'auto')
			  .append('svg:path')
				.attr('d', 'M0,-5L10,0L0,5')
				.attr('fill', '#000');
        },
		loadData: function () {
			//load network into plugin
			this.nodes = [];
			this.links = [];
			this.deleted = {};
			this.deleted.nodes = [];
			this.deleted.links = [];
			this.neighborMap = {};
			var data = this.data.result;
			for(var i=0;i<data.length;i++){
				var checkVertex = false;
				for(var j=0;j<schemas.result[0].vertex.length;j++){
					if(data[i]['@class']==schemas.result[0].vertex[j].name){
						checkVertex = true;
						break;
					}
				}
				if(checkVertex){
					this.nodes.push(data[i]);
					this.nodeMap[data[i]['@rid']] = data[i];
				}else{
					data[i].source = data[i].out;
					data[i].target = data[i].in;
					this.links.push(data[i]);
					this.edgeMap[data[i]['@rid']] = data[i];
					if(this.neighborMap[data[i]['@class']+"_"+data[i]['in']]==undefined){
						this.neighborMap[data[i]['@class']+"_"+data[i]['in']]=[];
					}
					this.neighborMap[data[i]['@class']+"_"+data[i]['in']].push(data[i]['out']);
				}
			}
			console.log(this.neighborMap);
			this.findDuplicateLinks();
        },
		toggleDirected:function(directed){
			this.directed = directed;
			console.log(directed);
			this.resetGraph();
		},
		findDuplicateLinks: function () {
			var linkHashMap = {};
			for(var i=0;i<this.links.length;i++){
				var link = this.links[i];
				var key;
				if((typeof link.source)==="string"){
					key	= link.source+"_"+link.target;
				}else{
					key	= link.source['@rid']+"_"+link.target['@rid'];
				}
				if(linkHashMap[key]==undefined){
					linkHashMap[key]=1;
					link.linknum=1;
				}else{
					linkHashMap[key]++;
					link.linknum=linkHashMap[key];
				}
				
			}
		},
        displayGraph: function () {
			//display network in SVG
			var parent = this;
			
			//links
			this.link = this.svg.select(".wrapper").append("g")
			.attr("class", "links")
			.selectAll("path")
			.data(this.links)
			.enter().append("path")
			.attr("stroke","rgb(0,0,0)")
			.attr("stroke-width", function(d) { 
				if(parent.options.weight){
					return d[parent.options.weight]; 
				}else{
					return 2;
				}
			});
			if(this.directed){
				this.link.style('marker-end', function(d) { return 'url(#endarrow)'; });
			}
			this.link = this.initEdgeClick(this.link)
			
			//nodes
			this.node = this.svg.select(".wrapper").append("g")
			.attr("class", "nodes")
			.selectAll("circle")
			.data(this.nodes)
			.enter().append("circle")
			.attr("r", 20)
			.attr("rid",function(d) { return d["@rid"]})
			.attr("fill", function(d) { return parent.color(d[parent.options.colorGroup]); })
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
			.data(this.nodes)
			.enter().append("circle")
			.attr("r",5)
			.attr("rid",function(d) { return d["@rid"]})
			.attr("visibility","hidden")
			.attr("fill", "black")
			.on("mouseover",this.mouseover)
			.on("mouseout",this.mouseout);
			this.hoverPoints= this.initHoverClick(this.hoverPoints)
			
			//node labels
			this.text = this.svg.select(".wrapper").append("g").attr("class", "labels").selectAll("g")
			.data(this.nodes)
			.enter().append("text")
			.attr("x", 0)
			.attr("y", 0)
			.style("font-family", "sans-serif")
			.style("font-size", "0.7em")
			.on("mouseover",this.mouseover)
			.on("mouseout",this.mouseout)
			.text(function(d) { return d[parent.options.label]; });

			this.simulation
			.nodes(this.nodes)
			.on("tick", function(){
				parent.link.attr("d", function(d) {
					var r = 150;
					var dr = r/d.linknum;  //linknum is defined above
					return "M" + d.source.x + "," + d.source.y + 
					 "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
					//A rx,ry xAxisRotate LargeArcFlag,SweepFlag x,y"
				});
				parent.node
				.attr("cx", function(d) { return d.x; })
				.attr("cy", function(d) { return d.y; });
				parent.text
				.attr("x", function(d) { return d.x; })
				.attr("y", function(d) { return d.y; });
				parent.hoverPoints
				.attr("cx", function(d) { return d.x; })
				.attr("cy", function(d) { return d.y+(20) });
			});

			this.simulation.force("link")
			.links(this.links);
        },
		
		initZoom: function (rect) {
			var parent = this;
			rect.call(d3.zoom()
				.scaleExtent([1 / 2, 4])
				.on("zoom", function(){
					parent.link.attr("transform", d3.event.transform);
					parent.node.attr("transform", d3.event.transform);
					parent.text.attr("transform", d3.event.transform);
					parent.hoverPoints.attr("transform", d3.event.transform);
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
					var point = $(".hover circle[rid='"+parent.linexy0+"']");
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
				parent.linexy0 = $(this).attr("rid");
				
				parent.svg.append("line")
				.attr("id","drawline")
				.attr("stroke","rgb(0,0,0)")
				.attr("stroke-width", 1);
			});
			return node;
		},
		initEdgeClick: function (edges){
			var parent = this;
			edges.on("click",function(edge,index){
				parent.loadClass(false);
				//var table = $(".sidebar table");
				//table.find("tr:gt(0):lt("+($(".sidebar table tr").length-3)+")").remove();
				var formchild = $("#NED form div:nth-child(1)");
				formchild.nextAll().remove();
				var properties = schemas.result[0].edge;
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
						//table.find("tr:first-child").after("<tr><td>"+classProperty[i].name+":</td><td><input type='text' value='"+edge[classProperty[i].name]+"' id='class_"+classProperty[i].name+"'></td></tr>");
						formchild.after("<div class='form-group'>"+
											"<label for='class_"+classProperty[i].name+"'>"+classProperty[i].name+":</label>"+
											"<input type='text' value="+edge[classProperty[i].name]+" class='form-control' id='class_"+classProperty[i].name+"'>"+
										"</div>");
					}
				}
				$("#rid").val(edge['@rid']);
				$("#ridfrom").val(edge['source']['@rid']);
				$("#ridto").val(edge['target']['@rid']);
				if(edge['@rid'].charAt(0)=="#"){
					$("#CUbtn").val("Update");
					$("#deletebtn").css("display","block");
				}else{
					$("#CUbtn").val("Create");
					$("#deletebtn").css("display","none");
				}
			});
			return edges;
		},
		initNodeClick: function (nodes){
			var parent = this;
			nodes.on("click",function(node,index){
				if(parent.drawline){
					if(parent.linexy0 != node['@rid']){
						var newlink = {source:parent.linexy0,target:node["@rid"],'@rid':Math.floor(Math.random() * (100000 - 1) + 1).toString()};
						parent.drawline = false;
						$("#drawline").remove();
						var newGraph = {nodes:[],links:[newlink]}
						var removeGraph = {nodes:[],links:[]}
						parent.updateGraph(newGraph,removeGraph);
					}
				}else{
					//load values for editting
					parent.loadClass(true);
					var formchild = $("#NED form div:nth-child(1)");
					formchild.nextAll().remove();
					$("#classType").removeAttr("disabled");
					var properties = schemas.result[0].vertex;
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
					if(node['@rid'].charAt(0)=="#"){
						$("#CUbtn").val("Update");
						$("#deletebtn").css("display","block");
					}else{
						$("#CUbtn").val("Create");
						$("#deletebtn").css("display","none");
					}
					//compute Clustering coefficient
					var cc = parent.calCC(node,"follows");
					
					//load metrics for the node
					var nodekey = "#NED .table";
					$(nodekey).html("");
					$(nodekey).append("<tr><td>ID</td><td>"+node['@rid']+"</td></tr>");
					for(var i=0;i<schemas.result[0].edge.length;i++){
						$(nodekey).append("<tr><td>"+schemas.result[0].edge[i].name+" in Degree</td><td>"+node['in_'+schemas.result[0].edge[i].name].length+"</td></tr>");
						$(nodekey).append("<tr><td>"+schemas.result[0].edge[i].name+" out Degree</td><td>"+node['out_'+schemas.result[0].edge[i].name].length+"</td></tr>");
						$(nodekey).append("<tr><td>"+schemas.result[0].edge[i].name+" CC</td><td>"+cc+"</td></tr>");
					}					
				}
			});
			return nodes;
		},
		calCC: function(node,edgeType){
			var cc = 0;
			var neighbor = this.neighborMap[edgeType+"_"+node['@rid']];
			console.log(neighbor);
			var Nv = 0;
			//find num of neighbors who are neighbors of each other
			for(var i=0;i<neighbor.length;i++){
				for(var j=1;j<neighbor.length;j++){
					//if its not itself
					if(neighbor[i]!=neighbor[j]){
						var arrA = this.neighborMap[edgeType+"_"+neighbor[i]];
						var arrB = this.neighborMap[edgeType+"_"+neighbor[j]];
						for(var k=0;k<arrA.length;k++){
							if(neighbor.indexOf(arrA[k])>-1){
								Nv++;
							}
						}
						for(var k=0;k<arrB.length;k++){
							if(neighbor.indexOf(arrB[k])>-1){
								Nv++;
							}
						}
					}
				}
			}
			if(this.directed){
				cc = Nv/(neighbor.length)*(neighbor.length-1);
			}else{
				cc = 2*Nv/(neighbor.length)*(neighbor.length-1);
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
				this.links[i]['source'] = this.links[i]['source']['@rid'];
				this.links[i]['target'] = this.links[i]['target']['@rid'];
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
			this.init();
			this.findDuplicateLinks();
			this.displayGraph();
			this.simulation.alpha(0.3).restart();
		},
		loadClass: function (vertex){
			var select = $("#classType");
			select.html("");
			select.append("<option value=''></option>")
			if(vertex){
				var properties = schemas.result[0].vertex;
				for(var i=0;i<properties.length;i++){
					select.append("<option value='"+properties[i].name+"'>"+properties[i].name+"</option>");
				}
			}else{
				var properties = schemas.result[0].edge;
				for(var i=0;i<properties.length;i++){
					select.append("<option value='"+properties[i].name+"'>"+properties[i].name+"</option>");
				}
			}
		},
		deleteNEinNetwork: function(){
			var vertex = false;
			if($("#classType")[0].options[1].value == schemas.result[0].vertex[0].name){
				vertex= true;
			}
			if($("#rid").val().charAt(0)=='#'){
				var json = {};
				json['@rid'] = $("#rid").val();
				json['@class'] = $("#classType").val();
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
					if(connectedLink.source['@rid']==$("#rid").val() || connectedLink.target['@rid']==$("#rid").val()){
						connectedLinks.push({"@rid":connectedLink['@rid']});
					}
				}
				var removeGraph = {nodes:[{"@rid":$("#rid").val()}],links:connectedLinks};
				this.updateGraph(newGraph,removeGraph)
			}else{
				var newGraph = {nodes:[],links:[]}
				var removeGraph = {nodes:[],links:[{"@rid":$("#rid").val()}]};
				this.updateGraph(newGraph,removeGraph)
			}
		},
		createNEinNetwork: function(){
			var vertex = false;
			var json = {};
			var selectedIndex = $("#classType")[0].selectedIndex;
			var property = schemas.result[0].edge[selectedIndex-1].properties;
			if($("#classType")[0].options[1].value == schemas.result[0].vertex[0].name){
				vertex= true;
				property = schemas.result[0].vertex[selectedIndex-1].properties;
			}
			for(var i=0;i<property.length;i++){
				json[property[i].name] = $("#class_"+property[i].name).val();
			}
			json['@rid'] = $("#rid").val();
			json['@class'] = $("#classType").val();
			if(json['@rid'].charAt(0)=="#"){
				json['updated'] = true;
			}
			if(vertex){
				var newGraph = {nodes:[json],links:[]}
				var removeGraph = {nodes:[{"@rid":$("#rid").val()}],links:[]};
				this.updateGraph(newGraph,removeGraph)
			}else{
				json['source'] = $("#ridfrom").val();
				json['target'] = $("#ridto").val();
				var newGraph = {nodes:[],links:[json]};
				var removeGraph = {nodes:[],links:[{"@rid":$("#rid").val()}]};
				this.updateGraph(newGraph,removeGraph);
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
						for(var j=0;j<schemas.result[0].vertex.length;j++){
							if(pnode['@class']==schemas.result[0].vertex[j].name){
								property = schemas.result[0].vertex[j];
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
						for(var j=0;j<schemas.result[0].edge.length;j++){
							if(plink['@class']==schemas.result[0].edge[j].name){
								property = schemas.result[0].edge[j];
								break;
							}
						}	
					}
					var rlink = {};
					rlink['@rid'] = plink['@rid'];
					rlink['@class'] = plink['@class'];
					rlink['source'] = plink['source']['@rid'];
					rlink['target'] = plink['target']['@rid'];
					//get the updated details based on the properties.
					for(var j=0;j<property.properties.length;j++){
						rlink[property.properties[j].name] = plink[property.properties[j].name];
					}
					jsonArray.jsonString.links.push(rlink);
				}
			}
			var str = JSON.stringify(jsonArray);
			ajax(functionURL,str,function(result){
				//update UI after updating the database
				var nodeID = result.result[0]["createdNodeRID"];
				var linkID = result.result[0]["createdLinkRID"];
				var newNodes = [];
				var newLinks = [];
				var removeNodes = [];
				var removeLinks = [];
				for(var i=0;i<parent.nodes.length;i++){
					var pnode = parent.nodes[i];
					if(nodeID[pnode['@rid']]){
						var nnode = jQuery.extend(true, {}, pnode);
						nnode['@rid'] = nodeID[pnode['@rid']];
						newNodes.push(nnode);
						removeNodes.push({"@rid":pnode['@rid']});
					}
				}
				for(var i=0;i<parent.links.length;i++){
					var plink = parent.links[i];
					if(linkID[plink['@rid']]){
						var nlink = jQuery.extend(true, {}, plink);
						nlink['@rid'] = linkID[plink['@rid']][0];
						if(nlink['source']['@rid'].charAt(0)!='#'){
							nlink['source'] = nodeID[nlink['source']['@rid']];
						}else{
							nlink['source'] = nlink['source']['@rid'];
						}
						if(nlink['target']['@rid'].charAt(0)!='#'){
							nlink['target'] = nodeID[nlink['target']['@rid']];
						}else{
							nlink['target'] = nlink['target']['@rid'];
						}
						
						newLinks.push(nlink);
						removeLinks.push({"@rid":plink['@rid']});
					}
				}
				var newGraph = {nodes:newNodes,links:newLinks}
				var removeGraph = {nodes:removeNodes,links:removeLinks};
				parent.updateGraph(newGraph,removeGraph);
				parent.deleted.nodes = [];
				parent.deleted.links = [];
			});
		},
		queryDatabase: function(query){
			var functionURL = "http://localhost:2480/function/"+this.db+"/ask";
			var json = {query:query};
			var str = JSON.stringify(json);
			var parent = this;
			ajax(functionURL,str,function(data1){
				parent.svg.select(".wrapper").selectAll("*").remove();
				parent.data = data1;
				parent.loadData();
				parent.displayGraph();
			});
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
				json.schemas=schemas;
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
		uploadNetwork: function(json){
			this.nodes = json.nodes;
			this.links = json.links;
			this.resetGraph();
		}
    };
	function ajax(url,jsonString,callback){
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
		}).done(callback);
	}
	function dragstarted(d) {
		if (!d3.event.active) this.simulation.alphaTarget(0.3).restart();
		d.fx = d.x;
		d.fy = d.y;
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
