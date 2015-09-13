
// http://en.wikipedia.org/wiki/Hilbert_curve

var Point2 = require('ndim/point2');

module.exports = Hilbert2;
function Hilbert2(length) {
    this.length = length;
}

Hilbert2.prototype.encode = function (point) {
    return encode(point, this.length);
};

Hilbert2.prototype.decode = function (scalar) {
    return decodeInto(new Point2(), scalar, this.length);
};

Hilbert2.prototype.decodeInto = function (scalar, point) {
    return decodeInto(scalar, point, this.length);
};

Hilbert2.sizeToLength = function sizeToLength(size) {
    return size.x * size.y;
};

Hilbert2.encode = encode;
function encode(point, length) {
    var rotation = point.constructor.zero.clone();
    var scalar = 0;
    for (var scale = length / 2; scale > 0; scale /= 2) {
        rotation.x = point.x & scale;
        rotation.y = point.y & scale;
        scalar += scale * ((3 * rotation.x) ^ rotation.y);
        rotate(scale, point, rotation);
    }
    return scalar;
}

Hilbert2.decodeInto = decodeInto;
function decodeInto(scalar, point, length) {
    var rotation = point.constructor.zero.clone();
    point.x = 0;
    point.y = 0;
    for (var scale = 1; scale < length; scale *= 2) {
        rotation.x = 1 & (scalar / 2);
        rotation.y = 1 & (scalar ^ rotation.x);
        rotate(scale, point, rotation);
        rotation.scaleThis(scale);
        point.addThis(rotation);
        scalar /= 4;
    }
    return point;
}

function rotate(scale, point, rotation) {
    if (!rotation.y) {
        if (rotation.x) {
            point.x = scale - 1 - point.x;
            point.y = scale - 1 - point.y;
        }
        var temp = point.y;
        point.y = point.x;
        point.x = temp;
    }
}

