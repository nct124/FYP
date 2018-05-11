exports.calCC = function(node,edgeType,neighborMap,directed) {
	var cc = 0;
	var neighbor = neighborMap[edgeType+"_"+node['@rid']];
	var Nv = 0;
	//find num of neighbors who are neighbors of each other
	if(neighbor!=undefined &&neighbor.length>1){
		for(var i=0;i<neighbor.length;i++){
			for(var j=0;j<neighbor.length;j++){
				//if its not itself
				if(neighbor[i]!=neighbor[j]){
					var arrA = neighborMap[edgeType+"_"+neighbor[i]];
					if(arrA!=undefined){
						if(arrA.indexOf(neighbor[j])>-1){
							Nv++;
						}
					}
					
				}
			}
		}
		if(this.directed == "true"){
			cc = Nv/((neighbor.length)*(neighbor.length-1));
		}else{
			cc = Nv/((neighbor.length)*(neighbor.length-1));
		}
	}
	return cc;
}

exports.path = [];
exports.getDegree = function(node,edgeType) {
	var degree = 0;
	if (node[edgeType]!=undefined){
		degree = node[edgeType].length;
	}
	return degree;
}
exports.recursivePath = function(pres, srcID, prev, current) {
    if (current == srcID) {
        return;
    }else {
        if (Array.isArray(current)) {
            if (this.path.length <= 10) {
                for (var i = 0; i < this.path.length; i++) {
                    if (this.path[i][0] == prev) {
                        var originalpath = this.path[i].slice();
                        this.path[i].unshift(current[0]);
                        this.recursivePath(pres, srcID, current[0], pres[current[0]]);
                        for (var j = 1; j < current.length; j++) {
                            var newpath = originalpath.slice(); //this.path[p].slice();
                            newpath.unshift(current[j]);
                            this.path.unshift(newpath);
                            i++;
                            this.recursivePath(pres, srcID, current[j], pres[current[j]]);
                        }
                    }
                }
            } else {
                for (p in this.path) {
                    if (this.path[p][0] == prev) {
                        this.path[p].unshift(current[0]);
                    }
                }
                this.recursivePath(pres, srcID, current, pres[current[0]]);
            }
        } else {
            for (p in this.path) {
                if (this.path[p][0] == prev) {
                    this.path[p].unshift(current);
                }
            }
            this.recursivePath(pres, srcID, current, pres[current]);
        }
    }
}
exports.floydWarshall=function(nodeMap,edgeMap,weightAttribute,directed,edgeType){
	var dist = {};
	var next = {};
	for(n1 in nodeMap){
		var rid = nodeMap[n1]["@rid"];
		if(dist[rid]==undefined){
			dist[rid] = {};
			next[rid] = {};
		}
		dist[rid][rid] = 0
		for(n2 in nodeMap){
			var rid2 = nodeMap[n2]["@rid"];
			if(rid!=n2){
				dist[rid][rid2] = Number.MAX_SAFE_INTEGER;
			}
		}
	}
	for(e in edgeMap){
		var edge = edgeMap[e];
		if(edge["@class"]==edgeType){
			if (weightAttribute != undefined && weightAttribute != ""){
				dist[edge.out][edge.in] = parseInt(edge[weightAttribute]);
			}else{
				dist[edge.out][edge.in] = 1;
			}	
			next[edge.out][edge.in] = [edge.in]
			if(directed=="false"){
				if (weightAttribute != undefined && weightAttribute != ""){
					dist[edge.in][edge.out] = parseInt(edge[weightAttribute]);
				}else{
					dist[edge.in][edge.out] = 1;
				}	
				next[edge.in][edge.out] = [edge.out]
			}
		}
	}
	for(n1 in nodeMap){
		var rid1 = nodeMap[n1]["@rid"];
		for(n2 in nodeMap){
			var rid2 = nodeMap[n2]["@rid"];
			for(n3 in nodeMap){
				var rid3 = nodeMap[n3]["@rid"];
				if(dist[rid2][rid3]>(dist[rid2][rid1] + dist[rid1][rid3])){
					dist[rid2][rid3] = dist[rid2][rid1] + dist[rid1][rid3]
					next[rid2][rid3] = next[rid2][rid1]
				}else if(dist[rid2][rid1]!=0&&dist[rid1][rid3]!=0&&
					dist[rid2][rid3]==(dist[rid2][rid1] + dist[rid1][rid3]
				)){
					//next[n2][n3].push(next[n2][n1]);
				}
			}
		}
	}
	return {dist: dist,path: next};
}
exports.shortestPath = function(startRID,neighborMap,nodeMap,edgeMap,directed,edgeType,weightAttribute) {
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
	return json;
}

