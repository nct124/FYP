function DegreeDistribution(data,avgDegree,gamma) {
	this.data = data; 
	this.avgDegree = avgDegree;
	this.gamma = gamma;
	this.poissonDistribution = function(){
		for(i in this.data){
			var k = this.data[i]["x"];
			var poisson = (Math.pow(Math.E,(-this.avgDegree)))*((Math.pow(this.avgDegree, k))/(this.fact(k)));
			this.data[i]["poisson"] = poisson;
		}
	}
	this.RiemannZetaSum = function(){
		var sum =0;
		for(i in data){
			if(i!=0){
				var k = data[i]["x"];
				sum+= Math.pow(i, (-this.gamma));
			}
		}
		return sum;
	}
	this.powerLawDistribution = function(){
		var sum = this.RiemannZetaSum();
		for(i in data){
			var k = data[i]["x"];
			var powerlaw = (Math.pow(k, (-this.gamma)))/(sum);
			//console.log("["+k+"^(-"+gamma+")]/"+sum+"="+powerlaw)
			this.data[i]["powerlaw"] = powerlaw;
		}
	}
	this.fact = function(number){
		var fact=1;
		if(number%2==1){
			fact = number;
			number--;
		}
		var sum = number;
		for(var i=number;i>0;i-=2){
			fact = fact * sum;
			sum = sum + i-2;
		}
		return fact;
	}
	this.getData = function(){
		return data;
	}
}
function CCDistribution(data,avgDegree,numOfNodes) {
	this.data = data; 
	this.avgDegree = avgDegree;
	this.numOfNodes = numOfNodes;
	this.RandomDistribution = function(){
		for(i in this.data){
			var k = this.data[i]["x"];
			var re = (avgDegree/numOfNodes);
			this.data[i]["Random Network"] = re;
		}
	}
	this.RiemannZetaSum = function(){
		var sum =0;
		for(i in data){
			var k = data[i]["x"];
			sum+= Math.pow(i, (-this.gamma));
		}
		return sum;
	}
	this.ScaleFreeDistribution = function(){
		var sum = this.RiemannZetaSum();
		for(i in data){
			var k = data[i]["x"];
			var sf = (Math.pow(i, -1));
			this.data[i]["Scale Free"] = sf;
		}
	}
	this.fact = function(number){
		var fact=1;
		if(number%2==1){
			fact = number;
			number--;
		}
		var sum = number;
		for(var i=number;i>0;i-=2){
			fact = fact * sum;
			sum = sum + i-2;
		}
		return fact;
	}
	this.getData = function(){
		return data;
	}
}