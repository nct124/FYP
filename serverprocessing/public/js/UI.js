var active;

$( document ).ready(function() {
	active = $("#graph1").GraphVisualizer({
		rdy:function(){
			active.schemas;
			//clearing
			$("#nodeClassSelect").html("");
			$("#nodeClassSelect").append("<option value=''></option>");
			$("#OverallEdgeClassSelect").empty();
			$("#OverallEdgeClassSelect").append("<option value=''></option>");
			$("#edgeClassSelect").html("");
			$("#edgeClassSelect").append("<option value=''></option>");
			$("#ClusterByNodeClassSelect").html("");
			$("#ClusterByNodeClassSelect").append("<option value=''></option>");
			
			//load node class
			for(var i=0;i<active.schemas.vertex.length;i++){
				$("#nodeClassSelect").append("<option value='"+i+"'>"+active.schemas.vertex[i].name+"</option>");
				$("#ClusterByNodeClassSelect").append("<option value='"+i+"'>"+active.schemas.vertex[i].name+"</option>");
			}
			
			//load edge class
			for(var i=0;i<active.schemas.edge.length;i++){
				$("#edgeClassSelect").append("<option value='"+i+"'>"+active.schemas.edge[i].name+"</option>");
				$("#OverallEdgeClassSelect").append("<option value='"+active.schemas.edge[i].name+"'>"+active.schemas.edge[i].name+"</option>");
			}
			$("#OverallEdgeClassSelect").val($("#OverallEdgeClassSelect")[0].options[1].value);
			active.changeOverallEdgeClass($("#OverallEdgeClassSelect")[0].options[$("#OverallEdgeClassSelect")[0].selectedIndex].value);
		},nodeClick:function(node){
			$("a[href='#NED']").click();
			var classes = active.getClass(true);
			displayClass(classes);
			var formchild = $("#NED form div:nth-child(1)");
			formchild.nextAll().remove();
			$("#classType").removeAttr("disabled");
			var classProperty;
			for(var i=0;i<classes.length;i++){
				if(classes[i].name==node['@class']){
					$("#classType")[0].selectedIndex = i+1;
					$("#classType").attr("disabled","true");
					classProperty = classes[i].properties;
					break;
				}
			}
			displayClassPropertyForm(node,formchild,classProperty);				
			//load metrics for the node
			var nodekey = "#NED .table";
			$(nodekey).html("");
			$(nodekey).append("<tr><td>ID</td><td>"+node['@rid']+"</td></tr>");
			var edgeClasses = active.getClass(false);
			for(var i=0;i<edgeClasses.length;i++){
				if(node['in_'+edgeClasses[i].name]!=undefined){
					$(nodekey).append("<tr><td>"+edgeClasses[i].name+" in Degree</td><td>"+node['in_'+edgeClasses[i].name].length+"</td></tr>");
				}
				if(node['out_'+edgeClasses[i].name]!=undefined){
					$(nodekey).append("<tr><td>"+edgeClasses[i].name+" out Degree</td><td>"+node['out_'+edgeClasses[i].name].length+"</td></tr>");
					$(nodekey).append("<tr><td>"+edgeClasses[i].name+" CC</td><td>"+active.calCC(node,edgeClasses[i].name)+"</td></tr>");
				}
			}
			//load the NED tab
			$("a[href='#NED']").tab("show");
		},edgeClick:function(edge){
			var classes = active.getClass(false);
			displayClass(classes);
			var formchild = $("#NED form div:nth-child(1)");
			formchild.nextAll().remove();
			var classProperty;
			for(var i=0;i<classes.length;i++){
				if(classes[i].name==edge['@class']){
					$("#classType")[0].selectedIndex = i+1;
					classProperty = classes[i].properties;
					break;
				}
			}
			displayClassPropertyForm(edge,formchild,classProperty);
			$("#ridfrom").val(edge['source']['@rid']);
			$("#ridto").val(edge['target']['@rid']);
			//load metrics for the node
			var nodekey = "#NED .table";
			$(nodekey).html("");
			$(nodekey).append("<tr><td>ID</td><td>"+edge['@rid']+"</td></tr>");
			$(nodekey).append("<tr class='source'><td>Source</td><td>"+edge['out']+"</td></tr>");
			$(nodekey).append("<tr class='target'><td>Target</td><td>"+edge['in']+"</td></tr>");
			$(nodekey+" tr.source")
			.hover(function(){
				var rid = $(nodekey+" tr.source td:nth-child(2)").html(); var color = "red";
				highlightNode(rid,color);
			},function(){
				var rid = $(nodekey+" tr.source td:nth-child(2)").html(); var color = active.nodeColor(active.nodeMap[rid][active.options.colorGroup]);
				highlightNode(rid,color);
			});
			$(nodekey+" tr.target")
			.hover(function(){
				var rid = $(nodekey+" tr.target td:nth-child(2)").html();
				var color = "red";
				highlightNode(rid,color);
			},function(){
				var rid = $(nodekey+" tr.target td:nth-child(2)").html();
				var color = active.nodeColor(active.nodeMap[rid][active.options.colorGroup]);
				highlightNode(rid,color);
			});
			
			$("a[href='#NED']").tab("show");
		}
	});
	active.options.rdy();
	$("#queryBtn").on("click",function(){
		var query = $("#query").val();
		$("a[href='#mainpanel']").click();
		active.queryDatabase(query,function(){
			var property = active.loadBasicNetworkProperties();
			displayBasicNetworkProperties(property);
		});
	});
	$("#clearBtn").on("click",function(){
		active.clearGraph();
		active.options.rdy();
	});
	$("#addBtn").on("click",function(){
		var newGraph = {nodes:[{"@class":"","x":300,"y":300,"@rid":Math.floor(Math.random() * (100000 - 1) + 1).toString(),weight:0}]
			,links:[]
		}
		var removeGraph = {nodes:[],links:[]};
		active.updateGraph(newGraph,removeGraph)
	});
	
	$("#saveBtn").on("click",function(){
		active.saveNetwork();
	});
	
	$("#exportBtn").on("click",function(){
		active.exportNetwork(document.getElementById("exportLink"));
		exportLink.click();
	});
	$("#deletebtn").on("click",function(){
		var rid = $("#rid").val();
		var classType = $("#classType").val();
		var vertex = false;
		if($("#classType")[0].options[1].value == active.schemas.vertex[0].name){
			active.deleteNodeinNetwork(rid,classType)
		}else{
			active.deleteEdgeinNetwork(rid,classType)
		}
	});
	$("#classType").on("change",function(){
		if(this.selectedIndex>0){
			var schemas = active.schemas;
			var classProperty;
			if(this.options[1].value==schemas.vertex[0].name){
				classProperty = schemas.vertex[this.selectedIndex-1].properties; 
			}else{
				classProperty = schemas.edge[this.selectedIndex-1].properties;
			}
			var formchild = $("#NED form div:nth-child(1)");
			formchild.nextAll().remove();
			displayClassPropertyForm(undefined,formchild,classProperty)
		}
	})
	$("#directedBtn input[type='checkbox']").on("change",function(){
		if(this.checked){
			active.toggleDirected(true);
		}else{
			active.toggleDirected(false);
		}
		$("#FilterNodeMetric").trigger("change");
		$("#ClusterBySelect").trigger("change");
		$("#NodeSizePropertySelect").trigger("change");
		
	});
	$("#uploadNetworkBtn")[0].addEventListener('change', function(e) {
		var file = this.files[0]
		var reader = new FileReader();
		var nodes = {};
		var edges = {};
		var schemas = {vertex:{},edge:{}};
		var extension = this.value.split('.').pop();
		reader.onload = function(e) {
			var raw = reader.result;
			//try{
				if(extension=="dl"){
					var content = raw.split("DATA:");
					var data = content[1].trim();
					var labels = content[0].split("LEVEL LABELS:")[1].trim().split("\n");
					var networkSize = content[0].split("LEVEL LABELS:")[0].trim().split("\n")[1].split(" ")[0].split("=")[1];
					var edgeSchema = [];
					var vertexSchema = [{name:"V",properties:[]}];
					for(i in labels){
						var edgeS = {name:labels[i].trim(),properties:[{name:"weightage"}]};
						edgeSchema.push(edgeS);
					}
					for(var j=0;j<networkSize;j++){
						var nodeID = "@"+(j+1);
						nodes[nodeID] = {"@rid":nodeID,"@class":"V"}
					}
					schemas.edge = edgeSchema;
					schemas.vertex = vertexSchema;
					var datarow = data.split("\n");
					var f = 0;
					for(i in  schemas.edge){
						for(var j=0;j<networkSize;j++){
							var DRC = datarow[(f*networkSize)+j].split(" ");
							for(var k=0;k<networkSize;k++){
								if(DRC[k]!=0){
									var node1 = "@"+(j+1);
									var node2 = "@"+(k+1);
									var EID = node1+"to"+node2+":"+schemas.edge[i].name;
									if(edges[node2+"to"+node1+":"+schemas.edge[i].name]==undefined){
										edges[EID] = {"@rid":EID,"@class":schemas.edge[i].name,in:node2,out:node1,source:nodes[node1],target:nodes[node2]};
										for(h in schemas.edge[i].properties){
											edges[EID][schemas.edge[i].properties[h].name] = DRC[k];
										}
										if(nodes[node1]["out_"+schemas.edge[i].name]==undefined){
											nodes[node1]["out_"+schemas.edge[i].name] = [];
										}
										nodes[node1]["out_"+schemas.edge[i].name].push(EID);
										if(nodes[node2]["in_"+schemas.edge[i].name]==undefined){
											nodes[node2]["in_"+schemas.edge[i].name] = [];
										}
										nodes[node2]["in_"+schemas.edge[i].name].push(EID);
									}
								}
							}
						}
						f++;
					}
				}else if(extension=="paj"){
					var edgeSchema = [{name:"E",properties:[{name:"weightage"}]}];
					var vertexSchema = [{name:"V",properties:[]}];
					schemas.edge = edgeSchema;
					schemas.vertex = vertexSchema;
					var content = raw.split("*Edges");
					var edgelist = content[1].trim().split("\n");
					var nodelist = content[0].split("*Vertices");
					nodelist = nodelist[1].trim().split("\n");
					var networkSize = parseInt(nodelist[0]);
					var hm = {};
					for(var i=1;i<nodelist.length;i++){
						var line = nodelist[i].split(" ");
						var nodeID = "@"+(line[0]);
						nodes[nodeID] = {"@rid":nodeID,"@class":"V"};
					}
					for(var i=0;i<edgelist.length;i++){
						var line = edgelist[i].split(" ");
						var node1 = "@"+line[0];
						var node2 = "@"+line[1];
						var EID = node1+"to"+node2+":E";
						var weightage = parseInt(line[2]);
						edges[EID] = {"@rid":EID,"@class":"E",in:node2,out:node1,source:nodes[node1],target:nodes[node2],"weightage":weightage};
						if(nodes[node1]["out_E"]==undefined){
							nodes[node1]["out_E"] = [];
						}
						nodes[node1]["out_E"].push(EID);
						if(nodes[node2]["in_E"]==undefined){
							nodes[node2]["in_E"] = [];
						}
						nodes[node2]["in_E"].push(EID);
					}
				}else if(raw.search("#nodes property")==-1){
					var arr = raw.split("\n");
					for(i in arr){
						var temp = arr[i].toString().trim();
						if(temp.charAt(0)!="#"){
							var node12 = temp.split(" ");
							var node1 = "@"+node12[0].toString();
							var node2 = "@"+node12[1].trim().toString();
							if(nodes[node1]==undefined){
								nodes[node1] = {"@rid":node1,"@class":"V",}
							}
							if(nodes[node1]["out_E"]==undefined){
								nodes[node1]["out_E"] = [];
							}
							nodes[node1]["out_E"].push(temp);
							if(nodes[node2]==undefined){
								nodes[node2] = {"@rid":node2,"@class":"V"}
							}
							if(nodes[node2]["in_E"]==undefined){
								nodes[node2]["in_E"] = [];
							}
							nodes[node2]["in_E"].push(temp);
							edges[temp] = {"@rid":temp,"@class":"E",in:node2,out:node1,source:nodes[node1],target:nodes[node2]};
						}
					}
					var edgeSchema = [{name:"E",properties:[]}];
					var vertexSchema = [{name:"V",properties:[]}];
					schemas.edge = edgeSchema;
					schemas.vertex = vertexSchema;
				}else{//own format
					var arr = raw.split("#schema");
					var schemaArray =  arr[1].split("#divide");
					schemaV = schemaArray[0].trim().split("\n");
					schemaE = schemaArray[1].trim().split("\n");
					for(i in schemaE){
						var schema = schemaE[i].split(" ");
						edgeSchema = {name:schema[0],properties:[]};
						for(var j=1;j<schema.length;j++){
							edgeSchema.properties.push({name:schema[j]});
						}
						schemas.edge[schema[0]] = (edgeSchema);
					}
					for(i in schemaV){
						var schema = schemaV[i].split(" ");
						vertexSchema = {name:schema[0],properties:[]};
						for(var j=1;j<schema.length;j++){
							vertexSchema.properties.push({name:schema[j]});
						}
						schemas.vertex[schema[0]] = (vertexSchema);
					}
					arr = arr[0].split("#links\n");
					var arrLink = arr[1].trim().split("\n");
					for(i in arrLink){
						var temp = arrLink[i];
						if(temp.charAt(0)!="#"){
							var node12 = temp.split("to");
							var node1 = "@"+node12[0];
							var node2 = "@"+node12[1].trim();
							if(nodes[node1]==undefined){
								nodes[node1] = {"@rid":node1}
							}
							if(nodes[node1]["out_"]==undefined){
								nodes[node1]["out_"] = [];
							}
							nodes[node1]["out_"].push(temp);
							if(nodes[node2]==undefined){
								nodes[node2] = {"@rid":node2}
							}
							if(nodes[node2]["in_"]==undefined){
								nodes[node2]["in_"] = [];
							}
							nodes[node2]["in_"].push(temp);
							edges[temp] = {"@rid":temp,in:node2,out:node1,source:nodes[node1],target:nodes[node2]};
						}
					}
					arr = arr[0].split("#links property\n");
					var arrLinkproperty = arr[1].trim().split("\n");
					for(i in arrLinkproperty){
						var temp = arrLinkproperty[i];
						var edge12 = temp.split(" ");
						edges[edge12[0]]["@class"] = edge12[1];
						var ids = edge12[0].split("to");
						var sid = "@"+ids[0];
						var did = "@"+ids[1];
						if(nodes[sid]["in_"]!=undefined){
							nodes[sid]["in_"+edge12[1]] = nodes[sid]["in_"].slice()
							delete nodes[sid]["in_"];
						}
						if(nodes[sid]["out_"]!=undefined){
							nodes[sid]["out_"+edge12[1]] = nodes[sid]["out_"].slice()
							delete nodes[sid]["out_"];
						}
						if(nodes[did]["in_"]!=undefined){
							nodes[did]["in_"+edge12[1]] = nodes[did]["in_"].slice()
							delete nodes[did]["in_"];
						}
						if(nodes[did]["out_"]!=undefined){
							nodes[did]["out_"+edge12[1]] = nodes[did]["out_"].slice()
							delete nodes[did]["out_"];
						}
						for(j in schemas.edge[edge12[1]].properties){
							var property = schemas.edge[edge12[1]].properties[j].name;
							edges[edge12[0]][property] = edge12[parseInt(j)+2];
						}
					}
					arr = arr[0].split("#nodes property\n");
					var arrNodeproperty = arr[1].trim().split("\n");
					for(i in arrNodeproperty){
						var temp = arrNodeproperty[i];
						var node12 = temp.split(" ");
						if(nodes["@"+node12[0]]==undefined){
							nodes["@"+node12[0]] = {"@rid":node12[0]}
						}
						nodes["@"+node12[0]]["@class"] = node12[1];
						for(j in schemas.vertex[node12[1]].properties){
							var property = schemas.vertex[node12[1]].properties[j].name;
							nodes["@"+node12[0]][property] = node12[parseInt(j)+2];
						}
					}
					var nodesSchArr = Object.keys(schemas.vertex).map(function (key) { return schemas.vertex[key]; });
					var edgesSchArr = Object.keys(schemas.edge).map(function (key) { return schemas.edge[key]; });
					schemas.edge = edgesSchArr;
					schemas.vertex = nodesSchArr;
				}
				var nodesArr = Object.keys(nodes).map(function (key) { return nodes[key]; });
				var edgesArr = Object.keys(edges).map(function (key) { return edges[key]; });
				var json = {result:nodesArr.concat(edgesArr)};
				active.uploadNetwork(json,schemas,function(){
					var property = active.loadBasicNetworkProperties();
					displayBasicNetworkProperties(property);
				});
				document.getElementById("uploadNetworkBtn").value="";
			//}catch(error){
				//var msg = "Text file format is not supported"
				//displayErrorMsg(msg)
			//}
		}
		reader.readAsText(file);	
	});
	$("#CUbtn").on("click",function(){
		if(validateForm()){
			var schemas = active.schemas;
			var rid = $("#rid").val();
			var classType = $("#classType").val();
			var vertex = false;
			var ridto = $("#ridto").val();
			var ridfrom = $("#ridfrom").val();
			var properties = {};
			var selectedIndex = $("#classType")[0].selectedIndex;
			var property = schemas.edge[selectedIndex-1].properties;
			if($("#classType")[0].options[1].value == schemas.vertex[0].name){
				vertex= true;
				property = schemas.vertex[selectedIndex-1].properties;
			}
			for(var i=0;i<property.length;i++){
				properties[property[i].name] = $("#class_"+property[i].name).val();
			}
			try{
				if(vertex){
					active.createNodeinNetwork(rid,classType,properties,function(node,classType){
						var rid = node["@rid"];
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
						for(var i=0;i<active.schemas.edge.length;i++){
							if(node['in_'+active.schemas.edge[i].name]!=undefined){
								$(nodekey).append("<tr><td>"+active.schemas.edge[i].name+" in Degree</td><td>"+node['in_'+active.schemas.edge[i].name].length+"</td></tr>");
							}
							if(node['out_'+active.schemas.edge[i].name]!=undefined){
								$(nodekey).append("<tr><td>"+active.schemas.edge[i].name+" out Degree</td><td>"+node['out_'+active.schemas.edge[i].name].length+"</td></tr>");
								$(nodekey).append("<tr><td>"+active.schemas.edge[i].name+" CC</td><td>"+active.calCC(node,active.schemas.edge[i].name)+"</td></tr>");
							}
						}
					});
				}else{
					active.createEdgeinNetwork(rid,classType,ridfrom,ridto,properties,function(edge,classType){
						var rid = edge["@rid"];
						var ridfrom = edge["out"];
						var ridto = edge["in"];
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
							$(".nodes circle[rid='"+rid+"']").attr("fill",active.nodeColor(active.nodeMap[rid][active.options.colorGroup]));
						});
						$(nodekey+" tr.target")
						.hover(function(){
							var rid = $(nodekey+" tr.target td:nth-child(2)").html();
							$(".nodes circle[rid='"+rid+"']").attr("fill", "red");
						},function(){
							var rid = $(nodekey+" tr.target td:nth-child(2)").html();
							$(".nodes circle[rid='"+rid+"']").attr("fill",active.nodeColor(active.nodeMap[rid][active.options.colorGroup]));
						});
					});
				}
				$("#FilterNodeMetric").trigger("change");
				$("#ClusterBySelect").trigger("change");
				$("#NodeSizePropertySelect").trigger("change");
			}catch(err){
				displayErrorMsg(err);
			}
		}else{
			displayErrorMsg("Enter all fields.");
		}
	});
	$("#degree").on("click",function(){//OK
		var edgeType = active.options.edgeUsed;
		var degreeDist = active.getDegreeDistribution(edgeType,active.directed,function(degreeDist){
			$("#graphpanel").html("<div class='header'><h4></h4></div><div class='body'></div><div class='footer'></div>");
			var avgDegree = active.getAvgDegree(edgeType);
			if(active.directed){
				var dist = new DegreeDistribution(degreeDist.in,avgDegree,active.getGamma(edgeType));
				dist.poissonDistribution();
				dist.powerLawDistribution();
				degreeDist.in = dist.getData();
				var graphIn = new ScatterPlot("#graphpanel",degreeDist.in,"in Degree distribution","k(in)","p(k)",avgDegree);
				var dist = new DegreeDistribution(degreeDist.out,avgDegree,active.getGamma(edgeType));
				dist.poissonDistribution();
				dist.powerLawDistribution();
				degreeDist.out = dist.getData();
				var graphOut = new ScatterPlot("#graphpanel",degreeDist.out,"out Degree distribution","k(out)","p(k)",avgDegree);						
				graphOut.plot();
				graphIn.plot();
			}else{
				var dist = new DegreeDistribution(degreeDist,avgDegree,active.getGamma(edgeType));
				dist.poissonDistribution();
				dist.powerLawDistribution();
				degreeDist = dist.getData();
				var graph = new ScatterPlot("#graphpanel",degreeDist,"Degree Distribution","k","p(k)",avgDegree);
				graph.plot();
			}
		});
	});
	$("#diameter").on("click",function(){//OK
		var edgeType = active.options.edgeUsed;
		active.getDiameter(edgeType,function(diameter){
			$("#graphModal .modal-body").empty();
			$(".distance").empty();
			$(".distance").append("<li class='list-group-item'>Distance:"+diameter.dist+"</li>");
			for(p in diameter.path){
				var path = "";
				for(i in diameter.path[p]){
					if(i==0){
						path+=diameter.path[p][i];
					}else{
						path+="->"+diameter.path[p][i];
					}
					if(i==0 || i ==diameter.path[p].length-1){
						$("circle[rid='"+diameter.path[p][i]+"']").attr("fill","green");
					}else{
						$("circle[rid='"+diameter.path[p][i]+"']").attr("fill","red");
					}
				}
				$(".distance").append("<li class='list-group-item'>Path ("+(parseInt(p)+1)+"):<br/>"+path+"</li>");
			}
		})
	});
	$("#CC").on("click",function(){//OK
		var edgeType = active.options.edgeUsed;
		active.getCCDistribution(edgeType,function(result){
			var CCdist = result.data;
			var edgeType = active.options.edgeUsed;
			var avgDegree = active.getAvgDegree(edgeType)
			var noOfNodes = active.nodes.length;
			var dist = new CCDistribution(CCdist,avgDegree,active.nodes.length);
			var avgCC = result.avg;
			dist.RandomDistribution();
			dist.ScaleFreeDistribution();
			CCdist = dist.getData();
			$("#graphpanel").html("<div class='header'><h4></h4></div><div class='body'></div><div class='footer'></div>");
			var graph = new ScatterPlot("#graphpanel",CCdist,"Clustering Coefficient Distribution","k","CC(k)",avgCC);
			graph.plot();
		})
	});
	$("#closeness").on("click",function(){
		var edgeType = active.options.edgeUsed;
		active.getCloseness(edgeType,function(closeness){
			$("#graphpanel").empty();
			$("#graphpanel").append("<div class='table-responsive'>"+
														"<table class='table'><tbody><tr><td>ID</td><td>Closeness</td></tr></tbody></table>"+
													"</div>");
			var table = $("#graphpanel table tbody")
			for(i in closeness){
				table.append("<tr><td>"+i+"</td><td>"+closeness[i]+"</td></tr>");
			}
		});
	});
	$("#betweenness").on("click",function(){
		var edgeType = active.options.edgeUsed;
		active.getBetweenness(edgeType,function(betweenness){
			$("#graphpanel").empty();
			$("#graphpanel").append("<div class='table-responsive'>"+
														"<table class='table'><tbody><tr><td>ID</td><td>Betweeness</td></tr></tbody></table>"+
													"</div>");
			var table = $("#graphpanel table tbody")
			for(i in betweenness){
				table.append("<tr><td>"+i+"</td><td>"+betweenness[i]+"</td></tr>");
			}
		});
	});
	$("#pagerank").on("click",function(){
		var edgeType = active.options.edgeUsed;
		active.getPageRank(edgeType,function(pagerank){
			$("#graphpanel").empty();
			$("#graphpanel").append("<div class='table-responsive'>"+
														"<table class='table'><tbody><tr><td>ID</td><td>Page Rank</td></tr></tbody></table>"+
													"</div>");
			var table = $("#graphpanel table tbody")
			for(i in pagerank){
				table.append("<tr><td>"+i+"</td><td>"+pagerank[i].C+"</td></tr>");
			}
		});
	});
	
	$("#NodeSizePropertySelect").on("change",function(){
		var value = this.options[this.selectedIndex].value
		active.changeNodeSizeProperty(value)
	});
	
	//clustering
	$("#ClusterBySelect").on("change",function(){
		$(".attributeoptions").css("display","none");
		$(".kmeanoptions").css("display","none");
		$(".hiearchicaloptions").css("display","none");
		$(".spectraloptions").css("display","none");
		if(this.options[this.selectedIndex].value=="attribute"){
			$(".attributeoptions").css("display","block");
		}else if(this.options[this.selectedIndex].value=="kmeansClustering"){
			$(".kmeanoptions").css("display","block");
		}else if(this.options[this.selectedIndex].value=="hiearchicalClustering"){
			$(".hiearchicaloptions").css("display","block");
		}else if(this.options[this.selectedIndex].value=="spectralClustering"){
			$(".spectraloptions").css("display","block");
			if(active.directed==false){
				$("#spectralDirection").val("both");
				$(".spectraloptions.direction").css("display","none");
			}
			var property = active.schemas.edge[document.getElementById("OverallEdgeClassSelect").selectedIndex-1].properties;
			displayClassProperty(property,"spectralAttributeSelect",false);
		}
	})
	$("#ClusteringSettingBtn").on("click",function(){
		var method = $("#ClusterBySelect").val();
		if(method=="attribute"){//done
			var classType = $("#ClusterByNodeClassSelect option[value='"+$("#ClusterByNodeClassSelect").val()+"']").html();
			var attribute = $("input[name='ClusterByNodeAttributeSelect']:checked").val();
			active.setClusteringClassAttribute(classType,attribute);
		}else if(method=="kmeansClustering"){//incomplete
			var noOfCluster = $("#NumOfClusterInput").val();
			active.setKmeansClusteringSettings(noOfCluster);
		}else if(method=="hiearchicalClustering"){//incomplete do min,max,avg
			var threshold=$("#hiearchicalThreshold").val()
			var linkageCriteria=$("#hiearchicalLinkageCriteria").val()
			var direction=$("#hiearchicalDirection").val()
			active.setHiearchicalClusteringSettings(threshold,linkageCriteria,direction);
		}else if(method=="spectralClustering"){
			var direction = $("#spectralDirection").val();
			var noOfCluster = $("#NumOfClusterInput").val();
			var weightageAttr = $("input[name='spectralAttributeSelect']:checked").val();
			active.setSpectralClusteringSettings(noOfCluster,direction,weightageAttr);
		}else{
			active.offClusteringMethod();
		}
	})
	$("#ClusterByNodeClassSelect").on("change",function(){
		var index = this.options[this.selectedIndex].value;
		var property = active.schemas.vertex[index].properties
		displayClassProperty(property,"ClusterByNodeAttributeSelect",true)
	});
	
	$("#hiearchicalThreshold").on("change",function(){
		$("#hiearchicalThresholdDisplay").html(this.value);
	});
	
	$("#FilterNodeMetric").on("change",function(){
		if(this.value=="off"){
			$(".FilterNodeCondition").css("display","none");
			active.changeFilteringCondition(this.value,0);
		}else if(this.value=="degree"){
			$(".FilterNodeCondition").css("display","block");
			var max = active.getMaxDegree(active.options.edgeUsed);
			var min = active.getMinDegree(active.options.edgeUsed);
			var step = 1;
			updateSliderRange("#FilterNodeCondition","#FilterNodeConditionDisplay",max,min,step)
			$("#FilterNodeMetricDisplay").html(" >="+this.options[this.selectedIndex].innerHTML);
		}else{
			$(".FilterNodeCondition").css("display","block");
			var max = 1;
			var min = 0;
			var step = 0.05;
			updateSliderRange("#FilterNodeCondition","#FilterNodeConditionDisplay",max,min,step)
			$("#FilterNodeMetricDisplay").html(" >="+this.options[this.selectedIndex].innerHTML);
		}
	});
	$("#FilterNodeCondition").on("change",function(){
		$("#FilterNodeConditionDisplay").html(this.value);
		active.changeFilteringCondition($("#FilterNodeMetric").val(),this.value);
	});
	
	//for the network metric calculation
	$("#OverallEdgeClassSelect").on("change",function(){
		active.changeOverallEdgeClass(this.options[this.selectedIndex].value);
		$("#FilterNodeMetric").trigger("change");
		$("#ClusterBySelect").trigger("change");
		$("#NodeSizePropertySelect").trigger("change");
	});
	
	//edge
	$("#edgeClassSelect").on("change",function(){
		var index = this.options[this.selectedIndex].value;
		var property = active.schemas.edge[index].properties
		displayClassProperty(property,"edgeWeightageAttributeSelect",false)
		var pastProperty= active.options.edgeLabel[active.schemas.edge[index].name];
		$("input[type='radio'][name='edgeWeightageAttributeSelect'][value='"+pastProperty+"']").attr("checked",true);
		displayClassProperty(property,"edgeLabelAttributeSelect",true)
		var pastProperty= active.options.weight[active.schemas.edge[index].name];
		$("input[type='radio'][name='edgeLabelAttributeSelect'][value='"+pastProperty+"']").attr("checked",true);
	});
	$("#edgeClassSettingBtn").on('click',function(){
		var index = document.getElementById("edgeClassSelect").options[document.getElementById("edgeClassSelect").selectedIndex].value;
		var weight = $("input[name='edgeWeightageAttributeSelect']:checked").val();
		var label = $("input[name='edgeLabelAttributeSelect']:checked").val();
		active.changeWeightageAttribute(weight,active.schemas.edge[index].name);
		active.changeEdgeLabel(label,active.schemas.edge[index].name)
	});
	
	//node label
	$("#nodeClassSelect").on("change",function(){
		var index = this.options[this.selectedIndex].value;
		var property = active.schemas.vertex[index].properties
		displayClassProperty(property,"nodeLabelAttributeSelect",true);
		var pastProperty= active.options.nodeLabel[active.schemas.vertex[index].name];
		$("input[type='radio'][name='nodeLabelAttributeSelect'][value='"+pastProperty+"']").attr("checked",true);
	});
	$("#nodeClassSettingBtn").on('click',function(){
		var index = document.getElementById("nodeClassSelect").options[document.getElementById("nodeClassSelect").selectedIndex].value;
		var label = $("input[name='nodeLabelAttributeSelect']:checked").val();
		active.changeNodeLabel(label,active.schemas.vertex[index].name)
	});
	//layout
	$("#layoutSelect").on("change",function(){
		if(this.value=="radial"){
			$(".layoutMetricSelectGroup").css("display","block");
		}else{
			$(".layoutMetricSelectGroup").css("display","none");
		}
	})
	$("#layoutSettingBtn").on('click',function(){
		var layout = $("#layoutSelect").val();
		var metric = "";
		if(layout=="radial"){
			metric = $("#layoutMetricSelect").val();
		}
		active.changeLayout(layout,metric);
	});
	$("#edgeLengthSettingBtn").on("click",function(){
		var length = parseInt($("#edgeLength").val());
		active.changeEdgeLength(length);
	});
	$("#nodeSizeSettingBtn").on("click",function(){
		var radius = parseInt($("#nodeSize").val());
		active.changeNodeSize(radius);
	});
});
function highlightNode(rid,color){
	$(".nodes circle[rid='"+rid+"']").attr("fill",color);
}
function updateSliderRange(range,display,max,min,step){
	$(range).attr("max",max);
	$(range).attr("min",min);
	$(range).attr("step",step);
	$(range).val(min)
	$(display).html(min);
}
function displayClassProperty(property,div,show){
	var radioBtnhtml1="<label><input type='radio' value='' checked name='"+div+"'/>none</label>";
	var radioBtnhtml2="";
	if(show==true){
		radioBtnhtml2 = "<label><input type='radio' value='@rid' name='"+div+"'/>rid</label>";
	}
	$("#"+div).html("");
	$("#"+div).append("<tr><td>"+radioBtnhtml1+"</td><td>"+radioBtnhtml2+"</td></tr>");
	for(var i=0;i<property.length;i=i+2){
		var radioBtnhtml1="<label><input type='radio' value='"+property[i].name+"' name='"+div+"'/>"+property[i].name+"</label>";
		if(property[i+1]==undefined){
			$("#"+div).append("<tr><td>"+radioBtnhtml1+"</td></tr>");
		}else{
			var radioBtnhtml2="<label><input type='radio' value='"+property[i+1].name+"' name='"+div+"'/>"+property[i+1].name+"</label>";
			$("#"+div).append("<tr><td>"+radioBtnhtml1+"</td><td>"+radioBtnhtml2+"</td></tr>");
		}
	}
}
function displayClass(classes){
	var select = $("#classType");
	select.html("");
	select.append("<option value=''></option>")
	for(var i=0;i<classes.length;i++){
		select.append("<option value='"+classes[i].name+"'>"+classes[i].name+"</option>");
	}
}
function displayBasicNetworkProperties(property){
	$("#NetD .properties").html("<div class='table-responsive'>"+
									"<table class='table'><tbody></tbody></table>"+
								"</div>");
	var table = $("#NetD .properties table tbody")
	for(i in property){
		table.append("<tr><td>"+i+"</td><td>"+property[i]+"</td></tr>");
	}
}
function displayClassPropertyForm(NE,formchild,classProperty){
	if(NE!=undefined){
		if(classProperty!=undefined){
			for(var i=0;i<classProperty.length;i++){
				formchild.after("<div class='form-group'>"+
									"<label for='class_"+classProperty[i].name+"'>"+classProperty[i].name+":</label>"+
									"<input type='text' value="+NE[classProperty[i].name]+" class='form-control' id='class_"+classProperty[i].name+"'>"+
								"</div>");
			}
		}
		$("#rid").val(NE['@rid']);
		if(NE['@rid'].charAt(0)=="#" || NE['@class']!=""){
			$("#CUbtn").val("Update");
			$("#deletebtn").css("display","block");
			$("#classType").attr("disabled","true");
		}else{
			$("#CUbtn").val("Create");
			$("#deletebtn").css("display","none");
			$("#classType").removeAttr("disabled");
		}
	}else{
		if(classProperty!=undefined){
			for(var i=0;i<classProperty.length;i++){
				formchild.after("<div class='form-group'>"+
									"<label for='class_"+classProperty[i].name+"'>"+classProperty[i].name+":</label>"+
									"<input type='text' class='form-control' id='class_"+classProperty[i].name+"'>"+
								"</div>");
			}
		}
		$("#CUbtn").val("Create");
		$("#deletebtn").css("display","none");
		$("#classType").removeAttr("disabled");
	}
}
function validateForm(){
	var classes = active.getClass(true);
	var formchild = $("#NED form div:nth-child(1)");
	var classProperty;
	if($("#classType")[0].options[1].value != classes[0].name){
		classes = active.getClass(false);
	}
	var index = $("#classType")[0].selectedIndex-1;
	classProperty = classes[index].properties;	
	for(i in classProperty){
		if($("#class_"+classProperty[i].name).val()==""){
			return false;
			displayErrorMsg("Please enter "+classProperty[i].name);
		}
	}
	return true;
}
function displayErrorMsg(err){
	$(".errormsgdiv").html("<div class='errormsg alert alert-danger fade in'>"+
						  err+
						  "<a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a>"+
						"</div>")
}