function getEdge(srid,drid,edgeType,nodeMap,edgeMap,directed) {
	var edges = [];
	if(nodeMap[srid]["out_"+edgeType]!=undefined){
		edges = nodeMap[srid]["out_"+edgeType];
	}
	if(directed=="false"){
		if(nodeMap[srid]["in_"+edgeType]!=undefined){
			edges = edges.concat(nodeMap[srid]["in_"+edgeType]);
		}
	}
	for(e in edges){
		var edge = edgeMap[edges[e]];
		if(edge['in']==drid){
			return edge;
		}
		if(directed=="false"){
			if(edge['out']==drid){
				return edge;
			}
		}
	}
	console.log("cant find");
	return undefined;
}


/*
=================================
js-binaryheap-decreasekey - v0.1
https://github.com/rombdn/js-binaryheap-decreasekey

Based on a Binary Heap implementation found in the book
Eloquent Javascript by Marijn Haverbeke
http://eloquentjavascript.net/appendix2.html

(c) 2013 Romain BEAUDON
This code may be freely distributed under the MIT License
=================================
*/


function BinaryHeap(scoreFunction, idFunction, valueProp) {
    this.content = [];
    this.scoreFunction = scoreFunction;
    this.idFunction = idFunction;
    this.valueProp = valueProp;
    this.map = {};
}


BinaryHeap.prototype = {
    size: function() {
        return this.content.length;
    },

    push: function(elt) {
        if(this.map[this.idFunction(elt)] !== undefined) {
            throw 'Error: id "' + this.idFunction(elt) + '" already present in heap';
            return;
        }

        this.content.push(elt);
        var index = this.bubbleUp(this.content.length - 1);
    },

    pop: function() {
        var result = this.content[0];
        var end = this.content.pop();

        delete this.map[this.idFunction(result)];

        if(this.content.length > 0) {
            this.content[0] = end;
            this.map[this.idFunction(end)] = 0;
            var index = this.sinkDown(0);
        }

        return result;
    },

    bubbleUp: function(n) {
        var element = this.content[n];
        var score = this.scoreFunction(element);

        while( n > 0 ) {
            var parentN = Math.floor((n-1)/2);
            var parent = this.content[parentN];

            if( this.scoreFunction(parent) < score )
                break;

            this.map[this.idFunction(element)] = parentN;
            this.map[this.idFunction(parent)] = n;

            this.content[parentN] = element;
            this.content[n] = parent;
            n = parentN;
        }

        this.map[this.idFunction(element)] = n;

        return n;
    },

    sinkDown: function(n) {
        var element = this.content[n];
        var score = this.scoreFunction(element);

        while ( true ) {
            var child2N = (n + 1) * 2;
            var child1N = child2N - 1;
            var swap = null;
            if(child1N < this.content.length) {
                var child1 = this.content[child1N];
                child1score = this.scoreFunction(child1);
                if( score > child1score ) {
                    swap = child1N;
                }
            }

            if(child2N < this.content.length) {
                var child2 = this.content[child2N];
                var child2score = this.scoreFunction(child2);
                if( (swap == null ? score : child1score) > child2score) {
                    
                    swap = child2N;
                }
            }

            if(swap == null) break;


            this.map[this.idFunction(this.content[swap])] = n;
            this.map[this.idFunction(element)] = swap;
            
            this.content[n] = this.content[swap];
            this.content[swap] = element;
            n = swap;
        }

        this.map[this.idFunction(element)] = n;

        return n;
    },
    decreaseKey: function(id, value) {
        var n = this.map[id];
		if(n==undefined){
			this.push({rid:id,weight:value});
		}else{
			this.content[n][this.valueProp] = value;
			this.bubbleUp(n);
		}
        
    }
};