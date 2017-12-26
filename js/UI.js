var active;
$( document ).ready(function() {
	var schemaURL = "http://localhost:2480/function/Testing/classProperty/";
	$.ajax({
	url: schemaURL,
	crossDomain: true,
	method : "POST",
	headers: {
		'Authorization':'Basic cm9vdDpwYXNzd29yZA=='
	},
	dataType: 'json',
	}).done(function(data1) {
		schemas = data1;
		console.log("SCHEMA:");
		console.log(schemas);
	});
	var graph1 = $("#graph1").GraphVisualizer();
	active = graph1;
	$("#queryBtn").on("click",function(){
		var query = $("#query").val();
		active.queryDatabase(query);
	})
	$("#addBtn").on("click",function(){
		var newGraph = {nodes:[{name:"newNode","x":300,"y":300,"@rid":Math.floor(Math.random() * (100000 - 1) + 1).toString()}]
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
		active.deleteNEinNetwork();
	});
	$("#classType").on("change",function(){
		if(this.selectedIndex>0){
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
		active.createNEinNetwork();
	});
});