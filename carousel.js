'use strict';

module.exports = Carousel;

function Carousel(args) {
    var self = this;
    var create = args.create;
    self.values = [];
    for (var index = 0; index < 10; index++) {
        self.values[index] = create();
    }
    self.iteration = 0;
    self.index = 0;
    self.value = self.values[0];
}

Carousel.prototype.iterate = function iterate(callback) {
    var self = this;
    self.iteration += 1;
    var index = self.iteration % self.values.length;
    var value = self.values[self.index];
    var other = self.values[index];
    self.index = index;
    self.value = other;
    value.iterateOnto(other, callback);
};

Carousel.prototype.get = function get(iteration) {
    var self = this;
    if (iteration > self.iteration) { return; }
    if (iteration <= self.iteration - self.values.length) { return; }
    return self.values[iteration % self.values.length];
};
