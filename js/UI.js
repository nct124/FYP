var active;
$( document ).ready(function() {	
	var graph1 = $("#graph1").GraphVisualizer({
		rdy:function(){
			var schema = active.schemas;
			$("#nodeLabelClassSelect").html("");
			$("#nodeLabelClassSelect").append("<option value=''></option>");
			for(var i=0;i<schema.vertex.length;i++){
				$("#nodeLabelClassSelect").append("<option value='"+i+"'>"+schema.vertex[i].name+"</option>");
			}
			$("#nodeLabelClassSelect").on("change",function(){
				var index = this.options[this.selectedIndex].value;
				$("#nodeLabelAttributeSelect").html("");
				$("#nodeLabelAttributeSelect").append("<option value=''></option>");
				for(var i=0;i<schema.vertex[index].properties.length;i++){
					$("#nodeLabelAttributeSelect").append("<option value='"+schema.vertex[index].properties[i].name+"'>"+schema.vertex[index].properties[i].name+"</option>");
				}
			});
			$("#nodeLabelAttributeSelect").on('change',function(){
				var index = document.getElementById("nodeLabelClassSelect").options[document.getElementById("nodeLabelClassSelect").selectedIndex].value;
				var label = this.options[this.selectedIndex].value;
				active.changeNodeLabel(label,schema.vertex[index].name)
				/*active.options.nodeLabel[schema.vertex[index].name] = label;
				active.resetGraph();*/
			});
			
			$("#edgeLabelClassSelect").html("");
			$("#edgeLabelClassSelect").append("<option value=''></option>");
			$("#edgeClassSelect").append("<option value=''></option>");
			for(var i=0;i<schema.edge.length;i++){
				$("#edgeLabelClassSelect").append("<option value='"+i+"'>"+schema.edge[i].name+"</option>");
				$("#edgeClassSelect").append("<option value='"+i+"'>"+schema.edge[i].name+"</option>");
			}
			$("#edgeLabelClassSelect").on("change",function(){
				var index = this.options[this.selectedIndex].value;
				$("#edgeLabelAttributeSelect").html("");
				$("#edgeLabelAttributeSelect").append("<option value=''></option>");
				for(var i=0;i<schema.edge[index].properties.length;i++){
					$("#edgeLabelAttributeSelect").append("<option value='"+schema.edge[index].properties[i].name+"'>"+schema.edge[index].properties[i].name+"</option>");
				}
			});
			$("#edgeLabelAttributeSelect").on('change',function(){
				var index = document.getElementById("edgeLabelClassSelect").options[document.getElementById("edgeLabelClassSelect").selectedIndex].value;
				var label = this.options[this.selectedIndex].value;
				active.changeEdgeLabel(label,schema.edge[index].name)
				/*active.options.edgeLabel[schema.edge[index].name] = label;
				console.log(active.options.edgeLabel);
				active.resetGraph();*/
			});
			
			
			$("#edgeClassSelect").on("change",function(){
				var index = this.options[this.selectedIndex].value;
				$("#edgeWeightageAttributeSelect").html("");
				$("#edgeWeightageAttributeSelect").append("<option value=''></option>");
				for(var i=0;i<schema.edge[index].properties.length;i++){
					$("#edgeWeightageAttributeSelect").append("<option value='"+schema.edge[index].properties[i].name+"'>"+schema.edge[index].properties[i].name+"</option>");
				}
			});
			$("#edgeWeightageAttributeSelect").on('change',function(){
				var index = document.getElementById("edgeClassSelect").options[document.getElementById("edgeClassSelect").selectedIndex].value;
				var attribute = this.options[this.selectedIndex].value;
				changeWeightageAttribute(attribute,schema.edge[index].name);
				/*active.options.weight[schema.edge[index].name] = label;
				console.log(active.options.edgeLabel);
				active.resetGraph();*/
			});
			$("#OverallEdgeClassSelect").empty();
			$("#OverallEdgeClassSelect").append("<option value=''></option>");
			for(var i=0;i<schema.edge.length;i++){
				$("#OverallEdgeClassSelect").append("<option value='"+schema.edge[i].name+"'>"+schema.edge[i].name+"</option>");
			}
			$("#OverallEdgeClassSelect").on("change",function(){
				active.changeOverallEdgeClass(this.options[this.selectedIndex].value);
			});
		}
	});
	active = graph1;
	$("#queryBtn").on("click",function(){
		var query = $("#query").val();
		active.queryDatabase(query);
	});
	$("#clearBtn").on("click",function(){
		active.clearGraph();
	});
	$("#addBtn").on("click",function(){
		var newGraph = {nodes:[{"@class":"","x":300,"y":300,"@rid":Math.floor(Math.random() * (100000 - 1) + 1).toString()}]
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
	});
	$("#deletebtn").on("click",function(){
		var rid = $("#rid").val();
		var classType = $("#classType").val();
		var vertex = false;
		if($("#classType")[0].options[1].value == active.schemas.vertex[0].name){
			vertex= true;
		}
		active.deleteNEinNetwork(rid,classType,vertex);
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
			for(var i=0;i<classProperty.length;i++){
				formchild.after("<div class='form-group'>"+
									"<label for='class_"+classProperty[i].name+"'>"+classProperty[i].name+":</label>"+
									"<input type='text' class='form-control' id='class_"+classProperty[i].name+"'>"+
								"</div>");
			}
		}
	})
	$("#directedSelect").on("change",function(){
		if(this.options[this.selectedIndex].value=="directed"){
			active.toggleDirected(true);
		}else{
			active.toggleDirected(false);
		}
	});
	
	$("#uploadNetworkBtn")[0].addEventListener('change', function(e) {
		var file = this.files[0]
		var reader = new FileReader();
		var fileType = "Edge";
		var nodes = {};
		var edges = {};
		reader.onload = function(e) {
			if(fileType=="Edge"){
				var raw = reader.result;
				var arr = raw.split("\n");
				for(i in arr){
					var temp = arr[i];
					var node12 = temp.split(" ");
					var node1 = node12[0];
					var node2 = node12[1];
					if(nodes[node1]==undefined){
						nodes[node1] = {"@rid":node1,"@class":"V",}
					}
					if(nodes[node1]["out_E"]==undefined){
						nodes[node1]["out_E"] = [];
					}
					nodes[node1]["out_E"].push(temp);
					if(nodes[node2]==undefined){
						nodes[node2] = {"@rid":node2,"@class":"V",}
					}
					if(nodes[node2]["in_E"]==undefined){
						nodes[node2]["in_E"] = [];
					}
					nodes[node2]["in_E"].push(temp);
					edges[temp] = {"@rid":temp,"@class":"E",in:node2,out:node1,source:nodes[node1],target:nodes[node2]};
				}
				var nodesArr = Object.keys(nodes).map(function (key) { return nodes[key]; });
				var edgesArr = Object.keys(edges).map(function (key) { return edges[key]; });
				var json = {result:nodesArr.concat(edgesArr)};//{nodes:nodesArr,links:edgesArr}
				active.uploadNetwork(json);
			}
			
		}
		reader.readAsText(file);	
	});
	$("#CUbtn").on("click",function(){
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
		active.createNEinNetwork(rid,classType,vertex,ridfrom,ridto,properties);
	});
	console.log(active);
	$("#degree").on("click",function(){//OK
		var edgeType = active.options.edgeUsed;
		var degreeDist = active.getDegreeDistribution(edgeType,active.directed);
		console.log(degreeDist);
		$("#graphModal .modal-body").empty();
		if(active.directed){
			var graphIn = new HistogramGraph("#graphModal",degreeDist.in,"x","y","in Degree distribution","k(in)","p(k)");
			var graphOut = new HistogramGraph("#graphModal",degreeDist.out,"x","y","out Degree distribution","k(out)","p(k)");						
			graphOut.plot();
			graphIn.plot();
		}else{
			var graph = new HistogramGraph("#graphModal",degreeDist,"x","y","Degree Distribution","k","p(k)");
			graph.plot();
		}
		
	});
	$("#diameter").on("click",function(){//OK
		var edgeType = active.options.edgeUsed;
		var diameter = active.getDiameter(edgeType)
		$("#graphModal .modal-body").empty();
		console.log(diameter);
		for(i in diameter.path){
			$("circle[rid='"+diameter.path[i]+"']").attr("fill","red");
		}
	});
	$("#CC").on("click",function(){//OK
		var edgeType = active.options.edgeUsed;
		var CCdist = active.getCCDistribution(edgeType)
		console.log(CCdist);
		$("#graphModal .modal-body").empty();
		var graph = new HistogramGraph("#graphModal",CCdist,"x","y","Clustering Coefficient Distribution","CC","p(CC)");
		graph.plot();
	});
	$("#closeness").on("click",function(){
		var edgeType = active.options.edgeUsed;
		var closeness = active.getCloseness(edgeType);
		$("#graphModal .modal-body").empty();
		console.log(closeness);
		$("#graphModal .modal-body").append("<div class='table-responsive'>"+
													"<table class='table'><tbody><tr><td>ID</td><td>Closeness</td></tr></tbody></table>"+
												"</div>");
		var table = $("#graphModal .modal-body table tbody")
		for(i in closeness){
			table.append("<tr><td>"+i+"</td><td>"+closeness[i]+"</td></tr>");
		}
	});
	
});