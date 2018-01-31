var active;

$( document ).ready(function() {
	/*ajax("http://localhost:8080/getCloseness",{test:"{value:'hi'}"},function(result){
		console.log(result);
	})*/
	var graph1 = $("#graph1").GraphVisualizer({
		rdy:function(){
			active.schemas;
			$("#nodeLabelClassSelect").html("");
			$("#nodeLabelClassSelect").append("<option value=''></option>");
			
			for(var i=0;i<active.schemas.vertex.length;i++){
				$("#nodeLabelClassSelect").append("<option value='"+i+"'>"+active.schemas.vertex[i].name+"</option>");
			}
			$("#nodeLabelClassSelect").on("change",function(){
				var index = this.options[this.selectedIndex].value;
				$("#nodeLabelAttributeSelect").html("");
				$("#nodeLabelAttributeSelect").append("<option value=''></option>");
				$("#nodeLabelAttributeSelect").append("<option value='@rid'>rid</option>");
				for(var i=0;i<active.schemas.vertex[index].properties.length;i++){
					$("#nodeLabelAttributeSelect").append("<option value='"+active.schemas.vertex[index].properties[i].name+"'>"+active.schemas.vertex[index].properties[i].name+"</option>");
				}
			});
			$("#nodeLabelAttributeSelect").on('change',function(){
				var index = document.getElementById("nodeLabelClassSelect").options[document.getElementById("nodeLabelClassSelect").selectedIndex].value;
				var label = this.options[this.selectedIndex].value;
				active.changeNodeLabel(label,active.schemas.vertex[index].name)
			});
			
			$("#edgeLabelClassSelect").html("");
			$("#edgeClassSelect").html("");
			$("#edgeLabelClassSelect").append("<option value=''></option>");
			$("#edgeClassSelect").append("<option value=''></option>");
			for(var i=0;i<active.schemas.edge.length;i++){
				$("#edgeLabelClassSelect").append("<option value='"+i+"'>"+active.schemas.edge[i].name+"</option>");
				$("#edgeClassSelect").append("<option value='"+i+"'>"+active.schemas.edge[i].name+"</option>");
			}
			$("#edgeLabelClassSelect").on("change",function(){
				var index = this.options[this.selectedIndex].value;
				$("#edgeLabelAttributeSelect").html("");
				$("#edgeLabelAttributeSelect").append("<option value=''></option>");
				for(var i=0;i<active.schemas.edge[index].properties.length;i++){
					$("#edgeLabelAttributeSelect").append("<option value='"+active.schemas.edge[index].properties[i].name+"'>"+active.schemas.edge[index].properties[i].name+"</option>");
				}
			});
			$("#edgeLabelAttributeSelect").on('change',function(){
				var index = document.getElementById("edgeLabelClassSelect").options[document.getElementById("edgeLabelClassSelect").selectedIndex].value;
				var label = this.options[this.selectedIndex].value;
				active.changeEdgeLabel(label,active.schemas.edge[index].name)
			});
			
			$("#edgeClassSelect").on("change",function(){
				var index = this.options[this.selectedIndex].value;
				$("#edgeWeightageAttributeSelect").html("");
				$("#edgeWeightageAttributeSelect").append("<option value=''></option>");
				for(var i=0;i<active.schemas.edge[index].properties.length;i++){
					$("#edgeWeightageAttributeSelect").append("<option value='"+active.schemas.edge[index].properties[i].name+"'>"+active.schemas.edge[index].properties[i].name+"</option>");
				}
			});
			$("#edgeWeightageAttributeSelect").on('change',function(){
				var index = document.getElementById("edgeClassSelect").options[document.getElementById("edgeClassSelect").selectedIndex].value;
				var attribute = this.options[this.selectedIndex].value;
				active.changeWeightageAttribute(attribute,active.schemas.edge[index].name);
			});
			$("#OverallEdgeClassSelect").empty();
			$("#OverallEdgeClassSelect").append("<option value=''></option>");
			for(var i=0;i<active.schemas.edge.length;i++){
				$("#OverallEdgeClassSelect").append("<option value='"+active.schemas.edge[i].name+"'>"+active.schemas.edge[i].name+"</option>");
			}
			$("#OverallEdgeClassSelect").on("change",function(){
				active.changeOverallEdgeClass(this.options[this.selectedIndex].value);
			});
		}
	});
	active = graph1;
	active.options.rdy();
	$("#queryBtn").on("click",function(){
		var query = $("#query").val();
		active.queryDatabase(query,function(){
			var property = active.loadBasicNetworkProperties();
			console.log(property);
			$("#NetD .properties").html("<div class='table-responsive'>"+
													"<table class='table'><tbody></tbody></table>"+
												"</div>");
			var table = $("#NetD .properties table tbody")
			for(i in property){
				table.append("<tr><td>"+i+"</td><td>"+property[i]+"</td></tr>");
			}
		});
	});
	$("#clearBtn").on("click",function(){
		active.clearGraph();
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
					var node2 = node12[1].trim();
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
				var nodesArr = Object.keys(nodes).map(function (key) { return nodes[key]; });
				var edgesArr = Object.keys(edges).map(function (key) { return edges[key]; });
				var json = {result:nodesArr.concat(edgesArr)};//{nodes:nodesArr,links:edgesArr}
				active.uploadNetwork(json,function(){
					var property = active.loadBasicNetworkProperties();
					$("#NetD .properties").html("<div class='table-responsive'>"+
															"<table class='table'><tbody></tbody></table>"+
														"</div>");
					var table = $("#NetD .properties table tbody")
					for(i in property){
						table.append("<tr><td>"+i+"</td><td>"+property[i]+"</td></tr>");
					}
				});
				document.getElementById("uploadNetworkBtn").value="";	
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
		try{
			active.createNEinNetwork(rid,classType,vertex,ridfrom,ridto,properties);
		}catch(err){
			displayErrorMsg(err);
		}
		
	});
	console.log(active);
	$("#degree").on("click",function(){//OK
		var edgeType = active.options.edgeUsed;
		var degreeDist = active.getDegreeDistribution(edgeType,active.directed,function(degreeDist){
			console.log(degreeDist);
			$("#graphModal .modal-body").empty();
			var avgDegree = active.getAvgDegree(edgeType);
			if(active.directed){
				var dist = new DegreeDistribution(degreeDist.in,avgDegree,active.getGamma(edgeType));
				dist.poissonDistribution();
				//dist.powerLawDistribution();
				degreeDist.in = dist.getData();
				var graphIn = new HistogramGraph("#graphModal",degreeDist.in,"in Degree distribution","k(in)","p(k)",avgDegree);
				var dist = new DegreeDistribution(degreeDist.out,avgDegree,active.getGamma(edgeType));
				dist.poissonDistribution();
				//dist.powerLawDistribution();
				degreeDist.out = dist.getData();
				var graphOut = new HistogramGraph("#graphModal",degreeDist.out,"out Degree distribution","k(out)","p(k)",avgDegree);						
				graphOut.plot();
				graphIn.plot();
			}else{
				var dist = new DegreeDistribution(degreeDist,avgDegree,active.getGamma(edgeType));
				dist.poissonDistribution();
				//dist.powerLawDistribution();
				degreeDist = dist.getData();
				var graph = new HistogramGraph("#graphModal",degreeDist,"Degree Distribution","k","p(k)",[]);
				graph.plot();
			}
		});
	});
	$("#diameter").on("click",function(){//OK
		var edgeType = active.options.edgeUsed;
		active.getDiameter(edgeType,function(diameter){
			console.log(diameter);
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
			//dist.ScaleFreeDistribution();
			CCdist = dist.getData();
			$("#graphModal .modal-body").empty();
			var graph = new HistogramGraph("#graphModal",CCdist,"Clustering Coefficient Distribution","k","CC(k)",avgCC);
			graph.plot();
		})
	});
	$("#closeness").on("click",function(){
		var edgeType = active.options.edgeUsed;
		active.getCloseness(edgeType,function(closeness){
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
	$("#betweenness").on("click",function(){
		var edgeType = active.options.edgeUsed;
		active.getBetweenness(edgeType,function(betweenness){
			$("#graphModal .modal-body").empty();
			console.log(betweenness);
			$("#graphModal .modal-body").append("<div class='table-responsive'>"+
														"<table class='table'><tbody><tr><td>ID</td><td>Betweeness</td></tr></tbody></table>"+
													"</div>");
			var table = $("#graphModal .modal-body table tbody")
			for(i in betweenness){
				table.append("<tr><td>"+i+"</td><td>"+betweenness[i]+"</td></tr>");
			}
		});
	});
	$("#NodeSizePropertySelect").on("change",function(){
		var value = this.options[this.selectedIndex].value
		active.changeNodeSizeAttribute(value)
	});
	$("#pagerank").on("click",function(){
		var edgeType = active.options.edgeUsed;
		active.getPageRank(edgeType,function(pagerank){
			$("#graphModal .modal-body").empty();
			console.log(pagerank);
			$("#graphModal .modal-body").append("<div class='table-responsive'>"+
														"<table class='table'><tbody><tr><td>ID</td><td>Page Rank</td></tr></tbody></table>"+
													"</div>");
			var table = $("#graphModal .modal-body table tbody")
			for(i in pagerank){
				table.append("<tr><td>"+i+"</td><td>"+pagerank[i].C+"</td></tr>");
			}
		});
	});
});

function displayErrorMsg(err){
	$(".errormsgdiv").html("<div class='errormsg alert alert-danger fade in'>"+
						  err+
						  "<a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a>"+
						"</div>")
}