var active;
$( document ).ready(function() {	
	var graph1 = $("#graph1").GraphVisualizer({
		rdy:function(){
			var schema = active.schemas.result[0];
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
				active.options.nodeLabel[schema.vertex[index].name] = label;
				active.resetGraph();
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
				active.options.edgeLabel[schema.edge[index].name] = label;
				console.log(active.options.edgeLabel);
				active.resetGraph();
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
				var label = this.options[this.selectedIndex].value;
				active.options.weight[schema.edge[index].name] = label;
				console.log(active.options.edgeLabel);
				active.resetGraph();
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
		if($("#classType")[0].options[1].value == active.schemas.result[0].vertex[0].name){
			vertex= true;
		}
		active.deleteNEinNetwork(rid,classType,vertex);
	});
	$("#classType").on("change",function(){
		if(this.selectedIndex>0){
			var schemas = active.schemas;
			var classProperty;
			if(this.options[1].value==schemas.result[0].vertex[0].name){
				classProperty = schemas.result[0].vertex[this.selectedIndex-1].properties; 
			}else{
				classProperty = schemas.result[0].edge[this.selectedIndex-1].properties;
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
		reader.onload = function(e) {
			active.uploadNetwork(JSON.parse(reader.result))
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
		var property = schemas.result[0].edge[selectedIndex-1].properties;
		if($("#classType")[0].options[1].value == schemas.result[0].vertex[0].name){
			vertex= true;
			property = schemas.result[0].vertex[selectedIndex-1].properties;
		}
		for(var i=0;i<property.length;i++){
			properties[property[i].name] = $("#class_"+property[i].name).val();
		}
		active.createNEinNetwork(rid,classType,vertex,ridfrom,ridto,properties);
	});
	console.log(active);
	$("#degree").on("click",function(){//OK
		var edgeType = "follows";
		var degreeDist = active.getDegreeDistribution(edgeType)
		var graph = new HistogramGraph("#graphModal",degreeDist,"x","y");
		graph.plot();
	});
	$("#diameter").on("click",function(){//OK
		var edgeType = "follows";
		var diameter = active.getDiameter(edgeType)
		console.log(diameter);
	});
	$("#CC").on("click",function(){//OK
		var edgeType = "follows";
		var CCdist = active.getCCDistribution(edgeType)
		console.log(CCdist);
		var graph = new HistogramGraph("#graphModal",CCdist,"x","y");
		graph.plot();
	});
	$("#closeness").on("click",function(){
		var edgeType = "follows";
		var closeness = active.getCloseness(edgeType)
		console.log(closeness);
	});
	
});