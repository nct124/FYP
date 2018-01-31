<script src="../js/priority_queue.js"></script>
<script type="text/javascript">
var neighborMap = <?php echo json_encode($_POST['neighborMap']); ?>
var nodeMap = <?php echo json_encode($_POST['nodeMap']); ?>
var edgeMap = <?php echo json_encode($_POST['edgeMap']); ?>
var directed = <?php echo json_encode($_POST['directed']); ?>
var edgeType = <?php echo json_encode($_POST['edgeType']); ?>
var weightAttribute = <?php echo json_encode($_POST['weightAttribute']); ?>
function rdy(){
	/*
	var closenessArray = {};
	for(nodeID in nodeMap){
		var distance = shortestPath(nodeID,edgeType);
		var sum = 0;
		var num = 0;
		var closeness = 0;
		for(node in distance.dist){
			sum+=distance.dist[node];
			num++;
		}
		if(sum!=0){
			closeness = (num-1)/sum; 
		}
		closenessArray[nodeID] = closeness;
	}
	document.write(closenessArray);*/
}
function shortestPath(startRID){
	var dist = {};
	var pres = {};
	var visited = {};
	var queue = new BinaryHeap(
		function(element) {
			return element.weight;
		},
		function(element) {
			return element.rid;
		},
		'weight'
	);
	var longestDistance = 0;
	var longestDistanceNode = "";
	dist[startRID] = 0;
	queue.push({
		rid: startRID,
		weight: dist[startRID]
	})
	while (queue.size() > 0) {
		//dequeue smallest node
		var current = queue.pop().rid;
		visited[current] = true;
		var neighbor = neighborMap[edgeType + "_" + current];
		for (n in neighbor) {
			var ne = neighbor[n];
			var weight = 1;
			if (weightAttribute != undefined && weightAttribute != "") {
				var edge = getEdge(current, ne, edgeType, nodeMap, edgeMap, directed)
				weight = parseInt(edge[weightAttribute]);
			}
			if (visited[ne] == undefined && (dist[ne] == undefined || (dist[ne] > (dist[current] + weight)))) {
				dist[ne] = dist[current] + weight;
				if (dist[ne] > longestDistance) {
					longestDistance = dist[ne];
					longestDistanceNode = ne;
				}
				pres[ne] = current;
				//update neighbor node priority ie remove and add neighbor with new weightage
				queue.decreaseKey(ne, dist[ne]);
			} else if (dist[ne] == (dist[current] + weight)) {
				//when u find another shortest path
				if (Array.isArray(pres[ne])) {
					pres[ne].push(current)
				} else {
					pres[ne] = [pres[ne]]
					pres[ne].push(current)
				}
			}
		}
	}
	var json = {
		dist: dist,
		pres: pres,
		longestDistance: {
			dist: longestDistance,
			node: longestDistanceNode
		}
	};
	//console.log(json);
	return json;
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
</script>
<body onload="rdy()">
</body>