EasingAnimator = function(opt){
	opt = opt || {};
	this.easingInterval = opt.easingInterval;
	this.duration = opt.duration || 1000;
	this.step = opt.step || 50;
	this.easingFn = opt.easingFn  || function easeInOutElastic(t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
		return -c/2 * ((t-=2)*t*t*t - 2) + b;
	};
	this.callback = opt.callback || function(){};
	this.completeCallback = opt.complete || function(){};
};

EasingAnimator.makeFromCallback = function(callback, opt){
	opt = opt || {};
	var options = Object.assign(opt, {callback:callback});
	return new EasingAnimator(options);
};

EasingAnimator.prototype.easeProp = function(obj, propDict, onComplete){
	onComplete = onComplete || function(){};
	propDict = propDict || {};
	
	var self = this,
		t = 0,
		out_vals = JSON.parse(JSON.stringify(obj));
	
	clearInterval(self.easingInterval);
	self.easingInterval = setInterval(function(){
		t+= self.step;
		if (t >= self.duration) {
			clearInterval(self.easingInterval);
			self.callback(propDict);
			return onComplete();
		}
		var percent = self.easingFn(t, 0, 1, self.duration);
		Object.keys(propDict).forEach(function(key, i) {
			var old_val = obj[key];
			
			out_vals[key] = old_val - percent*(old_val - propDict[key]);
		});
		self.callback(out_vals);
	}, self.step);
};
