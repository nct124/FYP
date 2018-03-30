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
		for(i in this.data){
			if(i!=0){
				var k = this.data[i]["x"];
				sum+= (1/(Math.pow(i,this.gamma)))//Math.pow(i, (-this.gamma));
				//console.log((1/(Math.pow(i,this.gamma)))+"=1/"+i+"^"+this.gamma);
			}
		}
		//console.log("RZS:"+sum);
		return sum;
	}
	this.powerLawDistribution = function(){
		var sum = this.RiemannZetaSum();
		for(i in data){
			if(sum>0){
				var k = data[i]["x"];
				var powerlaw = (Math.pow(k, (-this.gamma)))/(sum);
				//console.log("["+k+"^(-"+gamma+")]/"+sum+"="+powerlaw)
				this.data[i]["powerlaw"] = powerlaw;
			}else{
				this.data[i]["powerlaw"] = 0;
			}
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
		for(i in this.data){
			if(i!=0){
				var k = this.data[i]["x"];
				sum+= (1/(Math.pow(i,this.gamma)))//Math.pow(i, (-this.gamma));
				//console.log((1/(Math.pow(i,this.gamma)))+"=1/"+i+"^"+this.gamma);
			}
		}
		//console.log("RZS:"+sum);
		return sum;
	}
	this.ScaleFreeDistribution = function(){
		/*var sum = this.RiemannZetaSum();
		for(i in data){
			var k = data[i]["x"];
			var sf = (Math.pow(i, -1));
			this.data[i]["Scale Free"] = sf;
		}*/
		var sum = this.RiemannZetaSum();
		for(i in data){
			if(sum>0){
				var k = data[i]["x"];
				var powerlaw = (Math.pow(k, (-this.gamma)))/(sum);
				//console.log("["+k+"^(-"+gamma+")]/"+sum+"="+powerlaw)
				this.data[i]["Scale Free"] = powerlaw;
			}else{
				this.data[i]["Scale Free"] = 0;
			}
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