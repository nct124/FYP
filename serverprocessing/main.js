var lib = require('./lib');
var path = require('path')
var numericjs = require('./numeric-1.2.6');
	
const bodyParser = require('body-parser')
const express = require('express')
const app = express()

app.use(bodyParser.urlencoded({
        extended: true,
     parameterLimit: 10000000,
     limit: 1024 * 1024 * 1024 * 1024 * 10
}));
app.use(bodyParser.json({
        extended: true,
     parameterLimit: 10000000,
     limit: 1024 * 1024 * 1024 * 1024 * 10
}));
app.use(express.static(path.join(__dirname, 'public')));
// Add headers
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
});
app.get('/', function(req, res){
	res.sendFile(__dirname+'/index.html');
});
app.post('/getDegreeDistribution', function(req, res){
	var nodes = req.body.nodeMap;
	var directed = req.body.directed;
	var edgeType = req.body.edgeType;
	var data = {};
	if (directed=="true") {
		data.out = {};
		data.in = {};
	}
	var n = 0;
	for (i in nodes) {
		n++;
		var node = nodes[i];
		var degree = 0;
		if (directed== "true") {
			degree = lib.getDegree(node,'out_' + edgeType);
			if (data.out[degree] == undefined) {
				data.out[degree] = 0;
			}
			data.out[degree]++;
			degree = lib.getDegree(node,'in_' + edgeType);
			if (data.in[degree] == undefined) {
				data.in[degree] = 0;
			}
			data.in[degree]++;
		} else {
			degree = lib.getDegree(node,'out_'+edgeType);
			degree += lib.getDegree(node,'in_'+edgeType);
			if (data[degree] == undefined) {
				data[degree] = 0;
			}
			data[degree]++;
		}
	}
	var realData;
	if (directed== "true") {
		realData = {};
		realData.in = [];
		realData.out = [];
		for (i in data.in) {
			var node = data.in[i];
			realData.in.push({
				x: i,
				real: node / n
			});
		}
		for (i in data.out) {
			var node = data.out[i];
			realData.out.push({
				x: i,
				real: node / n
			});
		}
	} else {
		realData = [];
		for (i in data) {
			var node = data[i];
			realData.push({
				x: i,
				real: node / n
			});
		}
	}
	res.send(realData);
});
app.post('/getEigenValues', function(req, res){
	lmatrix = req.body.lmatrix;
	for(i in lmatrix){
		for(j in lmatrix[i]){
			lmatrix[i][j] = parseInt(lmatrix[i][j]);
		}
	}
	var newvalue = numericjs.eig(lmatrix);
	res.send({num:newvalue});
});
app.post('/getDiameter', function(req, res){
	var neighborMap = req.body.neighborMap;
	var nodeMap = req.body.nodeMap;
	var edgeMap = req.body.edgeMap;
	var directed = req.body.directed;
	var edgeType = req.body.edgeType;
	var weightAttribute = req.body.weightAttribute;
	var ld = 0;
	var ldp;
	var lds = "";
	for (nodeID in nodeMap) {
		var distance = lib.shortestPath(nodeID,neighborMap,nodeMap,edgeMap,directed,edgeType,weightAttribute);
		//startRID,neighborMap,nodeMap,edgeMap,directed,edgeType,weightAttribute
		if (distance.longestDistance != undefined) {
			if (distance.longestDistance.dist > ld) {
				ld = distance.longestDistance.dist;
				ldp = distance;
				lds = nodeID;
			}
		}
	}
	if (ldp != undefined) {
		lib.path = [
			[ldp.longestDistance.node]
		];
		lib.recursivePath(ldp.pres, lds, ldp.longestDistance.node, ldp.pres[ldp.longestDistance.node]);
		for (i in lib.path) {
			lib.path[i].unshift(lds);
		}
		res.send({
			dist: ld,
			path: lib.path
		});
	}
});
app.post('/getCCDistribution', function(req, res){
	var neighborMap = req.body.neighborMap;
	var nodes = req.body.nodeMap;
	var edgeType = req.body.edgeType;
	var directed = req.body.directed;
	var data = {};
	var datacount = {};
	var avg = 0;
	var noOfNodes = 0;
	for (i in nodes) {
		noOfNodes++;
		var node = nodes[i];
		if (neighborMap[edgeType + "_" + i] != undefined) {
			var k = neighborMap[edgeType + "_" + i].length;
			var CC = lib.calCC(node,edgeType,neighborMap,directed);
			avg += CC;
			if (data[k] == undefined) {
				data[k] = 0;
				datacount[k] = 0;
			}
			data[k] += CC;
			datacount[k]++;
		}
	}
	var realData = [];
	for (i in data) {
		var node = data[i]/datacount[i];
		realData.push({
			x: i,
			real: node.toString()
		});
	}
	avg = avg / noOfNodes;
	var returnJSON = {data:realData,avg:avg};
	res.send(returnJSON);
});
app.post('/getPageRank', function(req, res){
	//PR(i) = sum of (PR(j->i))/(noOfOutGoingEdges(j));
	var nodeMap = req.body.nodeMap;
	var edgeMap = req.body.edgeMap;
	var directed = req.body.directed;
	var edgeType = req.body.edgeType;
	var PR = {};
	var d = 0.85;var errorallow = 0.005;var noOfNodes = 0;
	//init
	for(i in nodeMap){
		noOfNodes++;
	}
	for(i in nodeMap){
		PR[i] = {C:1/noOfNodes,P:1/noOfNodes};
	}
	var update = true;
	while(update==true){
		update = false;
		for(id in PR){
			var node = nodeMap[id];
			var cPR = 0;
			//find incoming nodes(directed) OR in/out(undirected)
			var inedges = [];
			if(node["in_"+edgeType]!=undefined){
				inedges = inedges.concat(node["in_"+edgeType]);
			}
			if(directed=="false"){
				if(node["out_"+edgeType]!=undefined){
					inedges = inedges.concat(node["out_"+edgeType]);
				}
			}
			for(j in inedges){
				var eid = inedges[j];
				var innode = nodeMap[edgeMap[eid].out];
				var prevPR = PR[innode["@rid"]].P
				var noOfOutGoingEdges = 0;
				if(innode["out_"+edgeType]!=undefined){
					noOfOutGoingEdges += innode["out_"+edgeType].length;
				}
				if(directed=="false"){
					if(innode["in_"+edgeType]!=undefined){
						noOfOutGoingEdges += innode["in_"+edgeType].length;
					}
				}
				var ePR = (prevPR)/(noOfOutGoingEdges);
				cPR+=ePR;
			}
			PR[id].C = ((1-d)/noOfNodes)+(d*cPR);
		}
		for(id in PR){
			var diff = Math.abs(PR[id].C-PR[id].P);
			if(diff>errorallow){
				update=true;
			}
			PR[id].P = PR[id].C
		}
	}
	res.send(PR);
});
app.post('/getBetweenness', function(req, res){
	//(no. path going thru a certain vertex) / (no. path)
	var neighborMap = req.body.neighborMap;
	var nodeMap = req.body.nodeMap;
	var edgeMap = req.body.edgeMap;
	var directed = req.body.directed;
	var edgeType = req.body.edgeType;
	var weightAttribute = req.body.weightAttribute;
	var betweennessArray = {};
	var n = 0;
	for (srcID in nodeMap) {
		n++;
		if (betweennessArray[srcID] == undefined) {
			betweennessArray[srcID] = 0
		}
		var distance = lib.shortestPath(srcID,neighborMap,nodeMap,edgeMap,directed,edgeType,weightAttribute);
		for (destID in distance.dist) {
			for (node in nodeMap) {
				var tempBetweenness = 0;
				if (distance.dist[destID] > 1) {
					lib.path = [
						[destID]
					];
					lib.recursivePath(distance["pres"], srcID, destID, distance["pres"][destID])
					for (i in lib.path) {
						lib.path[i].splice(lib.path[i].length - 1, 1);
						if (lib.path[i].indexOf(node) > -1) {
							tempBetweenness++;
						}
					}
					if (betweennessArray[node] == undefined) {
						betweennessArray[node] = 0
					}
					betweennessArray[node] += tempBetweenness / lib.path.length;
				}
			}
		}
	}
	for (i in betweennessArray) {
		if(directed=="true"){
			betweennessArray[i] = betweennessArray[i] / ((n - 1) * (n - 2));
		}else{
			betweennessArray[i] = betweennessArray[i] / ((n - 1) * (n - 2) / 2);
		}
	}
	res.send(betweennessArray);
});
app.post('/getCloseness', function(req, res){
	var closenessArray = {};
	var neighborMap = req.body.neighborMap;
	var nodeMap = req.body.nodeMap;
	var edgeMap = req.body.edgeMap;
	var directed = req.body.directed;
	var edgeType = req.body.edgeType;
	var weightAttribute = req.body.weightAttribute;
	for(nodeID in nodeMap){
		//nodeID,neighborMap,nodeMap,edgeMap,directed,edgeType,weightAttribute
		var distance = lib.shortestPath(nodeID,neighborMap,nodeMap,edgeMap,directed,edgeType,weightAttribute);
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
	res.send(closenessArray);
})

app.listen(8080, () => console.log('Example app listening on port 8080!'))